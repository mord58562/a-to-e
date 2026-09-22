// Pre-paint auth probe. If an auth token is in localStorage we assume the
// gate will pass and pre-hide it before first paint - otherwise the gate
// flashes for one frame on every saved-login refresh. If the token is
// later rejected by /api/me the JS path un-hides the gate again.
//
// This lives in its own file rather than inline so the page can ship
// script-src 'self' with no 'unsafe-inline'. With the session token in
// localStorage, any XSS is a full account takeover, so the CSP is the
// thing standing between an injected stem and someone's account.
(function () {
  try {
    var pre = !!(localStorage.getItem("y4mcq.auth.token") ||
                 localStorage.getItem("y4mcq.guest.v1"));
    if (pre) document.documentElement.classList.add("pre-authed");
  } catch (_) {}
})();
