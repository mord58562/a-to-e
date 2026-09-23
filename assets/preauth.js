// Pre-paint auth probe. With a saved token (or guest id) the gate is
// hidden before first paint, so it does not flash on every reload. If
// /api/me later rejects the token, app.js shows the gate again.
//
// This lives in its own file rather than inline so the page can ship
// script-src 'self' with no 'unsafe-inline'. With the session token in
// localStorage, any XSS is a full account takeover, so the CSP is the
// thing standing between an injected stem and someone's account.
(function () {
  try {
    // An invite link has to land on the sign-up form, so a stored guest
    // id does not hide the gate when one is being opened.
    var invite = /(^#|&)invite=/.test(location.hash);
    var pre = !!(localStorage.getItem("y4mcq.auth.token") ||
                 (!invite && localStorage.getItem("y4mcq.guest.v1")));
    if (pre) document.documentElement.classList.add("pre-authed");
  } catch (_) {}
})();

// The bank's first two requests. meta.json keys the data files and the
// batch manifest lists them. app.js is deferred, so starting them here
// saves waiting for it to download and run. loadData takes the promises
// once; a null result means it fetches that file itself.
(function () {
  try {
    if (!window.fetch) return;
    var get = function (url, init) {
      return fetch(url, init)
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    };
    window.__bankHead = {
      meta: get("data/meta.json?t=" + Date.now()),
      manifest: get("data/batches_manifest.json", { cache: "no-cache" })
    };
  } catch (_) {}
})();

// The gate is static HTML and paints before app.js has wired it. A tap
// on "Continue as guest" or a pane switch in that gap is recorded for
// passGate to replay. A form submit is held: sent natively, it would
// reload the page and drop what was typed.
(function () {
  var inGate = function (el) { return !!(el && el.closest && el.closest("#gate")); };
  document.addEventListener("click", function (e) {
    if (window.__gateWired) return;
    var t = e.target && e.target.closest && e.target.closest("#gateGuestBtn, [data-gate-switch]");
    if (t && inGate(t)) window.__gateEarly = { kind: "click", el: t };
  }, true);
  document.addEventListener("submit", function (e) {
    if (window.__gateWired || !inGate(e.target)) return;
    e.preventDefault();
    window.__gateEarly = { kind: "submit", el: e.target };
  }, true);
})();

// Theme before first paint. :root holds the dark palette and app.js is
// deferred, so without this a light-theme load (the default) would paint
// one navy frame first. Same key and default as app.js applyTheme.
//
// The browser-chrome colour follows the app's theme, not the OS scheme:
// one theme-color meta, rewritten whenever data-theme changes, so a
// light-theme user on a dark-mode phone does not get a navy status bar
// over a white page.
(function () {
  var root = document.documentElement;
  var theme = "light";
  try { theme = localStorage.getItem("y4mcq.theme.v1") || "light"; } catch (_) {}
  root.setAttribute("data-theme", theme);
  var BAR = { light: "#fafbfc", dark: "#0a1929" };  // --bg in each palette
  function syncBar() {
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", BAR[root.getAttribute("data-theme")] || BAR.light);
  }
  syncBar();
  if (window.MutationObserver) {
    new MutationObserver(syncBar).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  }
})();
