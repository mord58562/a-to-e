/* A finished test queues every answer in one outbox write.
 * Signed in, a 10-question test answered in full, and a worker that takes
 * 400 ms per answer. Finishing the test must put all ten answers in the
 * outbox in one storage write, before the first POST returns, so a tab
 * closed a second later loses none of them (the regression: answers were
 * queued one at a time, each after the previous POST, and anything not
 * yet queued at close was lost on both sides). Then the flush posts each
 * once, one at a time, with the queued letter, and the outbox empties. */
const { boot, startSession, key, runner, main, wait, waitFor, userRoutes, SIGNED_IN } = require("./harness");
const USER = { id: "u1", email: "s@example.com", display_name: "Sam", is_admin: 0 };
const OB = "y4mcq.outbox.v1.cloud-u1";
const N = 10, SLOW = 400;
main(async () => {
  const T = runner("test-commit");
  let inFlight = 0, maxInFlight = 0;
  const t = await boot({ storage: { "y4mcq.auth.token": SIGNED_IN },
    routes: userRoutes(USER, {
      "POST /api/settings": { body: { ok: true } },
      "POST /api/answer": async () => {
        inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
        await wait(SLOW);
        inFlight--;
        return { body: { ok: true } };
      },
    }) });
  await startSession(t, { mode: "test", count: N });
  await T.booted(t);
  await waitFor(() => t.callsTo("POST", "/api/settings").length, 3000, "the settings flush").catch(() => {});
  await wait(100);

  const writes = [];
  const S = t.window.Storage.prototype, setItem = S.setItem;
  S.setItem = function (k, v) { if (k === OB) writes.push(JSON.parse(v)); return setItem.call(this, k, v); };

  const btn = () => t.$("#submitBtn");
  for (let i = 0; i < N; i++) {
    key(t, "abcde"[i % 5]); await wait(30);
    if (i < N - 1) { btn().click(); await wait(80); }
  }
  T.eq(btn().textContent, "Finish test", "the last question's button reads Finish test");
  T.eq(t.callsTo("POST", "/api/answer").length, 0, "nothing is posted before the test is scored");
  T.eq(writes.length, 0, "nothing is queued before the test is scored");

  btn().click();
  await waitFor(() => writes.length, 2000, "the outbox write").catch(() => {});
  await wait(50);   // well inside the first POST's 400 ms
  const first = writes[0] && writes[0].answers ? Object.keys(writes[0].answers) : [];
  T.eq(first.length, N, `the first outbox write holds all ${N} answers`);
  T.eq(t.callsTo("POST", "/api/answer").filter(c => c.status).length, 0, "and it landed before any POST returned");
  T.ok(t.screen() !== "quiz", `the test was scored (screen ${t.screen()})`);

  await waitFor(() => t.callsTo("POST", "/api/answer").filter(c => c.status).length >= N, N * SLOW + 4000, "every POST")
    .catch(() => {});
  await wait(150);
  const posts = t.callsTo("POST", "/api/answer");
  T.eq(posts.length, N, `${N} answer POSTs`);
  T.eq(new Set(posts.map(p => p.body.question_id)).size, N, "each question posted once");
  T.ok(posts.every(p => writes[0] && writes[0].answers[p.body.question_id] &&
    writes[0].answers[p.body.question_id].l === p.body.source_letter), "each POST carries the queued source letter");
  T.eq(maxInFlight, 1, "one POST at a time");
  T.eq(t.window.localStorage.getItem(OB), null, "the outbox is empty once the worker has them all");
  T.done(t);
});
