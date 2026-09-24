/* Admin panel test.
 *
 * The smoke test enters as a guest, so it never touches the admin
 * surfaces. This one stands up a fake worker, signs in as an admin
 * against it, and drives every tab and every destructive control.
 * The fake answers only the exact method and path each call should use;
 * any other worker call fails the test.
 *
 *   python3 -m http.server 8765 --bind 127.0.0.1 &
 *   npm i --no-save jsdom
 *   node tests/admin.js        (or tests/run.sh for every test)
 *
 * It asserts the things that were broken: the panel opens on Users,
 * the table renders real rows with a last-seen column, the admin's own
 * row offers no destructive action, delete opens a password-confirm
 * dialog that names the person and how many answers go with them
 * rather than window.confirm, promote asks for the password, posts it
 * to the right endpoint, keeps focus in the rebuilt table and reports
 * with an Undo that posts the reverse, every tab
 * renders its content without a console error or warning, deleting
 * your own account asks for the password and says when it is wrong,
 * and an expired session reads as expired, not as "not an admin".
 */
const { boot, runner, main, wait, waitFor, userRoutes, SIGNED_IN } = require("./harness");

const now = Math.floor(Date.now() / 1000);
const ADMIN = { id: "u1", email: "admin@example.com", display_name: "Admin", is_admin: 1 };
const USERS = [
  { id: "u1", email: "admin@example.com", display_name: "Admin", is_admin: 1, answers: 312, created_at: 1747000000, last_seen_at: now },
  { id: "u2", email: "carter@example.com", display_name: "Carter", is_admin: 0, answers: 20, created_at: 1755000000, last_seen_at: 1758000000 },
  { id: "u3", email: "ming@example.com", display_name: "Ming", is_admin: 0, answers: 6, created_at: 1757000000, last_seen_at: null },
];
const INVITES = [
  { code_hash: "a".repeat(64), code_hint: "QK4M", label: "Rachel", created_at: 1757000000, expires_at: 1790000000, used_at: null, revoked_at: null, used_by_name: null },
  { code_hash: "b".repeat(64), code_hint: "TP9X", label: "Carter", created_at: 1755000000, expires_at: 1780000000, used_at: 1755500000, revoked_at: null, used_by_name: "Carter" },
];
const QUALITY = { ok: true, worst: [{ question_id: "paeds-001", n: 12, c: 3 }], top: [{ question_id: "psych-004", n: 40, c: 31 }], totals: { users: 3, answers: 338, qs: 210 } };

