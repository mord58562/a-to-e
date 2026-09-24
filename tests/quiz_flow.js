/* The reveal, results and retry path.
 *
 * Next lives in the colophon: hidden until the answer is shown, then
 * visible, focused and one tap away; End sits on the left in study and
 * on the right in a live test. A revealed option is described by its
 * caption. Retry posts `retry: true`, keeps the miss locally, and a
 * server row from that same attempt does not undo it on the next boot
 * (a later one does). Retry offers only the questions opened. A 600
 * answer test is queued whole. A report carries the order the reporter
 * saw. A saved session over a day old is closed and said so. A subtopic
 * that only names a bucket or a specialty is not used as a title. */
const fs = require("fs"), path = require("path");
const { boot, startSession, runner, main, wait, waitFor, userRoutes, SIGNED_IN, REPO } = require("./harness");
const USER = { id: "u1", email: "s@example.com", display_name: "Sam", is_admin: 0 };
const HIST = "y4mcq.history.v1.cloud-u1";

// Some question ids from the live bank, for seeded sessions.
function bankIds(n) {
  const m = JSON.parse(fs.readFileSync(path.join(REPO, "data/batches_manifest.json")));
  let ids = [];
  for (const p of m.batches) {
    if (ids.length >= n + 100) break;
    ids.push(...JSON.parse(fs.readFileSync(path.join(REPO, "data", p))).map(q => q.id));
  }
  return [...new Set(ids)].slice(0, n);
}

