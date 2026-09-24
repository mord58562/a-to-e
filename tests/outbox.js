/* Outbox retry: an answer whose POST fails with a 5xx stays in the
 * per-account outbox and is sent on the next flush ("online"); a 401
 * keeps it, clears the token and says so with a Sign in action, and
 * nothing more is posted on that dead session. */
const { boot, startSession, key, runner, main, wait, waitFor, userRoutes, SIGNED_IN } = require("./harness");
const USER = { id: "u1", email: "s@example.com", display_name: "Sam", is_admin: 0 };
const OB = "y4mcq.outbox.v1.cloud-u1";
main(async () => {
  const T = runner("outbox");
  let answerStatus = 500;
  const t = await boot({ storage: { "y4mcq.auth.token": SIGNED_IN },
    warnOk: /^\[sync\] POST \/api\/answer failed: (500|401)|^\[auth\] \/api\/answer returned 401/,
    routes: userRoutes(USER, {
      "POST /api/settings": { body: { ok: true } },
      "POST /api/answer": () => answerStatus === 200 ? { body: { ok: true } }
        : { status: answerStatus, body: { ok: false, code: answerStatus === 401 ? "session_expired" : "server_error", error: "x", ref: "ab12" } },
    }) });
  await startSession(t, { mode: "study" });   // no gate for a signed-in user
  await T.booted(t);
  // Choosing the mode saved settings, which flush on a 600 ms debounce;
  // let that go first so the answer POSTs below are the only traffic.
  await waitFor(() => t.callsTo("POST", "/api/settings").length, 3000, "the settings flush").catch(() => {});
  await wait(100);
  const outbox = () => { try { return JSON.parse(t.window.localStorage.getItem(OB) || "null"); } catch (_) { return null; } };
  const posts = () => t.callsTo("POST", "/api/answer");

  key(t, "a"); await wait(30); key(t, "Enter");
  await waitFor(() => posts().length, 3000, "the answer POST"); await wait(100);
  T.eq(posts().length, 1, "the reveal posted the answer once");
  T.ok(posts()[0].auth === "Bearer " + SIGNED_IN, "the POST carries the bearer token");
  const ob1 = outbox();
  const qids = ob1 ? Object.keys(ob1.answers || {}) : [];
  T.eq(qids.length, 1, "a 500 leaves the answer in the outbox");
  if (qids.length) {
    const e = ob1.answers[qids[0]];
    T.ok(/^[A-E]$/.test(e.l) && typeof e.c === "boolean" && e.n === 1 && e.at > 0, "outbox entry has letter, correctness, n=1, at");
    const body = posts()[0].body;
    T.eq(body.question_id, qids[0], "posted body names the same question");
    T.eq(body.source_letter, e.l, "posted body carries the source letter");
    T.eq(body.n, 1, "posted body carries n");
    T.ok(Array.isArray(e.ids) && e.ids.length === 1 && /^[0-9a-f]{32}$/.test(e.ids[0]), "outbox entry holds one attempt id");
    T.ok(Array.isArray(body.attempt_ids) && body.attempt_ids.length === 1 && body.attempt_ids[0] === (e.ids || [])[0],
      "posted body carries the entry's attempt id");
  }
  T.ok(!t.$("#appNotice"), "a transient 500 raises no notice");

  answerStatus = 200;
  t.window.dispatchEvent(new t.window.Event("online"));
  await waitFor(() => posts().length === 2, 3000, "the re-send").catch(() => {}); await wait(100);
  T.eq(posts().length, 2, "coming back online re-sends");
  T.eq(JSON.stringify(posts()[1] && posts()[1].body.attempt_ids), JSON.stringify(posts()[0].body.attempt_ids),
    "the re-send carries the same attempt id, so the worker can ignore a replay");
  T.eq(outbox(), null, "the outbox is empty once the worker accepts");

  // 401: kept, token cleared, notice with Sign in.
  answerStatus = 401;
  key(t, "ArrowRight"); await wait(200);
  key(t, "b"); await wait(30); key(t, "Enter");
  await waitFor(() => posts().length === 3, 3000, "the third POST").catch(() => {}); await wait(150);
  const ob2 = outbox();
  T.ok(ob2 && Object.keys(ob2.answers).length === 1, "a 401 keeps the answer queued");
  T.eq(t.window.localStorage.getItem("y4mcq.auth.token"), null, "a 401 clears the token");
  const n = t.$("#appNotice");
  T.ok(n && /Signed out on this device/.test(n.textContent) && /Sign in/.test(n.textContent), "a 401 shows the signed-out notice with Sign in");
  const before = posts().length;
  t.window.dispatchEvent(new t.window.Event("online")); await wait(300);
  T.eq(posts().length, before, "no further posts after the session died");
  T.done(t);
});