main(async () => {
  const T = runner("admin");
  const t = await boot({ storage: { "y4mcq.auth.token": SIGNED_IN },
    warnOk: /^\[account\] \/api\/account\/delete failed: 403 password_wrong/,
    routes: userRoutes(ADMIN, {
      "GET /api/admin/users": { body: { ok: true, users: USERS } },
      "GET /api/admin/invites": { body: { ok: true, invites: INVITES } },
      "GET /api/admin/quality": { body: QUALITY },
      "POST /api/admin/users/u2/promote": { body: { ok: true } },
      "POST /api/admin/users/u2/demote": { body: { ok: true } },
      "POST /api/account/delete": { status: 403, body: { ok: false, code: "password_wrong", error: "RAW" } },
    }) });
  const { $, $$ } = t;
  const txt = () => (($("#adminNative") || {}).textContent || "").replace(/\s+/g, " ").trim();
  const tab = name => $$(".admin-tab").find(b => b.textContent.trim() === name);

  // The button is in the static HTML (CSS hides it for non-admins), so
  // wait for is-admin and for its handler, not for the element.
  const adminReady = p => p.document.body.classList.contains("is-admin") && p.$("#adminMastheadBtn") && p.$("#adminMastheadBtn").onclick;
  await waitFor(() => adminReady(t), 20000, "the admin button").catch(() => {});
  await T.booted(t);
  T.ok(t.document.body.classList.contains("is-admin"), "body carries is-admin");
  T.eq($("#signOutBtn").textContent, "Sign out", "Sign out is cased like the tools beside it");
  const btn = $("#adminMastheadBtn");
  if (!T.ok(btn && !btn.hidden, "the admin button is shown")) return T.done(t);
  btn.click();
  await waitFor(() => $$(".admin-users tbody tr").length, 5000, "the users table").catch(() => {});
  await waitFor(() => $$("#inviteList tbody tr").length, 5000, "the invite list").catch(() => {});

  T.ok(!$("#adminModal").hidden, "the panel opens");
  T.eq($$(".admin-tab").map(b => b.textContent.trim()).join(","), "Users,Bank,Content,Account", "the four tabs, in order");
  T.eq(($(".admin-tab.active") || {}).textContent, "Users", "opens on Users");
  T.eq($$(".admin-users tbody tr").length, 3, "renders every user row");
  T.ok(/^3 accounts, 1 admin\./.test(txt()), `the fact line counts accounts and admins (${txt().slice(0, 40)})`);
  T.ok(/days ago|today|never/.test(txt()), "a last-seen column");
  T.ok(/Use the Account tab/.test(txt()), "the admin's own row offers no destructive action");
  T.eq($$("#inviteList tbody tr").length, 2, "renders every invite row");
  T.ok(!!$("#inviteNew"), "the invite form is there");

  // Delete must open the type-to-confirm dialog, not window.confirm.
  const del = $$(".row-act.danger").find(b => b.dataset.act === "delete" && b.dataset.email === "carter@example.com");
  if (T.ok(!!del, "Carter's row offers delete")) {
    del.click(); await wait(200);
    T.ok($("#confirmDialog").open, "delete opens the confirm dialog");
    T.eq($("#confirmDialog").getAttribute("aria-describedby"), "confirmBody", "the confirm dialog is described by its body");
    T.ok(/carter@example\.com/.test($("#confirmBody").textContent), "the dialog names the user");
    T.ok(/\b20 saved answers\b/.test($("#confirmBody").textContent), "the dialog states the answer count");
    T.ok($("#confirmGo").disabled, "confirm starts disabled");
    T.eq($("#confirmGo").textContent, "Delete carter@example.com permanently", "the confirm label names the account");
    T.eq($("#confirmTypeInput").type, "password", "admin delete asks for the admin's password");
    $("#confirmTypeInput").value = "admin-password";
    $("#confirmTypeInput").dispatchEvent(new t.window.Event("input"));
    await wait(50);
    T.ok(!$("#confirmGo").disabled, "a password enables confirm");
    // Cancel submits the dialog's method="dialog" form, which jsdom does
    // not implement; close() is what the browser does with it.
    $("#confirmCancel").click(); $("#confirmDialog").close(); await wait(150);
    T.eq(t.calls.filter(c => /\/delete$/.test(c.path)).length, 0, "cancel deletes nothing");
  }

  // Promote asks for the admin's password, posts it to the right
  // endpoint, and offers Undo. Focus stays in the rebuilt table.
  const prom = $$(".row-act").find(b => b.dataset.act === "promote" && b.dataset.id === "u2");
  if (T.ok(!!prom, "Carter's row offers promote")) {
    prom.focus();
    prom.click(); await wait(200);
    T.ok($("#confirmDialog").open, "promote opens the confirm dialog");
    T.eq($("#confirmTypeInput").type, "password", "promote asks for the admin's password");
    $("#confirmTypeInput").value = "admin-password";
    $("#confirmTypeInput").dispatchEvent(new t.window.Event("input"));
    $("#confirmGo").click();
    await waitFor(() => !$("#adminStatus").hidden, 3000, "the status line").catch(() => {});
    await wait(150);
    const p = t.callsTo("POST", "/api/admin/users/u2/promote");
    T.eq(p.length, 1, "promote posts /api/admin/users/u2/promote once");
    T.ok(p[0] && p[0].body && p[0].body.password === "admin-password", "the password goes in the promote body");
    T.ok(/Carter is now an admin\./.test($("#adminStatus").textContent), "the status says so");
    const f = t.document.activeElement;
    T.ok(f && f !== t.document.body && f.dataset && f.dataset.id === "u2",
      `focus lands on Carter's row after the rebuild (${f && f.tagName}${f && f.dataset && f.dataset.act ? " " + f.dataset.act : ""})`);
    const undo = $(".admin-status-undo");
    if (T.ok(!!undo, "the status offers Undo")) {
      undo.click();
      await waitFor(() => t.callsTo("POST", "/api/admin/users/u2/demote").length, 3000, "the undo").catch(() => {});
      await wait(150);
      T.eq(t.callsTo("POST", "/api/admin/users/u2/demote").length, 1, "Undo posts /api/admin/users/u2/demote once");
      T.ok(/Carter is no longer an admin\./.test($("#adminStatus").textContent), "the status reports the undo");
    }
  }

  const open = async name => {
    const b = tab(name);
    if (!b) return false;
    b.click();
    await wait(300);
    return true;
  };
  if (T.ok(await open("Bank"), "Bank tab")) {
    await waitFor(() => $$(".admin-table-num tbody tr").length, 5000, "the bank table").catch(() => {});
    T.ok(/^[\d,]+ questions\. Last added \d{4}-\d\d-\d\d\./.test(txt()), `Bank: the fact line (${txt().slice(0, 50)})`);
    T.ok($$(".admin-table-num tbody tr").length > 0, "Bank: the table has rows");
    T.ok($$(".admin-table-num th").some(th => th.textContent.trim() === "Gap"), "Bank: the table has a Gap column");
    T.ok(/paeds-001/.test(txt()) || /Most answered/.test(txt()), "Bank: the quality lists render");
  }
  if (T.ok(await open("Content"), "Content tab")) {
    const pane = $("#adminAddAuditPane");
    await waitFor(() => pane && /Copy prompt/.test(pane.textContent), 5000, "the prompt pane").catch(() => {});
    const c = pane ? pane.textContent.replace(/\s+/g, " ") : "";
    T.ok(/Generation prompt/.test(c) && /Copy prompt/.test(c), "Content: the generation prompt and Copy prompt");
  }
  if (T.ok(await open("Account"), "Account tab")) {
    T.ok(/admin@example\.com/.test(txt()), "Account: names the signed-in account");
    T.ok(!!$("#pwForm"), "Account: change-password form");
    T.ok(!!$("#revokeSessions"), "Account: sign out everywhere else");
    const sd = $("#acctSelfDeleteOpen");
    if (T.ok(!!sd, "Account: delete my account")) {
      T.ok(!sd.closest("section").querySelector(".admin-note"), "Account: the delete section leaves the warning to its dialog");
      sd.click(); await wait(150);
      T.eq($("#confirmTypeInput").type, "password", "self-delete asks for the password");
      T.ok($("#confirmGo").disabled, "self-delete confirm starts disabled");
      $("#confirmTypeInput").value = "not-my-password";
      $("#confirmTypeInput").dispatchEvent(new t.window.Event("input"));
      await wait(50);
      $("#confirmGo").click();
      await waitFor(() => t.callsTo("POST", "/api/account/delete").length, 3000, "the delete call").catch(() => {});
      await wait(200);
      const d = t.callsTo("POST", "/api/account/delete");
      T.ok(d.length === 1 && d[0].body && d[0].body.password === "not-my-password", "the password goes in the delete body");
      T.ok(/Not deleted\. The current password is wrong\./.test($("#adminStatus").textContent), "a wrong password is worded and nothing is deleted");
      T.eq(t.window.localStorage.getItem("y4mcq.auth.token"), SIGNED_IN, "the session is kept");
    }
  }
  T.ok(!/Couldn't load/.test(t.document.body.textContent), "no tab says Couldn't load");

  // An admin read on a session that has ended elsewhere reads as ended,
  // with Sign in, not as "doesn't have admin access".
  const x = await boot({ storage: { "y4mcq.auth.token": SIGNED_IN },
    warnOk: /^\[admin\] \/api\/admin\/(users|invites|quality) failed: 401|^\[auth\] admin: .* returned 401/,
    routes: userRoutes(ADMIN, {
      "GET /api/admin/users": { status: 401, body: { ok: false, code: "session_expired", error: "Not signed in." } },
      "GET /api/admin/invites": { status: 401, body: { ok: false, code: "session_expired", error: "Not signed in." } },
      "GET /api/admin/quality": { status: 401, body: { ok: false, code: "session_expired", error: "Not signed in." } },
    }) });
  await waitFor(() => adminReady(x), 20000, "the admin button").catch(() => {});
  x.$("#adminMastheadBtn").click();
  await waitFor(() => x.$("[data-admin-signin]"), 5000, "the Sign in button").catch(() => {});
  const xt = ((x.$("#adminNative") || {}).textContent || "").replace(/\s+/g, " ");
  T.ok(/Your session has ended\. Sign in again\./.test(xt) && !!x.$("[data-admin-signin]"), "expired: the Users tab says the session ended, with Sign in");
  T.ok(!/doesn't have admin access/.test(xt), "expired: not worded as a non-admin");
  T.eq(x.window.localStorage.getItem("y4mcq.auth.token"), null, "expired: the dead token is cleared");
  T.done(t, x);
});
