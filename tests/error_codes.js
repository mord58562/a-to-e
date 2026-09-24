/* Error-code wording.
 * Static: every code the worker can send through fail() has a line in
 * the client's SERVER_ERROR_TEXT, with no allowance list, and the client
 * words no code the worker no longer sends.
 * Dynamic, through the real sign-in form: each code shows the client's
 * line and never the worker's raw `error` (except the two codes whose
 * detail is quoted on purpose), and no em-dash; login_locked counts
 * minutes from retry_after; a code-less 401 on sign-in reads as a wrong
 * password; code-less 5xx, a network failure and a ref read right; an
 * unknown code falls back to the worker's text, capitalised. */
const fs = require("fs"), path = require("path");
const { boot, runner, main, wait, REPO, APP } = require("./harness");
main(async () => {
  const T = runner("error-codes");
  const app = fs.readFileSync(APP, "utf8");
  const worker = fs.readFileSync(path.join(REPO, "cloudflare-worker/src/worker.js"), "utf8");
  const tableSrc = /const SERVER_ERROR_TEXT = \{([\s\S]*?)\n  \};/.exec(app);
  T.ok(!!tableSrc, "SERVER_ERROR_TEXT found in app.js");
  const mapped = new Set([...(tableSrc ? tableSrc[1] : "").matchAll(/^\s{4}([a-z_]+):/gm)].map(m => m[1]));
  // Every fail( call must name its code as a string literal, or this
  // parse would miss one.
  const failCalls = [...worker.matchAll(/\bfail\(([^)\n]{0,40})/g)].filter(m => !/^code,/.test(m[1]));
  const literal = failCalls.filter(m => /^\s*"[a-z_]+"/.test(m[1]));
  T.eq(failCalls.length - literal.length, 0, "every fail() in worker.js names its code as a literal");
  const emitted = new Set(literal.map(m => /"([a-z_]+)"/.exec(m[1])[1]));
  T.ok(emitted.size > 30, `worker codes parsed (${emitted.size})`);
  const unmapped = [...emitted].filter(c => !mapped.has(c));
  T.eq(unmapped.join(","), "", "every worker code is worded by the client");
  const stale = [...mapped].filter(c => !emitted.has(c));
  T.eq(stale.join(","), "", "no client wording for a code the worker no longer sends");

  let reply = null;
  const t = await boot({ routes: { "POST /api/login": () => reply },
    warnOk: /^\[api\] \/api\/login network error/ });
  const form = t.$("#cloudSignInForm"), err = t.$("#cloudSignInErr");
  const submit = async r => {
    reply = r; err.hidden = true; err.textContent = "";
    t.$("#cloudSignInEmail").value = "s@example.com";
    t.$("#cloudSignInPassword").value = "password123";
    form.dispatchEvent(new t.window.Event("submit", { cancelable: true, bubbles: true }));
    await wait(120);
    return err.hidden ? "(hidden)" : err.textContent;
  };
  const DETAIL = new Set(["audit_mismatch", "bad_request"]);
  for (const code of emitted) {
    const shown = await submit({ status: 400, body: { ok: false, code, error: "RAW-" + code } });
    T.ok(shown && shown !== "(hidden)", `${code}: something is shown`);
    T.ok(DETAIL.has(code) ? /Detail: RAW-/.test(shown) : !/RAW-/.test(shown),
      `${code}: raw worker text ${DETAIL.has(code) ? "quoted as detail" : "not shown"} (${shown})`);
    T.ok(!/\u2014/.test(shown), `${code}: no em-dash`);
  }
  T.eq(t.callsTo("POST", "/api/login").length, emitted.size, "each submit reached the worker once");
  T.eq(await submit({ status: 429, body: { ok: false, code: "login_locked", error: "x", retry_after: 61 } }),
    "Too many failed attempts for this email. Try again in 2 minutes.", "login_locked counts minutes from retry_after");
  T.eq(await submit({ status: 429, body: { ok: false, code: "login_locked", error: "x", retry_after: 30 } }),
    "Too many failed attempts for this email. Try again in 1 minute.", "login_locked singular");
  T.eq(await submit({ status: 401, body: {} }), "Wrong email or password.", "code-less 401 on sign-in reads as wrong password");
  T.eq(await submit({ status: 502, body: {} }), "The server hit an error. Try again in a moment.", "code-less 5xx");
  T.eq(await submit({ status: 500, body: { ok: false, code: "server_error", error: "x", ref: "ab12" } }),
    "The server hit an error. Try again in a moment. Reference ab12.", "ref is quoted last");
  T.eq(await submit("network"), "Can't reach the server. Check your connection and try again.", "network failure");
  T.eq(await submit({ status: 418, body: { ok: false, code: "brand_new_code", error: "teapot said no" } }),
    "Teapot said no.", "unknown code falls back to the worker text, capitalised and stopped");
  T.done(t);
});
