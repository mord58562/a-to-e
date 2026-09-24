/* Invite link landing: #invite=CODE&email=... opens Create account with
 * the code normalised and the email filled, focus on the name field, the
 * fragment cleared, and no guest auto-entry on a browser used as a guest
 * before. A signed-in visitor is told the link was not used, and nothing
 * is registered. */
const { boot, runner, main, wait, waitFor, userRoutes, SIGNED_IN } = require("./harness");
main(async () => {
  const T = runner("invite");
  const hash = "invite=qk4m tp9x ab12&email=" + encodeURIComponent("rachel@example.com");
  const pages = [];

  for (const [label, storage] of [["fresh", {}],
      ["ex-guest", { "y4mcq.guest.v1": { id: "g-old", display_name: "Guest", created_at: 1 } }]]) {
    const t = await boot({ hash, storage });
    pages.push(t);
    await wait(100);   // the name field is focused on a 60 ms timer
    await T.booted(t, `${label}: `);
    const form = t.$("#cloudSignUpForm");
    T.ok(!t.$("#gate").hidden, `${label}: gate shown`);
    T.ok(form && !form.hidden, `${label}: sign-up pane shown`);
    T.ok(t.$("#cloudSignInForm").hidden, `${label}: sign-in pane hidden`);
    T.eq(t.$(".gate-card").dataset.mode, "signup", `${label}: gate card in sign-up mode`);
    T.eq(t.$("#cloudSignUpInvite").value, "QK4M-TP9X-AB12", `${label}: code normalised and filled`);
    T.eq(t.$("#cloudSignUpEmail").value, "rachel@example.com", `${label}: email filled`);
    T.eq(t.document.activeElement && t.document.activeElement.id, "cloudSignUpName", `${label}: focus on name`);
    T.eq(t.window.location.hash, "", `${label}: fragment cleared from the address bar`);
    T.ok(t.document.body.classList.contains("locked"), `${label}: did not auto-enter guest mode (page still locked)`);
    T.eq(t.calls.length, 0, `${label}: no worker call before the form is sent`);
  }

  // Signed in: enters the account and is told why the link was not used.
  const t = await boot({ hash, storage: { "y4mcq.auth.token": SIGNED_IN },
    routes: userRoutes({ id: "u1", email: "a@example.com", display_name: "A", is_admin: 0 }) });
  pages.push(t);
  await waitFor(() => t.$("#appNotice"), 10000, "the notice");
  T.ok(/invite link is for a new account/.test(t.$("#appNotice").textContent), "signed-in: notice explains the link was not used");
  T.ok(t.$("#gate").hidden, "signed-in: gate stays hidden");
  T.eq(t.window.location.hash, "", "signed-in: fragment cleared");
  T.ok(!t.calls.some(c => c.path === "/api/register"), "signed-in: nothing registered");
  T.done(...pages);
});
