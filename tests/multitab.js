/* Several tabs on one account share localStorage. The other tab is
 * played by writing its keys and firing the storage event it would cause.
 *  - Another tab's history write is merged, not overwritten by this
 *    tab's next write (guest).
 *  - A test resumed in another tab stops here, unrecorded, and says so.
 *  - A test replaced by a new session in another tab carries on; when it
 *    is finished here, the other tab's saved session stays.
 *  - A 401 account_deleted removes the account's keys and says so. */
const { boot, startSession, key, runner, main, wait, waitFor, userRoutes, SIGNED_IN } = require("./harness");
const USER = { id: "u1", email: "s@example.com", display_name: "Sam", is_admin: 0 };
main(async () => {
  const T = runner("multitab");
  const t = await boot({ warnOk: /^\[session\] .* in another tab|^\[sync\]/ });
  await startSession(t, { mode: "test", count: 10 });
  await T.booted(t);
  const ls = t.window.localStorage;
  const keyOf = base => Object.keys(ls).find(k => k.startsWith(base + ".guest-"));
  const fire = (k, v) => {
    ls.setItem(k, v);
    t.window.dispatchEvent(new t.window.StorageEvent("storage", { key: k, newValue: v }));
  };
  const notice = () => (t.$("#appNotice") || {}).textContent || "";

  // History from another tab.
  const hk = keyOf("y4mcq.session.v1").replace("y4mcq.session.v1", "y4mcq.history.v1");
  fire(hk, JSON.stringify({ "other-tab-q": { lastCorrect: false, count: 3, last_at: Date.now() } }));

  // Resumed elsewhere: same sid, another owner.
  key(t, "a"); await wait(30); t.$("#submitBtn").click(); await wait(80);
  const sk = keyOf("y4mcq.session.v1");
  const mine = JSON.parse(ls.getItem(sk));
  T.ok(mine && /^[0-9a-f]{32}$/.test(mine.sid) && mine.owner && mine.beat > 0, "the saved session carries sid, owner and beat");
  fire(sk, JSON.stringify({ ...mine, owner: "tab-b", beat: Date.now() }));
  await waitFor(() => t.screen() === "home", 3000, "home after the move").catch(() => {});
  T.eq(t.screen(), "home", "a test resumed in another tab leaves this one");
  T.ok(/resumed in another tab/.test(notice()), "and says where it went");
  await wait(1200);
  const hist = JSON.parse(ls.getItem(hk) || "{}");
  T.ok(hist["other-tab-q"] && hist["other-tab-q"].count === 3, "the other tab's history row survives this tab's writes");
  T.eq(Object.keys(hist).length, 1, "the moved test's answer was not recorded here");

  // Replaced elsewhere: this tab starts a test, another tab saves a new one.
  ls.removeItem(sk);
  t.$("#startBtn").click();
  await waitFor(() => t.screen() === "quiz" && t.$("#qOptions li"), 5000, "a new test");
  const other = { sid: "b".repeat(32), owner: "tab-b", beat: Date.now(), poolTag: "tb", mode: "study", answers: {}, revealed: {}, savedAt: Date.now() };
  fire(sk, JSON.stringify(other));
  await wait(50);
  T.ok(/new session was started in another tab/.test(notice()), "a replaced test is told it can't be resumed");
  T.eq(t.screen(), "quiz", "and carries on");
  key(t, "b"); await wait(30);
  t.$("#endNowBtn").click(); await wait(100);
  const go = t.$("#confirmGo"); if (go && go.offsetParent !== undefined) go.click();
  await waitFor(() => t.screen() === "summary", 3000, "the report").catch(() => {});
  T.eq(t.screen(), "summary", "the replaced test finishes");
  const left = JSON.parse(ls.getItem(sk) || "null");
  T.ok(left && left.sid === other.sid, "finishing it leaves the other tab's saved session");
  const hist2 = JSON.parse(ls.getItem(hk) || "{}");
  T.eq(Object.keys(hist2).length, 2, "the replaced test's answer is recorded here");

  // Account deleted on another device.
  const u = await boot({ storage: { "y4mcq.auth.token": SIGNED_IN },
    warnOk: /account_deleted|^\[sync\] POST \/api\/answer failed: 401/,
    routes: userRoutes(USER, {
      "POST /api/settings": { body: { ok: true } },
      "POST /api/answer": { status: 401, body: { ok: false, code: "account_deleted", error: "x" } },
    }) });
  await startSession(u, { mode: "study" });
  await waitFor(() => u.callsTo("POST", "/api/settings").length, 3000, "the settings flush").catch(() => {});
  key(u, "a"); await wait(30); key(u, "Enter");
  await waitFor(() => u.callsTo("POST", "/api/answer").length, 3000, "the answer POST"); await wait(200);
  const uk = Object.keys(u.window.localStorage).filter(k => k.endsWith(".cloud-u1"));
  T.eq(uk.length, 0, "account_deleted removes the account's keys");
  T.eq(u.window.localStorage.getItem("y4mcq.auth.token"), null, "and the token");
  T.ok(/This account was deleted/.test((u.$("#appNotice") || {}).textContent || ""), "and says the account is gone");
  T.done(t, u);
});