main(async () => {
  const T = runner("quiz-flow");
  const pages = [];

  // ── Colophon Next, study ──────────────────────────────────────────────
  {
    const t = await boot({});
    pages.push(t);
    await startSession(t, { mode: "study" });
    const next = t.$("#nextBtn"), end = t.$("#endNowBtn"), exit = t.$("#exitBtn");
    T.ok(t.$("#colophon").contains(next), "study: Next is in the colophon");
    T.ok(!t.$("#nextBtnEnd") && !t.$(".commentary-next"), "study: no second Next at the foot of the commentary");
    T.ok(next.hidden, "study: Next is hidden before the answer is shown");
    T.ok(end.parentNode === exit.parentNode, "study: End sits on the left, where a test's Leave is");
    t.$("#qOptions li .opt-choice").click(); await wait(30);
    t.$("#submitBtn").click(); await wait(150);
    T.ok(!next.hidden, "study: Next shows once the answer is shown");
    T.eq(t.document.activeElement, next, "study: Next takes focus at the reveal, so Enter moves on");
    T.eq(next.textContent, "Next", "study: it reads Next");
    const described = t.$$("#qOptions .opt-choice").map(c => {
      const id = c.getAttribute("aria-describedby");
      const el = id && t.document.getElementById(id);
      return el ? el.textContent.trim() : "";
    });
    T.ok(described.every(Boolean), "study: every revealed option is described by its caption");
    T.ok(described.some(s => /^Correct\./.test(s)), "study: the key's description opens with Correct.");
    const first = t.$("#qStem").textContent;
    next.click(); await wait(200);
    T.ok(t.$("#qStem").textContent !== first, "study: the colophon Next moves to the next question");
    T.ok(next.hidden, "study: and hides again for the unanswered one");
    T.eq(t.document.activeElement, t.$("#qStem"), "study: focus lands on the new stem, not the hidden button");
  }

  // ── Colophon, test; Retry offers only what was opened ────────────────
  {
    const t = await boot({});
    pages.push(t);
    await startSession(t, { mode: "test", count: 0 });
    const end = t.$("#endNowBtn");
    T.ok(t.$("#nextBtn").hidden, "test: no colophon Next in a live test");
    T.ok(end.parentNode === t.$("#nextBtn").parentNode && end.textContent === "Finish test",
      "test: Finish test holds the right end");
    t.$("#qOptions li .opt-choice").click(); await wait(30);
    t.$("#submitBtn").click(); await wait(150);            // answered, on to question 2
    t.$("#submitBtn").click(); await wait(150);            // question 2 skipped, on to 3
    end.click(); await wait(300);
    if (t.$("#confirmDialog").open) t.$("#confirmGo").click();
    await waitFor(() => t.screen() === "summary", 5000, "the summary");
    const label = t.$("#retryBtn").textContent;
    const open = /(\d[\d,]*) unanswered/.exec(label);
    T.eq(open && open[1], "2", `test: Retry offers the two questions opened and left, not the bank (${label})`);
  }

  // ── Retry keeps the miss, on this device and across a boot ────────────
  {
    const routes = userRoutes(USER, { "POST /api/settings": {}, "POST /api/answer": {} });
    const t = await boot({ storage: { "y4mcq.auth.token": SIGNED_IN }, routes });
    pages.push(t);
    await startSession(t, { mode: "study" });
    let qid = null, keyText = null;
    for (let i = 0; i < 12 && !qid; i++) {
      t.$("#qOptions li .opt-choice").click(); await wait(30);
      t.$("#submitBtn").click(); await wait(150);
      if (t.$("#qOptions li.wrong")) {
        keyText = t.$("#qOptions li.correct .opt-text").textContent;
        qid = t.callsTo("POST", "/api/answer").pop().body.question_id;
      } else { t.$("#nextBtn").click(); await wait(150); }
    }
    T.ok(qid, "retry: found a question answered wrong");
    t.$("#endNowBtn").click();
    await waitFor(() => t.screen() === "summary", 5000, "the summary");
    t.$("#retryBtn").click();
    await waitFor(() => t.screen() === "quiz", 5000, "the retry");
    let body = null;
    for (let i = 0; i < 12 && !body; i++) {
      const li = t.$$("#qOptions li").find(x => x.querySelector(".opt-text").textContent === keyText);
      if (li) {
        li.querySelector(".opt-choice").click(); await wait(30);
        t.$("#submitBtn").click(); await wait(200);
        const b = t.callsTo("POST", "/api/answer").pop().body;
        if (b.question_id === qid) body = b;
      } else {
        t.$("#qOptions li .opt-choice").click(); await wait(30);
        t.$("#submitBtn").click(); await wait(150);
        t.$("#nextBtn").click(); await wait(150);
      }
    }
    T.ok(body && body.correct === true && body.retry === true, `retry: the POST says right, in Retry (${JSON.stringify(body && { c: body.correct, r: body.retry })})`);
    await wait(1100);
    const row = JSON.parse(t.window.localStorage.getItem(HIST) || "{}")[qid] || {};
    T.eq(row.lastCorrect, false, "retry: the miss stays on Previously incorrect here");

    // Next boot: a worker that ignored `retry` returns the row as right, at
    // the same attempt's time. A later answer from another device wins.
    const stored = {};
    for (let i = 0; i < t.window.localStorage.length; i++) {
      const k = t.window.localStorage.key(i);
      if (!/outbox/.test(k)) stored[k] = t.window.localStorage.getItem(k);
    }
    for (const [later, want] of [[0, false], [60000, true]]) {
      const remote = { [qid]: { lastCorrect: true, count: row.count, last_at: Math.floor((row.last_at + later) / 1000) * 1000 } };
      const t2 = await boot({ storage: stored, routes: userRoutes(USER, {
        "GET /api/state": { body: { ok: true, history: remote, flags: {}, settings: null } },
        "POST /api/settings": {}, "POST /api/answer": {} }) });
      pages.push(t2);
      await waitFor(() => t2.callsTo("GET", "/api/state").length, 10000, "the state pull");
      await wait(600);
      const r2 = JSON.parse(t2.window.localStorage.getItem(HIST) || "{}")[qid] || {};
      T.eq(r2.lastCorrect, want, later
        ? "retry: a newer right answer from another device is taken"
        : "retry: the same attempt stored as right by the server does not undo the miss");
    }
  }

  // ── A 600-answer test is queued whole; a report carries its order ────
  {
    const ids = bankIds(600);
    const answers = Object.fromEntries(ids.map(id => [id, "A"]));
    const OB = "y4mcq.outbox.v1.cloud-u1";
    const t = await boot({ storage: { "y4mcq.auth.token": SIGNED_IN,
        "y4mcq.session.ids.v1.cloud-u1": { tag: "tg", ids },
        "y4mcq.session.v1.cloud-u1": { poolTag: "tg", idx: 599, mode: "test", timerMins: 0, answers, revealed: {},
          timeMs: {}, salt: "abc", struck: {}, sessionStart: Date.now() - 1000, savedAt: Date.now() - 1000 } },
      routes: userRoutes(USER, { "POST /api/settings": {}, "POST /api/answer": { delay: 50 }, "POST /report": { body: { ok: true, id: "report-1" } } }) });
    pages.push(t);
    await waitFor(() => t.$("#resumeDiscardBtn") && !t.$("#resumeRow").hidden, 30000, "the resume row");
    const writes = [];
    const S = t.window.Storage.prototype, setItem = S.setItem;
    S.setItem = function (k, v) { if (k === OB) writes.push(JSON.parse(v)); return setItem.call(this, k, v); };
    t.$("#resumeDiscardBtn").click(); await wait(300);
    S.setItem = setItem;
    T.eq(writes[0] ? Object.keys(writes[0].answers).length : -1, 600, "outbox: all 600 answers of a scored test are queued");
    T.ok(!/couldn't be kept/.test((t.$("#appNotice") || {}).textContent || ""), "outbox: no data-loss notice");

    await startSession(t, { mode: "study" });
    t.$("#reportBtn").click(); await wait(80);
    t.$("#reportText").value = "B is also defensible.";
    t.$("#reportSubmit").click();
    await waitFor(() => t.callsTo("POST", "/report").length, 3000, "the report");
    const shown = t.callsTo("POST", "/report")[0].body.shown;
    T.ok(typeof shown === "string" && /^[A-E]{5}$/.test(shown) && new Set(shown).size === 5,
      `report: the displayed order goes with the report (${shown})`);
  }

  // ── A saved test over a day old is marked and said so ─────────────────
  {
    const ids = bankIds(10);
    const t = await boot({ storage: { "y4mcq.auth.token": SIGNED_IN,
        "y4mcq.session.ids.v1.cloud-u1": { tag: "old", ids },
        "y4mcq.session.v1.cloud-u1": { poolTag: "old", idx: 3, mode: "test", timerMins: 0,
          answers: { [ids[0]]: "A", [ids[1]]: "B" }, revealed: {}, timeMs: {}, salt: "s1", struck: {},
          sessionStart: Date.now() - 26 * 3600e3, savedAt: Date.now() - 25 * 3600e3 } },
      warnOk: /older than 24 h/,
      routes: userRoutes(USER, { "POST /api/settings": {}, "POST /api/answer": {} }) });
    pages.push(t);
    await waitFor(() => /marked/.test((t.$("#appNotice") || {}).textContent || ""), 30000, "the expiry notice").catch(() => {});
    const text = (t.$("#appNotice") || {}).textContent || "";
    T.ok(/was left for over a day, so it has been marked: \d+ of 10 correct, 8 unanswered/.test(text),
      `expiry: the test's score is said (${text.slice(0, 160)})`);
  }

  // ── Titles: a bucket or a specialty is not what a question tested ────
  {
    const src = fs.readFileSync(path.join(REPO, "assets/app.js"), "utf8");
    const a = src.indexOf("  const BROAD_SUBTOPICS"), b = src.indexOf("\n  }\n", src.indexOf("function testedLabel", a));
    const testedLabel = new Function(src.slice(a, b + 4) + "\nreturn testedLabel;")();
    T.eq(testedLabel({ subtopic: "Other", topic: "Medicine" }), "", "title: Other is not a title");
    T.eq(testedLabel({ subtopic: "Cardiology", topic: "Medicine" }), "", "title: a specialty is not a title");
    T.eq(testedLabel({ subtopic: "Paediatrics", topic: "Paediatrics" }), "", "title: the discipline is not a title");
    T.eq(testedLabel({ subtopic: "Other", subtopic_detail: "anti-D after 12 weeks" }), "Anti-D after 12 weeks", "title: the detail is");
    T.eq(testedLabel({ subtopic: "Postpartum haemorrhage", topic: "Obstetrics & Gynaecology" }), "Postpartum haemorrhage", "title: a specific subtopic still is");
  }

  T.done(...pages);
});
