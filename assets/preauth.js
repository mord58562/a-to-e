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
