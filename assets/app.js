/* A to E - SPA driver.
 *
 * Layout: one centred reading column (--col). The reference panel is a
 * fixed right-side overlay and never shifts the column.
 * Subtopic is never shown before the answer: it would give away the
 * diagnosis.
 *
 * Study mode = continuous, instant explanation on submit.
 * Test mode  = no reveal until end, optional countdown timer.
 */

(function () {
  "use strict";

  // Web Storage that cannot take the app down; these names shadow the
  // globals inside this IIFE. With site data blocked, reading
  // `window.localStorage` throws SecurityError; with a full quota every
  // setItem throws. A failed write is kept in memory for this tab and
  // logged once. A guest is told once, after home is up (the gate would
  // cover it); signed-in answers still reach the server.
  const storageNotice = { ready: false, pending: false, quota: false, shown: false };
  function showStorageNotice() {
    storageNotice.pending = false;
    if (storageNotice.shown || cloudUser) return;
    storageNotice.shown = true;
    showAppNotice(storageNotice.quota
      ? "Sorry, this browser's storage for this site is full, so answers from this tab won't be kept after it closes. Free some browser storage to keep them."
      : "Sorry, this browser is blocking storage for this site, so answers from this tab will be lost when it closes. Allow site data for this site to keep them.");
  }
  const localStorage = _safeStorage("localStorage");
  const sessionStorage = _safeStorage("sessionStorage");
  function _safeStorage(name) {
    let real = null;
    try { real = window[name]; real.getItem("y4mcq.probe"); } catch (_) { real = null; }
    const mem = new Map();
    let warned = false;
    const warnOnce = (e) => {
      if (warned) return;
      warned = true;
      console.warn(`[a-to-e] ${name} unavailable (${e && e.name || e}); this tab's progress will not be saved`);
      if (name !== "localStorage") return;
      storageNotice.quota = !!(e && e.name === "QuotaExceededError");
      if (storageNotice.ready) showStorageNotice(); else storageNotice.pending = true;
    };
    return {
      getItem(k) {
        k = String(k);
        if (mem.has(k)) return mem.get(k);
        try { return real ? real.getItem(k) : null; } catch (e) { warnOnce(e); return null; }
      },
      setItem(k, v) {
        k = String(k); v = String(v);
        try {
          if (!real) throw new Error("no storage");
          real.setItem(k, v);
          mem.delete(k);
        } catch (e) { warnOnce(e); mem.set(k, v); }
      },
      removeItem(k) {
        k = String(k);
        mem.delete(k);
        try { if (real) real.removeItem(k); } catch (e) { warnOnce(e); }
      },
      key(i) {
        try { return real ? real.key(i) : null; } catch (e) { return null; }
      },
      get length() {
        try { return real ? real.length : 0; } catch (e) { return 0; }
      },
    };
  }

  // The Cloudflare Worker, as printed by `wrangler deploy` in
  // cloudflare-worker/.
  const WORKER_URL = "https://a-to-e-inbox.mord58562.workers.dev";

  const HISTORY_KEY  = "y4mcq.history.v1";
  const FLAGS_KEY    = "y4mcq.flags.v1";
  const THEME_KEY    = "y4mcq.theme.v1";     // shared across profiles
  const SETTINGS_KEY = "y4mcq.settings.v3";
  const REMINDER_DISMISS_KEY = "y4mcq.reminder.dismissed";
  const LOCAL_QUESTIONS_KEY  = "y4mcq.local_questions.v1";
  const PROFILE_MIGRATED_KEY = "y4mcq.profile.migrated.v1";
  const AUTH_TOKEN_KEY       = "y4mcq.auth.token";
  // Last known masthead identity, so the name pill and the Admin button
  // can be painted with the rest of the row instead of arriving after
  // the round-trip that confirms them. Cosmetic only: every admin
  // surface is gated on the server, and the real answer overwrites this
  // as soon as /api/me lands.
  const CHROME_KEY           = "y4mcq.chrome.v1";
  const SESSION_KEY          = "y4mcq.session.v1";
  // A resumable session goes stale rather than lingering forever: coming
  // back to a half-finished test two weeks later is not resuming, it is
  // being ambushed by one.
  const SESSION_MAX_AGE_MS   = 24 * 60 * 60 * 1000;
  const GUEST_KEY            = "y4mcq.guest.v1";

  // Cloud account state. Populated by checkAuth() on startup if a token
  // is stored; cleared on logout. `is_admin` controls whether add/audit
  // UI is visible.
  let cloudUser = null;
  let authToken = null;
  // Guest state: lightweight identity used purely for namespacing
  // localStorage; never synced to the worker. Persisted across reloads
  // until the user signs in or explicitly clears.
  let guestUser = null;
  // Set when a saved session could not be checked (network or server
  // error, not a 401), so the gate can say why it is showing.
  let authCheckFailed = false;

  function activateGuest() {
    let g = null;
    try { g = JSON.parse(localStorage.getItem(GUEST_KEY) || "null"); } catch {}
    if (!g || !g.id) {
      // If a previous guest session left progress behind in localStorage
      // (HISTORY_KEY.guest-<id>), adopt that id so the user inherits
      // their prior progress and pill colour. Pick the guest namespace
      // with the most recent `last_at` activity. Otherwise mint fresh.
      let bestId = null, bestAt = 0;
      const prefix = HISTORY_KEY + ".guest-";
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(prefix)) continue;
        const id = k.slice(prefix.length);
        let hist = null;
        try { hist = JSON.parse(localStorage.getItem(k) || "{}"); } catch {}
        if (!hist || typeof hist !== "object") continue;
        let mostRecent = 0;
        for (const qid in hist) {
          const at = (hist[qid] && hist[qid].last_at) || 0;
          if (at > mostRecent) mostRecent = at;
        }
        if (mostRecent > bestAt || (mostRecent === bestAt && !bestId)) {
          bestAt = mostRecent;
          bestId = id;
        }
      }
      g = {
        id: bestId || ("g-" + Math.random().toString(36).slice(2, 10)),
        display_name: "Guest",
        created_at: Date.now(),
      };
      localStorage.setItem(GUEST_KEY, JSON.stringify(g));
    }
    guestUser = g;
  }

  // Every server failure a person reads is worded here. The worker sends
  // a stable `code` with each error; its `error` text is for logs, curl
  // and clients older than the codes. An unknown code falls back to that
  // text, and a response with neither gets a line chosen by status.
  const SERVER_UNREACHABLE = "Can't reach the server. Check your connection and try again.";
  const SERVER_ERROR_TEXT = {
    payload_too_large:   "That's too much to send in one go.",
    server_error:        "The server hit an error. Try again in a moment.",
    server_unconfigured: "The server isn't set up to take this yet.",
    signup_rate:         "Too many sign-up attempts from this network. Try again in an hour.",
    email_format:        "Enter an email address like name@example.com.",
    password_short:      "Use at least 8 characters for the password.",
    password_long:       "That password is too long.",
    invite_required:     "Enter your invite code.",
    invite_invalid:      "That invite code isn't recognised. Check it against the message you were sent; a code works once, and they expire.",
    email_taken:         "An account already uses that email. Sign in instead.",
    credentials_missing: "Enter your email and password.",
    login_rate:          "Too many sign-in attempts from this network. Try again in 15 minutes.",
    login_locked:        d => {
      const mins = Math.max(1, Math.ceil((Number(d && d.retry_after) || 0) / 60));
      return `Too many failed attempts for this email. Try again in ${plural(mins, "minute")}.`;
    },
    credentials_wrong:   "Wrong email or password.",
    session_expired:     "Your session has ended. Sign in again.",
    not_admin:           "This account doesn't have admin access.",
    last_admin:          "You're the last admin. Make someone else an admin first.",
    user_not_found:      "That account no longer exists.",
    self_target:         "You can't do that to your own account here. Your own account is under Account.",
    password_rate:       "Too many password attempts. Try again in 15 minutes.",
    password_wrong:      "The current password is wrong.",
    invite_spent:        "That code has already been used or revoked.",
    settings_too_large:  "Your settings are too large to save.",
    report_short:        "Add a few words about what's wrong.",
    report_long:         "Keep the report under 4,000 characters.",
    report_rate:         "You've sent a lot of reports this hour. Try again later.",
    report_daily:        "The report box is full for today. Try again tomorrow.",
    report_queue_full:   "The report box is full until the open reports are reviewed.",
    batch_too_large:     "Too many at once. Apply them in smaller groups.",
    audit_mismatch:      "The file has changed since this audit was built. Copy the prompt again and redo the audit.",
    github_read_failed:  "Couldn't read the bank from GitHub. Nothing was changed.",
    reports_not_closed:  "The question edits were saved, but the reports weren't closed.",
    bad_request:         "The server couldn't use that request.",
  };
  // For these the worker's own text names the failing field or the ids
  // that no longer match, which the admin needs to act on.
  const SERVER_ERROR_DETAIL = new Set(["audit_mismatch", "bad_request"]);
  // `path` only matters for a code-less 401, which means a wrong password
  // on sign-in and a dead session everywhere else.
  function serverErrorText(data, status, path) {
    data = data || {};
    let text = SERVER_ERROR_TEXT[data.code];
    if (typeof text === "function") text = text(data);
    if (!text) {
      const said = String(data.error || "").trim();
      if (status === 401) {
        text = path === "/api/login" ? SERVER_ERROR_TEXT.credentials_wrong : SERVER_ERROR_TEXT.session_expired;
      } else if (status >= 500) {
        text = SERVER_ERROR_TEXT.server_error;
      } else if (said) {
        text = said.charAt(0).toUpperCase() + said.slice(1) + (/[.!?]$/.test(said) ? "" : ".");
      } else if (status === 429) {
        text = "Too many attempts. Try again in a few minutes.";
      } else if (status === 413) {
        text = SERVER_ERROR_TEXT.payload_too_large;
      } else {
        text = "The server turned that down. Try again, and reload if it keeps happening.";
      }
    }
    const detail = String(data.error || "").trim();
    if (SERVER_ERROR_DETAIL.has(data.code) && detail) text += ` Detail: ${detail}`;
    // The reference matches a line in the worker log; worth quoting in a
    // bug report, so it goes last where it can be read off.
    if (data.ref) text += ` Reference ${data.ref}.`;
    return text;
  }

  // Every request is bounded. A half-open connection (captive portal, a
  // phone changing networks) never settles on its own, and the caller
  // needs a failure it can act on. `read` runs under the same timer, so
  // a caller that passes one bounds the body as well as the headers. A
  // timeout rejects with an AbortError.
  async function timedFetch(url, init, ms, read = r => r) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    try {
      return await read(await fetch(url, { ...init, signal: ctl.signal }));
    } finally {
      clearTimeout(timer);
    }
  }

  const API_TIMEOUT_MS = 20000;
  async function apiFetch(path, options) {
    if (!WORKER_URL) throw new Error("Cloud backend not configured");
    const headers = { "Content-Type": "application/json", ...(options && options.headers || {}) };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    let r;
    try {
      r = await timedFetch(WORKER_URL.replace(/\/$/, "") + path, { ...options, headers }, API_TIMEOUT_MS);
    } catch (netErr) {
      // Offline, DNS, TLS and timeout failures, as distinct from a server
      // 4xx/5xx. The sign-up and sign-in forms show this to the user.
      console.warn("[api]", path, "network error:", netErr && (netErr.name + ": " + netErr.message));
      const e = new Error(SERVER_UNREACHABLE);
      e.status = 0;
      e.code = "unreachable";
      throw e;
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data.ok === false) {
      const e = new Error(serverErrorText(data, r.status, path));
      e.status = r.status;
      e.code = data.code || "";
      e.serverError = data.error || "";
      throw e;
    }
    return data;
  }

  // Set when boot entered the account from the cached identity instead of
  // waiting for /api/me. Resolves to { user } or { error }; boot reads it
  // in settleSessionCheck() once the home screen is up.
  let authVerify = null;

  // The account last confirmed on this browser, kept with the masthead
  // chrome. Caches written before `user` was stored carry the id only in
  // the chip's "cloud-<id>".
  function cachedCloudUser() {
    let c = null;
    try { c = JSON.parse(localStorage.getItem(CHROME_KEY) || "null"); } catch (_) { return null; }
    if (!c || !c.cloud) return null;
    const u = (c.user && typeof c.user === "object") ? c.user : {};
    const id = u.id || (/^cloud-(.+)$/.exec(c.profileId || "") || [])[1];
    if (!id) return null;
    return { id, email: u.email || "", display_name: u.display_name || c.name || "", is_admin: !!c.admin };
  }

  // Only a 401 means the session is dead. A worker blip or a dropped
  // connection at page load keeps the token, so the student stays in
  // their account instead of answering into a guest namespace. The
  // cached name and admin chrome go with the token, or a guest on this
  // browser would see them.
  function forgetDeadSession() {
    authToken = null;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CHROME_KEY);
  }

  async function cloudCheckAuth() {
    if (!WORKER_URL) return null;
    const t = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!t) return null;
    authToken = t;
    const check = apiFetch("/api/me", { method: "GET" })
      .then(r => (r && r.user && r.user.id) ? { user: r.user } : { error: new Error("no user in /api/me") },
            error => ({ error }));
    // A returning student with a known account goes straight in. The
    // bank, the local history and the outbox all work without the
    // worker, and /api/me can take the full 20 s timeout on bad wifi.
    const cached = cachedCloudUser();
    if (cached) {
      cloudUser = cached;
      authVerify = check;
      return cached;
    }
    const { user, error } = await check;
    if (user) { cloudUser = user; return user; }
    if (error && error.status === 401) {
      forgetDeadSession();
    } else {
      authToken = null;
      authCheckFailed = true;
      console.warn("[auth] could not verify the saved session:", error && error.status, error && error.message);
    }
    return null;
  }

  // The background half of an optimistic start. A 401 sends the student
  // back to the gate (or, mid-session, to the signed-out notice, so the
  // question on screen is not thrown away). A slow or unreachable worker
  // leaves them studying on the local copy with answers queued.
  async function settleSessionCheck() {
    if (!authVerify) return;
    const { user, error } = await authVerify;
    authVerify = null;
    if (user) {
      if (!cloudUser || user.id !== cloudUser.id) {
        console.warn("[auth] token belongs to a different account than the cached one; reloading");
        localStorage.removeItem(CHROME_KEY);
        location.reload();
        return;
      }
      Object.assign(cloudUser, user);
      paintProfileChip();
      return;
    }
    if (error && error.status === 401) {
      console.warn("[auth] /api/me returned 401 after an optimistic start:", error.code || "", error.serverError || "");
      forgetDeadSession();
      if (!state.quiz) { location.reload(); return; }
      onSessionExpired("/api/me");
      return;
    }
    console.warn("[auth] could not verify the saved session:", error && error.status, error && error.message);
    showAppNotice("Can't reach the server. Answers are kept on this device and sync when the connection returns.");
  }
  async function cloudSignIn(email, password) {
    const { token, user } = await apiFetch("/api/login", { method: "POST", body: JSON.stringify({ email, password }) });
    authToken = token; cloudUser = user;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    return user;
  }
  // Codes are issued as XXXX-XXXX-XXXX. One pasted without the dashes,
  // or with spaces, must hash the same: each refusal spends one of the
  // five sign-up attempts per hour. The worker applies the same rule,
  // so either side alone is enough.
  function normaliseInviteCode(raw) {
    const s = String(raw || "").trim().toUpperCase();
    const bare = s.replace(/[^A-Z0-9]/g, "");
    return bare.length === 12 ? bare.replace(/(.{4})(?=.)/g, "$1-") : s;
  }
  async function cloudSignUp(email, password, displayName, inviteCode) {
    const payload = { email, password, display_name: displayName, invite_code: inviteCode };
    const { token, user } = await apiFetch("/api/register", { method: "POST", body: JSON.stringify(payload) });
    authToken = token; cloudUser = user;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    return user;
  }
  function cloudSignOut() {
    // Revoke the token on the server too. The local clear below happens
    // regardless, so a network failure never leaves this browser signed in.
    const wasToken = authToken;
    if (wasToken) {
      // keepalive: signOut() reloads the page straight after this, and a
      // plain fetch is aborted by the navigation before it reaches the
      // worker, leaving the token live on the server.
      apiFetch("/api/logout", { method: "POST", keepalive: true })
        .catch(e => console.warn("[auth] /api/logout failed:", e && e.status, e && e.message));
    }
    authToken = null; cloudUser = null;
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
  // Pull the signed-in user's full state (answers + flags + settings)
  // from the worker so a fresh browser sees the same picture as the
  // original device. The server copy wins; localStorage is a cache that
  // mergeRemoteState() overwrites with this response.
  //
  // Returns { history, flags, settings }, or null on failure: the caller
  // must tell "fetched and empty" from "couldn't reach the server", or a
  // network blip would wipe local state.
  async function cloudFetchState() {
    if (!cloudUser || !WORKER_URL) return null;
    try {
      const r = await apiFetch("/api/state", { method: "GET" });
      return {
        history:  (r && r.history && typeof r.history === "object") ? r.history : {},
        flags:    (r && r.flags && typeof r.flags === "object") ? r.flags : {},
        settings: (r && r.settings && typeof r.settings === "object") ? r.settings : null,
      };
    } catch (e) {
      console.warn("[sync] cloudFetchState failed:", e && e.message || e);
      return null;
    }
  }
  // ── Sync outbox ─────────────────────────────────────────────────────
  // Every answer, flag and settings write for a signed-in user goes into
  // a small per-account outbox in localStorage BEFORE it is posted, and
  // leaves it only when the worker has accepted it, so an answer given
  // on bad hospital wifi, or after the session died, is never lost and
  // never overwritten by an older server row.
  //
  // The outbox is also what the boot merge trusts: a question with a
  // pending answer keeps its local row, a pending flag or unflag beats
  // the server's set, and dirty settings are kept and re-posted. Nothing
  // compares clocks across devices.
  //
  // Shape: { answers: {qid: {l, c, at, n}}, flags: {qid: {on, at}},
  //          settings: <generation, 0 = clean> }. Bounded to OUTBOX_MAX
  // entries per map, oldest dropped first (logged).
  const OUTBOX_KEY = "y4mcq.outbox.v1";
  const OUTBOX_MAX = 500;
  let _sessionExpired = false;
  function outboxKey() { return cloudUser ? `${OUTBOX_KEY}.cloud-${cloudUser.id}` : null; }
  function outboxRead() {
    const k = outboxKey();
    const o = k ? load(k, {}) : {};
    const obj = v => (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
    return { answers: obj(o.answers), flags: obj(o.flags), settings: Number(o.settings) || 0 };
  }
  function outboxCap(map, what) {
    const ids = Object.keys(map);
    if (ids.length <= OUTBOX_MAX) return;
    ids.sort((a, b) => ((map[a] && map[a].at) || 0) - ((map[b] && map[b].at) || 0));
    const drop = ids.slice(0, ids.length - OUTBOX_MAX);
    for (const id of drop) delete map[id];
    console.warn(`[sync] outbox over ${OUTBOX_MAX}: dropped ${drop.length} oldest pending ${what}`);
    // The only real data loss in the sync path, so the student hears it.
    const noun = what === "flags" ? "flag" : "answer";
    showAppNotice(`Sorry, the ${drop.length === 1 ? `oldest unsynced ${noun}` : `${fmtNum(drop.length)} oldest unsynced ${noun}s`} ` +
      `on this device couldn't be kept: it holds ${fmtNum(OUTBOX_MAX)} at most. Reconnect so the rest can sync.`);
  }
  // Read-modify-write against storage, not an in-memory copy, so two tabs
  // do not drop each other's pending writes.
  function outboxUpdate(fn) {
    const k = outboxKey();
    if (!k) return null;
    const o = outboxRead();
    fn(o);
    outboxCap(o.answers, "answers");
    outboxCap(o.flags, "flags");
    if (!Object.keys(o.answers).length && !Object.keys(o.flags).length && !o.settings) localStorage.removeItem(k);
    else save(k, o);
    return o;
  }

  function cloudPostAnswer(qid, sourceLetter, correct) {
    if (!cloudUser) return Promise.resolve(null);
    // A single letter, not a substring: "ABCDE".includes is true for ""
    // and "AB" too. Guest answers carry no letter and stay local.
    if (typeof sourceLetter !== "string" || sourceLetter.length !== 1 ||
        !"ABCDE".includes(sourceLetter)) return Promise.resolve(null);
    const at = Date.now();
    outboxUpdate(o => {
      const prev = o.answers[qid];
      // n counts attempts not yet on the server, so a question answered
      // twice offline still adds two to attempt_count when it lands.
      o.answers[qid] = { l: sourceLetter, c: !!correct, at, n: ((prev && prev.n) || 0) + 1 };
    });
    return flushOutbox();
  }
  function cloudPostFlag(qid, on) {
    if (!cloudUser) return Promise.resolve(false);
    outboxUpdate(o => { o.flags[qid] = { on: !!on, at: Date.now() }; });
    return flushOutbox();
  }
  function markSettingsDirty() {
    outboxUpdate(o => { o.settings = Math.max(Date.now(), o.settings + 1); });
  }

  // One POST. "sent" and "drop" both clear the entry: a 4xx other than
  // 401/408/429 means the worker refused this write for good (bad id,
  // too large), and resending it forever would block the queue.
  async function syncSend(path, body) {
    try {
      await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
      return "sent";
    } catch (e) {
      const st = e && e.status;
      console.warn(`[sync] POST ${path} failed:`, st || "network", (e && (e.serverError || e.message)) || e,
                   body && body.question_id ? `qid=${body.question_id}` : "");
      if (st === 401) { onSessionExpired(path); return "retry"; }
      if (st >= 400 && st < 500 && st !== 408 && st !== 429) return "drop";
      scheduleOutboxRetry();
      return "retry";
    }
  }
  let _flushing = null, _flushAgain = false, _flushRetryTimer = null;
  function scheduleOutboxRetry() {
    if (_flushRetryTimer) return;
    _flushRetryTimer = setTimeout(() => { _flushRetryTimer = null; flushOutbox(); }, 60000);
  }
  // One POST at a time: a guest signing up with 100 flags must not open
  // 100 requests at once.
  function flushOutbox() {
    if (!cloudUser || !WORKER_URL || !authToken || _sessionExpired) return Promise.resolve(false);
    if (_flushing) { _flushAgain = true; return _flushing; }
    _flushing = (async () => {
      let ok;
      do { _flushAgain = false; ok = await _flushOnce(); } while (ok && _flushAgain);
      return ok;
    })().catch(e => { console.warn("[sync] outbox flush threw:", e && e.stack || e); return false; })
      .finally(() => { _flushing = null; });
    return _flushing;
  }
  async function _flushOnce() {
    const o = outboxRead();
    for (const qid of Object.keys(o.flags)) {
      const e = o.flags[qid];
      if (await syncSend("/api/flag", { question_id: qid, on: !!(e && e.on) }) === "retry") return false;
      outboxUpdate(x => { if (x.flags[qid] && x.flags[qid].at === (e && e.at)) delete x.flags[qid]; });
    }
    for (const qid of Object.keys(o.answers)) {
      const e = o.answers[qid] || {};
      // `at` lets the worker keep the newer of two rows for a question.
      const body = { question_id: qid, source_letter: e.l, correct: !!e.c, at: e.at, n: e.n || 1 };
      if (await syncSend("/api/answer", body) === "retry") return false;
      outboxUpdate(x => {
        const cur = x.answers[qid];
        if (!cur) return;
        if (cur.at === e.at) delete x.answers[qid];
        else cur.n = Math.max(1, (cur.n || 1) - (e.n || 1));
      });
    }
    if (o.settings) {
      if (await syncSend("/api/settings", { settings: state.settings }) === "retry") return false;
      outboxUpdate(x => { if (x.settings === o.settings) x.settings = 0; });
    }
    return true;
  }
  window.addEventListener("online", () => { flushOutbox(); });

  // A 401 on a sync write means this device's session is gone: another
  // device used "Sign out everywhere else", the password changed, or the
  // 90-day cap passed.
  function onSessionExpired(path) {
    if (_sessionExpired) return;
    _sessionExpired = true;
    console.warn(`[auth] ${path} returned 401; token cleared, local progress kept in the outbox`);
    authToken = null;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    showAppNotice("Signed out on this device. Answers stay here and sync after you sign in again.",
                  "Sign in", () => location.reload());
  }

  // One notice line under the masthead, for problems that belong to the
  // whole page rather than a dialog.
  function showAppNotice(message, actionLabel, action) {
    let el = document.getElementById("appNotice");
    if (!el) {
      el = document.createElement("div");
      el.id = "appNotice";
      el.setAttribute("role", "alert");
      const masthead = document.querySelector(".masthead");
      if (masthead && masthead.parentNode) masthead.parentNode.insertBefore(el, masthead.nextSibling);
      else document.body.insertBefore(el, document.body.firstChild);
    }
    el.textContent = "";
    const msg = document.createElement("span");
    msg.textContent = message;
    el.appendChild(msg);
    if (actionLabel && action) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "link-btn"; b.textContent = actionLabel;
      b.onclick = action;
      el.appendChild(b);
    }
    const x = document.createElement("button");
    x.type = "button"; x.className = "link-btn"; x.textContent = "×";
    x.setAttribute("aria-label", "Dismiss");
    x.onclick = () => el.remove();
    el.appendChild(x);
    el.hidden = false;
  }

  // Last-resort handler for a throw in a click handler or a render path,
  // which would otherwise leave a half-drawn screen and no message. Log
  // the stack with the question on screen, and tell the user once per
  // page what to do.
  let _uncaughtShown = false;
  function reportUncaught(kind, err, where) {
    const msg = String((err && err.message) || err || "");
    if (/ResizeObserver loop/.test(msg)) return;   // benign browser notice
    let q = null;
    try { q = state.quiz && state.quiz.pool && state.quiz.pool[state.quiz.idx]; } catch (_) { /* before state exists */ }
    console.error(`[a-to-e] uncaught ${kind}:`, (err && err.stack) || msg, where || "", q ? `question=${q.id}` : "");
    if (_uncaughtShown) return;
    _uncaughtShown = true;
    showAppNotice(q
      ? `Something failed on this screen. Reload to continue; if it repeats, report question ${q.id}.`
      : "Something failed on this screen. Reload to continue.", "Reload", () => location.reload());
  }
  window.addEventListener("error", e => {
    // Scripts from elsewhere (extensions) are not ours to report.
    if (e.filename && !e.filename.startsWith(location.origin)) return;
    reportUncaught("error", e.error || e.message, e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : "");
  });
  window.addEventListener("unhandledrejection", e => reportUncaught("rejection", e.reason));

  // Admin is a server-side fact (users.is_admin), re-checked by the worker
  // on every admin endpoint. The client class below only controls chrome.
  function isCurrentUserAdmin() {
    return !!(cloudUser && cloudUser.is_admin);
  }
  // `is-admin` and `is-cloud` on <body> drive the CSS that hides
  // admin-only and account-only chrome.
  function refreshAdminBodyClass() {
    document.body.classList.toggle("is-admin", isCurrentUserAdmin());
    document.body.classList.toggle("is-cloud", !!cloudUser);
    refreshAdminAccountVisibility();
  }

  // Namespace a storage key by account or guest id so each user has
  // their own history / flags / settings / reminders / pasted questions.
  // The bare key is only reached pre-gate, where no state-bearing key is
  // read.
  function ns(key) {
    if (cloudUser) return `${key}.cloud-${cloudUser.id}`;
    if (guestUser) return `${key}.guest-${guestUser.id}`;
    return key;
  }

  const DEFAULT_SETTINGS = {
    mode: "study",
    count: 20,
    timer: 0,
    disciplines: ["Paediatrics", "Obstetrics & Gynaecology", "Psychiatry", "Medicine"],
    difficulties: [1, 2, 3, 4, 5],
    filter: "all",
    subtopics: null,   // null = all on; array of strings = subset
  };

  const state = {
    questions: [],
    ranges: null,
    meta: null,
    history: {},
    flags:   {},
    settings: Object.assign({}, DEFAULT_SETTINGS),
    quiz: null,
    sessionStart: 0,
    questionStart: 0,
    timerInterval: null,
    paused: false,
    refsOpen: false,
    reports: [],
  };

  // Build the focus directive embedded in the paste-flow prompt. All four
  // disciplines are at parity, so the directive asks for an even split
  // and pushes for creative-reasoning question types.
  function seasonalFocusDirective() {
    return [
      "All four disciplines (Paediatrics, Obstetrics & Gynaecology, Psychiatry, Medicine) are at parity. Distribute new questions evenly across the four.",
      "Each question should be built around a clinical-reasoning pattern - mechanism inversion, side-effect to drug class mapping, constraint-stacked decision, antibody or test-pattern to diagnosis, AU-specific cutoff discrimination, time-of-onset reasoning, multi-step ladder under organ dysfunction, confound elimination, pattern recognition with non-obvious cue, or dose-calculation traps. Vary the pattern across the batch.",
    ].join("\n");
  }
  // Live bank counts for the prompt's {{BANK_STATE}}, so whichever LLM
  // the admin pastes into knows which discipline most needs questions.
  function bankStateBlock() {
    const counts = { "Paediatrics": 0, "Obstetrics & Gynaecology": 0, "Psychiatry": 0, "Medicine": 0 };
    const diff = { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 };
    (state.questions || []).forEach(q => {
      if (q.topic in counts) counts[q.topic]++;
      if (q.difficulty >= 1 && q.difficulty <= 5) diff["L" + q.difficulty]++;
    });
    const total = state.questions.length;
    const lines = [
      `Current bank state (live, embedded at copy time):`,
      `- Paediatrics: ${counts["Paediatrics"]}`,
      `- Obstetrics & Gynaecology: ${counts["Obstetrics & Gynaecology"]}`,
      `- Psychiatry: ${counts["Psychiatry"]}`,
      `- Medicine: ${counts["Medicine"]}`,
      `- TOTAL: ${total}`,
      ``,
      `By difficulty: L1=${diff.L1}, L2=${diff.L2}, L3=${diff.L3}, L4=${diff.L4}, L5=${diff.L5}`,
      `Target ratios (overhaul v3, 2026-06-01): L2 ~50% baseline, L3 ~25%, L4 15-20%, L5 ~5%, L1 <=5%. >=50% of L4-L5 must centre on COMMON presentations where reasoning depth earns the rating.`,
    ];
    return lines.join("\n");
  }
  function renderPrompt(tpl) {
    return tpl
      .replace(/\{\{FOCUS_DIRECTIVE\}\}/g, seasonalFocusDirective())
      .replace(/\{\{BANK_STATE\}\}/g, bankStateBlock());
  }

  // The local Python backend (scripts/server.py) only exists on a dev
  // machine. On GitHub Pages the same relative path answers every POST
  // with 405, and trying it would send the body and the bearer token to
  // the wrong host.
  const IS_LOCAL_DEV = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname || "") ||
                       location.protocol === "file:";

  // POST to the remote worker. The local dev backend is tried only on a
  // dev host, and only when the worker could not be reached at all: any
  // HTTP answer from the worker is final, because a 400 or 429 is the
  // reason the user needs to see and must not be retried elsewhere.
  // Returns the parsed response on success, or { ok:false, status, error }.
  //
  // Admin writes go through GitHub file by file, so they get longer than
  // apiFetch. A timeout is not "unreachable": the write may have landed,
  // so nothing is retried and the admin is told to check first.
  const BACKEND_TIMEOUT_MS = 60000;
  async function postBackend(endpoint, body) {
    const path = endpoint.replace(/^\//, "");
    const targets = [];
    if (WORKER_URL) targets.push(WORKER_URL.replace(/\/$/, "") + "/" + path);
    if (IS_LOCAL_DEV || !WORKER_URL) targets.push("api/" + path);
    const headers = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    let last = null;
    for (const url of targets) {
      let r;
      try {
        r = await timedFetch(url, { method: "POST", headers, body: JSON.stringify(body) }, BACKEND_TIMEOUT_MS);
      } catch (e) {
        if (e && e.name === "AbortError") {
          console.warn("[backend] POST", url, `no answer after ${BACKEND_TIMEOUT_MS / 1000}s`);
          return { ok: false, status: 0, code: "timeout",
                   error: "The server didn't answer within a minute. It may still have gone through, so check before sending it again." };
        }
        last = { ok: false, status: 0, code: "unreachable", error: SERVER_UNREACHABLE };
        console.warn("[backend] POST", url, "network error:", e && e.message);
        continue;
      }
      if (r.ok) return await r.json().catch(() => ({ ok: true }));
      const data = await r.json().catch(() => ({}));
      console.warn("[backend] POST", url, r.status, data.code || "", data.error || "", data.ref || "");
      return { ok: false, status: r.status, code: data.code || "", error: serverErrorText(data, r.status, "/" + path), ref: data.ref };
    }
    return last || { ok: false, status: 0, code: "unreachable", error: SERVER_UNREACHABLE };
  }

  // The stored value has to be the same kind of thing as the default:
  // `{}` in the pasted-questions key would make loadData throw "not
  // iterable", and a string in the history key would throw on the first
  // submit.
  function load(k, d) {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      if (v == null) return d;
      if (Array.isArray(d)) return Array.isArray(v) ? v : d;
      if (d && typeof d === "object") return (typeof v === "object" && !Array.isArray(v)) ? v : d;
      return v || d;
    } catch { return d; }
  }
  // Settings are read back from storage AND from the server, and every
  // consumer calls .includes / .length on the list fields without a
  // guard, so a wrong-typed field would stop the home screen rendering.
  function normaliseSettings(s) {
    const out = Object.assign({}, DEFAULT_SETTINGS, (s && typeof s === "object" && !Array.isArray(s)) ? s : {});
    for (const f of ["disciplines", "difficulties"]) {
      // An empty list would mean "nothing matches", and a saved session
      // should never open on an empty bank, so it resets to everything.
      if (!Array.isArray(out[f]) || !out[f].length) out[f] = DEFAULT_SETTINGS[f].slice();
    }
    if (out.subtopics !== null && !Array.isArray(out.subtopics)) out.subtopics = null;
    return out;
  }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  // Local save is immediate; the POST waits for 600 ms of quiet. The
  // dirty mark is written at once, so a change made offline or just
  // before the tab closes is re-posted at the next boot rather than
  // replaced by the server's older copy.
  let _settingsSyncTimer = null;
  function saveSettings() {
    save(ns(SETTINGS_KEY), state.settings);
    if (!cloudUser) return;
    markSettingsDirty();
    if (_settingsSyncTimer) clearTimeout(_settingsSyncTimer);
    _settingsSyncTimer = setTimeout(() => {
      _settingsSyncTimer = null;
      flushOutbox();
    }, 600);
  }
  // Leaving inside the debounce window: send the settings now. keepalive
  // lets the request outlive the page. The dirty mark stays; the next
  // boot re-posts the same settings, which is harmless.
  window.addEventListener("pagehide", () => {
    if (!_settingsSyncTimer || !cloudUser || !authToken || _sessionExpired) return;
    clearTimeout(_settingsSyncTimer);
    _settingsSyncTimer = null;
    apiFetch("/api/settings", { method: "POST", keepalive: true, body: JSON.stringify({ settings: state.settings }) })
      .catch(e => console.warn("[sync] pagehide settings post failed:", e && e.status, e && e.message));
  });

  // Hydrate the account's or guest's state once the gate has set who it
  // is. Pre-gate, state.history/flags/settings are empty defaults.
  function loadProfileState() {
    state.history  = load(ns(HISTORY_KEY), {});
    state.flags    = load(ns(FLAGS_KEY), {});
    state.settings = normaliseSettings(load(ns(SETTINGS_KEY), {}));
  }

  // Boot merge of /api/state into the local cache. The outbox (writes
  // not yet accepted by the worker) decides every conflict; clocks are
  // never compared across devices.
  //
  // History: the server row wins for each question it knows, EXCEPT a
  //   question with a pending answer, whose local row is newer by
  //   definition. Rows the server has never seen (guest answers with no
  //   source letter, anything still queued) are kept. time_ms_total and
  //   first_correct are local-only fields and are carried across.
  // Flags: the server's set, then pending flag/unflag ops applied on
  //   top, so an unflag made on another device holds here too.
  // Settings: the server's copy, unless a local change is still dirty.
  const FLAGSYNC_KEY = "y4mcq.flagsync.v1";
  function mergeRemoteState(remote) {
    const LOCAL_ONLY = ["time_ms_total", "first_correct"];
    const prevHistory = state.history || {};
    const remoteHistory = remote.history || {};
    const flagMarker = ns(FLAGSYNC_KEY);
    // Once per account on this browser: local flags the server lacks are
    // ambiguous (never synced, or removed elsewhere), so they are queued
    // as pending rather than silently deleted.
    if (!localStorage.getItem(flagMarker)) {
      const localOnly = Object.keys(state.flags || {})
        .filter(qid => state.flags[qid] && !(remote.flags || {})[qid]);
      if (localOnly.length) {
        const at = Date.now();
        outboxUpdate(o => { for (const qid of localOnly) if (!o.flags[qid]) o.flags[qid] = { on: true, at }; });
        console.warn(`[sync] flag rule upgrade: re-posting ${localOnly.length} local-only flag(s)`);
      }
      localStorage.setItem(flagMarker, "1");
    }
    const pending = outboxRead();

    const history = { ...prevHistory };
    for (const qid in remoteHistory) {
      const prev = prevHistory[qid];
      if (prev && pending.answers[qid]) continue;
      const row = { ...remoteHistory[qid] };
      delete row.updated_at;   // never read on the client
      if (prev) {
        for (const f of LOCAL_ONLY) if (prev[f] !== undefined && row[f] === undefined) row[f] = prev[f];
      }
      history[qid] = row;
    }
    state.history = history;

    const flags = {};
    for (const qid in (remote.flags || {})) if (remote.flags[qid]) flags[qid] = true;
    for (const qid in pending.flags) {
      if (pending.flags[qid] && pending.flags[qid].on) flags[qid] = true;
      else delete flags[qid];
    }
    state.flags = flags;

    if (remote.settings && typeof remote.settings === "object" && !pending.settings) {
      state.settings = normaliseSettings(remote.settings);
    }
  }

  // One-time legacy migration. Older builds used unscoped keys (one
  // profile per browser). Leftover unscoped data moves into the first
  // account that signs in on this browser, so its history, flags,
  // settings and questions don't appear lost.
  function migrateLegacyIfNeeded() {
    if (!cloudUser) return;
    if (localStorage.getItem(PROFILE_MIGRATED_KEY)) return;
    const legacy = [
      HISTORY_KEY, FLAGS_KEY, SETTINGS_KEY,
      REMINDER_DISMISS_KEY, LOCAL_QUESTIONS_KEY,
    ];
    for (const base of legacy) {
      const raw = localStorage.getItem(base);
      if (raw == null) continue;
      const scoped = ns(base);
      if (localStorage.getItem(scoped) == null) {
        localStorage.setItem(scoped, raw);
      }
      localStorage.removeItem(base);
    }
    localStorage.removeItem("y4mcq.gate.passed");
    localStorage.setItem(PROFILE_MIGRATED_KEY, "1");
  }

  // When a cloud user signs in for the first time on a browser that
  // previously stored progress under the retired local profile, fold
  // that history into the cloud namespace so their existing progress
  // follows them. The profile path itself is gone; only the orphaned
  // localStorage it left behind is read here.
  const LEGACY_PROFILE_IDS = ["rob"];
  // One import per browser, not per account, or every account that ever
  // signs in here (a test account, a classmate on the same machine)
  // would get the legacy history merged into its cache.
  const LEGACY_IMPORTED_KEY = "y4mcq.legacy.imported";
  function importLegacyHistoryIntoCloud() {
    if (!cloudUser) return;
    const importedFlag = "y4mcq.cloud.imported." + cloudUser.id;
    if (localStorage.getItem(importedFlag) || localStorage.getItem(LEGACY_IMPORTED_KEY)) return;
    // A browser where some account already took the import under the
    // old per-account key counts as done.
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("y4mcq.cloud.imported.")) {
        localStorage.setItem(LEGACY_IMPORTED_KEY, "1");
        return;
      }
    }
    for (const profileId of LEGACY_PROFILE_IDS) {
      const legHist = load(`${HISTORY_KEY}.${profileId}`, null);
      if (!legHist) continue;
      const cloudKey = `${HISTORY_KEY}.cloud-${cloudUser.id}`;
      const existing = load(cloudKey, {});
      for (const qid in legHist) {
        if (!existing[qid] || (legHist[qid].count > (existing[qid].count || 0))) {
          existing[qid] = legHist[qid];
        }
      }
      save(cloudKey, existing);
      const legFlags = load(`${FLAGS_KEY}.${profileId}`, null);
      if (legFlags) {
        const cloudFlagsKey = `${FLAGS_KEY}.cloud-${cloudUser.id}`;
        const ef = load(cloudFlagsKey, {});
        save(cloudFlagsKey, Object.assign({}, legFlags, ef));
      }
    }
    localStorage.setItem(importedFlag, "1");
    localStorage.setItem(LEGACY_IMPORTED_KEY, "1");
  }

  // The gate is not a security boundary: the question JSON is public. It
  // routes a visitor to an account, a guest session or an invite; the
  // worker enforces everything else against the bearer token.
  async function passGate() {
    return new Promise(async resolve => {
      // A throw inside a promise executor is a promise that never
      // settles: a page stuck behind the gate. On a throw, unlock and
      // carry on; the rest of boot copes without an account.
      try {
      const gate = document.getElementById("gate");
      const card = gate ? gate.querySelector(".gate-card") : null;
      const unlock = () => {
        if (gate) gate.hidden = true;
        document.body.classList.remove("locked");
        resolve();
      };
      if (!gate) { document.body.classList.remove("locked"); return resolve(); }

      // Pane switcher.
      const switchPane = (mode) => {
        if (card) card.dataset.mode = mode;
        document.querySelectorAll(".gate-pane").forEach(p => p.hidden = true);
        const map = { signin: "cloudSignInForm", signup: "cloudSignUpForm" };
        const el = document.getElementById(map[mode] || "cloudSignInForm");
        if (el) { el.hidden = false; const f = el.querySelector("input"); if (f) setTimeout(() => f.focus(), 50); }
      };
      document.querySelectorAll("[data-gate-switch]").forEach(b => {
        b.addEventListener("click", () => switchPane(b.dataset.gateSwitch));
      });

      // 0. Guest-to-signup intent: a guest just clicked "sign up" in the
      // chip. Do NOT auto-activate guest; show the signup pane and run
      // the guest->cloud migration on success.
      const signupIntent = sessionStorage.getItem("y4mcq.signupIntent");
      if (signupIntent) sessionStorage.removeItem("y4mcq.signupIntent");

      // An invite link (#invite=CODE&email=...) opens the sign-up form
      // filled in. It lives in the fragment so the code never reaches a
      // server log, and it comes off the address bar straight away so a
      // bookmark or a shared screenshot does not carry it.
      const invite = readInviteLink();

      // 1. Already signed in? Skip the gate.
      // Every way into an account (restored session, sign-in, sign-up)
      // folds any guest progress on this browser into it and retires the
      // guest id. A guest id left beside a valid token would send a
      // signed-in user into guest mode on a network blip at boot, and
      // guest answers left behind would pass to the next guest here.
      const enterAccount = (freshAccount) => {
        let prevGuestId = null;
        try {
          const g = localStorage.getItem(GUEST_KEY);
          if (g) prevGuestId = JSON.parse(g).id;
        } catch (_) {}
        if (prevGuestId) migrateGuestHistoryIntoCloud(prevGuestId, !!freshAccount);
        localStorage.removeItem(GUEST_KEY);
        guestUser = null;
        unlock();
      };
      const cloudCheck = await cloudCheckAuth();
      if (cloudCheck) {
        enterAccount();
        if (invite) showAppNotice("That invite link is for a new account. You're already signed in, so it wasn't used. Sign out first to create another account with it.");
        return;
      }
      // preauth.js hid the gate before first paint because a token or a
      // guest id was stored. When the token has just failed (expired,
      // revoked, or the server unreachable), the gate has to come back or
      // the page stays blank. The guest path below unlocks straight away,
      // so dropping the class there costs nothing.
      document.documentElement.classList.remove("pre-authed");

      // 2. Already in guest mode? Skip the gate (UNLESS the guest asked
      // to sign up, in which case we keep them at the gate so they can
      // create a cloud account that inherits their guest progress).
      // Not when a stored session could not be checked: that user has an
      // account, and guest mode would send their answers to the guest
      // namespace without a word. The gate says why instead.
      const savedGuest = localStorage.getItem(GUEST_KEY);
      if (savedGuest && !signupIntent && !invite && !authCheckFailed) { activateGuest(); return unlock(); }

      // Guest button: continue without an account; data lives in localStorage.
      const guestBtn = document.getElementById("gateGuestBtn");
      if (guestBtn) guestBtn.addEventListener("click", () => {
        activateGuest();
        unlock();
      });

      // 3. Sign-in form.
      const signInForm = document.getElementById("cloudSignInForm");
      const signInErr  = document.getElementById("cloudSignInErr");
      if (authCheckFailed && signInErr) {
        signInErr.textContent = "Can't reach the server to restore your session. Reload to try again, or sign in.";
        signInErr.hidden = false;
      }
      // The forms are novalidate: the browser's own bubbles are US English,
      // in a different voice, and never say the 8-character rule up front.
      const say = (el, text) => { el.textContent = text; el.hidden = false; };
      const emailProblem = v => !v ? "Enter your email." : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? SERVER_ERROR_TEXT.email_format : "";
      signInForm.addEventListener("submit", async e => {
        e.preventDefault();
        signInErr.hidden = true;
        const email = document.getElementById("cloudSignInEmail").value.trim();
        const pw = document.getElementById("cloudSignInPassword").value;
        const problem = emailProblem(email) || (!pw ? "Enter your password." : "");
        if (problem) return say(signInErr, problem);
        try {
          await cloudSignIn(email, pw);
          enterAccount();
        } catch (err) {
          signInErr.textContent = (err && err.message) || "Sign in failed.";
          signInErr.hidden = false;
        }
      });

      // 4. Sign-up form.
      const signUpForm = document.getElementById("cloudSignUpForm");
      const signUpErr  = document.getElementById("cloudSignUpErr");
      signUpForm.addEventListener("submit", async e => {
        e.preventDefault();
        signUpErr.hidden = true;
        const pw  = document.getElementById("cloudSignUpPassword").value;
        const pw2 = (document.getElementById("cloudSignUpPassword2") || {}).value || "";
        const email = document.getElementById("cloudSignUpEmail").value.trim();
        const name = document.getElementById("cloudSignUpName").value.trim();
        const code = normaliseInviteCode((document.getElementById("cloudSignUpInvite") || {}).value || "");
        const problem = !code ? SERVER_ERROR_TEXT.invite_required
          : !name ? "Enter your first name."
          : emailProblem(email)
          || (pw.length < 8 ? SERVER_ERROR_TEXT.password_short
          : pw !== pw2 ? "Passwords don't match." : "");
        if (problem) return say(signUpErr, problem);
        try {
          await cloudSignUp(email, pw, name, code);
          enterAccount(true);
        } catch (err) {
          signUpErr.textContent = (err && err.message) || "Sign up failed.";
          signUpErr.hidden = false;
        }
      });

      switchPane(signupIntent || invite ? "signup" : "signin");
      if (invite) {
        document.getElementById("cloudSignUpInvite").value = invite.code;
        if (invite.email) document.getElementById("cloudSignUpEmail").value = invite.email;
        // switchPane focuses the first field, which is now filled.
        setTimeout(() => document.getElementById("cloudSignUpName").focus(), 60);
      }
      } catch (err) {
        console.error("[gate] failed to initialise:", err && err.stack || err);
        document.body.classList.remove("locked");
        const g = document.getElementById("gate");
        if (g) g.hidden = true;
        resolve();
      }
    });
  }

  function readInviteLink() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    const code = normaliseInviteCode(params.get("invite") || "");
    if (!code) return null;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (_) { /* file:// */ }
    return { code, email: (params.get("email") || "").trim() };
  }

  function inviteLink(code, email) {
    const params = new URLSearchParams({ invite: code });
    if (email) params.set("email", email);
    return `${location.origin}${location.pathname}#${params}`;
  }

  function signOut() {
    localStorage.removeItem(GUEST_KEY);
    // The cached name goes with the session, or the gate would paint the
    // last user's pill on the next load.
    localStorage.removeItem(CHROME_KEY);
    cloudSignOut();
    guestUser = null;
    // Hard reload so all in-memory state resets to the gate flow.
    location.reload();
  }

  // The masthead is sticky, and the navigator rail is fixed beneath it.
  // Its height changes with font size and safe-area inset, so it is
  // measured and CSS reads the number.
  function trackMastheadHeight() {
    const masthead = document.querySelector(".masthead");
    if (!masthead) return;
    const set = () => {
      const h = Math.round(masthead.getBoundingClientRect().height);
      // Zero means it is not on screen yet: behind the gate the whole app
      // shell is display:none, and 0px would override the stylesheet's
      // fallback and drop the rail under the topbar.
      if (h > 0) document.documentElement.style.setProperty("--masthead-h", `${h}px`);
    };
    set();
    if (typeof ResizeObserver === "function") new ResizeObserver(set).observe(masthead);
    else window.addEventListener("resize", set);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    applyTheme(localStorage.getItem(THEME_KEY) || "light");
    paintCachedMastheadChrome();
    trackMastheadHeight();
    // The bank does not depend on who signs in, so its download overlaps
    // the gate: /api/me and any password entry.
    const dataPromise = loadData();
    let dataSettled = false;
    dataPromise.then(() => { dataSettled = true; }, () => { dataSettled = true; });
    await passGate();
    // The bank is several MB. A local load finishes in under 100 ms, so
    // the loading line waits 300 ms before appearing rather than
    // flashing; on a slow link it counts files so a long wait visibly
    // moves. showHome() replaces it.
    let loadingTick = null;
    const loadingDelay = dataSettled ? null : setTimeout(() => {
      const app = document.getElementById("app");
      if (dataSettled || !app || app.firstChild) return;
      const p = document.createElement("p");
      p.id = "bankLoading";
      p.className = "dim";
      p.setAttribute("role", "status");
      const paint = () => {
        p.textContent = bankProgress.listed && bankProgress.total
          ? `Loading questions: ${fmtNum(bankProgress.done)} of ${fmtNum(bankProgress.total)} files`
          : "Loading the question bank…";
      };
      paint();
      app.appendChild(p);
      loadingTick = setInterval(paint, 500);
    }, 300);
    migrateLegacyIfNeeded();
    importLegacyHistoryIntoCloud();
    loadProfileState();
    // Merge the account's server state into the local cache (see
    // mergeRemoteState), only when the fetch succeeded. Not awaited: if
    // the worker is slower than the bank, home paints from the local
    // cache and is refreshed in place when the merge arrives.
    let homeShown = false;
    if (cloudUser) {
      cloudFetchState().then(remote => {
        if (remote) {
          mergeRemoteState(remote);
          save(ns(HISTORY_KEY), state.history);
          save(ns(FLAGS_KEY),   state.flags);
          save(ns(SETTINGS_KEY), state.settings);
          if (homeShown) refreshHomeAfterSync();
        }
        // Drain anything queued by an earlier visit, a guest migration
        // or a dead session.
        flushOutbox();
      });
    }
    try {
      await dataPromise;
    } catch (err) {
      // A failed bank load must not stop boot before showHome(): an
      // empty bank with a working shell at least says what happened.
      console.error("[boot] the question bank failed to load:", err && err.stack || err);
    }
    if (loadingDelay) clearTimeout(loadingDelay);
    if (loadingTick) clearInterval(loadingTick);
    mergeLocalQuestions();
    // Wire each subsystem on its own, so a throw in one cannot stop
    // showHome() and leave a blank screen.
    const wires = [
      ["masthead",   wireMasthead],
      ["colophon",   wireColophon],
      ["refPanel",   wireRefPanel],
      ["quizTopbar", wireQuizTopbar],
      ["escape",     wireEscapeAndContentPane],
      ["report",     wireReportModal],
      ["reportsAdmin", wireReportsAdmin],
      ["stats",      wireStatsModal],
      ["account",    wireAccountModal],
      ["admin",      wireAdminModal],
    ];
    for (const [name, fn] of wires) {
      try { fn(); } catch (e) { console.error("wire", name, "failed:", e); }
    }
    showHome();
    homeShown = true;
    storageNotice.ready = true;
    if (storageNotice.pending) showStorageNotice();
    settleSessionCheck();
  });

  // Settings, flags and history merged from the server after home was
  // drawn. Only the home controls read them before a session starts.
  function refreshHomeAfterSync() {
    if (document.body.getAttribute("data-screen") !== "home" || state.quiz) return;
    applySettingsToOptions();
    renderSubtopicChips();
    onSettingsChange();
  }

  // ── Stats modal ─────────────────────────────────────────────────────
  function wireStatsModal() {
    const btn = document.getElementById("statsBtn");
    const modal = document.getElementById("statsModal");
    const close = document.getElementById("statsClose");
    if (!btn || !modal || !close) return;
    btn.onclick = () => { renderStats(); modal.hidden = false; };
    close.onclick = () => { modal.hidden = true; };
    modal.addEventListener("click", e => { if (e.target.id === "statsModal") modal.hidden = true; });
  }

  function wireAccountModal() {
    // The Account and Admin buttons open the same modal.
    const btn = document.getElementById("accountBtn");
    if (btn) btn.onclick = () => openAdmin("account");
    const adminBtn = document.getElementById("adminMastheadBtn");
    // No tab argument, so it lands on Users, the one used daily.
    if (adminBtn) adminBtn.onclick = () => openAdmin();
    // Admins don't need a separate Account button - the unified modal
    // already contains the account tab. Hide the duplicate.
    if (adminBtn) refreshAdminAccountVisibility();
  }
  function refreshAdminAccountVisibility() {
    const acc = document.getElementById("accountBtn");
    const adm = document.getElementById("adminMastheadBtn");
    if (acc) acc.hidden = !cloudUser || (cloudUser && cloudUser.is_admin);
    if (adm) adm.hidden = !(cloudUser && cloudUser.is_admin);
  }

  // ── Admin modal ─────────────────────────────────────────────────────
  // One modal, sidebar tabs. Non-admin cloud users see Account only;
  // admins see the full set. Users, Bank and Account render into
  // #adminNative when opened; Content is the static #adminAddAuditPane,
  // wired once at boot and shown in its place.
  // Bank is for reading how the bank is doing; Content is the working
  // surface for adding and auditing. Users is first because it is the
  // one used daily.
  const ADMIN_TABS = [
    { id: "users",    label: "Users",    admin: true },
    { id: "bank",     label: "Bank",     admin: true },
    { id: "content",  label: "Content",  admin: true },
    { id: "account",  label: "Account",  admin: false },
  ];

  // ── Status region ──────────────────────────────────────────────────
  // One element for the whole panel. Never auto-dismisses: an admin who
  // misses a toast has no other record that the action happened, and
  // auto-dismissal runs into WCAG 2.2.1. Success is role=status,
  // problems switch the element to role=alert so they interrupt.
  function adminSay(kind, message, undo) {
    const el = document.getElementById("adminStatus");
    if (!el) return;
    el.setAttribute("role", kind === "error" ? "alert" : "status");
    el.className = "admin-status " + (kind === "error" ? "is-error" : "is-ok");
    el.innerHTML = `<span class="admin-status-head">${kind === "error" ? "Problem" : "Done"}</span>` +
                   `<span class="admin-status-msg">${esc(message)}</span>`;
    if (undo) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "admin-status-undo"; b.textContent = "Undo";
      b.onclick = () => { adminClear(); undo(); };
      el.appendChild(b);
    }
    const x = document.createElement("button");
    x.type = "button"; x.className = "admin-status-x";
    x.setAttribute("aria-label", "Dismiss"); x.textContent = "\u00d7";
    x.onclick = adminClear;
    el.appendChild(x);
    el.hidden = false;
  }
  function adminClear() {
    const el = document.getElementById("adminStatus");
    if (el) { el.hidden = true; el.innerHTML = ""; }
  }

  // ── Confirmation ───────────────────────────────────────────────────
  // Friction proportional to the blast radius. A role change is
  // instantly reversible, so it gets none. Deleting an account destroys
  // data that cannot be recovered, so it gets a dialog that names the
  // person, states how many answers go with them, and requires their
  // email typed out. window.confirm can do none of that.
  // tone "primary" is for a confirm that loses nothing (finishing a
  // test); everything else keeps the destructive style.
  function adminConfirm({ title, body, confirmLabel, typeToMatch, typeLabel, tone }) {
    return new Promise(resolve => {
      const dlg = document.getElementById("confirmDialog");
      if (!dlg || !dlg.showModal) return resolve(window.confirm(body));
      const go = document.getElementById("confirmGo");
      const cancel = document.getElementById("confirmCancel");
      const wrap = document.getElementById("confirmTypeWrap");
      const input = document.getElementById("confirmTypeInput");
      const err = document.getElementById("confirmErr");
      document.getElementById("confirmTitle").textContent = title;
      document.getElementById("confirmBody").textContent = body;
      go.textContent = confirmLabel;
      go.className = tone === "primary" ? "primary" : "danger-btn";
      err.hidden = true;
      if (typeToMatch) {
        wrap.hidden = false;
        document.getElementById("confirmTypeLabel").textContent =
          typeLabel || `Type ${typeToMatch} to confirm`;
        input.value = "";
        go.disabled = true;
        input.oninput = () => {
          go.disabled = input.value.trim().toLowerCase() !== typeToMatch.toLowerCase();
        };
        // Enter in the field would submit the dialog's form through its
        // first submit button, which is Cancel: typing the email and
        // pressing Enter would silently cancel the delete.
        input.onkeydown = e => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (!go.disabled) go.click();
        };
      } else {
        wrap.hidden = true;
        go.disabled = false;
        input.oninput = null;
        input.onkeydown = null;
      }
      let settled = false;
      const finish = v => {
        if (settled) return;
        settled = true;
        go.onclick = null;
        dlg.onclose = null;
        if (dlg.open) dlg.close();
        resolve(v);
      };
      go.onclick = () => finish(true);
      dlg.onclose = () => finish(false);
      dlg.showModal();
      // Initial focus on the least destructive control.
      cancel.focus();
    });
  }

  function wireAdminModal() {
    const modal = document.getElementById("adminModal");
    const close = document.getElementById("adminClose");
    if (!modal || !close) return;
    const shut = () => { modal.hidden = true; adminClear(); };
    close.onclick = shut;
    modal.addEventListener("click", e => { if (e.target.id === "adminModal") shut(); });
    const nav = document.getElementById("adminSidebar");
    if (nav) {
      nav.addEventListener("click", e => {
        const btn = e.target.closest(".admin-tab");
        if (!btn || !nav.contains(btn)) return;
        e.preventDefault();
        if (btn.dataset.adminTab) selectAdminTab(btn.dataset.adminTab);
      });
    }
  }

  function openAdmin(initialTab) {
    const modal = document.getElementById("adminModal");
    if (!modal) return;
    const isAdmin = isCurrentUserAdmin();
    const tabs = ADMIN_TABS.filter(t => isAdmin || !t.admin);
    const nav = document.getElementById("adminSidebar");
    const title = document.getElementById("adminTitle");
    if (title) title.textContent = isAdmin ? "Admin" : "Account";
    nav.innerHTML = tabs.map(t =>
      // data-label feeds the CSS width reservation, so the row does not
      // re-flow when the selected label switches to 600 weight.
      `<a href="#admin-${t.id}" class="admin-tab" data-admin-tab="${t.id}" ` +
      `data-label="${esc(t.label)}">${esc(t.label)}</a>`
    ).join("");
    nav.hidden = tabs.length < 2;
    selectAdminTab(tabs.some(t => t.id === initialTab) ? initialTab : tabs[0].id);
    modal.hidden = false;
    adminClear();
  }

  // Bumped on every tab activation. An async renderer captures it before
  // its first await and stops if it no longer matches, so a response that
  // arrives after the user has moved on paints nothing.
  let _adminRenderSeq = 0;
  const adminRenderToken = () => ++_adminRenderSeq;
  const adminRenderStale = (token, root) =>
    token !== _adminRenderSeq || !root || !root.isConnected;

  function selectAdminTab(id) {
    adminRenderToken();
    document.querySelectorAll(".admin-tab").forEach(b => {
      const on = b.dataset.adminTab === id;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    adminClear();
    const addaudit = document.getElementById("adminAddAuditPane");
    const native = document.getElementById("adminNative");
    if (!native) return;
    native.innerHTML = "";
    if (id === "content") {
      if (addaudit) addaudit.hidden = false;
      native.hidden = true;
      fillPromptText();
      refreshLocalBankSummary();
      refreshAuditInboxList().then(renderAuditInbox);
      renderReportsAdminList(_reportFilter);
      loadAndRenderAuditLive();
      return;
    }
    if (addaudit) addaudit.hidden = true;
    native.hidden = false;
    if (id === "bank")    return renderAdminBankTab(native);
    if (id === "users")   return renderAdminUsersTab(native);
    if (id === "account") return renderAdminAccountTab(native);
  }

  // Loading states. Nothing for the first second - a skeleton that
  // flashes for 40ms is worse than no skeleton - then placeholder rows
  // rather than a spinner, so the layout does not jump when data lands.
  function adminLoading(root, rows) {
    // Renderers call this straight after capturing their token, so the
    // current sequence number is theirs. A slow load the user has left
    // behind must not paint placeholder rows over the tab now on screen
    // (#adminNative is shared by every tab).
    const seq = _adminRenderSeq;
    const t = setTimeout(() => {
      if (adminRenderStale(seq, root)) return;
      root.innerHTML = `<div class="admin-skeleton">` +
        Array.from({ length: rows || 3 }, () => `<div class="sk-row"></div>`).join("") +
        `</div>`;
    }, 1000);
    return () => clearTimeout(t);
  }
  // A retry cannot fix a dead session or a revoked admin flag, so those
  // two say what happened and offer no button.
  function adminLoadError(root, what, retry, err) {
    const st = err && err.status, code = err && err.code;
    if (code === "not_admin" || st === 403) {
      root.innerHTML = `<p class="admin-empty" role="alert">${esc(SERVER_ERROR_TEXT.not_admin)}</p>`;
      return;
    }
    if (st === 401) {
      root.innerHTML = `<p class="admin-empty" role="alert">${esc(SERVER_ERROR_TEXT.session_expired)}</p>`;
      onSessionExpired("admin: " + what);
      return;
    }
    root.innerHTML = `<p class="admin-empty" role="alert">Couldn't load ${esc(what)}. ` +
      `<button type="button" class="link-btn" data-admin-retry>Try again</button></p>`;
    const b = root.querySelector("[data-admin-retry]");
    if (b) b.onclick = retry;
  }

  // ── Bank ───────────────────────────────────────────────────────────
  // No stat tiles and no charts: a bare number has no answer to "is
  // that good?", and a bar chart of six integers is decoration. One
  // table with Target and Gap answers the question the numbers exist
  // to answer.
  async function renderAdminBankTab(root) {
    const token = _adminRenderSeq;
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const byTopic = {};
    const grid = {};
    (state.questions || []).forEach(q => {
      const d = q.difficulty;
      if (d >= 1 && d <= 5) counts[d]++;
      byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
      grid[q.topic] = grid[q.topic] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      if (d >= 1 && d <= 5) grid[q.topic][d]++;
    });
    const total = (state.questions || []).length;
    const meta = state.meta || {};
    const reportsOpen = (state.reports || []).filter(r => (r.status || "open") === "open").length;
    const inboxCount = (state.inboxManifest && state.inboxManifest.inbox && state.inboxManifest.inbox.length) || 0;
    // The 2026-06-01 overhaul's intended shape. Gap is what to act on.
    const TARGET = { 1: 1, 2: 20, 3: 40, 4: 18, 5: 6 };
    const TOPICS = ["Paediatrics", "Obstetrics & Gynaecology", "Psychiatry", "Medicine"];
    const pc = n => total ? (100 * n / total) : 0;

    const body = TOPICS.map(t => {
      const g = grid[t] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      return `<tr><th scope="row">${esc(t)}</th>` +
        [1, 2, 3, 4, 5].map(d => `<td>${fmtNum(g[d])}</td>`).join("") +
        `<td class="num-strong">${fmtNum(byTopic[t] || 0)}</td></tr>`;
    }).join("");
    const totalsRow = `<tr class="tr-total"><th scope="row">All</th>` +
      [1, 2, 3, 4, 5].map(d => `<td>${fmtNum(counts[d])}</td>`).join("") +
      `<td class="num-strong">${fmtNum(total)}</td></tr>`;
    const shareRow = `<tr class="tr-quiet"><th scope="row">Share</th>` +
      [1, 2, 3, 4, 5].map(d => `<td>${pc(counts[d]).toFixed(1)}%</td>`).join("") +
      `<td></td></tr>`;
    const targetRow = `<tr class="tr-quiet"><th scope="row">Target</th>` +
      [1, 2, 3, 4, 5].map(d => `<td>${TARGET[d]}%</td>`).join("") + `<td></td></tr>`;
    const gapRow = `<tr class="tr-quiet"><th scope="row">Gap</th>` +
      [1, 2, 3, 4, 5].map(d => {
        const g = pc(counts[d]) - TARGET[d];
        const cls = Math.abs(g) >= 8 ? ' class="gap-wide"' : "";
        return `<td${cls}>${g > 0 ? "+" : ""}${g.toFixed(1)}</td>`;
      }).join("") + `<td></td></tr>`;

    // What the student's pool line leaves out: files that failed this
    // load and questions dropped as unservable or shadowed by a reused id.
    const bl = state.batchLoadStats || {};
    const loadFacts = [
      bl.failed ? `<b>${fmtNum(bl.failed)}</b> of ${plural(bl.total, "bank file")} failed to load this time.` : "",
      bl.invalid ? `<b>${fmtNum(bl.invalid)}</b> malformed ${bl.invalid === 1 ? "question" : "questions"} skipped.` : "",
      bl.shadowed ? `<b>${fmtNum(bl.shadowed)}</b> duplicate ${bl.shadowed === 1 ? "id" : "ids"} hidden behind an earlier copy.` : "",
    ].join(" ");

    root.innerHTML = `
      <div class="admin-pane">
        <p class="admin-fact">${plural(total, "question")}.
          Last added ${esc(String(meta.last_added || meta.updated || "unknown"))}.
          ${reportsOpen ? `<b>${fmtNum(reportsOpen)}</b> open ${reportsOpen === 1 ? "report" : "reports"}.` : "No open reports."}
          ${inboxCount ? `<b>${fmtNum(inboxCount)}</b> ${inboxCount === 1 ? "batch" : "batches"} in the inbox.` : ""}
          ${loadFacts}</p>

        <section class="admin-pane-section">
          <h3>Difficulty by module</h3>
          <table class="admin-table admin-table-num">
            <thead><tr><th scope="col">Module</th>
              <th scope="col">1</th><th scope="col">2</th><th scope="col">3</th>
              <th scope="col">4</th><th scope="col">5</th>
              <th scope="col">Total</th></tr></thead>
            <tbody>${body}${totalsRow}${shareRow}${targetRow}${gapRow}</tbody>
          </table>
          <p class="admin-note">Gap is percentage points against the target
            set by the 2026-06-01 overhaul. Anything beyond eight points is
            marked.</p>
        </section>

        <section class="admin-pane-section" id="bankQuality">
          <h3>Answer quality</h3>
        </section>
      </div>`;

    const qRoot = document.getElementById("bankQuality");
    const stop = adminLoading(qRoot.appendChild(document.createElement("div")), 4);
    let q = null;
    try { q = await apiFetch("/api/admin/quality"); }
    catch (e) {
      stop();
      console.warn("[admin] /api/admin/quality failed:", e && e.status, e && (e.serverError || e.message));
      if (adminRenderStale(token, qRoot)) return;
      const box = qRoot.querySelector(".admin-skeleton") || qRoot.appendChild(document.createElement("div"));
      box.outerHTML = "";
      return adminLoadError(qRoot, "answer quality", () => renderAdminBankTab(root), e);
    }
    stop();
    if (adminRenderStale(token, qRoot)) return;
    const totals = (q && q.totals) || {};
    const rows = arr => (arr || []).slice(0, 25).map(r => {
      const pct = r.n ? Math.round((100 * (r.c || 0)) / r.n) : 0;
      return `<tr><th scope="row" class="mono-id">${esc(r.question_id)}</th>` +
             `<td>${r.n}</td><td>${pct}%</td></tr>`;
    }).join("");
    const worst = rows(q && q.worst);
    const top = rows(q && q.top);
    qRoot.innerHTML = `
      <h3>Answer quality</h3>
      <p class="admin-fact">${plural(totals.users || 0, "person", "people")},
        ${plural(totals.answers || 0, "answer")} across
        ${plural(totals.qs || 0, "question")}.</p>
      <h4>Lowest correct rate</h4>
      ${worst ? `<table class="admin-table admin-table-num"><thead><tr>
          <th scope="col">Question</th><th scope="col">Answers</th><th scope="col">Correct</th>
        </tr></thead><tbody>${worst}</tbody></table>`
        : `<p class="admin-empty">Nothing with five or more answers yet. This fills in as people use the bank.</p>`}
      <h4>Most answered</h4>
      ${top ? `<table class="admin-table admin-table-num"><thead><tr>
          <th scope="col">Question</th><th scope="col">Answers</th><th scope="col">Correct</th>
        </tr></thead><tbody>${top}</tbody></table>`
        : `<p class="admin-empty">No answers recorded yet.</p>`}`;
  }

  // ── Users ──────────────────────────────────────────────────────────
  // Action buttons are always visible and carry the person's name in a
  // visually hidden span, so a screen reader hears "Remove admin for
  // Jane Smith" rather than "Remove admin".
  function relTime(ts) {
    if (!ts) return { text: "never", title: "" };
    const then = ts * 1000;
    const days = Math.floor((Date.now() - then) / 86400000);
    const text = days <= 0 ? "today" : days === 1 ? "yesterday"
      : days < 30 ? `${days} days ago`
      : days < 365 ? `${plural(Math.floor(days / 30), "month")} ago`
      : `${plural(Math.floor(days / 365), "year")} ago`;
    return { text, title: new Date(then).toLocaleString("en-AU") };
  }

  async function renderAdminUsersTab(root) {
    const token = _adminRenderSeq;
    const stop = adminLoading(root, 4);
    let users = [];
    try {
      const r = await apiFetch("/api/admin/users");
      users = (r && r.users) || [];
    } catch (e) {
      stop();
      console.warn("[admin] /api/admin/users failed:", e && e.status, e && (e.serverError || e.message));
      if (adminRenderStale(token, root)) return;
      return adminLoadError(root, "the user list", () => renderAdminUsersTab(root), e);
    }
    stop();
    if (adminRenderStale(token, root)) return;

    const meId = cloudUser && cloudUser.id;
    const adminCount = users.filter(u => u.is_admin).length;
    const rows = users.map(u => {
      const isSelf = u.id === meId;
      const name = u.display_name || (u.email || "").split("@")[0] || "(no name)";
      const seen = relTime(u.last_seen_at);
      const joined = u.created_at
        ? new Date(u.created_at * 1000).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
        : "-";
      let actions;
      if (isSelf) {
        actions = `<span class="admin-noact">Use the Account tab</span>`;
      } else if (u.is_admin && adminCount <= 1) {
        actions = `<span class="admin-noact">Last admin</span>`;
      } else {
        const roleBtn = u.is_admin
          ? `<button type="button" class="row-act" data-act="demote" data-id="${esc(u.id)}" data-name="${esc(name)}">Remove admin<span class="visually-hidden"> for ${esc(name)}</span></button>`
          : `<button type="button" class="row-act" data-act="promote" data-id="${esc(u.id)}" data-name="${esc(name)}">Make admin<span class="visually-hidden"> for ${esc(name)}</span></button>`;
        actions = roleBtn +
          `<button type="button" class="row-act danger" data-act="delete" data-id="${esc(u.id)}" data-name="${esc(name)}" data-email="${esc(u.email || "")}" data-answers="${u.answers || 0}">Delete<span class="visually-hidden"> ${esc(name)}</span></button>`;
      }
      return `<tr${isSelf ? ' class="is-self"' : ""}>
        <th scope="row">${esc(name)}${isSelf ? ' <span class="admin-you">you</span>' : ""}</th>
        <td class="cell-email">${esc(u.email || "")}</td>
        <td>${u.is_admin ? "Admin" : "Student"}</td>
        <td>${esc(joined)}</td>
        <td${seen.title ? ` title="${esc(seen.title)}"` : ""}>${esc(seen.text)}</td>
        <td class="num">${u.answers || 0}</td>
        <td class="cell-actions">${actions}</td>
      </tr>`;
    }).join("");

    root.innerHTML = `
      <div class="admin-pane">
        <p class="admin-fact">${plural(users.length, "account")},
          ${plural(adminCount, "admin")}.</p>
        ${users.length ? `
        <div class="admin-table-scroll">
          <table class="admin-table admin-users">
            <thead><tr>
              <th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th>
              <th scope="col">Joined</th><th scope="col">Last seen</th>
              <th scope="col" class="num">Questions</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="admin-note">Questions counts distinct questions answered,
          not attempts.</p>` :
        `<p class="admin-empty">No accounts yet. Issue an invite code below and
          the person appears here once they sign up.</p>`}

        <section class="admin-pane-section" id="inviteSection">
          <h3>Invite codes</h3>
        </section>
      </div>`;

    root.querySelectorAll("[data-act]").forEach(btn => {
      btn.onclick = () => onUserAction(btn, root);
    });
    renderInvites(document.getElementById("inviteSection"), root);
  }

  async function onUserAction(btn, root) {
    const { act, id, name } = btn.dataset;
    const email = btn.dataset.email || "";
    const answers = parseInt(btn.dataset.answers || "0", 10);
    const run = async (path, ok, undo) => {
      btn.disabled = true;
      const busy = { promote: "Making admin…", demote: "Removing admin…", delete: "Deleting…" }[act];
      const slow = setTimeout(() => { if (busy) btn.textContent = busy; }, 1000);
      try {
        await apiFetch(path, { method: "POST" });
        clearTimeout(slow);
        adminSay("ok", ok, undo);
        await renderAdminUsersTab(root);
      } catch (e) {
        clearTimeout(slow);
        btn.disabled = false;
        // Nothing was optimistic, so the row is still correct as shown.
        adminSay("error", e.message || String(e));
      }
    };

    if (act === "promote" || act === "demote") {
      // Instantly reversible, so no dialog. Undo is offered instead.
      const to = act === "promote" ? "promote" : "demote";
      const back = act === "promote" ? "demote" : "promote";
      return run(`/api/admin/users/${encodeURIComponent(id)}/${to}`,
        act === "promote" ? `${name} is now an admin.` : `${name} is no longer an admin.`,
        () => apiFetch(`/api/admin/users/${encodeURIComponent(id)}/${back}`, { method: "POST" })
          .then(() => {
            adminSay("ok", act === "promote" ? `${name} is no longer an admin.` : `${name} is an admin again.`);
            renderAdminUsersTab(root);
          })
          .catch(e => adminSay("error", e.message || String(e))));
    }

    if (act === "delete") {
      const okd = await adminConfirm({
        title: `Delete ${name}'s account?`,
        body: `This permanently deletes ${email} and ${plural(answers, "saved answer")}. It cannot be undone.`,
        confirmLabel: `Delete ${email} permanently`,
        typeToMatch: email,
        typeLabel: `Type ${email} to confirm`,
      });
      if (!okd) return;
      // No undo offered, because there is none.
      return run(`/api/admin/users/${encodeURIComponent(id)}/delete`,
        `Deleted ${email} and ${plural(answers, "answer")}.`);
    }
  }

  // ── Invite codes ───────────────────────────────────────────────────
  // Registration is invite-only, so this is the only way to let someone
  // in. The plaintext code exists exactly once, in the response to the
  // create call, so it is shown until dismissed rather than flashed.

  // A code the admin has just created. renderInvites() rebuilds the whole
  // section straight after a create, so the code is held here and
  // repainted rather than wiped before anyone can read it.
  let freshInvite = null;

  function freshInviteHtml() {
    if (!freshInvite) return "";
    const link = inviteLink(freshInvite.code, freshInvite.email);
    const who = freshInvite.label || freshInvite.email;
    return `<div class="invite-fresh">
      <p>New invite${who ? ` for ${esc(who)}` : ""}. The link opens the sign-up form with the code filled in, and works once.</p>
      <div class="invite-code-row">
        <code>${esc(freshInvite.code)}</code>
        <button type="button" class="secondary" data-copy="${esc(link)}">Copy link</button>
        <a class="secondary invite-mail" href="${esc(inviteMailto(link, freshInvite))}">Email it</a>
        <button type="button" class="link-btn" data-copy="${esc(freshInvite.code)}">Copy code</button>
        <button type="button" class="link-btn" id="inviteFreshDismiss">Dismiss</button>
      </div></div>`;
  }

  // Opens the admin's own mail app with the invite written, so it comes
  // from an address the recipient knows rather than a no-reply sender.
  function inviteMailto(link, inv) {
    const days = inv.expiresDays;
    const body = [
      "Hi,",
      "",
      "Here's an invite to A to E, the practice MCQ bank. Open this link to set up your account:",
      "",
      link,
      "",
      `It works once${days ? ` and expires in ${plural(days, "day")}` : ""}.`,
    ].join("\n");
    return `mailto:${encodeURIComponent(inv.email || "").replace(/%40/g, "@")}` +
      `?subject=${encodeURIComponent("Your A to E invite")}&body=${encodeURIComponent(body)}`;
  }

  async function renderInvites(root, usersRoot) {
    if (!root) return;
    const token = _adminRenderSeq;
    const head = `<h3>Invite codes</h3>
      <p class="admin-fact">Registration is invite only. A code works once.</p>
      <form class="invite-new" id="inviteNew">
        <label>For <input id="inviteLabel" type="text" maxlength="80" placeholder="name or note" /></label>
        <label>Email <input id="inviteEmail" type="email" maxlength="200" autocomplete="off" placeholder="optional" /></label>
        <label>Expires in
          <select id="inviteDays">
            <option value="7">7 days</option>
            <option value="30" selected>30 days</option>
            <option value="90">90 days</option>
            <option value="365">a year</option>
          </select></label>
        <button type="submit" class="primary">Create invite</button>
      </form>
      <div id="inviteFresh">${freshInviteHtml()}</div>`;
    root.innerHTML = head + `<div id="inviteList"></div>`;
    const list = document.getElementById("inviteList");
    const stop = adminLoading(list, 2);
    let invites = [];
    try {
      const r = await apiFetch("/api/admin/invites");
      // A revoked code is gone as far as this panel is concerned. The
      // server stops sending them; this also covers a worker that has
      // not been redeployed yet.
      invites = ((r && r.invites) || []).filter(i => !i.revoked_at);
    } catch (e) {
      stop();
      console.warn("[admin] /api/admin/invites failed:", e && e.status, e && (e.serverError || e.message));
      if (adminRenderStale(token, list)) return;
      return adminLoadError(list, "invite codes", () => renderInvites(root, usersRoot), e);
    }
    stop();
    if (adminRenderStale(token, list)) return;
    const now = Math.floor(Date.now() / 1000);
    const statusOf = i => i.used_at ? `Used by ${i.used_by_name || "someone"}`
      : (i.expires_at && i.expires_at < now) ? "Expired"
      : "Unused";
    const rows = invites.map(i => {
      const st = statusOf(i);
      // A live code comes back in full; a spent one, and any code issued
      // before codes were stored recoverably, has only its hint.
      const cell = i.code
        ? `<code>${esc(i.code)}</code>` +
          `<button type="button" class="row-act" data-copy="${esc(inviteLink(i.code))}">Copy link</button>`
        : `${esc(i.code_hint)}...` + (st === "Unused"
            ? `<button type="button" class="row-act" data-reissue="${esc(i.code_hash)}"` +
              ` data-label="${esc(i.label || "")}">Reissue</button>` : "");
      return `<tr class="${st === "Unused" ? "" : "is-spent"}">
        <th scope="row" class="mono-id cell-code">${cell}</th>
        <td>${esc(i.label || "")}</td>
        <td>${esc(st)}</td>
        <td>${i.expires_at ? esc(new Date(i.expires_at * 1000).toLocaleDateString("en-AU", { day: "numeric", month: "short" })) : "-"}</td>
        <td class="cell-actions">${st === "Unused"
          ? `<button type="button" class="row-act danger" data-revoke="${esc(i.code_hash)}">Revoke<span class="visually-hidden"> code ${esc(i.code_hint)}</span></button>`
          : ""}</td></tr>`;
    }).join("");
    list.innerHTML = invites.length ? `
      <div class="admin-table-scroll">
        <table class="admin-table">
          <thead><tr><th scope="col">Code</th><th scope="col">For</th>
            <th scope="col">Status</th><th scope="col">Expires</th>
            <th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
      : `<p class="admin-empty">No codes yet. Create one to let someone sign up.</p>`;

    const inviteForm = root.querySelector("#inviteNew");
    if (!inviteForm) return;
    inviteForm.onsubmit = async e => {
      e.preventDefault();
      const btn = e.target.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        const r = await apiFetch("/api/admin/invites", {
          method: "POST",
          body: JSON.stringify({
            label: document.getElementById("inviteLabel").value,
            expires_days: parseInt(document.getElementById("inviteDays").value, 10),
          }),
        });
        freshInvite = {
          code: r.code,
          label: document.getElementById("inviteLabel").value.trim(),
          email: document.getElementById("inviteEmail").value.trim(),
          expiresDays: parseInt(document.getElementById("inviteDays").value, 10),
        };
        document.getElementById("inviteLabel").value = "";
        document.getElementById("inviteEmail").value = "";
        renderInvites(root, usersRoot);
      } catch (err) {
        adminSay("error", err.message || String(err));
      } finally { btn.disabled = false; }
    };

    root.querySelectorAll("[data-copy]").forEach(b => {
      b.onclick = () => {
        const code = b.dataset.copy;
        const done = () => {
          const was = b.textContent;
          b.textContent = "Copied";
          setTimeout(() => { b.textContent = was; }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(done).catch(() =>
            adminSay("error", `Couldn't reach the clipboard. Copy it from here: ${code}`));
        } else {
          adminSay("error", `Couldn't reach the clipboard. Copy it from here: ${code}`);
        }
      };
    });
    const dismiss = document.getElementById("inviteFreshDismiss");
    if (dismiss) dismiss.onclick = () => { freshInvite = null; renderInvites(root, usersRoot); };

    // Codes issued before the server kept a readable copy cannot be
    // shown, so the way to get a usable code out of one is to replace
    // it: revoke, then issue a fresh code carrying the same label.
    list.querySelectorAll("[data-reissue]").forEach(b => {
      b.onclick = async () => {
        b.disabled = true;
        try {
          await apiFetch("/api/admin/invites/revoke", {
            method: "POST", body: JSON.stringify({ code_hash: b.dataset.reissue }),
          });
          const r = await apiFetch("/api/admin/invites", {
            method: "POST",
            body: JSON.stringify({ label: b.dataset.label || "", expires_days: 30 }),
          });
          freshInvite = { code: r.code, label: b.dataset.label || "", expiresDays: 30 };
          adminSay("ok", "Old code revoked, new one issued.");
          renderInvites(root, usersRoot);
        } catch (err) {
          b.disabled = false;
          adminSay("error", err.message || String(err));
        }
      };
    });

    list.querySelectorAll("[data-revoke]").forEach(b => {
      b.onclick = async () => {
        b.disabled = true;
        try {
          await apiFetch("/api/admin/invites/revoke", {
            method: "POST", body: JSON.stringify({ code_hash: b.dataset.revoke }),
          });
          adminSay("ok", "Code revoked.");
          renderInvites(root, usersRoot);
        } catch (e) { b.disabled = false; adminSay("error", e.message || String(e)); }
      };
    });
  }

  function renderAdminAccountTab(root) {
    if (!cloudUser) {
      root.innerHTML = `<p class="dim">Sign in to manage your account.</p>`;
      return;
    }
    root.innerHTML = `
      <div class="admin-pane">
      <p class="admin-fact">${esc(cloudUser.display_name || cloudUser.email)} ·
        ${esc(cloudUser.email)}${cloudUser.is_admin ? ' · admin' : ''}</p>

      <section class="admin-pane-section">
        <h3>Change password</h3>
        <form id="pwForm" class="admin-form" autocomplete="on" novalidate>
          <label>Current password
            <input id="pwCurrent" type="password" required autocomplete="current-password" /></label>
          <label>New password
            <input id="pwNew" type="password" required minlength="8" autocomplete="new-password" /></label>
          <label>Confirm new password
            <input id="pwNew2" type="password" required minlength="8" autocomplete="new-password" /></label>
          <button type="submit" class="primary">Change password</button>
        </form>
        <p class="admin-note">Changing your password signs out every other
          device. This tab stays signed in.</p>
      </section>

      <section class="admin-pane-section">
        <h3>Sessions</h3>
        <p class="admin-note">If you have signed in somewhere you no longer
          control, end those sessions. Your current one is kept.</p>
        <button type="button" class="secondary" id="revokeSessions">Sign out everywhere else</button>
      </section>

      <section class="admin-pane-section account-self-delete">
        <h3>Delete this account</h3>
        <p class="admin-note">Every answer, flag and setting goes with it. This cannot be undone.</p>
        <button type="button" class="danger-btn" id="acctSelfDeleteOpen">Delete my account</button>
      </section>
      </div>`;

    document.getElementById("pwForm").onsubmit = async e => {
      e.preventDefault();
      const cur = document.getElementById("pwCurrent").value;
      const a = document.getElementById("pwNew").value;
      const b = document.getElementById("pwNew2").value;
      if (!cur) return adminSay("error", "Enter your current password.");
      if (a.length < 8) return adminSay("error", SERVER_ERROR_TEXT.password_short);
      if (a !== b) return adminSay("error", "The new passwords don't match.");
      if (a === cur) return adminSay("error", "The new password is the same as the current one.");
      const btn = e.target.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        const r = await apiFetch("/api/password", {
          method: "POST",
          body: JSON.stringify({ current_password: cur, new_password: a }),
        });
        // The server revoked every session including this one and issued
        // a replacement, so swap the stored token or the next call 401s.
        if (r && r.token) { authToken = r.token; localStorage.setItem(AUTH_TOKEN_KEY, r.token); }
        e.target.reset();
        adminSay("ok", "Password changed. Every other device has been signed out.");
      } catch (err) {
        adminSay("error", err.message || String(err));
      } finally { btn.disabled = false; }
    };

    document.getElementById("revokeSessions").onclick = async ev => {
      const okd = await adminConfirm({
        title: "Sign out everywhere else?",
        body: "Every other signed-in device will have to sign in again. " +
              "This device stays signed in.",
        confirmLabel: "Sign out other devices",
      });
      if (!okd) return;
      ev.target.disabled = true;
      try {
        const r = await apiFetch("/api/account/sessions/revoke", { method: "POST" });
        adminSay("ok", r && r.revoked
          ? `Signed out ${r.revoked} other ${r.revoked === 1 ? "session" : "sessions"}.`
          : "No other sessions were active.");
      } catch (err) {
        adminSay("error", err.message || String(err));
      } finally { ev.target.disabled = false; }
    };
    // Same confirmation as an admin deleting someone else: the shared
    // dialog, with the email typed out.
    const goBtn = document.getElementById("acctSelfDeleteOpen");
    if (goBtn) {
      goBtn.onclick = async () => {
        const email = (cloudUser && cloudUser.email) || "";
        // A start from the cached account may not know the email yet.
        if (!email) return adminSay("error", "Your account details haven't loaded yet. Reload, then try again.");
        const okd = await adminConfirm({
          title: "Delete your account?",
          body: `Every answer, flag and setting on ${email} is deleted, here and on the server. This cannot be undone.`,
          confirmLabel: "Delete my account",
          typeToMatch: email,
          typeLabel: `Type ${email} to confirm`,
        });
        if (!okd) return;
        goBtn.disabled = true;
        adminSay("ok", "Deleting…");
        try {
          await apiFetch("/api/account/delete", { method: "POST" });
          adminSay("ok", "Account deleted. Reloading…");
          // The dialog promises every answer, flag and setting goes with
          // the account. The server copy has; remove this device's copy
          // too, and the cached name, which the next guest here would
          // otherwise see in the masthead.
          const suffix = cloudUser ? `.cloud-${cloudUser.id}` : null;
          if (suffix) {
            const doomed = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith("y4mcq.") && k.endsWith(suffix)) doomed.push(k);
            }
            doomed.forEach(k => localStorage.removeItem(k));
            console.info(`[account] deleted; removed ${doomed.length} local key(s) for ${suffix.slice(1)}`);
          }
          localStorage.removeItem(CHROME_KEY);
          cloudSignOut();
          setTimeout(() => location.reload(), 600);
        } catch (e) {
          console.warn("[account] /api/account/delete failed:", e && e.status, e && e.code, e && e.serverError);
          adminSay("error", `Not deleted. ${(e && e.message) || SERVER_UNREACHABLE}`);
          goBtn.disabled = false;
        }
      };
    }
  }

  function formatDuration(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h) return m ? `${h} h ${m} min` : `${h} h`;
    if (m) return `${m} min`;
    return `${s} s`;
  }
  // Stats answer "where am I weak?", not "how much have I done?": a few
  // facts in a sentence, then each table weakest first, with bars that
  // show accuracy (the number printed beside them).
  function renderStats() {
    const body = document.getElementById("statsBody");
    if (!body) return;
    const history = state.history || {};
    const ids = Object.keys(history);
    const bankById = {}; (state.questions || []).forEach(q => { bankById[q.id] = q; });

    // `lastCorrect` is the only correctness the server round-trips, so this
    // is last-attempt accuracy, not first-attempt.
    let answered = 0, lastAttemptCorrect = 0, totalMs = 0, timedCount = 0;
    const byTopic = {};
    const byDiff = {};
    const byCell = {};
    let lastAt = 0;
    const tally = (map, k, ok) => { const e = map[k] = map[k] || { n: 0, correct: 0 }; e.n++; if (ok) e.correct++; };
    for (const id of ids) {
      const h = history[id]; if (!h || !h.count) continue;
      const q = bankById[id]; if (!q) continue;
      answered++;
      if (h.lastCorrect) lastAttemptCorrect++;
      // Answers recorded before timing existed carry no time_ms_total;
      // counting them would drag the average toward zero.
      if (h.time_ms_total && h.time_ms_total > 0) {
        totalMs += h.time_ms_total;
        timedCount++;
      }
      if ((h.last_at || 0) > lastAt) lastAt = h.last_at || 0;
      const t = q.topic || "Other";
      tally(byTopic, t, h.lastCorrect);
      tally(byDiff, `${q.difficulty} / 5`, h.lastCorrect);
      tally(byCell, `${t} at ${q.difficulty} / 5`, h.lastCorrect);
    }
    const total = (state.questions || []).length;
    const pctOf = e => e.n ? Math.round((e.correct / e.n) * 100) : 0;
    const overall = pctOf({ n: answered, correct: lastAttemptCorrect });

    if (!answered) {
      body.innerHTML = `<p class="stats-empty">Nothing answered yet. Accuracy by discipline and difficulty shows here after your first few questions.</p>`;
      return;
    }

    // Below this many answers a percentage says more about luck than
    // about the student, so those rows sink to the bottom, dimmed.
    const FEW = 5;
    const sorted = map => Object.keys(map).sort((a, b) => {
      const A = map[a], B = map[b];
      const fa = A.n < FEW, fb = B.n < FEW;
      if (fa !== fb) return fa ? 1 : -1;
      return pctOf(A) - pctOf(B) || B.n - A.n || a.localeCompare(b);
    });
    const rows = map => sorted(map).map(k => {
      const e = map[k], pct = pctOf(e), few = e.n < FEW ? " stats-few" : "";
      return `
          <div class="stats-label${few}">${esc(k)}</div>
          <div class="stats-count${few}">${fmtNum(e.correct)} of ${fmtNum(e.n)}</div>
          <div class="stats-bar-wrap${few}"><span style="width:${pct}%"></span></div>
          <div class="stats-pct-cell${few}">${pct}%</div>`;
    }).join("");

    const facts = [`${fmtNum(answered)} of ${plural(total, "question")} answered, ${overall}% right on the last attempt.`];
    // The weakest discipline-and-difficulty pair with enough answers to
    // mean something, named only when it is below the overall rate.
    const cells = Object.keys(byCell).filter(k => byCell[k].n >= 10)
      .sort((a, b) => pctOf(byCell[a]) - pctOf(byCell[b]) || byCell[b].n - byCell[a].n);
    if (cells.length && pctOf(byCell[cells[0]]) < overall) {
      const w = byCell[cells[0]];
      facts.push(`Weakest: ${esc(cells[0])}, ${pctOf(w)}% over ${plural(w.n, "question")}.`);
    }
    if (timedCount) {
      facts.push(`About ${formatDuration(totalMs / timedCount)} a question, ${formatDuration(totalMs)} in all.`);
    }
    if (lastAt) {
      const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(lastAt).setHours(0, 0, 0, 0)) / 86400000);
      facts.push(`Last studied ${days <= 0 ? "today" : days === 1 ? "yesterday"
        : fmtDate(lastAt, new Date(lastAt).getFullYear() !== new Date().getFullYear())}.`);
    }
    const pending = cloudUser ? Object.keys(outboxRead().answers).length : 0;
    if (pending) facts.push(`${plural(pending, "answer")} on this device not yet synced.`);

    body.innerHTML = `
      <p class="stats-facts">${facts.join(" ")}</p>
      <div class="stats-section">
        <h3>By discipline</h3>
        <div class="stats-table">${rows(byTopic)}</div>
      </div>
      <div class="stats-section">
        <h3>By difficulty</h3>
        <div class="stats-table">${rows(byDiff)}</div>
      </div>`;
  }

  // Files settled out of files requested, for the boot loading line. The
  // total is only final once the manifests are in (`listed`).
  const bankProgress = { done: 0, total: 0, listed: false };
  async function loadData() {
    // Data files don't carry the CSS/JS cache-bust string, so meta.json
    // (fetched fresh) supplies the key for everything downstream: a
    // routine push then reaches students without a code release.
    const metaPre = await fetchJson("data/meta.json?t=" + Date.now()).catch(() => ({}));
    // `last_added` is part of the key because a routine push can bump only
    // that field; keyed on `updated` alone, the manifest would stay
    // cached under the same URL all day.
    const v = metaPre && metaPre.updated
      ? (String(metaPre.updated) + (metaPre.last_added ? "-" + String(metaPre.last_added) : "")).replace(/[^0-9-]/g, "")
      : String(Math.floor(Date.now()/3600000));
    const bust = "?v=" + v;
    // Every bank source is counted the same way. A fetch that fails, a body
    // that is not JSON, and a body that is valid JSON but not an array all
    // mean "this file contributed nothing", and all of them have to reach
    // the count the home screen shows. A manifest that fails hides every
    // batch it lists, so it counts too. Anything that is not an array
    // becomes [], or the spread below would throw and leave the page
    // blank.
    let srcTotal = 0, srcFailed = 0;
    bankProgress.done = 0; bankProgress.listed = false;
    const settled = () => { bankProgress.done++; bankProgress.total = srcTotal; };
    const pullArray = (p) => {
      srcTotal++;
      return fetchJson(p).then(
        d => { settled(); if (Array.isArray(d)) return d; srcFailed++; return []; },
        () => { settled(); srcFailed++; return []; }
      );
    };
    // Per-file content hashes from batches_manifest.json `hashes`
    // ({path: sha1 prefix}, written by scripts/manifest_hashes.py). A
    // batch with a hash is keyed on it, so a release that bumps `updated`
    // does not re-download every unchanged file. A batch
    // with no hash (one the worker appended, say) falls back to `bust`.
    let batchHashes = {};
    const batchUrl = p => {
      const h = batchHashes[p];
      return "data/" + p + (typeof h === "string" && /^[0-9a-f]{6,64}$/.test(h) ? "?h=" + h : bust);
    };
    const pullManifest = (p, key) => {
      srcTotal++;
      return fetchJson(p).then(
        d => {
          settled();
          if (d && d.hashes && typeof d.hashes === "object" && !Array.isArray(d.hashes)) {
            batchHashes = Object.assign({}, batchHashes, d.hashes);
          }
          const list = d && d[key];
          if (Array.isArray(list)) return list;
          srcFailed++; return [];
        },
        () => { settled(); srcFailed++; return []; }
      );
    };
    const [paeds, obgyn, psych, medicine, ranges, meta, batchPaths, inboxPaths, reportsFile] = await Promise.all([
      pullArray("data/questions_paeds.json" + bust),
      pullArray("data/questions_obgyn.json" + bust),
      pullArray("data/questions_psych.json" + bust),
      pullArray("data/questions_medicine.json" + bust),
      fetchJson("data/reference_ranges.json" + bust).catch(() => null),
      Promise.resolve(metaPre),
      pullManifest("data/batches_manifest.json" + bust, "batches"),
      pullManifest("data/inbox_manifest.json" + bust, "inbox"),
      fetchJson("data/reports.json" + bust).catch(() => ({ reports: [] })),
    ]);
    state.reports = (reportsFile && reportsFile.reports) || [];

    // Pull every staging batch listed in the manifests. Each is its own
    // JSON array of question objects matching the live schema.
    const allPaths = [...batchPaths, ...inboxPaths];
    const extraReq = allPaths.map(p => pullArray(batchUrl(p)));
    bankProgress.total = srcTotal;
    bankProgress.listed = true;
    const extra = await Promise.all(extraReq);
    const extraQuestions = extra.flat();
    // Read by the Bank tab's inbox count.
    state.inboxManifest = { inbox: inboxPaths };
    // Per-file view of the live bank for the admin Content tab: the same
    // arrays, not a second download or copy.
    state.bankFiles = [
      { path: "data/questions_paeds.json",    questions: paeds },
      { path: "data/questions_obgyn.json",    questions: obgyn },
      { path: "data/questions_psych.json",    questions: psych },
      { path: "data/questions_medicine.json", questions: medicine },
      ...batchPaths.map((p, i) => ({ path: "data/" + p, questions: extra[i] })),
    ];
    state.batchLoadStats = { total: srcTotal, failed: srcFailed };
    if (srcFailed > 0) {
      console.warn(`[a-to-e] ${srcFailed} of ${srcTotal} bank files failed to load`);
    }

    // A question the quiz cannot render or grade is dropped and counted,
    // so the admin sees the number rather than a student meeting an empty
    // quiz screen or a question with no right answer.
    const raw = [...paeds, ...obgyn, ...psych, ...medicine, ...extraQuestions];
    const bad = raw.filter(q => q && q.id && !isServable(q));
    state.bankQuestions = raw.filter(q => !q || !q.id || isServable(q));
    state.batchLoadStats.invalid = bad.length;
    if (bad.length) {
      console.warn(`[a-to-e] ${bad.length} malformed question(s) skipped: ${bad.slice(0, 20).map(q => q.id).join(", ")}`);
    }
    // dedupeById keeps the first copy of an id. A second file reusing a
    // published id is otherwise hidden with nothing said anywhere.
    {
      const seenIds = new Set(), shadowed = [];
      for (const q of state.bankQuestions) {
        if (!q || !q.id) continue;
        if (seenIds.has(q.id)) shadowed.push(q.id); else seenIds.add(q.id);
      }
      state.batchLoadStats.shadowed = shadowed.length;
      if (shadowed.length) {
        console.warn(`[a-to-e] ${shadowed.length} duplicate id(s) hidden behind an earlier copy: ${shadowed.slice(0, 20).join(", ")}`);
      }
    }
    state.ranges = ranges;
    state.meta = meta;
    // The first loadData() runs in parallel with the gate, so it usually
    // finishes before anyone is signed in. The boot path merges the local
    // questions again once the gate resolves; this call covers later
    // reloads, when the identity is already known.
    if (cloudUser || guestUser) mergeLocalQuestions();
    else state.questions = dedupeById(state.bankQuestions);
  }

  // Locally pasted questions live only in this browser's localStorage,
  // per user, and merge into the bank the same way as inbox files.
  // Boot calls this again after the gate: the bank can finish before
  // sign-in does, and until then ns() returns the bare pre-gate key.
  function mergeLocalQuestions() {
    const local = load(ns(LOCAL_QUESTIONS_KEY), []).filter(isServable);
    state.questions = dedupeById([...(state.bankQuestions || []), ...local]);
  }
  // A question outside the four disciplines or the 1-5 scale loads but
  // no filter can ever reach it (getPool matches both exactly), so it is
  // as unservable as one with no stem. The worker (servableProblem) and
  // scripts/bank.py apply the same rule to what they write and count.
  const SERVABLE_TOPICS = ["Paediatrics", "Obstetrics & Gynaecology", "Psychiatry", "Medicine"];
  function isServable(q) {
    return !!(q && q.id && typeof q.stem === "string" &&
      SERVABLE_TOPICS.includes(q.topic) &&
      Number.isInteger(q.difficulty) && q.difficulty >= 1 && q.difficulty <= 5 &&
      Array.isArray(q.options) && q.options.length >= 2 &&
      q.options.every(o => o && typeof o === "object") &&
      q.options.filter(o => o.correct === true).length === 1);
  }
  // Deduplicate by id - if a question is later merged into the main
  // file, the main-file entry wins (it appears first).
  function dedupeById(all) {
    const seen = new Set();
    return all.filter(q => {
      if (!q || !q.id) return false;
      if (seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    });
  }
  // The browser's own HTTP cache, keyed by loadData's ?v= or ?h= on each
  // URL. Boot waits on these before showHome(), so the timer covers the
  // body as well as the headers; a timeout rejects, and the bank loader
  // counts it as a failed file like any other.
  const FETCH_JSON_TIMEOUT_MS = 30000;
  function fetchJson(p) {
    return timedFetch(p, {}, FETCH_JSON_TIMEOUT_MS, r => {
      // A 404 from GitHub Pages serves an HTML page, so r.json() would
      // reject anyway, but a proxy or an error page can return valid JSON
      // of the wrong shape and that must not be mistaken for bank content.
      if (!r.ok) throw new Error(`${r.status} fetching ${p}`);
      return r.json();
    }).catch(e => {
      if (e && e.name === "AbortError") {
        console.warn(`[data] ${p} timed out after ${FETCH_JSON_TIMEOUT_MS / 1000}s`);
        throw new Error(`timed out fetching ${p}`);
      }
      throw e;
    });
  }

  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(THEME_KEY, t);
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(cur === "light" ? "dark" : "light");
  }

  // Written after every resolved sign-in, read before the next one.
  // It also carries the account itself, which is what lets the next boot
  // go straight in without waiting for /api/me (cachedCloudUser).
  function rememberMastheadChrome(chip, nameEl) {
    if (!chip || chip.hidden || !nameEl) return;
    try {
      localStorage.setItem(CHROME_KEY, JSON.stringify({
        name: nameEl.textContent || "",
        profileId: chip.dataset.profileId || "",
        pillStyle: chip.dataset.pillStyle || "",
        admin: document.body.classList.contains("is-admin"),
        cloud: document.body.classList.contains("is-cloud"),
        user: cloudUser ? { id: cloudUser.id, email: cloudUser.email || "",
                            display_name: cloudUser.display_name || "" } : null,
      }));
    } catch (_) { /* private mode: the pop-in is the worst of it */ }
  }

  // Paint that cached identity before the network answers. Only for a
  // visitor who already has a token or a guest id: a signed-out browser
  // must never be shown a name.
  function paintCachedMastheadChrome() {
    let cached = null;
    try {
      if (!localStorage.getItem(AUTH_TOKEN_KEY) && !localStorage.getItem(GUEST_KEY)) return;
      cached = JSON.parse(localStorage.getItem(CHROME_KEY) || "null");
    } catch (_) { return; }
    if (!cached || !cached.name) return;
    const chip = document.getElementById("profileChip");
    const nameEl = document.getElementById("profileName");
    if (!chip || !nameEl) return;
    nameEl.textContent = cached.name;
    if (cached.profileId) chip.dataset.profileId = cached.profileId;
    if (cached.pillStyle) chip.dataset.pillStyle = cached.pillStyle;
    chip.hidden = false;
    document.body.classList.toggle("is-admin", !!cached.admin);
    document.body.classList.toggle("is-cloud", !!cached.cloud);
  }

  // The name pill is neutral for everyone. Gold is the one pill with a
  // meaning (admin), so no other pill takes a colour.
  function paintProfileChip() {
    const chip = document.getElementById("profileChip");
    const nameEl = document.getElementById("profileName");
    if (!chip || !nameEl) return;
    if (cloudUser) {
      chip.hidden = false;
      chip.dataset.profileId = "cloud-" + cloudUser.id;
      if (cloudUser.is_admin) chip.dataset.pillStyle = "gold";
      else delete chip.dataset.pillStyle;
      nameEl.textContent = cloudUser.display_name || cloudUser.email;
    } else if (guestUser) {
      chip.hidden = false;
      chip.dataset.profileId = "guest";
      delete chip.dataset.pillStyle;
      nameEl.textContent = "Guest";
    }
    refreshAdminBodyClass();
    rememberMastheadChrome(chip, nameEl);
  }

  function wireMasthead() {
    document.getElementById("rangesBtn").onclick = () => toggleRefs();
    document.getElementById("themeBtn").onclick = toggleTheme;
    const goHome = e => {
      if (e) e.preventDefault();
      leaveSession();
    };
    const brand = document.querySelector(".masthead .brand");
    if (brand) brand.onclick = goHome;
    paintProfileChip();
    const signOutBtn = document.getElementById("signOutBtn");
    if (signOutBtn) {
      const isGuest = guestUser && !cloudUser;
      if (isGuest) {
        signOutBtn.textContent = "create account";
        signOutBtn.title = "Your guest answers and flags move into the new account";
      }
      signOutBtn.onclick = async e => {
        e.stopPropagation();
        if (isGuest) {
          // Reload into the gate's signup pane WITHOUT clearing the
          // guest token. passGate will see the SIGNUP_INTENT flag and
          // jump straight to the sign-up form; on successful signup it
          // migrates the guest namespace into the new cloud namespace.
          sessionStorage.setItem("y4mcq.signupIntent", "1");
          location.reload();
          return;
        }
        // Signing out loses nothing the server has, so it only asks when
        // this device still holds writes the server has not taken.
        const o = cloudUser ? outboxRead() : null;
        const nA = o ? Object.keys(o.answers).length : 0, nF = o ? Object.keys(o.flags).length : 0;
        const unsynced = [nA && plural(nA, "answer"), nF && plural(nF, "flag")].filter(Boolean).join(" and ");
        if (unsynced && !(await adminConfirm({
              title: `Sign out with ${unsynced} not yet synced?`,
              body: "They stay on this device and sync the next time you sign in here.",
              confirmLabel: "Sign out anyway",
              tone: "primary",
            }))) return;
        signOut();
      };
    }
  }

  // Migrate localStorage progress from the guest namespace into the
  // signed-in cloud user's namespace, on every way into an account while
  // a guest id is stored (see enterAccount in passGate). The guest keys
  // are removed afterwards, so the next guest on a shared browser does
  // not adopt this person's answers.
  //
  // Guest-history rows don't carry a sourceLetter (the original shuffle
  // wasn't recorded), so they stay local: the worker requires a letter.
  // Flags go through the outbox, which drains one POST at a time after
  // boot. Settings are adopted only by a new account (freshAccount); an
  // existing account keeps its own.
  function migrateGuestHistoryIntoCloud(prevGuestId, freshAccount) {
    if (!cloudUser || !prevGuestId) return;
    const g = `guest-${prevGuestId}`, c = `cloud-${cloudUser.id}`;
    const importedFlag = `y4mcq.cloud.guestmigrated.${cloudUser.id}.${prevGuestId}`;
    if (localStorage.getItem(importedFlag)) return;
    const guestHist = load(`${HISTORY_KEY}.${g}`, null);
    if (guestHist) {
      const cloudKey = `${HISTORY_KEY}.${c}`;
      const existing = load(cloudKey, {});
      for (const qid in guestHist) {
        if (!existing[qid] || (guestHist[qid].count > (existing[qid].count || 0))) {
          existing[qid] = guestHist[qid];
        }
      }
      save(cloudKey, existing);
    }
    const guestFlags = load(`${FLAGS_KEY}.${g}`, null);
    const flagged = guestFlags ? Object.keys(guestFlags).filter(qid => guestFlags[qid]) : [];
    if (flagged.length) {
      const cloudFlagsKey = `${FLAGS_KEY}.${c}`;
      const ef = load(cloudFlagsKey, {});
      for (const qid of flagged) ef[qid] = true;
      save(cloudFlagsKey, ef);
      const at = Date.now();
      outboxUpdate(o => { for (const qid of flagged) o.flags[qid] = { on: true, at }; });
    }
    const guestSettings = load(`${SETTINGS_KEY}.${g}`, null);
    if (guestSettings && freshAccount) {
      save(`${SETTINGS_KEY}.${c}`, normaliseSettings(guestSettings));
      markSettingsDirty();
    }
    // A session in progress, and questions pasted as a guest.
    const guestSession = localStorage.getItem(`${SESSION_KEY}.${g}`);
    if (guestSession && localStorage.getItem(`${SESSION_KEY}.${c}`) == null) {
      localStorage.setItem(`${SESSION_KEY}.${c}`, guestSession);
      const ids = localStorage.getItem(`${SESSION_IDS_KEY}.${g}`);
      if (ids != null) localStorage.setItem(`${SESSION_IDS_KEY}.${c}`, ids);
    }
    const guestLocalQs = load(`${LOCAL_QUESTIONS_KEY}.${g}`, []);
    if (guestLocalQs.length) {
      const mine = load(`${LOCAL_QUESTIONS_KEY}.${c}`, []);
      const have = new Set(mine.map(q => q && q.id));
      save(`${LOCAL_QUESTIONS_KEY}.${c}`, mine.concat(guestLocalQs.filter(q => q && !have.has(q.id))));
    }
    localStorage.setItem(importedFlag, "1");
    for (const base of [HISTORY_KEY, FLAGS_KEY, SETTINGS_KEY, SESSION_KEY, SESSION_IDS_KEY,
                        LOCAL_QUESTIONS_KEY, REMINDER_DISMISS_KEY]) {
      localStorage.removeItem(`${base}.${g}`);
    }
    console.info(`[sync] guest ${prevGuestId} merged into account: ${guestHist ? Object.keys(guestHist).length : 0} answers, ` +
                 `${flagged.length} flags${guestSettings && freshAccount ? ", settings" : ""}`);
  }

  function wireColophon() {
    document.getElementById("exitBtn").onclick = () => {
      if (state.quiz) leaveSession();
    };
    document.getElementById("endNowBtn").onclick = endSession;
    document.getElementById("pauseBtn").onclick = togglePause;
  }

  function wireQuizTopbar() {
    document.getElementById("qtPrev").onclick = () => navOffset(-1);
    document.getElementById("qtNext").onclick = () => navOffset(+1);
    document.getElementById("qtCounter").onclick = e => {
      e.stopPropagation();
      // Whether the rail is actually on screen, not whether the window
      // is wide: with the reference panel open the rail stands down at
      // some widths, and the counter is the only navigator left.
      const rail = document.getElementById("navRail");
      const railShowing = rail && !rail.hidden &&
        (!window.getComputedStyle || getComputedStyle(rail).display !== "none");
      if (railShowing) return;
      toggleQtList();
    };
    document.addEventListener("click", e => {
      const list = document.getElementById("qtList");
      if (!list || list.hidden) return;
      if (!list.contains(e.target) && !e.target.closest("#qtCounter")) closeQtList();
    });
  }

  function setScreen(name) {
    document.body.setAttribute("data-screen", name);
    document.getElementById("colophon").hidden = name !== "quiz";
    document.getElementById("quizTopbar").hidden = name !== "quiz";
    const rail = document.getElementById("navRail");
    if (rail) rail.hidden = name !== "quiz";
    if (name !== "quiz") closeQtList();
  }


  // ── Home ────────────────────────────────────────────────────────────────
  function showHome() {
    setScreen("home");
    state.quiz = null;
    closeRefs(true);
    document.body.classList.remove("has-paeds");
    const app = document.getElementById("app");
    app.innerHTML = "";
    app.appendChild(document.getElementById("tpl-home").content.cloneNode(true));
    document.getElementById("sessionMeta").textContent = "";

    offerSavedSession();
    applySettingsToOptions();

    document.querySelectorAll('.setup-options:not(.multi)').forEach(row => {
      row.addEventListener("click", e => {
        const opt = e.target.closest(".opt"); if (!opt) return;
        const name = row.dataset.name;
        row.querySelectorAll(".opt").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
        const raw = opt.dataset.value;
        state.settings[name] = (name === "count" || name === "timer") ? parseInt(raw, 10) : raw;
        saveSettings();
        onSettingsChange();
      });
    });
    document.querySelectorAll('.setup-options.multi').forEach(row => {
      row.addEventListener("click", e => {
        const opt = e.target.closest(".opt"); if (!opt) return;
        opt.classList.toggle("selected");
        readMulti(row);
        onSettingsChange();
      });
    });
    renderSubtopicChips();
    const stop = e => { e.preventDefault(); e.stopPropagation(); };
    document.getElementById("tagsAll").onclick = e => {
      stop(e);
      document.querySelectorAll("#subtopicChips .opt").forEach(c => c.classList.add("selected"));
      readMulti(document.getElementById("subtopicChips"));
      onSettingsChange();
    };
    document.getElementById("tagsNone").onclick = e => {
      stop(e);
      document.querySelectorAll("#subtopicChips .opt").forEach(c => c.classList.remove("selected"));
      readMulti(document.getElementById("subtopicChips"));
      onSettingsChange();
    };
    // A saved session is replaced only after the user confirms: Begin sits
    // beside the Resume strip, and one misclick would end a half-done test.
    document.getElementById("startBtn").onclick = async () => {
      const saved = loadSavedSession();
      if (saved) {
        const ok = await adminConfirm({
          title: "Replace the saved session?",
          body: "The session in progress will be discarded. Answers so far are kept in your history.",
          confirmLabel: "Start new session",
        });
        if (!ok || state.quiz) return;
        discardSavedSession(saved);
      }
      startQuiz();
    };
    onSettingsChange();
  }
  const SUBTOPIC_TOPIC_SHORT = {
    "Paediatrics": "Paeds", "Obstetrics & Gynaecology": "O&G",
    "Psychiatry": "Psych", "Medicine": "Medicine",
  };
  function subtopicName(q) { return q.subtopic || "Other"; }
  function subtopicKey(q) { return `${q.topic}::${subtopicName(q)}`; }
  // True when a learning-area selection admits this question. Accepts
  // the discipline-keyed form and the bare area name older saved
  // settings carry.
  function subtopicSelected(list, q) {
    return list.includes(subtopicKey(q)) || list.includes(subtopicName(q));
  }
  function renderSubtopicChips() {
    const wrap = document.getElementById("subtopicChips");
    if (!wrap) return;
    // Only show subtopic chips for currently-selected disciplines so the
    // list doesn't bloat to 70+ chips when filters are narrow.
    const visible = new Set(state.settings.disciplines);
    // Chips are keyed by discipline plus area, so "Respiratory" in
    // Paediatrics and in Medicine are two chips that turn off separately.
    const counts = {};
    const disciplinesByName = {};
    state.questions.forEach(q => {
      if (!visible.has(q.topic)) return;
      const k = subtopicKey(q);
      if (!counts[k]) counts[k] = { name: subtopicName(q), topic: q.topic, n: 0 };
      counts[k].n++;
      (disciplinesByName[counts[k].name] = disciplinesByName[counts[k].name] || new Set()).add(q.topic);
    });
    const sorted = Object.entries(counts).sort((a, b) =>
      a[1].name.localeCompare(b[1].name) || a[1].topic.localeCompare(b[1].topic));
    wrap.innerHTML = "";
    const selected = state.settings.subtopics;
    sorted.forEach(([k, e]) => {
      const c = document.createElement("button");
      const on = !selected || subtopicSelected(selected, { topic: e.topic, subtopic: e.name });
      c.className = "opt" + (on ? " selected" : "");
      c.dataset.value = k;
      const shared = disciplinesByName[e.name].size > 1;
      c.textContent = shared
        ? `${e.name}, ${SUBTOPIC_TOPIC_SHORT[e.topic] || e.topic} (${fmtNum(e.n)})`
        : `${e.name} (${fmtNum(e.n)})`;
      wrap.appendChild(c);
    });
    document.getElementById("tagCountLabel").textContent =
      sorted.length ? `(${fmtNum(sorted.length)})` : "";
  }

  function applySettingsToOptions() {
    setSingle("mode",   state.settings.mode);
    setSingle("count",  String(state.settings.count));
    setSingle("timer",  String(state.settings.timer));
    setSingle("filter", state.settings.filter);
    document.querySelectorAll('.setup-options[data-name="disciplines"] .opt').forEach(c => {
      c.classList.toggle("selected", state.settings.disciplines.includes(c.dataset.value));
    });
    document.querySelectorAll('.setup-options[data-name="difficulties"] .opt').forEach(c => {
      c.classList.toggle("selected", state.settings.difficulties.includes(parseInt(c.dataset.value, 10)));
    });
    document.querySelectorAll('[data-show-for="test"]').forEach(r => {
      r.hidden = state.settings.mode !== "test";
    });
  }
  function setSingle(name, value) {
    const row = document.querySelector(`.setup-options[data-name="${name}"]`);
    if (!row) return;
    row.querySelectorAll(".opt").forEach(o =>
      o.classList.toggle("selected", o.dataset.value === value));
  }
  function readMulti(row) {
    const name = row.dataset.name;
    const values = Array.from(row.querySelectorAll(".opt.selected")).map(o => o.dataset.value);
    if (name === "disciplines") {
      state.settings.disciplines = values;
      // Re-render the subtopic chips so they reflect the new discipline set.
      renderSubtopicChips();
    } else if (name === "difficulties") {
      state.settings.difficulties = values.map(v => parseInt(v, 10)).filter(n => !isNaN(n));
    } else if (name === "subtopics") {
      const total = row.querySelectorAll(".opt").length;
      state.settings.subtopics = values.length === total ? null : values;
    }
    saveSettings();
  }

  function onSettingsChange() {
    document.querySelectorAll('[data-show-for="test"]').forEach(r => {
      r.hidden = state.settings.mode !== "test";
    });
    // aria-pressed mirrors .selected, which a screen reader cannot see.
    // Every click on the home screen ends here, so this one pass covers
    // them all.
    document.querySelectorAll(".setup-options .opt").forEach(o =>
      o.setAttribute("aria-pressed", o.classList.contains("selected") ? "true" : "false"));
    // Track the discipline picker live, not just at session start, so
    // the wordmark matches what is selected on the home screen.
    refreshGlucoseSuffix();
    updatePool();
  }

  function getPool(s) {
    s = s || state.settings;
    return state.questions.filter(q => {
      // An empty list is an empty selection, in all three facets: with
      // every difficulty switched off the pool is empty, not the whole
      // bank.
      if (!s.disciplines.includes(q.topic)) return false;
      if (!(s.difficulties || []).includes(q.difficulty)) return false;
      if (s.subtopics && !subtopicSelected(s.subtopics, q)) return false;
      const h = state.history[q.id];
      if (s.filter === "unseen" && h) return false;
      if (s.filter === "incorrect" && (!h || h.lastCorrect !== false)) return false;
      if (s.filter === "flagged" && !state.flags[q.id]) return false;
      return true;
    });
  }
  // Name the setting that emptied the pool: a Filter of Flagged with
  // nothing flagged is not fixed by adding a difficulty level. Running
  // out of Unseen is progress, not a miss.
  function emptyPoolAdvice(s) {
    if (!s.disciplines.length) return "No discipline selected.";
    if (!(s.difficulties || []).length) return "No difficulty selected.";
    if (s.subtopics && !s.subtopics.length) return "No learning area selected.";
    if (s.filter && s.filter !== "all" && getPool(Object.assign({}, s, { filter: "all" })).length) {
      if (s.filter === "unseen") {
        return "You've answered every question in this selection. Set Filter to Previously incorrect, or add a discipline or difficulty.";
      }
      if (s.filter === "incorrect") {
        return "Nothing in this selection was answered wrong on its last attempt. Set Filter to All or Unseen.";
      }
      if (s.filter === "flagged") return "Nothing flagged in this selection. Set Filter to All.";
    }
    if (s.subtopics && getPool(Object.assign({}, s, { subtopics: null, filter: "all" })).length) {
      return "None of the selected learning areas has questions at this discipline and difficulty. Select more learning areas.";
    }
    return "No questions at this discipline and difficulty. Add a difficulty level or another discipline.";
  }

  function updatePool() {
    const n = getPool().length;
    const el = document.getElementById("poolSize");
    const startBtn = document.getElementById("startBtn");
    if (!el || !startBtn) return;
    const s = state.settings;
    if (n === 0) {
      el.textContent = emptyPoolAdvice(s);
    } else if (s.mode === "study") {
      el.textContent = `${plural(n, "question")}. Study runs until you stop it.`;
    } else {
      const take = s.count === 0 ? n : Math.min(s.count, n);
      el.textContent = `${fmtNum(take)} of ${plural(n, "matching question")}, ${s.timer ? `${s.timer} min` : "untimed"}.`;
    }
    // A bank file that failed to load leaves the student on a subset, so
    // say so. The file counts and any skipped malformed questions are
    // author problems; they go to the console (loadData) and the admin
    // Bank tab, not here.
    const bl = state.batchLoadStats;
    if (bl && bl.failed > 0) {
      el.textContent += " Some questions didn't load. Reload to get the full bank.";
    }
    startBtn.disabled = n === 0;
  }

  // ── Quiz ────────────────────────────────────────────────────────────────
  function startQuiz() {
    resetNavigator();
    const s = state.settings;
    const pool = shuffle(getPool());
    if (!pool.length) return;
    // count === 0 means "All" - take every matching question.
    const take = (s.mode === "study" || s.count === 0)
      ? pool.length
      : Math.min(s.count, pool.length);
    state.quiz = {
      pool: pool.slice(0, take),
      idx: 0,
      mode: s.mode,
      timerMins: s.mode === "test" ? s.timer : 0,
      deadline: null,
      answers: {},
      struck: {},
      revealed: {},
      finished: false,
    };
    if (state.quiz.timerMins > 0) {
      state.quiz.deadline = Date.now() + state.quiz.timerMins * 60000;
    }
    state.sessionStart = Date.now();
    // Tag body with mode so CSS can hide the countdown row in study mode;
    // a per-question timer only means something in a test.
    document.body.dataset.mode = s.mode;
    setScreen("quiz");
    document.getElementById("sessionMeta").textContent = s.mode === "study" ? "Study session" : "Test session";
    refreshGlucoseSuffix();
    renderQuiz();
    startSessionTimer();
    saveSession();
  }

  // "(+ glucose)" is a paediatrics in-joke, so it shows only when
  // Paediatrics is the one discipline selected.
  function refreshGlucoseSuffix() {
    const d = (state.settings && state.settings.disciplines) || [];
    document.body.classList.toggle(
      "has-paeds", d.length === 1 && d[0] === "Paediatrics");
  }

  // Ruling out an option and un-ruling it are the same control, so the
  // icon has to say which way it will go. Struck rows show a restore
  // arrow, matching what every qbank does: the affordance names the
  // NEXT action, not the current state.
  const ICON_RULE_OUT = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>';
  const ICON_RESTORE  = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a5 5 0 1 1 1.6 3.7"/><path d="M2.4 4.6v3.2h3.2"/></svg>';

  function selectOption(q, opt, li) {
    if (state.quiz.revealed[q.id]) return;
    // A ruled-out row is not selectable. Clicking it restores it first,
    // which is less annoying than a dead click.
    const struck = state.quiz.struck[q.id];
    if (struck && struck.has(opt.letter)) { toggleStrike(q.id, opt.letter, li); return; }
    document.querySelectorAll("#qOptions li").forEach(x => {
      x.classList.remove("selected");
      const c = x.querySelector(".opt-choice");
      if (c) { c.setAttribute("aria-checked", "false"); c.tabIndex = -1; }
    });
    li.classList.add("selected");
    const choice = li.querySelector(".opt-choice");
    if (choice) { choice.setAttribute("aria-checked", "true"); choice.tabIndex = 0; choice.focus(); }
    state.quiz.answers[q.id] = opt.letter;
    document.getElementById("submitBtn").disabled = false;
  }

  // Undo a not-yet-submitted selection, aria-checked included, so a
  // screen reader hears the row clear as well as seeing it.
  function deselectOption(q, li) {
    if (!li || state.quiz.revealed[q.id]) return;
    li.classList.remove("selected");
    const choice = li.querySelector(".opt-choice");
    if (choice) { choice.setAttribute("aria-checked", "false"); }
    delete state.quiz.answers[q.id];
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) submitBtn.disabled = true;
  }

  // A session survives a reload, so the home screen has to say so. It
  // reads from the saved copy rather than from state, because showHome
  // has just cleared state.quiz.
  function offerSavedSession() {
    const row = document.getElementById("resumeRow");
    if (!row) return;
    const saved = loadSavedSession();
    if (!saved) { row.hidden = true; return; }
    const { raw, pool } = saved;
    const answered = answeredCount({ mode: raw.mode, answers: raw.answers || {}, revealed: raw.revealed || {} });
    const mode = raw.mode === "test" ? "Test" : "Study";
    const left = raw.deadline ? Math.max(0, Math.round((raw.deadline - Date.now()) / 60000)) : null;
    document.getElementById("resumeLine").textContent =
      `${mode} session in progress: question ${fmtNum(Math.min((raw.idx || 0) + 1, pool.length))}` +
      (raw.mode === "test" ? ` of ${fmtNum(pool.length)}` : "") + `, ${fmtNum(answered)} answered` +
      (left !== null ? `, ${left} minute${left === 1 ? "" : "s"} left on the clock` : "") + ".";
    row.hidden = false;
    document.getElementById("resumeBtn").onclick = () => resumeSession(saved);
    document.getElementById("resumeDiscardBtn").onclick = () => {
      discardSavedSession(saved);
      row.hidden = true;
    };
  }

  // A test's answers reach history when it is scored or left, not one by
  // one, so throwing away a saved test commits what it holds first. A
  // study session's revealed answers are already in history.
  function discardSavedSession(saved) {
    if (saved && saved.raw && saved.raw.mode === "test") {
      commitTestAnswers({
        mode: "test", pool: saved.pool,
        answers: saved.raw.answers || {}, timeMs: saved.raw.timeMs || {},
      });
    }
    clearSavedSession();
  }

  // Written on every mutation that would be painful to lose, read once at
  // boot. Only ids are stored, not questions: the bank is fetched fresh
  // and a question that has since been retired simply drops out.
  //
  // The pool's id list lives under its own key and is written only when
  // the pool itself changes. A study session's pool is the whole bank
  // (about 7,000 ids, ~150 KB), and rewriting it on every answer, strike
  // and Prev/Next would be a synchronous stringify plus setItem each time.
  // The small per-mutation blob carries a tag that must match the id
  // list's tag, so a list left over from another session is never used.
  const SESSION_IDS_KEY = "y4mcq.session.ids.v1";
  let _savedPool = null, _savedPoolNs = null, _savedPoolTag = null;
  function clearSavedSession() {
    localStorage.removeItem(ns(SESSION_KEY));
    localStorage.removeItem(ns(SESSION_IDS_KEY));
    _savedPool = null; _savedPoolTag = null;
  }

  function saveSession() {
    const q = state.quiz;
    // A one-question report review from the admin panel is never the
    // session to resume.
    if (q && q.ephemeral) return;
    if (!q || q.finished) { clearSavedSession(); return; }
    const key = ns(SESSION_KEY);
    // Another tab may have replaced the stored list since; a prefix check
    // on the raw string is enough and costs no parse.
    const listIsOurs = () => (localStorage.getItem(ns(SESSION_IDS_KEY)) || "")
      .startsWith(`{"tag":${JSON.stringify(_savedPoolTag)}`);
    if (q.pool !== _savedPool || key !== _savedPoolNs || !_savedPoolTag || !listIsOurs()) {
      _savedPoolTag = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      save(ns(SESSION_IDS_KEY), { tag: _savedPoolTag, ids: q.pool.map(x => x.id) });
      _savedPool = q.pool; _savedPoolNs = key;
    }
    const cur = q.pool[q.idx];
    save(key, {
      poolTag: _savedPoolTag,
      // The id as well as the index: if an earlier question is retired
      // before the resume, the index alone lands on a different one.
      currentId: cur ? cur.id : null,
      idx: q.idx,
      reached: q.reached,
      mode: q.mode,
      timerMins: q.timerMins,
      deadline: q.deadline,
      answers: q.answers,
      revealed: q.revealed,
      timeMs: q.timeMs || {},
      struck: Object.fromEntries(Object.entries(q.struck || {}).map(([k, v]) => [k, [...v]])),
      sessionStart: state.sessionStart,
      savedAt: Date.now(),
    });
  }

  function loadSavedSession() {
    const raw = load(ns(SESSION_KEY), {});
    if (!raw) return null;
    // Sessions saved before the id list moved to its own key still carry
    // `ids` inline; read either shape.
    let ids = Array.isArray(raw.ids) ? raw.ids : null;
    if (!ids && raw.poolTag) {
      const stored = load(ns(SESSION_IDS_KEY), {});
      if (stored && stored.tag === raw.poolTag && Array.isArray(stored.ids)) ids = stored.ids;
      else console.warn("[session] saved session has no matching id list; discarding", raw.poolTag, stored && stored.tag);
    }
    if (!ids || !ids.length) return null;
    if (!raw.savedAt || Date.now() - raw.savedAt > SESSION_MAX_AGE_MS) {
      clearSavedSession();
      return null;
    }
    const byId = Object.create(null);
    for (const q of state.questions) byId[q.id] = q;
    const pool = ids.map(id => byId[id]).filter(Boolean);
    if (!pool.length) return null;
    if (raw.currentId) {
      const at = pool.findIndex(q => q.id === raw.currentId);
      if (at >= 0) raw.idx = at;
    }
    return { raw, pool };
  }

  function resumeSession(saved) {
    const { raw, pool } = saved;
    resetNavigator();
    state.quiz = {
      pool,
      idx: Math.min(raw.idx || 0, pool.length - 1),
      mode: raw.mode === "test" ? "test" : "study",
      timerMins: raw.timerMins || 0,
      deadline: raw.deadline || null,
      reached: raw.reached,
      answers: raw.answers || {},
      revealed: raw.revealed || {},
      timeMs: raw.timeMs || {},
      struck: Object.fromEntries(Object.entries(raw.struck || {})
        .map(([k, v]) => [k, new Set(Array.isArray(v) ? v : [])])),
      finished: false,
    };
    state.sessionStart = raw.sessionStart || Date.now();
    document.body.dataset.mode = state.quiz.mode;
    setScreen("quiz");
    document.getElementById("sessionMeta").textContent =
      (state.quiz.mode === "study" ? "Study session" : "Test session") + ", resumed";
    refreshGlucoseSuffix();
    renderQuiz();
    startSessionTimer();
  }

  // The word carries the state ("Flag" / "Flagged"), and the button
  // reports it to assistive tech as pressed.
  function setFlagBtn(btn, on) {
    if (!btn) return;
    btn.classList.toggle("active", on);
    btn.classList.toggle("flag", on);
    btn.textContent = on ? "Flagged" : "Flag";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.title = on ? "Remove the flag (F)" : "Flag for review (F)";
  }

  // A clinical vignette hands you an observation set, not a sentence.
  // The data comes as one comma-joined string per row ("Pulse 128/min,
  // blood pressure 158/94 mmHg, respiratory rate 22/min, SpO2 98% on
  // room air, temperature 37.6 degrees C"). Where a row is clearly a
  // list of measurements it is broken into discrete items so the
  // numbers can be read off the way they would be off a chart.
  const MEASUREMENT_ROWS = /^(vital signs|vitals|observations?|obs|obs on arrival|investigations?|bloods?|blood tests|pathology|examination findings|urine|urinalysis|urine dipstick|dipstick|blood gas|arterial blood gas|venous blood gas|abg|vbg)$/i;
  // Readings whose value is a word rather than a number ("C3 normal").
  // They get the same name and value treatment as the numeric readings
  // beside them.
  const QUALITATIVE = /^(.*?)\s+(normal|nil|absent|present|positive|negative|clear|raised|reduced|elevated|low|high|trace|detected|not detected|pending|sinus rhythm|regular|irregular)\b(.*)$/i;
  // Batch authors capitalise the first reading of a row and not the
  // rest, so a column of names read "Pulse rate / blood pressure /
  // respiratory rate". Lower the first letter only where the word is
  // ordinary prose; an acronym (SpO2, CRP, INR) keeps its shape.
  function obsName(name) {
    // Any capital further along means the word is not ordinary prose:
    // SpO2, HbA1c, eGFR, C reactive protein all keep what they came with.
    // A first word of three letters or fewer is a symbol, not prose: Hb,
    // Na, Mg, Plt ("mg 0.6" would read as milligrams).
    const first = name.split(/\s/)[0];
    const prose = first.length > 3 && /^[A-Z][a-z]+$/.test(first) && !/[A-Z]/.test(name.slice(1));
    return prose ? name[0].toLowerCase() + name.slice(1) : name;
  }

  // Split a row at ", " only outside brackets, so "bilirubin 305
  // micromol/L (unconjugated 295, conjugated 10)" stays one reading.
  function splitTopLevel(value) {
    const parts = [];
    let depth = 0, start = 0;
    for (let i = 0; i < value.length; i++) {
      const c = value[i];
      if (c === "(" || c === "[") depth++;
      else if ((c === ")" || c === "]") && depth > 0) depth--;
      else if (c === "," && depth === 0 && /\s/.test(value[i + 1] || "")) {
        parts.push(value.slice(start, i));
        start = i + 1;
      }
    }
    parts.push(value.slice(start));
    return parts.map(x => x.trim()).filter(Boolean);
  }

  function renderClinicalValue(dd, label, value) {
    const parts = splitTopLevel(value);
    const numeric = parts.filter(x => /\d/.test(x) || QUALITATIVE.test(x)).length;
    // Only split when it genuinely is a list: at least three items, most
    // of them carrying a number, and none of them a full clause. A
    // narrative examination finding stays as prose.
    // The length ceiling is generous because one thyroid result ("thyroid
    // stimulating hormone less than 0.01 mIU/L (0.4-4.0)") is 58
    // characters; the shape rules are what keep narrative out.
    const splittable = MEASUREMENT_ROWS.test(label)
      && parts.length >= 3
      && numeric >= parts.length - 1
      && parts.every(x => x.length <= 72);
    if (!splittable) { dd.textContent = value; return; }
    dd.classList.add("obs-set");
    for (const part of parts) {
      // "blood pressure 158/94 mmHg" -> name "blood pressure",
      // reading "158/94 mmHg". Split at the first whitespace-delimited
      // token that opens with a digit or a comparator, which is what
      // lets "SpO2 99% on room air" split at the 99 rather than at the
      // 2 in SpO2. Failing that, split at a qualitative value word.
      // "less than 0.01" and "greater than 30" are readings, not part of
      // the analyte's name, so the split goes in front of them.
      // The comparator split only applies when the name half is still a
      // bare name. If it already holds a reading or an open bracket, the
      // comparator belongs to a duration or a reference range ("urine
      // output 0.4 mL/kg/hour over 6 hours", "HbA1c 8.5% (RR under 7.0%)")
      // and the numeric split below finds the real value.
      let m = part.match(/^(.*?)\s+((?:less than|greater than|under|over|up to)\s+[\d.].*)$/i);
      if (m && (/(^|\s)[\d.<>=]/.test(m[1]) ||
                (m[1].match(/\(/g) || []).length > (m[1].match(/\)/g) || []).length)) m = null;
      m = m || part.match(/^(.*?)\s+([<>=]?\s*[\d.].*)$/);
      if (!m) {
        const q = part.match(QUALITATIVE);
        if (q && q[1]) m = [part, q[1], (q[2] + q[3]).trim()];
      }
      const item = document.createElement("span");
      item.className = "obs";
      if (m) {
        item.innerHTML = `<span class="obs-name">${esc(obsName(m[1]))}</span>` +
                         `<span class="obs-value">${esc(m[2])}</span>`;
      } else {
        // No name/value split: this reading spans both columns rather
        // than taking the name cell and pushing everything after it one
        // slot along. `.obs` is display:contents, so a single child is a
        // single cell.
        item.innerHTML = `<span class="obs-solo">${esc(part)}</span>`;
      }
      dd.appendChild(item);
    }
  }

  function renderQuiz() {
    chargeQuestionTime();
    const app = document.getElementById("app");
    app.innerHTML = "";
    app.appendChild(document.getElementById("tpl-quiz").content.cloneNode(true));
    renderTopbar();
    renderReadingPane();
    paintColophon();
    state.questionStart = Date.now();
    state.quiz._timingId = state.quiz.pool[state.quiz.idx].id;
    bindQuizKeys();
    // Replacing #app takes the focused control with it and drops focus to
    // <body>, so a keyboard or screen-reader user would not hear that a
    // new question loaded. Land on the stem instead, unless something
    // outside #app (the topbar, a revealed question's Next) holds focus.
    const act = document.activeElement;
    const stem = document.getElementById("qStem");
    if (stem && (!act || act === document.body || !act.isConnected)) {
      stem.tabIndex = -1;
      stem.focus({ preventScroll: true });
    }
    // Always start a new question (or a re-rendered one after navigation)
    // at the top of the page so the full stem is in view. Use instant
    // behaviour - a smooth scroll feels laggy when paging through quickly.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  // Position indicator. The counter is the middle cell of a fixed
  // three-column grid, so it stays dead centre no matter how wide the
  // Previous / Next labels get, and opening the list does not move it.
  function renderTopbar() {
    const total = state.quiz.pool.length;
    const idx = state.quiz.idx;
    const study = state.quiz.mode === "study";
    // A study session is open-ended, so it gives the position only: "of
    // 7,053" would read as a debt.
    document.getElementById("qtNumber").textContent = study
      ? `Question ${fmtNum(idx + 1)}` : `Question ${fmtNum(idx + 1)} of ${fmtNum(total)}`;
    // From 1200px up the rail is the navigator and this is a label, not
    // a control, so it stops announcing a list that Enter would open.
    const counter = document.getElementById("qtCounter");
    const rail = document.getElementById("navRail");
    const railShowing = rail && !rail.hidden &&
      (!window.getComputedStyle || getComputedStyle(rail).display !== "none");
    if (counter) {
      if (railShowing) {
        counter.removeAttribute("aria-expanded");
        counter.removeAttribute("aria-controls");
        counter.setAttribute("aria-disabled", "true");
        counter.removeAttribute("title");
      } else {
        counter.setAttribute("aria-controls", "qtList");
        counter.removeAttribute("aria-disabled");
        counter.title = "Open the question list";
        if (!counter.hasAttribute("aria-expanded")) counter.setAttribute("aria-expanded", "false");
      }
    }
    document.getElementById("qtPrev").disabled = navTarget(-1) < 0;
    const qtNext = document.getElementById("qtNext");
    qtNext.disabled = navTarget(+1) < 0;
    // Once a question is revealed the filled Next under it is the way on;
    // a second Next in the topbar would be the same action in another
    // style. Hidden rather than removed so the counter stays centred.
    const cur = state.quiz.pool[idx];
    qtNext.style.visibility = cur && state.quiz.revealed[cur.id] ? "hidden" : "";
    // Progress along a whole-bank shuffle is a sliver that never moves.
    const prog = document.getElementById("qtProgress");
    if (prog) prog.hidden = study;
    const bar = document.querySelector("#qtProgress span");
    if (bar) bar.style.width = total ? `${((idx + 1) / total) * 100}%` : "0%";
    renderNavigator();
  }

  // How many chips to draw at once. A session can be the whole bank, and
  // 7,000 buttons is neither drawable nor navigable, so the grid is a
  // window onto the pool with the current question inside it, paged a
  // round hundred at a time. Below that the window is the whole pool and
  // the paging controls are not rendered at all.
  const navWindow = 100;
  let navWindowStart = 0;
  // Set when the current question changes, cleared once the window has
  // been repositioned. Paging leaves it false so the view stays put.
  let navFollowCurrent = true;

  // Memoised per question: did the letter the user picked turn out to
  // be the correct one. Keyed by question id, filled lazily.
  const _correctCache = Object.create(null);
  function answerWasCorrect(q, letter) {
    const key = q.id + ":" + letter;
    if (key in _correctCache) return _correctCache[key];
    const ok = !!_shuffledOptions(q).find(o => o.letter === letter)?.correct;
    _correctCache[key] = ok;
    return ok;
  }

  // How far a study session has got. Its pool is every matching question
  // in a shuffle, so only the questions reached so far belong on the rail
  // or in the report; the rest are not a backlog. Sessions saved before
  // this was recorded work it out once from their answers.
  function studyReach(quiz) {
    quiz = quiz || state.quiz;
    if (quiz.reached == null) {
      let r = 0;
      quiz.pool.forEach((q, i) => { if (quiz.answers[q.id] || quiz.revealed[q.id] && !quiz.reviewing) r = i; });
      quiz.reached = r;
    }
    if (!quiz.reviewing) quiz.reached = Math.max(quiz.reached, quiz.idx || 0);
    return quiz.reached;
  }
  // The questions the navigator can show: a test's whole pool, or the
  // part of a study pool reached so far.
  function navSpan() {
    const quiz = state.quiz;
    return quiz.mode === "study" ? Math.min(quiz.pool.length, studyReach(quiz) + 1) : quiz.pool.length;
  }

  function navigatorHtml() {
    const pool = state.quiz.pool;
    const study = state.quiz.mode === "study";
    const total = navSpan();
    const midTest = state.quiz.mode === "test" && !state.quiz.finished;

    // Counts walk the answered set, not the pool. A pool can be the
    // whole 7,122-question bank while the answered set is a handful,
    // and this runs on every navigation.
    const byId = state.quiz.byId || (state.quiz.byId =
      pool.reduce((m, q) => (m[q.id] = q, m), Object.create(null)));
    let correct = 0, incorrect = 0, answered = 0;
    for (const qid in state.quiz.answers) {
      const q = byId[qid];
      if (!q) continue;
      if (!isAnswerCounted(qid)) continue;
      answered += 1;
      if (midTest) continue;
      if (answerWasCorrect(q, state.quiz.answers[qid])) correct += 1; else incorrect += 1;
    }
    let flagged = 0;
    if (study) {
      for (let i = 0; i < total; i++) if (state.flags[pool[i].id]) flagged += 1;
    } else {
      for (const qid in state.flags) if (state.flags[qid] && byId[qid]) flagged += 1;
    }

    // Recentre only when the question itself moved out of the window.
    // Recentring on every render would snap the view straight back the
    // moment you paged away to look somewhere else.
    if (total <= navWindow) navWindowStart = 0;
    else if (navFollowCurrent &&
             (state.quiz.idx < navWindowStart ||
              state.quiz.idx >= navWindowStart + navWindow)) {
      navWindowStart = Math.max(0, Math.min(
        total - navWindow, state.quiz.idx - Math.floor(navWindow / 2)));
    }
    navFollowCurrent = false;
    const from = total <= navWindow ? 0 : Math.min(navWindowStart, Math.max(0, total - navWindow));
    navWindowStart = from;
    const to = Math.min(total, from + navWindow);

    // Chip state is computed for the visible window only.
    const states = pool.slice(from, to).map((q, n) => {
      const i = from + n;
      const ans = state.quiz.answers[q.id];
      let st = "unanswered";
      if (ans && !isAnswerCounted(q.id)) st = "pending";
      else if (ans) st = midTest ? "answered" : (answerWasCorrect(q, ans) ? "correct" : "incorrect");
      return { st, flagged: !!state.flags[q.id], i };
    });

    const chips = states.map(x => {
      // A pending study pick draws like an answered test chip: something
      // was chosen, nothing is graded.
      const cls = ["nav-chip", x.st === "pending" ? "answered" : x.st];
      if (x.i === state.quiz.idx) cls.push("current");
      if (x.flagged) cls.push("flagged");
      const label = `Question ${x.i + 1}, ${x.st === "pending" ? "selected, not submitted" : x.st}` +
                    (x.i === state.quiz.idx ? ", current" : "") + (x.flagged ? ", flagged" : "");
      return `<button type="button" class="${cls.join(" ")}" data-nav-i="${x.i}" ` +
             `aria-label="${label}"${x.i === state.quiz.idx ? ' aria-current="true"' : ""}>${x.i + 1}</button>`;
    }).join("");

    const windowed = total > navWindow;
    // One line, read as a sentence. A stack of "N correct / N
    // incorrect / N flagged" is the generic stat-panel shape, and at
    // this size the numbers are small enough to sit inline.
    const score = midTest
      ? ""
      : `, <b class="good">${correct}</b> right and <b class="bad">${incorrect}</b> wrong`;
    const flag = flagged ? `, <b>${fmtNum(flagged)}</b> flagged` : "";
    const tally = study
      ? `<b>${fmtNum(answered)}</b> answered`
      : `<b>${fmtNum(answered)}</b> of ${fmtNum(total)} answered`;
    // In a test Enter only moves on; nothing is shown until the end.
    const enterDoes = study ? "show answer, then next" : "next";

    // Go to is for a test, where question 34 of 40 is a place to return
    // to. In a study session every reached question is already a chip.
    return `
      <p class="nav-stats">${tally}${score}${flag}.</p>
      ${windowed ? `
        <div class="nav-window">
          <button type="button" class="nav-page" data-nav-page="-1" ${from === 0 ? "disabled" : ""}>‹</button>
          <span class="nav-range">${fmtNum(from + 1)} to ${fmtNum(to)}</span>
          <button type="button" class="nav-page" data-nav-page="1" ${to >= total ? "disabled" : ""}>›</button>
        </div>` : ""}
      <div class="nav-chips">${chips}</div>
      ${windowed && !study ? `
        <form class="nav-jump">
          <label for="navJumpInput">Go to</label>
          <input id="navJumpInput" type="number" min="1" max="${total}" inputmode="numeric"
                 placeholder="${state.quiz.idx + 1}" />
          <button type="submit">Go</button>
        </form>` : ""}
      <details class="nav-keys kbd-only">
        <summary>Keyboard</summary>
        <dl>
          <dt>1 to 5 or A to E</dt><dd>choose an option</dd>
          <dt>shift + the same</dt><dd>rule it out</dd>
          <dt>Enter</dt><dd>${enterDoes}</dd>
          <dt>Left / Right</dt><dd>previous / next</dd>
          <dt>F</dt><dd>flag</dd>
          <dt>L</dt><dd>reference values</dd>
        </dl>
      </details>`;
  }

  function renderNavigator() {
    const html = navigatorHtml();
    const rail = document.getElementById("navRail");
    const railBody = document.getElementById("navRailBody");
    if (railBody) railBody.innerHTML = html;
    if (rail) rail.hidden = false;
    const list = document.getElementById("qtList");
    // The chip has to hold the highest number in the session. Four
    // digits do not fit the 30px square three digits were drawn in.
    const digits = String(navSpan()).length;
    // 8px per digit: the narrow-screen panel draws these at 12.5px.
    const chipMin = Math.max(30, 10 + 8 * digits) + "px";
    if (rail) rail.style.setProperty("--nav-chip-min", chipMin);
    if (list) list.style.setProperty("--nav-chip-min", chipMin);
    // The panel behind the counter is the same navigator, for widths
    // with no room for the rail. Only rebuild it while it is open.
    if (list && !list.hidden) list.innerHTML = html;
    wireNavigator(rail);
    if (list && !list.hidden) wireNavigator(list);
    // Only the dropdown gets scrolled to the current chip. The rail has
    // no scroll region of its own, so asking for the chip to be
    // brought into view would scroll the page instead, fighting the jump
    // to the top of the question that follows every navigation.
  }

  function wireNavigator(root) {
    if (!root || root.dataset.navWired) return;
    root.dataset.navWired = "1";
    root.addEventListener("click", e => {
      const chip = e.target.closest("[data-nav-i]");
      if (chip) {
        jumpTo(parseInt(chip.dataset.navI, 10));
        const list = document.getElementById("qtList");
        if (root === list) closeQtList();
        return;
      }
      const page = e.target.closest("[data-nav-page]");
      if (page) {
        const dir = parseInt(page.dataset.navPage, 10);
        navWindowStart = Math.max(0, Math.min(
          navSpan() - navWindow, navWindowStart + dir * navWindow));
        navFollowCurrent = false;
        renderNavigator();
      }
    });
    root.addEventListener("submit", e => {
      const form = e.target.closest(".nav-jump");
      if (!form) return;
      e.preventDefault();
      const n = parseInt(form.querySelector("input").value, 10);
      if (n >= 1 && n <= state.quiz.pool.length) jumpTo(n - 1);
    });
  }

  function scrollCurrentChipIntoView(root) {
    if (!root) return;
    const cur = root.querySelector(".nav-chip.current");
    // block: "nearest" is a no-op when the chip is already visible, so
    // this never yanks the rail while the reader is browsing it.
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" });
  }

  function toggleQtList() {
    const list = document.getElementById("qtList");
    if (!list) return;
    if (list.hidden) {
      list.innerHTML = navigatorHtml();
      list.hidden = false;
      wireNavigator(list);
      scrollCurrentChipIntoView(list);
    } else {
      list.hidden = true;
    }
    const btn = document.getElementById("qtCounter");
    if (btn) btn.setAttribute("aria-expanded", list.hidden ? "false" : "true");
  }
  function closeQtList() {
    const list = document.getElementById("qtList");
    if (list) list.hidden = true;
    const btn = document.getElementById("qtCounter");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  // What counts as answered. A test answer is whatever is selected when
  // the test is scored. A study pick counts only once it is revealed:
  // before that it can still be changed, and grading it anywhere (chips,
  // tallies, the report, Retry) would give the key away.
  function isAnswerCounted(qid, quiz) {
    quiz = quiz || state.quiz;
    if (!quiz || !quiz.answers[qid]) return false;
    return quiz.mode === "test" || !!quiz.revealed[qid];
  }
  function answeredCount(quiz) {
    quiz = quiz || state.quiz;
    if (!quiz) return 0;
    return Object.keys(quiz.answers).filter(id => isAnswerCounted(id, quiz)).length;
  }

  // Leaving and ending do different things, so the dialog words them
  // differently. Leave scores nothing and cannot be undone (the saved
  // copy goes); End scores a test, and in a test anything unanswered
  // counts against it. Study End has nothing to lose, so it skips the
  // dialog altogether (see endSession).
  function confirmLeaveSession(kind) {
    const quiz = state.quiz;
    const total = quiz ? quiz.pool.length : 0;
    const answered = answeredCount(quiz);
    const left = Math.max(0, total - answered);
    if (kind === "end") {
      return adminConfirm({
        title: "Finish the test now?",
        body: left
          ? `${fmtNum(answered)} of ${fmtNum(total)} answered. The other ${fmtNum(left)} count as unanswered.`
          : `All ${fmtNum(total)} answered.`,
        confirmLabel: "Finish test",
        tone: "primary",
      });
    }
    const body = quiz && quiz.mode === "test"
      ? `${answered} of ${total} answered.` +
        (answered ? " Those answers are saved to your history." : "") +
        " The test is not scored and cannot be resumed."
      : (answered ? `${answered} answered, already saved to your history.` : "Nothing answered yet.") +
        " This session cannot be resumed.";
    return adminConfirm({ title: "Leave this session?", body, confirmLabel: "Leave session" });
  }

  // One path home from a session, for the Exit button and the brand. A
  // scored session (the report, or a review from it) leaves without a
  // dialog: there is nothing left to lose.
  async function leaveSession() {
    const quiz = state.quiz;
    if (quiz && !quiz.finished) {
      if (!(await closeLiveSession(quiz))) return;
    } else {
      stopSessionTimer();
      // Only a session being left takes the saved copy with it; the brand
      // on the home screen must not clear the session Resume is offering.
      if (quiz) clearSavedSession();
    }
    showHome();
  }

  // Asks, then closes a session still in progress: time charged, a
  // test's answers committed, the saved copy removed. False when the
  // user stays, or when the clock ran out while the dialog was open
  // (that session is scored and on the report now). A report review
  // was never the saved session, so it leaves the saved copy alone.
  async function closeLiveSession(quiz) {
    if (!(await confirmLeaveSession("leave"))) return false;
    if (state.quiz !== quiz || quiz.finished) return false;
    stopSessionTimer();
    chargeQuestionTime();
    commitTestAnswers(quiz);
    if (!quiz.ephemeral) clearSavedSession();
    return true;
  }

  async function endSession() {
    const quiz = state.quiz;
    if (!quiz) return;
    if (quiz.reviewing) { backToResults(); return; }
    if (quiz.finished) return;
    if (quiz.mode === "test" && !(await confirmLeaveSession("end"))) return;
    if (state.quiz !== quiz || quiz.finished) return;
    stopSessionTimer();
    showSummary(false);
  }

  // Time on a question is charged when you leave it, so a test answer
  // committed at scoring carries the time spent on it across every
  // visit, not the time since the last one.
  function chargeQuestionTime() {
    const quiz = state.quiz;
    if (!quiz || !quiz._timingId || !state.questionStart) return;
    quiz.timeMs = quiz.timeMs || {};
    const ms = Math.max(0, Date.now() - state.questionStart);
    quiz.timeMs[quiz._timingId] = Math.min(30 * 60000, (quiz.timeMs[quiz._timingId] || 0) + ms);
    quiz._timingId = null;
  }

  // One history row per attempt. The caller saves: a test commit writes
  // many rows and should stringify history once, not once per question.
  function recordAttempt(q, letter, elapsedMs) {
    const chosen = _shuffledOptions(q).find(o => o.letter === letter);
    const isC = !!(chosen && chosen.correct);
    const prev = state.history[q.id] || {};
    state.history[q.id] = {
      lastCorrect: isC,
      count: (prev.count || 0) + 1,
      last_at: Date.now(),
      time_ms_total: (prev.time_ms_total || 0) + (elapsedMs || 0),
      first_correct: prev.first_correct ?? (prev.count ? prev.first_correct : isC),
    };
    return { chosen, isC };
  }

  // A test is recorded once, with its final answers, when it is scored or
  // left. Recording at each submit would log a question again every time
  // the reader went back to check it and pressed Enter, and never log an
  // answer left with Next, a chip or the clock running out.
  function commitTestAnswers(quiz) {
    if (!quiz || quiz.mode !== "test" || quiz.committed) return;
    quiz.committed = true;
    const posts = [];
    for (const q of quiz.pool) {
      const letter = quiz.answers[q.id];
      if (!letter) continue;
      const { chosen, isC } = recordAttempt(q, letter, (quiz.timeMs || {})[q.id] || 0);
      if (chosen && chosen.sourceLetter) posts.push([q.id, chosen.sourceLetter, isC]);
    }
    if (!posts.length) return;
    save(ns(HISTORY_KEY), state.history);
    // One at a time: a whole-bank test would otherwise open thousands
    // of requests at once.
    if (cloudUser) (async () => { for (const p of posts) await cloudPostAnswer(...p); })();
  }

  // Pause is global state, so each new session resets it; otherwise
  // pausing a test and leaving would start the next session paused, with
  // a countdown that could never run out.
  function resetPause() {
    state.paused = false;
    if (state.quiz) state.quiz._pausedAt = null;
    paintPauseBtn();
  }
  function paintPauseBtn() {
    const btn = document.getElementById("pauseBtn");
    if (!btn) return;
    btn.textContent = state.paused ? "▶" : "⏸";
    btn.setAttribute("aria-label", state.paused ? "Resume session" : "Pause session");
    btn.title = state.paused ? "Resume" : "Pause";
  }

  // The end control names what it does: a test is finished (and marked,
  // after a dialog), a study session simply ends, and a review goes back
  // to the results it came from.
  function paintColophon() {
    const end = document.getElementById("endNowBtn");
    if (!end) return;
    const quiz = state.quiz;
    end.textContent = quiz && quiz.reviewing ? "Back to results"
      : quiz && quiz.mode === "test" ? "Finish test" : "End session";
  }

  // Screen-reader announcements. Cleared first so the same sentence
  // twice in a row is still read out.
  function announce(text) {
    const el = document.getElementById("quizStatus");
    if (!el) return;
    el.textContent = "";
    setTimeout(() => { el.textContent = text; }, 50);
  }

  // Smooth scrolling passed from script overrides the reduced-motion CSS.
  function scrollBehavior() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto" : "smooth";
  }

  // Called when a session starts: the window and the follow flag are
  // module state, and a new quiz inheriting "301 to 400" would show a
  // page with no current chip in it.
  function resetNavigator() {
    navWindowStart = 0;
    navFollowCurrent = true;
  }

  function jumpTo(i) {
    if (i === state.quiz.idx) return;
    state.quiz.idx = i;
    navFollowCurrent = true;
    renderQuiz();
    saveSession();
  }
  // Where Previous / Next go. In a review opened from the report they
  // step through the rows the report listed (the Incorrect filter, say),
  // not through the whole pool, which is mostly questions already right.
  function navTarget(d) {
    const quiz = state.quiz;
    if (quiz.reviewing && Array.isArray(quiz.reviewList) && quiz.reviewList.length) {
      const pos = quiz.reviewList.indexOf(quiz.idx);
      // Off the list (a chip took you elsewhere): the nearest row that way.
      const j = pos >= 0 ? pos + d
        : d > 0 ? quiz.reviewList.findIndex(i => i > quiz.idx)
        : quiz.reviewList.length - 1 - [...quiz.reviewList].reverse().findIndex(i => i < quiz.idx);
      return j >= 0 && j < quiz.reviewList.length ? quiz.reviewList[j] : -1;
    }
    const i = quiz.idx + d;
    return i >= 0 && i < quiz.pool.length ? i : -1;
  }
  function navOffset(d) {
    const i = navTarget(d);
    if (i < 0) return;
    jumpTo(i);
  }

  // Per-question deterministic option shuffle. Many batches were written
  // with the correct answer always at letter A, which trivialises the bank.
  // We re-letter options at render time using a seeded shuffle so the same
  // question always shows the same order across reopens but the correct
  // answer is rarely at A.
  function _seededOrder(seedStr, n) {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      const j = (h >>> 0) % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }
  // Keyed off the question rather than written onto it: an enumerable
  // property would ride along when a question is serialised into an
  // audit prompt, and a model that echoed it back would have apply-report
  // write the shuffled copy into the bank.
  const _shuffleCache = new WeakMap();
  function _shuffledOptions(q) {
    const hit = _shuffleCache.get(q);
    if (hit) return hit;
    const order = _seededOrder(q.id || JSON.stringify(q.options.map(o => o.text)), q.options.length);
    const letters = ["A", "B", "C", "D", "E", "F", "G"];
    const out = order.map((origIdx, newIdx) => {
      const o = q.options[origIdx];
      // Preserve the source-JSON letter alongside the post-shuffle letter so
      // cross-user stats can aggregate by the unchanging source label.
      return Object.assign({}, o, { letter: letters[newIdx], sourceLetter: o.letter });
    });
    _shuffleCache.set(q, out);
    return out;
  }

  // An explanation is an object with summary / pearls / why_not. Some
  // batches write it as a plain string, which is taken as the summary.
  function explanationOf(q) {
    const e = q && q.explanation;
    if (typeof e === "string") return { summary: e };
    return e || {};
  }

  function renderReadingPane() {
    const q = state.quiz.pool[state.quiz.idx];
    const shuffled = _shuffledOptions(q);
    // No folio line: the topbar carries the position, and before the
    // answer the subtopic and discipline must stay hidden.
    renderStemWithClues(q);

    // Optional question image (e.g. from a referenced AU image bank).
    const imgFig = document.getElementById("qImage");
    const imgEl = document.getElementById("qImageImg");
    const imgCap = document.getElementById("qImageCaption");
    if (q.image && q.image.url) {
      imgFig.hidden = false;
      imgEl.src = q.image.url;
      imgEl.alt = q.image.alt || "Clinical image";
      imgCap.textContent = q.image.caption || "";
      imgCap.hidden = !q.image.caption;
    } else {
      imgFig.hidden = true;
      imgEl.removeAttribute("src");
    }

    const dtWrap = document.getElementById("qDataTable");
    // Humanise snake_case / camelCase keys for display.
    const labelise = (k) => {
      if (!k) return "";
      const s = String(k)
        .replace(/[_-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .trim();
      return s.charAt(0).toUpperCase() + s.slice(1);
    };
    // Flatten a value into an array of "Label · text" lines. Handles
    // primitives, arrays, and shallow nested objects (seen in agent
    // output where vitals/labs are sometimes a sub-dict instead of a
    // single string). Skips empty / placeholder entries.
    const isBlank = (s) => {
      const t = String(s ?? "").trim().toLowerCase();
      if (!t) return true;
      return (
        t === "-" || t === "—" || t === "n/a" || t === "na" ||
        t === "nil" || t === "none" || t === "not performed"
      );
    };
    // Filter out empty / placeholder rows so an empty Investigations
    // entry (or any other row with a blank/n-a/nil value) doesn't
    // render its label with no content beside it.
    const dtEntries = (q.data_table ? Object.entries(q.data_table) : [])
      .filter(([k, v]) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((x) => !isBlank(x));
        if (typeof v === "object") {
          return Object.values(v).some((x) => !isBlank(x));
        }
        return !isBlank(v);
      });
    if (dtEntries.length) {
      dtWrap.hidden = false;
      const dl = document.createElement("dl");
      dl.className = "patient-table";
      dl.id = "qDataTable";
      for (const [k, v] of dtEntries) {
        const dt = document.createElement("dt");
        dt.textContent = labelise(k);
        const dd = document.createElement("dd");
        if (Array.isArray(v)) {
          dd.textContent = v.filter((x) => !isBlank(x)).join("; ");
        } else if (v && typeof v === "object") {
          const sub = document.createElement("dl");
          sub.className = "patient-subtable";
          for (const [kk, vv] of Object.entries(v)) {
            if (isBlank(vv) && !Array.isArray(vv) && typeof vv !== "object") continue;
            const sdt = document.createElement("dt");
            sdt.textContent = labelise(kk);
            const sdd = document.createElement("dd");
            sdd.textContent = Array.isArray(vv)
              ? vv.join("; ")
              : (vv && typeof vv === "object" ? JSON.stringify(vv) : String(vv));
            sub.appendChild(sdt); sub.appendChild(sdd);
          }
          dd.appendChild(sub);
        } else {
          renderClinicalValue(dd, labelise(k), String(v));
        }
        dl.appendChild(dt); dl.appendChild(dd);
      }
      dtWrap.replaceWith(dl);
    } else {
      dtWrap.hidden = true;
    }

    document.getElementById("qLeadIn").textContent = q.lead_in;

    const ol = document.getElementById("qOptions");
    ol.innerHTML = "";
    ol.setAttribute("role", "radiogroup");
    ol.setAttribute("aria-label", q.lead_in || "Answer options");
    // One citation per source. Rationales end in "(Source: X)" and the
    // option also carries X in source_refs, so the trailing bracket is
    // dropped in favour of the caption, and the caption itself is dropped
    // when every option cites the same thing, since Sources already says it.
    const refKey = o => (o.source_refs || []).join(", ");
    const oneSource = !!(q.sources && q.sources.length) &&
      shuffled.every(o => refKey(o) === refKey(shuffled[0]));
    const SOURCE_TAIL = /\s*\(Sources?:(?:[^()]|\([^()]*\))*\)\s*\.?\s*$/i;
    shuffled.forEach((opt, i) => {
      const li = document.createElement("li");
      li.dataset.letter = opt.letter;
      const hasRefs = !!(opt.source_refs && opt.source_refs.length);
      const cite = hasRefs && !oneSource
        ? `<span class="cite">${esc(refKey(opt))}</span>` : "";
      let rationale = String(opt.rationale || "");
      if (hasRefs && SOURCE_TAIL.test(rationale)) {
        rationale = rationale.replace(SOURCE_TAIL, "");
        if (rationale && !/[.!?]$/.test(rationale)) rationale += ".";
      }
      // The row itself carries the radio semantics. The eliminate control
      // is a separate button inside it, so a screen reader hears one
      // choice and one toggle rather than two competing controls.
      li.innerHTML = `
        <span class="opt-choice" role="radio" tabindex="${i === 0 ? 0 : -1}"
              aria-checked="false" aria-label="${esc(opt.letter + ". " + opt.text)}">
          <span class="opt-marker" aria-hidden="true"></span>
          <span class="opt-letter" aria-hidden="true">${opt.letter}</span>
          <span class="opt-body">
            <span class="opt-text">${esc(opt.text)}</span>
            <span class="opt-rationale"><b>${opt.correct ? "Correct." : "Incorrect."}</b> ${esc(rationale)}${cite}</span>
          </span>
        </span>
        <button type="button" class="opt-strike" data-letter="${opt.letter}"
                aria-pressed="false" title="Rule out (shift+${i + 1})">
          <span class="opt-strike-icon" aria-hidden="true">${ICON_RULE_OUT}</span>
          <span class="visually-hidden">Rule out ${esc(opt.text)}</span>
        </button>
        <span class="opt-key" aria-hidden="true">${i + 1}</span>
      `;
      li.querySelector(".opt-strike").addEventListener("click", e => {
        e.stopPropagation();
        toggleStrike(q.id, opt.letter, li);
      });
      li.addEventListener("click", () => selectOption(q, opt, li));
      li.querySelector(".opt-choice").addEventListener("keydown", e => {
        if (e.key !== " " && e.key !== "Enter") return;
        // Radio pattern: the first press only selects. Stopped here, or
        // the quiz handler would see Submit enabled and commit on the same
        // keystroke. A second press on the selected row goes through, and
        // submits.
        if (li.classList.contains("selected")) return;
        e.preventDefault();
        e.stopPropagation();
        selectOption(q, opt, li);
      });
      ol.appendChild(li);
    });

    if (state.quiz.struck[q.id]) {
      state.quiz.struck[q.id].forEach(l => {
        const x = ol.querySelector(`li[data-letter="${l}"]`); if (x) paintStrike(x, true);
      });
    }
    if (state.quiz.answers[q.id]) {
      const sel = ol.querySelector(`li[data-letter="${state.quiz.answers[q.id]}"]`);
      if (sel) {
        sel.classList.add("selected");
        const c = sel.querySelector(".opt-choice");
        if (c) { c.setAttribute("aria-checked", "true"); c.tabIndex = 0; }
        ol.querySelectorAll(".opt-choice").forEach(c2 => {
          if (c2 !== c) c2.tabIndex = -1;
        });
      }
      document.getElementById("submitBtn").disabled = false;
    }

    const submitBtn = document.getElementById("submitBtn");
    submitBtn.onclick = onSubmit;
    // A test reveals nothing: the answer is kept as soon as it is chosen,
    // so the button only moves on, and on the last question it finishes.
    if (state.quiz.mode === "test") {
      submitBtn.textContent = state.quiz.idx >= state.quiz.pool.length - 1
        ? "Finish test" : "Next";
    }
    document.getElementById("nextBtn").onclick = onNext;
    // A second Next at the foot of the commentary, so a reader who has
    // scrolled through it on a phone does not have to scroll back up.
    const nextEnd = document.getElementById("nextBtnEnd");
    if (nextEnd) nextEnd.onclick = onNext;
    const flagBtn = document.getElementById("flagBtn");
    flagBtn.onclick = () => {
      const on = !state.flags[q.id];
      // Local first, so the button answers at once; the outbox carries
      // the change to the server.
      if (on) state.flags[q.id] = true;
      else    delete state.flags[q.id];
      save(ns(FLAGS_KEY), state.flags);
      setFlagBtn(flagBtn, on);
      renderTopbar();
      if (cloudUser) cloudPostFlag(q.id, on);
    };
    setFlagBtn(flagBtn, !!state.flags[q.id]);

    // The click handler is delegated globally (see wireReportModal).
    // Here we just update the button's visual state for the current Q.
    const repBtn = document.getElementById("reportBtn");
    if (repBtn) {
      const open = state.reports.filter(r => r.question_id === q.id && r.status === "open").length;
      repBtn.classList.toggle("has-report", open > 0);
      repBtn.title = open
        ? `${open} open report${open === 1 ? "" : "s"} on this question (click to add another)`
        : "Report an issue with this question";
    }

    if (state.quiz.revealed[q.id]) revealAnswer(q);
  }

  function toggleStrike(id, letter, li) {
    if (state.quiz.revealed[id]) return;
    state.quiz.struck[id] = state.quiz.struck[id] || new Set();
    const on = !state.quiz.struck[id].has(letter);
    if (on) {
      state.quiz.struck[id].add(letter);
      if (state.quiz.answers[id] === letter) {
        delete state.quiz.answers[id];
        li.classList.remove("selected");
        const c = li.querySelector(".opt-choice");
        if (c) c.setAttribute("aria-checked", "false");
        document.getElementById("submitBtn").disabled = true;
      }
    } else {
      state.quiz.struck[id].delete(letter);
    }
    paintStrike(li, on);
    saveSession();
  }

  // Keeps the row's classes, the button's pressed state and, crucially,
  // its icon in step. A struck row's control shows a restore arrow, so
  // it is obvious that clicking again undoes it.
  function paintStrike(li, on) {
    li.classList.toggle("struck", on);
    const btn = li.querySelector(".opt-strike");
    if (!btn) return;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    const icon = btn.querySelector(".opt-strike-icon");
    if (icon) icon.innerHTML = on ? ICON_RESTORE : ICON_RULE_OUT;
    const n = li.querySelector(".opt-key");
    const num = n ? n.textContent : "";
    btn.title = on ? `Restore (shift+${num})` : `Rule out (shift+${num})`;
    const sr = btn.querySelector(".visually-hidden");
    const txt = (li.querySelector(".opt-text") || {}).textContent || "";
    if (sr) sr.textContent = (on ? "Restore " : "Rule out ") + txt;
  }

  function onSubmit() {
    const q = state.quiz.pool[state.quiz.idx];
    if (!state.quiz.answers[q.id]) return;
    // A test answer is recorded once, at scoring (commitTestAnswers), so
    // Next here only moves on. Going back to check an answer and pressing
    // Enter does not log it a second time. No House quote in a test: it
    // is a timed exam, and the quote belongs to study sessions.
    if (state.quiz.mode === "test") { onNext(); return; }
    if (state.quiz.revealed[q.id]) return;
    const elapsedMs = state.questionStart ? Math.min(1000 * 60 * 30, Date.now() - state.questionStart) : 0;
    const { chosen, isC } = recordAttempt(q, state.quiz.answers[q.id], elapsedMs);
    save(ns(HISTORY_KEY), state.history);
    state.quiz.revealed[q.id] = true;
    saveSession();
    maybeShowHouseQuote();
    // Sync this answer to the server (fire-and-forget) so history, attempt
    // counts and the Unseen / Previously-incorrect filters survive a device
    // change.
    if (cloudUser && chosen && chosen.sourceLetter) {
      cloudPostAnswer(q.id, chosen.sourceLetter, isC);
    }
    revealAnswer(q);
    renderTopbar();
    // Study mode only: a test must not say whether an answer was right.
    const key = _shuffledOptions(q).find(o => o.correct);
    announce(isC ? "Correct." : `Incorrect. The answer is ${key ? key.letter : "not marked"}.`);
  }


  function revealAnswer(q) {
    document.querySelectorAll("#qOptions li").forEach(li => {
      const letter = li.dataset.letter;
      const opt = _shuffledOptions(q).find(o => o.letter === letter);
      li.classList.add("revealed");
      li.classList.remove("selected");
      if (opt.correct) li.classList.add("correct");
      else if (state.quiz.answers[q.id] === letter) li.classList.add("wrong");
    });
    renderStemWithClues(q);

    const ex = document.getElementById("explainBlock");
    ex.hidden = false;

    // What the question was testing heads its commentary. It is only
    // shown after the answer is committed, since before that it would
    // give the answer away. subtopic_detail is the specific phrase; the
    // broad q.subtopic is for grouping. Authors start it lowercase.
    const subLabel = String(q.subtopic_detail || q.subtopic || "").trim();
    const head = ex.querySelector(".comm-head");
    if (head) head.textContent = subLabel
      ? subLabel.charAt(0).toUpperCase() + subLabel.slice(1) : "Commentary";
    const meta = ex.querySelector(".comm-meta");
    if (meta) {
      meta.textContent = q.difficulty ? `Difficulty ${q.difficulty} of 5` : "";
      meta.hidden = !q.difficulty;
    }

    // The Why-is-correct block in the HTML stays hidden and empty: every
    // option shows its own rationale after the reveal. "In context"
    // (explainSummary) is what adds to them: condition background, key
    // points, pearls.

    const sum = explanationOf(q);
    const sumWrap = document.getElementById("explainSummary");
    sumWrap.innerHTML = "";
    // A summary can carry blank-line paragraph breaks; each one becomes
    // its own <p> rather than collapsing into one run-on block.
    const paras = t => String(t).split(/\n\s*\n/).map(x => x.trim()).filter(Boolean)
      .map(x => `<p>${esc(x)}</p>`).join("");
    if (sum.summary) sumWrap.innerHTML += paras(sum.summary);
    if (sum.key_points && sum.key_points.length) {
      sumWrap.innerHTML += `<ul>${sum.key_points.map(p => `<li>${esc(p)}</li>`).join("")}</ul>`;
    }
    // Some Medicine questions carry a `context` paragraph in place of
    // pearls.
    if (sum.context) sumWrap.innerHTML += paras(sum.context);
    if (sum.pearls) sumWrap.innerHTML += `<div class="pearl"><b>Pearl.</b> ${esc(sum.pearls)}</div>`;

    // Only an absolute http(s) URL becomes a link. Anything else (a
    // markdown-wrapped URL, an empty string) would resolve against the
    // Pages origin and 404, so it renders as the plain label instead.
    document.getElementById("explainSources").innerHTML = (q.sources || []).map(s =>
      s && typeof s.url === "string" && /^https?:\/\//i.test(s.url)
        ? `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`
        : `<li>${esc(s && s.label)}</li>`
    ).join("");

    const rl = document.getElementById("explainRanges");
    rl.innerHTML = "";
    if (q.reference_ranges && q.reference_ranges.length) {
      // q.topic gates which panels may appear: a paediatric panel never
      // renders under an adult question even if the question asks for it.
      rl.innerHTML = renderInlineRanges(q.reference_ranges, q.topic);
      if (!rl.dataset.wired) {
        rl.addEventListener("click", e => {
          const b = e.target.closest(".ir-open");
          if (b) openRefs([b.dataset.refKey]);
        });
        rl.dataset.wired = "1";
      }
    }

    document.getElementById("submitBtn").hidden = true;
    document.getElementById("nextBtn").hidden = false;
    // Focus without scrolling so the user keeps the rationale + option
    // breakdown in view. Enter still advances to the next question
    // because the button has keyboard focus.
    document.getElementById("nextBtn").focus({ preventScroll: true });
    // Frame the reveal on the correct answer: that row is what the reveal
    // is about, and a wrong pick is already marked red where it sits.
    // Instant, like every other question change; a smooth scroll of a
    // phone-length rationale takes over half a second. rAF defers until
    // the explainBlock has reflowed.
    requestAnimationFrame(() => {
      const anchorLi = document.querySelector("#qOptions li.revealed.correct");
      const nextBtn = document.getElementById("nextBtn");
      if (anchorLi && nextBtn) {
        const aRect = anchorLi.getBoundingClientRect();
        const nRect = nextBtn.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        // If both already fit, do nothing. Otherwise scroll so the
        // answer row is near the top and the Next button is in view
        // (or as close as the document allows).
        const fits = aRect.top >= 0 && nRect.bottom <= vh;
        if (!fits) {
          const targetTop = window.scrollY + aRect.top - 80;
          window.scrollTo({ top: Math.max(0, targetTop), behavior: "instant" });
        }
      } else if (nextBtn) {
        nextBtn.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
      // The Next at the foot of the commentary is for a reader who has
      // scrolled past the one under the options. When both would sit on
      // the same screen it is the same button twice, so it stays hidden.
      const endBtn = document.getElementById("nextBtnEnd");
      const endWrap = endBtn && endBtn.closest(".commentary-next");
      if (endWrap && nextBtn) {
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const apart = endBtn.getBoundingClientRect().bottom - nextBtn.getBoundingClientRect().top;
        endWrap.hidden = apart < vh;
      }
    });
  }

  async function onNext() {
    const quiz = state.quiz;
    if (quiz.reviewing) {
      // The last row of a review goes back to the report.
      const i = navTarget(+1);
      if (i < 0) backToResults(); else jumpTo(i);
      return;
    }
    if (quiz.idx + 1 >= quiz.pool.length) {
      // The last question of a test asks before scoring while anything
      // is unanswered or flagged.
      if (quiz.mode === "test" && !quiz.finished) {
        const open = quiz.pool.filter(q => !quiz.answers[q.id]).length;
        const flagged = quiz.pool.filter(q => state.flags[q.id]).length;
        if (open || flagged) {
          const parts = [];
          if (open) parts.push(`${fmtNum(open)} unanswered`);
          if (flagged) parts.push(`${fmtNum(flagged)} flagged`);
          const ok = await adminConfirm({
            title: "Finish the test now?",
            body: parts.join(", ") + ".",
            confirmLabel: "Finish test",
            tone: "primary",
          });
          if (!ok || state.quiz !== quiz || quiz.finished) return;
        }
      }
      stopSessionTimer();
      showSummary(false);
      return;
    }
    quiz.idx += 1;
    navFollowCurrent = true;
    renderQuiz();
    // Saved after the move, so a reload resumes on the new question, not
    // one behind.
    saveSession();
  }

  // ── Reference panel (fixed side overlay; no scrim, no dim) ──────────────
  // The question pane stays fully interactable while the panel is open.
  // Interacting with the question does NOT close the panel - the panel only
  // closes when the user clicks ×, presses L again, or presses Escape.
  function wireRefPanel() {
    document.getElementById("refClose").onclick = () => closeRefs();
    document.getElementById("rangesSearch").addEventListener("input", e =>
      filterRanges(e.target.value.toLowerCase()));
  }
  function toggleRefs() {
    if (state.refsOpen) return closeRefs();
    return openRefs();
  }
  function openRefs(restrictKeys) {
    state.refsOpen = true;
    renderRefBody(restrictKeys);
    const panel = document.getElementById("refPanel");
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("refs-open");
    document.getElementById("rangesSearch").value = "";
    // No focus theft - the user keeps interacting with the question.
  }
  function closeRefs() {
    state.refsOpen = false;
    const panel = document.getElementById("refPanel");
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("refs-open");
  }
  // Curated quick-jump pills. Each maps to a category key in
  // reference_ranges.json. The order is the user's expected reach
  // frequency in a clinical question - common bloods first.
  const REF_JUMP_PILLS = [
    { label: "FBC",    key: "fbc" },
    { label: "U&E",    key: "uec" },
    { label: "LFT",    key: "lfts" },
    { label: "ABG",    key: "abg" },
    { label: "VBG",    key: "vbg" },
    { label: "Urine",  key: "urine_dipstick" },
    { label: "Paeds",  key: "paeds_fbc" },
    { label: "Glucose", key: "glucose_hba1c" },
    { label: "Thyroid", key: "thyroid" },
    { label: "Coag",   key: "coags" },
    { label: "CSF",    key: "csf" },
    { label: "Iron",   key: "iron_studies" },
  ];

  function renderRefBody(restrictKeys) {
    const body = document.getElementById("rangesBody");
    const jump = document.getElementById("refJump");
    body.innerHTML = "";
    if (jump) jump.innerHTML = "";
    const cats = (state.ranges && state.ranges.categories) || {};
    const keys = restrictKeys && restrictKeys.length ? restrictKeys : Object.keys(cats);
    if (!keys.length || Object.keys(cats).length === 0) {
      body.innerHTML = `<p class="dim">No reference data loaded.</p>`;
      return;
    }

    // Quick-jump pills: only render those whose key exists in the data
    // and isn't restricted away by a question-specific subset. Uses a
    // single delegated listener on the container instead of one per pill
    // so re-renders don't accumulate handlers.
    if (jump && (!restrictKeys || !restrictKeys.length)) {
      jump.innerHTML = REF_JUMP_PILLS
        .filter(p => cats[p.key])
        .map(p => `<button class="ref-pill" data-key="${esc(p.key)}">${esc(p.label)}</button>`)
        .join("");
      if (!jump.dataset.wired) {
        jump.addEventListener("click", e => {
          const btn = e.target.closest(".ref-pill");
          if (!btn) return;
          const target = body.querySelector(`.range-cat[data-key="${btn.dataset.key}"]`);
          if (target) target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
        });
        jump.dataset.wired = "1";
      }
    }

    keys.forEach(k => {
      const cat = cats[k]; if (!cat) return;
      const div = document.createElement("section");
      div.className = "range-cat";
      div.dataset.key = k;
      const rows = (cat.ranges || []).map(refRowHtml).join("");
      div.innerHTML = `<h3>${esc(cat.label || k)}</h3><div class="rrs">${rows}</div>` +
        (cat.notes ? `<p class="range-note">${esc(cat.notes)}</p>` : "");
      body.appendChild(div);
    });
  }

  // Search: filter at row-level (not category-level) so a search for
  // "potassium" surfaces only the row, not whole categories.
  function filterRanges(term) {
    term = (term || "").trim().toLowerCase();
    const hit = document.getElementById("rangesSearchHit");
    let matches = 0;
    document.querySelectorAll("#rangesBody .range-cat").forEach(cat => {
      let visibleRows = 0;
      cat.querySelectorAll(".rr").forEach(row => {
        const text = row.textContent.toLowerCase();
        const show = !term || text.includes(term);
        row.classList.toggle("rr-hidden", !show);
        if (show) { visibleRows++; matches++; }
      });
      const catLabel = (cat.querySelector("h3")?.textContent || "").toLowerCase();
      const catMatches = !term || catLabel.includes(term);
      // Show category if any row matches OR the category title itself matches.
      cat.classList.toggle("hidden", !visibleRows && !catMatches);
      // If category title matches but no rows, un-hide all rows so user can scan.
      if (term && !visibleRows && catMatches) {
        cat.querySelectorAll(".rr").forEach(r => r.classList.remove("rr-hidden"));
      }
    });
    if (hit) {
      if (term) {
        hit.hidden = false;
        hit.textContent = `${matches} match${matches === 1 ? "" : "es"}`;
      } else {
        hit.hidden = true;
      }
    }
    const jump = document.getElementById("refJump");
    if (jump) jump.style.display = term ? "none" : "";
  }

  // ── Timers ──────────────────────────────────────────────────────────────
  // Every session start and review entry comes through here, so this is
  // where a pause left over from the last session is cleared.
  function startSessionTimer() {
    stopSessionTimer();
    resetPause();
    // 1-second precision is enough for both the session clock and any
    // countdown.
    state.timerInterval = setInterval(tick, 1000);
    tick();
  }
  function stopSessionTimer() {
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  }
  function tick() {
    if (!state.quiz) return;
    // Pause button is only shown when meaningful: a countdown timer is
    // running, or we're currently paused (so the user can resume).
    const pauseBtn = document.getElementById("pauseBtn");
    if (pauseBtn) {
      pauseBtn.hidden = !(state.quiz.deadline || state.paused);
    }
    if (state.paused) return;
    const sessMs = Date.now() - state.sessionStart;
    document.getElementById("sessionTime").textContent = "session " + fmtClock(sessMs);
    const qEl = document.getElementById("questionTime");
    const sep = document.getElementById("qTimerSep");
    if (state.quiz.deadline) {
      const remain = state.quiz.deadline - Date.now();
      if (remain <= 0) {
        qEl.textContent = "time up";
        qEl.classList.add("danger");
        sep.hidden = false;
        stopSessionTimer();
        showSummary(true);
        return;
      }
      qEl.textContent = fmtClock(remain) + " left";
      qEl.classList.toggle("warn",   remain < 5 * 60000 && remain >= 60000);
      qEl.classList.toggle("danger", remain < 60000);
      sep.hidden = false;
      // The clock itself is not a live region (it would be read out every
      // second), so crossing a threshold is announced once instead.
      const level = remain < 60000 ? 2 : remain < 5 * 60000 ? 1 : 0;
      if (level > (state.quiz._timeLevel || 0)) {
        state.quiz._timeLevel = level;
        announce(level === 2 ? "1 minute left." : "5 minutes left.");
      }
    } else if (state.quiz.mode === "test") {
      // Test mode without countdown: time on the current question. Study
      // mode shows none; nothing there is being timed.
      qEl.textContent = "Q " + fmtClock(Date.now() - state.questionStart);
      sep.hidden = false;
    } else {
      qEl.textContent = "";
      sep.hidden = true;
    }
  }
  function togglePause() {
    state.paused = !state.paused;
    paintPauseBtn();
    if (state.quiz && state.quiz.deadline && state.paused) {
      state.quiz._pausedAt = Date.now();
    } else if (state.quiz && state.quiz.deadline && state.quiz._pausedAt) {
      const off = Date.now() - state.quiz._pausedAt;
      state.quiz.deadline += off;
      state.sessionStart += off;
      state.questionStart += off;
      state.quiz._pausedAt = null;
      // Saved, or a reload after an unpause would charge the paused
      // minutes to the clock.
      saveSession();
    }
  }
  function fmtClock(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  // ── Keyboard ────────────────────────────────────────────────────────────
  // Letters are not directions here: A to E name the options on screen,
  // so they select like 1 to 5. Only the arrow keys navigate.
  const DIR_MAP = {
    "arrowup": "up", "arrowdown": "down",
    "arrowleft": "left", "arrowright": "right",
  };
  function bindQuizKeys() {
    document.onkeydown = e => {
      if (e.defaultPrevented) return;
      const t = e.target;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable) return;
      // Nothing here may act on the question behind an open dialog or
      // modal.
      if (document.querySelector("dialog[open], .modal:not([hidden])")) return;
      // Enter and Space belong to whatever control has focus: a button,
      // a link in the commentary, the Keyboard <summary>. Taking them
      // here would cancel the control and submit or advance instead.
      if ((e.key === "Enter" || e.key === " ") && t.closest &&
          t.closest("button, a[href], summary, [role=button]")) return;
      // Modifier-key shortcuts belong to the browser / OS. Shift is the
      // exception: shift+number is the qbank convention for ruling an
      // option out, handled below.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const q = state.quiz && state.quiz.pool[state.quiz.idx];
      if (!q) return;
      // Which option a number key means, read off the physical key. Shift
      // turns 1 into " or § on UK, German and French layouts, and AZERTY
      // needs Shift for the digits at all, so e.key alone would miss them.
      const codeDigit = /^(?:Digit|Numpad)([1-5])$/.exec(e.code || "");
      const digitIdx = codeDigit ? parseInt(codeDigit[1], 10) - 1
        : "!@#$%".indexOf(e.key) >= 0 && e.key.length === 1 ? "!@#$%".indexOf(e.key)
        : /^[1-5]$/.test(e.key) ? parseInt(e.key, 10) - 1
        : /^[a-e]$/i.test(e.key) ? "abcde".indexOf(e.key.toLowerCase()) : -1;
      const k = e.key.toLowerCase();
      const dir = DIR_MAP[k];
      const submitBtn = document.getElementById("submitBtn");
      const nextBtn   = document.getElementById("nextBtn");
      const revealed  = !!state.quiz.revealed[q.id];
      const selected  = document.querySelector("#qOptions li.selected");
      const canSubmit = !revealed && submitBtn && !submitBtn.disabled;
      const canNext   = revealed && nextBtn && !nextBtn.hidden;

      if (e.shiftKey && digitIdx >= 0) {
        // shift+1..5 rules out the matching option, and rules it back in.
        const letter = "ABCDE"[digitIdx];
        const li = document.querySelector(`#qOptions li[data-letter="${letter}"]`);
        if (li && !revealed) toggleStrike(q.id, letter, li);
        e.preventDefault();
      } else if (!e.shiftKey && digitIdx >= 0) {
        // A number or letter selects its option and never commits: Enter,
        // a second Space on the selected row, or the button does that.
        const letter = "ABCDE"[digitIdx];
        const li = document.querySelector(`#qOptions li[data-letter="${letter}"]`);
        // Pressing the number of the option that is already selected
        // takes it back off, so the key that chose it is the key that
        // undoes it.
        if (li && !revealed) {
          if (li.classList.contains("selected")) deselectOption(q, li);
          else li.click();
        }
        e.preventDefault();
      } else if (k === "enter" || (k === " " && t.closest && t.closest(".opt-choice"))) {
        // Enter commits the selection, then moves on once revealed. Space
        // does the same only on an option row (the second press on the
        // selected row); elsewhere it is left to scroll the page.
        if (canNext) nextBtn.click();
        else if (canSubmit) submitBtn.click();
        e.preventDefault();
      } else if (k === "f") {
        document.getElementById("flagBtn").click();
      } else if (k === "x") {
        // x rules out whatever is currently selected.
        if (selected) toggleStrike(q.id, selected.dataset.letter, selected);
      } else if (k === "l") {
        toggleRefs();
      } else if (dir === "left") {
        navOffset(-1);
        e.preventDefault();
      } else if (dir === "right") {
        // Navigation only. A selection is never committed by an arrow, so
        // stepping back through a session and forward again changes nothing.
        if (canNext) nextBtn.click();
        else navOffset(1);
        e.preventDefault();
      } else if (dir === "up" || dir === "down") {
        if (revealed) { e.preventDefault(); return; }
        const items = Array.from(document.querySelectorAll("#qOptions li"));
        if (!items.length) { e.preventDefault(); return; }
        const n = items.length;
        const cur = items.findIndex(li => li.classList.contains("selected"));
        // Step over ruled-out rows: clicking one restores it, so landing
        // on it would undo the elimination.
        const step = dir === "down" ? 1 : -1;
        let nextIdx = -1;
        for (let s = 1; s <= n; s++) {
          const j = ((cur === -1 ? (step > 0 ? -1 : n) : cur) + step * s + n * 2) % n;
          if (j === cur) break;
          if (!items[j].classList.contains("struck")) { nextIdx = j; break; }
        }
        if (nextIdx < 0) { e.preventDefault(); return; }
        items[nextIdx].click();
        // Keep the newly-selected option in view so keyboard browsing
        // works on short viewports without the user reaching for the
        // wheel. `block: nearest` won't scroll if already in view.
        if (items[nextIdx].scrollIntoView) {
          items[nextIdx].scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
        }
        e.preventDefault();
      }
    };
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  function showSummary(timeUp) {
    const quiz = state.quiz;
    // Back from a review: the report is drawn again from the same state,
    // so nothing below may run twice (the test commit, above all).
    const returning = !!quiz.reviewing;
    const returnIdx = quiz.idx;
    quiz.reviewing = false;
    quiz.reviewList = null;
    if (!quiz.finished) {
      chargeQuestionTime();
      // Unrevealed study picks never reached history, so they are not
      // scored either (see isAnswerCounted).
      if (quiz.mode === "study") {
        for (const id of Object.keys(quiz.answers)) if (!quiz.revealed[id]) delete quiz.answers[id];
      }
      commitTestAnswers(quiz);
    }
    if (timeUp) quiz.timeUp = true;
    timeUp = !!quiz.timeUp;
    state.quiz.finished = true;
    clearSavedSession();
    document.onkeydown = null;
    setScreen("summary");
    const app = document.getElementById("app");
    app.innerHTML = "";
    app.appendChild(document.getElementById("tpl-summary").content.cloneNode(true));

    const pool = state.quiz.pool;
    const answered = pool.filter(q => state.quiz.answers[q.id]);
    let correct = 0;
    const byTopic = {};
    pool.forEach(q => {
      const ans = state.quiz.answers[q.id];
      const isC = ans && _shuffledOptions(q).find(o => o.letter === ans)?.correct;
      if (isC) correct++;
      const t = q.topic;
      byTopic[t] = byTopic[t] || { c: 0, n: 0, attempted: 0 };
      byTopic[t].n++;
      if (ans) byTopic[t].attempted++;
      if (isC) byTopic[t].c++;
    });
    // A study session is scored on what was answered; the rest of its
    // pool was never reached and is not mentioned. A test is scored out
    // of its full length, so its unanswered questions are named.
    const study = state.quiz.mode === "study";
    const denom = study ? answered.length : pool.length;
    const pct = denom ? Math.round(100 * correct / denom) : 0;
    document.getElementById("scorePct").textContent = `${pct}%`;
    let line = study && !denom ? "Nothing answered"
      : `${fmtNum(correct)} of ${fmtNum(denom)} correct`;
    if (!study && answered.length < pool.length)
      line += `, ${fmtNum(pool.length - answered.length)} unanswered`;
    if (timeUp) line += " (time ran out)";
    line += ".";
    document.getElementById("scoreLine").textContent = line;

    const tb = document.getElementById("topicBreakdown");
    tb.innerHTML = "";
    Object.entries(byTopic).sort().forEach(([t, r]) => {
      const d = study ? r.attempted : r.n;
      // A discipline the session never touched is not a result.
      if (!d) return;
      const p = Math.round(100 * r.c / d);
      const row = document.createElement("div");
      row.className = "topic-row";
      row.innerHTML =
        `<span>${esc(t)}</span>` +
        `<div class="bar-track"><div class="bar-fill" style="width:${p}%;"></div></div>` +
        `<span class="topic-pct">${r.c}/${d}</span>`;
      tb.appendChild(row);
    });

    // Back from a review, the list comes back as it was left: the same
    // filter, paged far enough to hold the row just read, and focus on
    // that row.
    const filter = returning ? _reviewFilter : "all";
    let shown;
    if (returning) {
      const pos = reviewRows(filter).findIndex(r => r.i === returnIdx);
      shown = Math.max(_reviewShown, Math.ceil((pos + 1) / REVIEW_PAGE) * REVIEW_PAGE);
    }
    renderReviewList(filter, shown);
    const paintFilters = f => document.querySelectorAll("#reviewFilters .opt").forEach(x => {
      x.classList.toggle("selected", x.dataset.review === f);
      x.setAttribute("aria-pressed", x.dataset.review === f ? "true" : "false");
    });
    document.querySelectorAll("#reviewFilters .opt").forEach(c => {
      c.onclick = () => {
        paintFilters(c.dataset.review);
        renderReviewList(c.dataset.review);
      };
    });
    paintFilters(filter);

    // Say how many, and do not offer the button when there are none.
    const retryBtn = document.getElementById("retryBtn");
    const wrongCount = pool.filter(q => {
      const a = state.quiz.answers[q.id];
      return a && !_shuffledOptions(q).find(o => o.letter === a)?.correct;
    }).length;
    retryBtn.textContent = `Retry ${wrongCount} incorrect`;
    retryBtn.hidden = wrongCount === 0;
    retryBtn.onclick = retryIncorrect;
    document.getElementById("newQuizBtn").onclick = showHome;

    // Focus follows the screen change: the reviewed row when coming back
    // from it, otherwise the report heading.
    const back = returning && document.querySelector(`#reviewList li[data-review-i="${returnIdx}"]`);
    if (back) {
      back.focus({ preventScroll: true });
      if (back.scrollIntoView) back.scrollIntoView({ block: "center" });
    } else {
      const h = app.querySelector("h1");
      if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    }
  }

  // The review list is built as one string and delegated, not 7,000
  // elements with 7,000 closures. A study session's pool is whatever
  // matched the filters - the whole bank, by default - and only the
  // questions actually seen are worth listing, so the rest are behind a
  // "show the rest" control rather than rendered up front.
  const REVIEW_PAGE = 100;
  let _reviewFilter = "all";
  let _reviewShown = REVIEW_PAGE;

  function reviewRows(filter) {
    const rows = [];
    const quiz = state.quiz;
    // A study session lists what it reached; a question flagged in some
    // earlier session further down the shuffle is not part of this one.
    const span = quiz.mode === "study" ? navSpan() : quiz.pool.length;
    quiz.pool.slice(0, span).forEach((q, i) => {
      const ans = quiz.answers[q.id];
      const isC = ans && _shuffledOptions(q).find(o => o.letter === ans)?.correct;
      const flagged = !!state.flags[q.id];
      if (filter === "incorrect" && (isC || !ans)) return;
      if (filter === "flagged" && !flagged) return;
      // In a study session "All" is what was answered or flagged. A test
      // is marked out of every question, so its unanswered ones are
      // listed too.
      if (filter === "all" && quiz.mode === "study" && !ans && !flagged) return;
      rows.push({ q, i, ans, isC, flagged });
    });
    return rows;
  }

  // A review row is identified by what the stem is about. Most stems
  // open with the reader's role ("You are the general practitioner
  // seeing a 71 year old man..."), which made every row start the same,
  // so that clause is skipped.
  function stemOpening(stem, max) {
    let s = String(stem || "").replace(/\s+/g, " ").trim();
    const WHO = "newborn|baby|infant|toddler|child|boy|girl|man|woman|teenager|adolescent|young|" +
      "previously|healthy|term|preterm|primigravida|multigravida|primiparous|multiparous|" +
      "nulliparous|pregnant|couple|mother|father|patient";
    const role = new RegExp(`^You are [^.]*?\\b(?=(?:a|an|the) (?:\\d|G\\d|(?:${WHO})\\b))`, "i").exec(s);
    if (role) s = s.slice(role[0].length);
    else {
      // "You are the doctor in a sexual health clinic. A 26 year old..."
      // Only a first sentence that is about the setting alone is skipped.
      const lead = /^You are (?:the|a|an) [^.]*\.\s+/i.exec(s);
      if (lead && lead[0].length < s.length && !/\d/.test(lead[0]) &&
          !new RegExp(`\\b(?:${WHO})\\b`, "i").test(lead[0])) s = s.slice(lead[0].length);
    }
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (s.length <= max) return s;
    const cut = s.slice(0, max);
    const sp = cut.lastIndexOf(" ");
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:.]+$/, "") + "…";
  }

  function renderReviewList(filter, shown) {
    const ol = document.getElementById("reviewList");
    _reviewFilter = filter;
    _reviewShown = shown || REVIEW_PAGE;
    const rows = reviewRows(filter);
    const page = rows.slice(0, _reviewShown);
    const html = page.map(({ q, i, ans, isC, flagged }) => {
      const cls = (!ans ? "unanswered" : (isC ? "correct" : "incorrect")) + (flagged ? " flagged" : "");
      const glyph = !ans ? "·" : (isC ? "✓" : "✗");
      // A row opens its question, so it takes focus and Enter like a
      // button. The glyph gets words, and flagged is written out rather
      // than left to the row tint.
      const said = (!ans ? "Unanswered" : (isC ? "Correct" : "Incorrect")) + (flagged ? ", flagged" : "");
      return `<li class="${cls}" data-review-i="${i}" data-qid="${esc(q.id)}" role="button" tabindex="0">` +
        `<span class="rv-status"><span aria-hidden="true">${glyph}</span>` +
        `<span class="visually-hidden">${said}.</span></span>` +
        `<span class="rv-stem">${flagged ? '<b class="rv-flag">Flagged</b> ' : ""}` +
        `${esc(stemOpening(q.stem, 110))}</span></li>`;
    }).join("");
    const rest = rows.length - page.length;
    if (rows.length) {
      ol.innerHTML = html + (rest > 0
        ? `<li class="rv-empty"><button type="button" class="link-btn" id="reviewMore">` +
          `Show ${rest} more</button></li>`
        : "");
    } else {
      const EMPTY = {
        incorrect: "No incorrect answers this session. All shows the ones you got right.",
        flagged: "Nothing was flagged in this session.",
      };
      ol.innerHTML = `<li class="rv-empty">${EMPTY[filter] || "Nothing was answered or flagged in this session."}</li>`;
    }
    const more = document.getElementById("reviewMore");
    if (more) more.onclick = () => renderReviewList(_reviewFilter, _reviewShown + REVIEW_PAGE);
    if (!ol.dataset.reviewWired) {
      ol.dataset.reviewWired = "1";
      const open = li => {
        state.quiz.idx = parseInt(li.dataset.reviewI, 10);
        // The session has been scored, so review is read-only: every
        // question is revealed, or an answer given after seeing the score
        // would land in history. The countdown is over too; a deadline
        // left set would send the first tick straight back to the summary.
        for (const p of state.quiz.pool) state.quiz.revealed[p.id] = true;
        state.quiz.deadline = null;
        // A review is its own state, not an unfinished session: clearing
        // `finished` would make the scored session resumable again and
        // hide right / wrong on a test's navigator.
        state.quiz.reviewing = true;
        // Next and Previous walk the rows the report was showing.
        state.quiz.reviewList = reviewRows(_reviewFilter).map(r => r.i);
        resetNavigator();
        setScreen("quiz");
        renderQuiz();
        startSessionTimer();
      };
      ol.addEventListener("click", e => {
        const li = e.target.closest("li[data-review-i]");
        if (li) open(li);
      });
      ol.addEventListener("keydown", e => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const li = e.target.closest("li[data-review-i]");
        if (!li || e.target !== li) return;
        e.preventDefault();
        open(li);
      });
    }
  }

  function backToResults() {
    if (!state.quiz) return;
    stopSessionTimer();
    showSummary(false);
  }

  function retryIncorrect() {
    // Answered and wrong. A question never reached is not incorrect: a
    // study pool is the whole bank.
    const wrong = state.quiz.pool.filter(q => {
      const ans = state.quiz.answers[q.id];
      return ans && !_shuffledOptions(q).find(o => o.letter === ans)?.correct;
    });
    if (!wrong.length) { showHome(); return; }
    resetNavigator();
    state.quiz = {
      pool: shuffle(wrong), idx: 0, mode: state.quiz.mode,
      timerMins: 0, deadline: null,
      answers: {}, struck: {}, revealed: {}, finished: false,
    };
    state.sessionStart = Date.now();
    setScreen("quiz");
    renderQuiz();
    startSessionTimer();
    // A retry is a session like any other and survives a reload.
    saveSession();
  }

  // ── Escape and the Content pane ─────────────────────────────────────
  // The app's one Escape handler, and the generation-prompt and paste
  // controls on the admin Content pane.
  function wireEscapeAndContentPane() {
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      // Close whichever overlay is topmost. Order matches z-stacking so a
      // report opened from within the admin modal closes first. The
      // confirm dialog is a native <dialog>, which handles its own
      // Escape, so it is deliberately absent here.
      const reportM = document.getElementById("reportModal");
      const statsM  = document.getElementById("statsModal");
      const adminM  = document.getElementById("adminModal");
      const confirmD = document.getElementById("confirmDialog");
      if (confirmD && confirmD.open)  { return; }
      if (reportM && !reportM.hidden) { closeReportModal(); return; }
      if (statsM && !statsM.hidden)   { statsM.hidden = true; return; }
      if (adminM && !adminM.hidden)   { adminM.hidden = true; adminClear(); return; }
      const qtList = document.getElementById("qtList");
      if (qtList && !qtList.hidden)   { closeQtList(); return; }
      if (state.refsOpen)             { closeRefs(); return; }
      // Last resort, and only once nothing is open: clear a
      // not-yet-submitted selection. It lives here, not in the quiz key
      // handler, so the Escape that closes the reference panel keeps the
      // answer the reader was checking a value against.
      const q = state.quiz && state.quiz.pool[state.quiz.idx];
      const sel = document.querySelector("#qOptions li.selected");
      if (q && sel && !state.quiz.revealed[q.id]) deselectOption(q, sel);
    });
    const toggleBtn = document.getElementById("promptToggleBtn");
    const promptPre = document.getElementById("promptText");
    if (toggleBtn && promptPre) toggleBtn.onclick = () => {
      promptPre.hidden = !promptPre.hidden;
      toggleBtn.textContent = promptPre.hidden ? "show prompt" : "hide prompt";
    };
    // The prompt is filled by fillPromptText() when the Content tab opens
    // and rendered again at copy time, so the bank counts are current.
    const promptText = document.getElementById("promptText");
    const copyBtn = document.getElementById("copyPromptBtn");
    const copyStatus = document.getElementById("copyPromptStatus");
    const COPY_LABEL = copyBtn ? copyBtn.textContent : "";
    let copyResetTimer = null;
    if (copyBtn) copyBtn.onclick = async () => {
      // Re-render so the live bank counts are current at copy time.
      promptText.textContent = renderPrompt((await loadPromptTemplate()) || "");
      let ok = false;
      try {
        await navigator.clipboard.writeText(promptText.textContent);
        ok = true;
      } catch {
        // Fallback: select the <pre> so the user can Cmd-C.
        const r = document.createRange();
        r.selectNodeContents(promptText);
        const sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(r);
      }
      if (ok) {
        copyBtn.classList.add("copied");
        copyBtn.textContent = "Copied";
        copyStatus.textContent = `Now paste it into ${auditLlmLabel()}.`;
        copyStatus.classList.add("ok");
      } else {
        copyBtn.classList.add("copy-failed");
        copyBtn.textContent = "Copy manually";
        copyStatus.textContent = "Clipboard blocked. The prompt is selected; copy it.";
      }
      clearTimeout(copyResetTimer);
      copyResetTimer = setTimeout(() => {
        copyBtn.classList.remove("copied", "copy-failed");
        copyBtn.textContent = COPY_LABEL;
        copyStatus.textContent = "";
        copyStatus.classList.remove("ok");
      }, 2200);
    };

    // Paste-questions flow.
    const pasteAddBtn = document.getElementById("pasteAddBtn");
    if (pasteAddBtn) pasteAddBtn.onclick = pasteAdd;
    const pasteDlBtn = document.getElementById("pasteDownloadBtn");
    if (pasteDlBtn) pasteDlBtn.onclick = pasteDownload;
    const localClearBtn = document.getElementById("localBankClear");
    if (localClearBtn) localClearBtn.onclick = clearLocalBank;
    const localExportBtn = document.getElementById("localBankExport");
    if (localExportBtn) localExportBtn.onclick = exportLocalBank;
    refreshLocalBankSummary();
  }

  // ── Report modal (per-question issue submission) ───────────────────────
  let _reportingQId = null;
  let _reportingModel = null;
  // Who a report is filed under. Reports land in a public file, so this is
  // an opaque id (never an email) and mirrors the ns() precedence so a
  // report can be traced back to the same namespace that raised it.
  function reporterId() {
    if (cloudUser) return "cloud-" + cloudUser.id;
    if (guestUser) return "guest-" + guestUser.id;
    return "guest";
  }
  function wireReportModal() {
    const m = document.getElementById("reportModal"); if (!m) return;
    document.getElementById("reportCancel").onclick = closeReportModal;
    m.addEventListener("click", e => { if (e.target.id === "reportModal") closeReportModal(); });
    document.getElementById("reportSubmit").onclick = submitReport;
    // Delegated click handler. The Report button lives inside the
    // tpl-quiz template that gets re-cloned on each question render,
    // so per-render onclick binding is brittle - delegate from body.
    document.body.addEventListener("click", e => {
      const btn = e.target && e.target.closest && e.target.closest("#reportBtn");
      if (!btn) return;
      e.preventDefault();
      const q = state.quiz && state.quiz.pool && state.quiz.pool[state.quiz.idx];
      if (!q) return;
      // Ids name the topic and sometimes the answer ("...-naloxone-half-
      // life"), so before the answer is shown the dialog gives the
      // position instead. The id still goes in the report itself.
      const shown = state.quiz.revealed[q.id] || state.quiz.finished;
      // Study mode has no fixed length, so it names the position alone.
      openReportModal(q.id, q.model, shown ? null
        : `Question ${fmtNum(state.quiz.idx + 1)}` +
          (state.quiz.mode === "test" ? ` of ${fmtNum(state.quiz.pool.length)}` : ""));
    });
  }
  function openReportModal(qid, model, label) {
    _reportingQId = qid;
    _reportingModel = model || null;
    document.getElementById("reportQId").textContent = label || `Question: ${qid}`;
    const ta = document.getElementById("reportText");
    ta.value = "";
    document.getElementById("reportStatus").textContent = "";
    document.getElementById("reportStatus").className = "dim small";
    document.getElementById("reportModal").hidden = false;
    // Ctrl/Cmd + Enter submits the report from inside the textarea so the
    // whole flow is keyboard-completable. Wired once per open to avoid
    // handler accumulation.
    ta.onkeydown = e => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submitReport();
      }
    };
    setTimeout(() => ta.focus(), 50);
  }
  function closeReportModal() {
    document.getElementById("reportModal").hidden = true;
  }
  async function submitReport() {
    const text = (document.getElementById("reportText").value || "").trim();
    const status = document.getElementById("reportStatus");
    const btn = document.getElementById("reportSubmit");
    // Ctrl/Cmd+Enter reaches here directly, not through the button, so
    // the disabled button alone would not stop a second report being filed.
    if (btn.disabled) return;
    status.className = "dim small";
    if (text.length < 3) {
      status.textContent = SERVER_ERROR_TEXT.report_short;
      status.classList.add("bad");
      return;
    }
    btn.disabled = true;
    status.textContent = "Sending…";
    const res = await postBackend("report", {
      question_id: _reportingQId,
      issue: text,
      profile: reporterId(),
      model: _reportingModel,
    });
    btn.disabled = false;
    if (res && res.ok) {
      status.textContent = "Sent. Thank you.";
      status.classList.remove("bad"); status.classList.add("ok");
      // Optimistically include in local in-memory list so the badge updates.
      state.reports.push({
        id: res.id, question_id: _reportingQId, issue: text,
        profile: reporterId(),
        model: _reportingModel, created: new Date().toISOString(),
        status: "open", resolution: null,
      });
      const repBtn = document.getElementById("reportBtn");
      if (repBtn) repBtn.classList.add("has-report");
      setTimeout(closeReportModal, 1200);
    } else {
      // postBackend has already worded the reason; "check your connection"
      // is wrong advice when the server answered with one.
      status.textContent = `Not sent. ${(res && res.error) || SERVER_UNREACHABLE}`;
      status.classList.add("bad");
    }
  }

  // ── Audit dashboard (admin only) ───────────────────────────────────────
  // Inbox (pending batches), Reports (user-submitted issues) and Live
  // (published files). Each row offers a copy-prompt → paste-response → apply workflow that
  // works on any LLM's free tier (no API key, no Claude Code needed).
  const AUDIT_LLMS = {
    claude:   { label: "Claude",   url: "https://claude.ai" },
    chatgpt:  { label: "ChatGPT",  url: "https://chatgpt.com" },
    gemini:   { label: "Gemini",   url: "https://gemini.google.com" },
    grok:     { label: "Grok",     url: "https://grok.com" },
    deepseek: { label: "DeepSeek", url: "https://chat.deepseek.com" },
    mistral:  { label: "Le Chat",  url: "https://chat.mistral.ai" },
    copilot:  { label: "Copilot",  url: "https://copilot.microsoft.com" }
  };
  // The generation prompt is 15 KB of admin-only content that nothing
  // outside the Content tab reads, so it is its own file, fetched once on
  // demand and cached. A failed fetch is not cached, so reopening the
  // Content tab (as the error says) tries again. Concurrent callers
  // share one request.
  let _promptTemplate = null;
  let _promptTemplateReq = null;
  function loadPromptTemplate() {
    if (_promptTemplate !== null) return Promise.resolve(_promptTemplate);
    if (_promptTemplateReq) return _promptTemplateReq;
    const url = "assets/prompt-template.txt?v=" + encodeURIComponent((state.meta && state.meta.updated) || "1");
    _promptTemplateReq = (async () => {
      try {
        _promptTemplate = await timedFetch(url, {}, FETCH_JSON_TIMEOUT_MS, r => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.text();
        }).then(t => t.trim());
        return _promptTemplate;
      } catch (e) {
        console.warn("[prompt] template fetch failed:", url, e && e.message || e);
        return "";
      } finally {
        _promptTemplateReq = null;
      }
    })();
    return _promptTemplateReq;
  }
  // Fills the Content tab's prompt block. Admin-only surface, so it is
  // fetched when that tab opens, not at boot for every visitor.
  function fillPromptText() {
    const promptText = document.getElementById("promptText");
    return loadPromptTemplate().then(t => {
      if (promptText) promptText.textContent = t ? renderPrompt(t) : "Couldn't load the prompt template. Reopen the Content tab to try again.";
      return t;
    });
  }

  const AUDIT_LLM_KEY = "y4mcq.audit.llm.v1";
  function auditLlmId() {
    const id = localStorage.getItem(AUDIT_LLM_KEY);
    return (id && AUDIT_LLMS[id]) ? id : "claude";
  }
  function auditLlmEntry() { return AUDIT_LLMS[auditLlmId()]; }
  function auditLlmUrl() { return auditLlmEntry().url; }
  function auditLlmLabel() { return auditLlmEntry().label; }
  function setAuditLlm(id) {
    if (!AUDIT_LLMS[id]) return;
    localStorage.setItem(AUDIT_LLM_KEY, id);
    refreshAuditLlmLinks();
  }
  function refreshAuditLlmLinks() {
    const label = auditLlmLabel();
    const url = auditLlmUrl();
    document.querySelectorAll(".audit-open-llm").forEach(a => {
      a.href = url;
      a.textContent = `Open ${label}`;
    });
  }
  // Remembered so re-entering the Content tab does not silently reset
  // the filter the admin last chose.
  let _reportFilter = "open";
  let _liveFilter = "all";

  function wireReportsAdmin() {
    const llmSel = document.getElementById("auditLlmSelect");
    if (llmSel) {
      llmSel.value = auditLlmId();
      llmSel.onchange = () => setAuditLlm(llmSel.value);
    }
    document.querySelectorAll("[data-rep-filter]").forEach(b => {
      b.setAttribute("aria-pressed", String(b.dataset.repFilter === _reportFilter));
      b.classList.toggle("selected", b.dataset.repFilter === _reportFilter);
      b.onclick = () => {
        _reportFilter = b.dataset.repFilter;
        document.querySelectorAll("[data-rep-filter]").forEach(x => {
          const on = x === b;
          x.classList.toggle("selected", on);
          x.setAttribute("aria-pressed", String(on));
        });
        renderReportsAdminList(_reportFilter);
      };
    });
    const bulkBtn = document.getElementById("auditBulkReports");
    if (bulkBtn) bulkBtn.onclick = startBulkReportAudit;
    document.querySelectorAll("[data-live-filter]").forEach(b => {
      b.setAttribute("aria-pressed", String(b.dataset.liveFilter === _liveFilter));
      b.classList.toggle("selected", b.dataset.liveFilter === _liveFilter);
      b.onclick = () => {
        _liveFilter = b.dataset.liveFilter;
        document.querySelectorAll("[data-live-filter]").forEach(x => {
          const on = x === b;
          x.classList.toggle("selected", on);
          x.setAttribute("aria-pressed", String(on));
        });
        renderAuditLive(_liveFilter);
      };
    });
  }


  // The list of pending inbox batches, read from inbox_manifest.json when
  // the Content tab opens (the admin may have just pasted, so this is the
  // freshest copy). A file that fails to load is named, not taken for an
  // empty one.
  let _inboxBatches = [];   // [{ path: "inbox/...json", questions: [...] }]
  let _inboxFailed = [];    // paths, or the manifest, that did not load
  async function refreshAuditInboxList() {
    _inboxFailed = [];
    const failed = (what, e) => {
      console.warn("[audit] inbox:", what, "failed to load:", e && e.message || e);
      _inboxFailed.push(what);
    };
    const manifest = await fetchJson("data/inbox_manifest.json").catch(e => { failed("inbox_manifest.json", e); return null; });
    const paths = (manifest && manifest.inbox) || [];
    _inboxBatches = await Promise.all(paths.map(async (p) => {
      let qs = await fetchJson("data/" + p).catch(e => { failed(p, e); return null; });
      if (qs !== null && !Array.isArray(qs)) { failed(p, new Error("not a JSON array")); qs = null; }
      return { path: p, questions: qs || [] };
    }));
    // An empty batch has already been audited and cleared.
    _inboxBatches = _inboxBatches.filter(b => b.questions.length > 0);
    const ic = document.getElementById("auditInboxCount");
    if (ic) ic.textContent = _inboxBatches.length ? String(_inboxBatches.length) : "";
    const rc = document.getElementById("auditReportsCount");
    if (rc) {
      const open = state.reports.filter(r => r.status === "open").length;
      rc.textContent = open ? String(open) : "";
    }
  }
  function renderAuditInbox() {
    const list = document.getElementById("auditInboxList");
    list.innerHTML = _inboxFailed.length
      ? `<li class="small audit-load-error">Couldn't load ${esc(_inboxFailed.join(", "))}, so batches may be missing below. Reopen the Content tab to try again.</li>`
      : "";
    if (!_inboxBatches.length) {
      if (!_inboxFailed.length) list.innerHTML = `<li class="dim small">No inbox batches awaiting audit. Pasted content goes through this list before being promoted to the live per-topic files.</li>`;
      return;
    }
    for (const b of _inboxBatches) {
      const li = document.createElement("li");
      li.className = "audit-row";
      const topicsCount = {};
      for (const q of b.questions) topicsCount[q.topic || "?"] = (topicsCount[q.topic || "?"] || 0) + 1;
      const topicSummary = Object.entries(topicsCount).map(([t, n]) => `${esc(t)} ${fmtNum(n)}`).join(", ");
      const modelsCount = {};
      for (const q of b.questions) modelsCount[q.model || "unknown"] = (modelsCount[q.model || "unknown"] || 0) + 1;
      const modelSummary = Object.entries(modelsCount).map(([m, n]) => `${esc(m)} ×${fmtNum(n)}`).join(", ");
      li.innerHTML = `
        <div class="audit-row-head">
          <div class="audit-row-text">
            <span class="audit-row-name">${esc(b.path)}</span>
            <span class="audit-row-meta dim small">${plural(b.questions.length, "question")} · ${topicSummary} · by ${modelSummary}</span>
          </div>
          <button class="link-btn audit-row-toggle">Audit this batch</button>
        </div>
        <div class="audit-flow" hidden>
          ${auditFlowMarkup(`inbox-${esc(b.path)}`)}
        </div>
      `;
      list.appendChild(li);
      const toggle = li.querySelector(".audit-row-toggle");
      const flow = li.querySelector(".audit-flow");
      toggle.onclick = () => {
        flow.hidden = !flow.hidden;
        toggle.textContent = flow.hidden ? "Audit this batch" : "Hide";
      };
      wireAuditFlow(flow, {
        kind: "inbox",
        buildPrompt: () => buildInboxAuditPrompt(b),
        parse: validateInboxAuditResponse,
        apply: async (parsed) => applyInboxAudit(b.path, parsed),
      });
    }
  }

  function auditFlowMarkup(_keyHint) {
    return `
      <ol class="audit-steps">
        <li><b>Copy the prompt</b> <button class="audit-copy primary">Copy prompt</button>
          <a class="link-btn audit-open-llm" href="${auditLlmUrl()}" target="_blank" rel="noopener">Open ${auditLlmLabel()}</a>
          <span class="audit-copy-status dim small"></span></li>
        <li><b>Paste the LLM's full JSON reply</b>
          <textarea class="audit-response paste-box" rows="8" spellcheck="false" autocomplete="off" placeholder='{ "summary": "...", "kept": [ ... ], "dropped": [ ... ] }'></textarea>
        </li>
        <li><b>Validate &amp; apply</b>
          <button class="audit-apply primary">Validate &amp; apply</button>
          <span class="audit-apply-status dim small"></span>
        </li>
      </ol>
    `;
  }

  function wireAuditFlow(flowEl, opts) {
    const copyBtn = flowEl.querySelector(".audit-copy");
    const copyStatus = flowEl.querySelector(".audit-copy-status");
    const respEl = flowEl.querySelector(".audit-response");
    const applyBtn = flowEl.querySelector(".audit-apply");
    const applyStatus = flowEl.querySelector(".audit-apply-status");
    copyBtn.onclick = async () => {
      let text;
      try {
        // Throws when the prompt template is missing; the status line
        // says so.
        if (!_promptTemplate) await loadPromptTemplate();
        text = opts.buildPrompt();
      } catch (e) {
        console.warn("[audit] building the prompt failed:", e && e.message || e);
        copyStatus.textContent = (e && e.message) || "Couldn't build the prompt.";
        copyStatus.className = "audit-copy-status small bad";
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        copyStatus.textContent = `Copied. Paste into ${auditLlmLabel()}.`;
        copyStatus.className = "audit-copy-status dim small ok";
      } catch {
        // The async clipboard is refused (permissions, http): fall back to
        // execCommand on a throwaway textarea, which reports its result.
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        let copied = false;
        try { copied = document.execCommand("copy"); } catch (e) { console.warn("[audit] execCommand copy threw:", e && e.message); }
        document.body.removeChild(ta);
        copyStatus.textContent = copied
          ? `Copied. Paste into ${auditLlmLabel()}.`
          : "The clipboard is blocked in this browser. Allow clipboard access for this site, then copy again.";
        copyStatus.className = "audit-copy-status dim small";
      }
    };
    applyBtn.onclick = async () => {
      applyStatus.textContent = "Checking the reply…";
      applyStatus.className = "audit-apply-status dim small";
      const raw = (respEl.value || "").trim();
      if (!raw) {
        applyStatus.textContent = "Paste the LLM's JSON reply first.";
        applyStatus.classList.add("bad");
        return;
      }
      let parsed;
      try {
        parsed = opts.parse(raw);
      } catch (e) {
        applyStatus.textContent = `The reply doesn't check out: ${((e && e.message) || "no detail").replace(/\.$/, "")}.`;
        applyStatus.classList.remove("dim", "ok"); applyStatus.classList.add("bad");
        return;
      }
      applyBtn.disabled = true;
      applyStatus.textContent = "Saving to the repo…";
      try {
        const res = await opts.apply(parsed);
        if (res && res.ok) {
          applyStatus.textContent = "Applied. " + (res.note || "Reloading state.");
          applyStatus.classList.remove("bad"); applyStatus.classList.add("ok");
          // Refresh in-memory state + re-render dashboard.
          await loadData();
          await refreshAuditInboxList();
          if (opts.kind === "inbox") renderAuditInbox();
          else renderReportsAdminList("open");
        } else {
          applyStatus.textContent = `Not applied. ${(res && res.error) || "The server gave no reason."}`;
          applyStatus.classList.add("bad");
        }
      } catch (e) {
        console.warn("[audit] apply threw:", e && e.stack || e);
        applyStatus.textContent = `Not applied. ${(e && e.message) || "No detail."}`;
        applyStatus.classList.add("bad");
      } finally {
        applyBtn.disabled = false;
      }
    };
  }

  // Build the audit prompt for a single inbox batch: the generation
  // template's quality bar (sections 1-7), without the trailing input
  // block or Section 8 (how questions reach the site), wrapped in an
  // audit intro and output spec.
  function _qualityBarText() {
    if (!_promptTemplate) {
      // Primed by loadPromptTemplate() when the Content tab mounts. If
      // it is still empty the fetch failed, and an audit prompt with no
      // quality bar in it would quietly grade against nothing.
      throw new Error("The prompt template has not loaded. Reopen the Content tab and try again.");
    }
    let t = renderPrompt(_promptTemplate);
    // Strip the "INPUT FROM ME" trailing block (everything from
    // "============================\nINPUT FROM ME" onwards).
    t = t.split(/={5,}\s*\nINPUT FROM ME/i)[0].trim();
    // Section 8 sits after INPUT FROM ME today; cut it too if the
    // template ever moves it ahead.
    t = t.split(/={5,}\s*\n8\.\s+HOW THESE QUESTIONS REACH THE SITE/i)[0].trim();
    return t;
  }
  function buildInboxAuditPrompt(batch) {
    const qb = _qualityBarText();
    const batchJson = JSON.stringify(batch.questions, null, 2);
    return `You are auditing a batch of MCQs for the A to E Australian Y4 MCQ bank.

Apply the quality bar below to every question in the batch. For each:
  (1) If it passes with no fix, keep as-is (output unchanged JSON).
  (2) If it has fixable issues, fix and keep (output the corrected JSON
      with all original fields preserved).
  (3) If it violates a hard rule (weight-based dose math in lead-in,
      off-focus discipline given the current period, irretrievable
      trick question, uncalibrated difficulty that can't be saved),
      DROP it.

Also: dedupe WITHIN this batch  -  if two questions test essentially the
same scenario / decision, keep the better-written one and drop the
other.

The original LLM's self-declared model is shown on each question
(\`model\` field) so you can correlate patterns. Be especially strict
on the correct-answer-detail anti-pattern (correct option markedly
longer than distractors  -  fix by trimming the correct option or
expanding distractors to match detail level, NOT by leaving as-is).

${qb}

============================
INPUT - the batch to audit (${batch.questions.length} questions)
============================

${batchJson}

============================
OUTPUT FORMAT (strict, no prose)
============================

Output ONLY this JSON object. Start with \`{\`. End with \`}\`. No
Markdown fences, no commentary outside the JSON.

{
  "summary": "<2-4 sentences on biggest patterns + actions taken>",
  "kept": [ <full corrected question JSON, schema unchanged>, ... ],
  "dropped": [ { "id": "<question id>", "reason": "<one sentence>" }, ... ]
}

Every kept entry MUST include every original field (id, topic,
subtopic, difficulty, model, tags, stem, data_table, lead_in,
options[5], explanation, sources[], reference_ranges[], created)
because the site replaces the live entry wholesale on apply.`;
  }

  function validateInboxAuditResponse(raw) {
    let s = raw.trim();
    if (s.startsWith("```")) s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let obj;
    try { obj = JSON.parse(s); }
    catch (e) { throw new Error("not valid JSON: " + e.message); }
    if (!obj || typeof obj !== "object") throw new Error("response must be an object");
    if (typeof obj.summary !== "string") throw new Error("missing string `summary`");
    if (!Array.isArray(obj.kept)) throw new Error("missing array `kept`");
    if (!Array.isArray(obj.dropped)) throw new Error("missing array `dropped`");
    obj.kept.forEach((q, i) => {
      if (!q || typeof q !== "object") throw new Error(`kept[${i}] not an object`);
      if (!q.id || typeof q.id !== "string") throw new Error(`kept[${i}].id missing`);
      if (!q.topic) throw new Error(`kept[${i}].topic missing`);
      if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`kept[${i}].options invalid`);
      const correct = q.options.filter(o => o && o.correct === true);
      if (correct.length !== 1) throw new Error(`kept[${i}] needs exactly one correct option (found ${correct.length})`);
    });
    obj.dropped.forEach((d, i) => {
      if (!d || !d.id || !d.reason) throw new Error(`dropped[${i}] missing id/reason`);
    });
    return obj;
  }

  // ── Live content tab (audit any already-promoted file in place) ───────
  let _liveFiles = [];   // [{ path, questions }]
  let _liveFailed = [];  // paths that did not load, named above the list
  async function loadAndRenderAuditLive() {
    _liveFailed = [];
    if (Array.isArray(state.bankFiles) && state.bankFiles.length) {
      // Already in memory from loadData (refreshed after every apply).
      _liveFiles = state.bankFiles.map(f => ({ path: f.path, questions: Array.isArray(f.questions) ? f.questions : [] }));
    } else {
      const token = _adminRenderSeq;
      const failed = (what, e) => {
        console.warn("[audit] live:", what, "failed to load:", e && e.message || e);
        _liveFailed.push(what);
      };
      const manifest = await fetchJson("data/batches_manifest.json").catch(e => { failed("batches_manifest.json", e); return null; });
      const batchPaths = ((manifest && manifest.batches) || []).map(p => "data/" + p);
      const mainPaths = [
        "data/questions_paeds.json",
        "data/questions_obgyn.json",
        "data/questions_psych.json",
        "data/questions_medicine.json",
      ];
      const all = mainPaths.concat(batchPaths);
      const files = await Promise.all(all.map(async (p) => {
        let qs = await fetchJson(p).catch(e => { failed(p, e); return null; });
        if (qs !== null && !Array.isArray(qs)) { failed(p, new Error("not a JSON array")); qs = null; }
        return { path: p, questions: qs || [] };
      }));
      // A quick tab flip started a second download; only the latest paints.
      if (token !== _adminRenderSeq) return;
      _liveFiles = files;
    }
    _liveFiles = _liveFiles.filter(f => f.questions.length > 0);
    const c = document.getElementById("auditLiveCount");
    if (c) c.textContent = _liveFiles.length ? String(_liveFiles.length) : "";
    renderAuditLive("all");
  }
  function renderAuditLive(filter) {
    const list = document.getElementById("auditLiveList");
    list.innerHTML = _liveFailed.length
      ? `<li class="small audit-load-error">Couldn't load ${esc(_liveFailed.join(", "))}. Reopen the Content tab to try again.</li>`
      : "";
    const visible = _liveFiles.filter(f => {
      if (filter === "all") return true;
      if (filter === "batches") return f.path.startsWith("data/batches/");
      if (filter === "main")    return !f.path.startsWith("data/batches/");
      if (filter === "paeds")    return f.path.includes("paeds") || f.path.includes("_paeds");
      if (filter === "obgyn")    return f.path.includes("obgyn");
      if (filter === "psych")    return f.path.includes("psych");
      if (filter === "medicine") return f.path.includes("med") && !f.path.includes("paeds");
      return true;
    });
    if (!visible.length) {
      list.insertAdjacentHTML("beforeend", `<li class="dim small">No files match this filter.</li>`);
      return;
    }
    for (const f of visible) {
      const li = document.createElement("li");
      li.className = "audit-row";
      const isMain = !f.path.startsWith("data/batches/");
      const subjects = {};
      for (const q of f.questions) subjects[q.subtopic || q.topic || "?"] = (subjects[q.subtopic || q.topic || "?"] || 0) + 1;
      const topSubjects = Object.entries(subjects).sort((a,b) => b[1]-a[1]).slice(0, 3)
        .map(([k, n]) => `${esc(k)} ${fmtNum(n)}`).join(", ");
      const models = {};
      for (const q of f.questions) models[q.model || "unknown"] = (models[q.model || "unknown"] || 0) + 1;
      const modelSummary = Object.entries(models).map(([m, n]) => `${esc(m)} ×${fmtNum(n)}`).join(", ");
      li.innerHTML = `
        <div class="audit-row-head">
          <div class="audit-row-text">
            <span class="audit-row-name">${isMain ? "★ " : ""}${esc(f.path)}</span>
            <span class="audit-row-meta dim small">${plural(f.questions.length, "question")} · most: ${topSubjects} · by ${modelSummary}</span>
          </div>
          <button class="link-btn audit-row-toggle">Audit this file</button>
        </div>
        <div class="audit-flow" hidden>${auditFlowMarkup(`live-${esc(f.path)}`)}</div>
      `;
      list.appendChild(li);
      const toggle = li.querySelector(".audit-row-toggle");
      const flow = li.querySelector(".audit-flow");
      toggle.onclick = () => {
        flow.hidden = !flow.hidden;
        toggle.textContent = flow.hidden ? "Audit this file" : "Hide";
      };
      wireAuditFlow(flow, {
        kind: "live",
        buildPrompt: () => buildLiveAuditPrompt(f),
        parse: validateInboxAuditResponse,   // same shape as inbox audit
        apply: async (parsed) => applyLiveAudit(f.path, parsed),
      });
    }
  }
  function buildLiveAuditPrompt(file) {
    const qb = _qualityBarText();
    const filename = file.path.split("/").pop();
    return `You are re-auditing an already-live file in the A to E Australian Y4 MCQ bank.

File: \`${file.path}\` (${file.questions.length} questions)

Apply the quality bar below. For each question:
  (1) Pass with no fix → keep as-is.
  (2) Has fixable issues (option imbalance, US spellings, em-dashes,
      stem below floor, weak rationale, missing source attribution,
      inflated difficulty) → fix and keep, output corrected JSON with
      all original fields preserved.
  (3) Violates a hard rule (weight-based dose math in lead-in, trick
      question, fundamentally wrong clinical content) → DROP.

Special attention for live audit:
  - This file is already serving users. Drops should be rare and only
    for genuinely-broken questions. Prefer fix over drop.
  - The correct-answer-is-longest tell is the #1 historical issue -
    trim correct options to mean distractor word count or expand
    distractors to match. Target all 5 options within +/- 25% word count.
  - The original LLM's self-declared model is on each question
    (\`model\` field) so you can correlate patterns by author.

${qb}

============================
INPUT - the live file to re-audit (${file.questions.length} questions)
============================

${JSON.stringify(file.questions, null, 2)}

============================
OUTPUT FORMAT (strict, no prose)
============================

Output ONLY this JSON object. Start with \`{\`. End with \`}\`. No
Markdown fences, no commentary outside the JSON.

{
  "summary": "<2-4 sentences on patterns + actions taken>",
  "kept": [ <full corrected question JSON, schema unchanged>, ... ],
  "dropped": [ { "id": "<question id>", "reason": "<one sentence>" }, ... ]
}

Every kept entry MUST include every original field (id, topic,
subtopic, difficulty, model, tags, stem, data_table, lead_in,
options[5], explanation, sources[], reference_ranges[], created) -
the file is replaced wholesale on apply.`;
  }
  async function applyLiveAudit(filePath, audit) {
    const res = await postBackend("apply-live-audit", {
      file_path: filePath,
      audit,
    });
    if (!res) return { ok: false, error: "backend unreachable" };
    if (res.ok) {
      return { ok: true, note: `${audit.kept.length} kept, ${audit.dropped.length} dropped. File rewritten in place.` };
    }
    return res;
  }

  async function applyInboxAudit(batchPath, audit) {
    const res = await postBackend("apply-audit", {
      batch_path: batchPath,
      audit,
    });
    if (!res) return { ok: false, error: "backend unreachable" };
    if (res.ok) {
      const moved = res.moved || {};
      const movedSummary = Object.entries(moved).filter(([_, n]) => n > 0).map(([k, n]) => `${k}=${n}`).join(", ");
      return { ok: true, note: `${audit.kept.length} kept (${movedSummary || "0"}), ${audit.dropped.length} dropped.` };
    }
    return res;
  }

  // ── Report audit (single + bulk) ──────────────────────────────────────
  let _selectedReportIds = new Set();
  function startBulkReportAudit() {
    if (!_selectedReportIds.size) return;
    const reports = state.reports.filter(r => _selectedReportIds.has(r.id));
    showReportAuditFlow(reports);
  }
  function showReportAuditFlow(reports) {
    // Build an inline flow row at the top of the reports list. One at a
    // time: a second Audit click replaces the pane rather than stacking
    // another with its own half-finished state.
    const list = document.getElementById("reportsAdminList");
    list.querySelectorAll(".audit-row").forEach(r => r.remove());
    const wrap = document.createElement("li");
    wrap.className = "audit-row";
    wrap.innerHTML = `
      <div class="audit-row-head">
        <span class="audit-row-name">Auditing ${reports.length} report${reports.length === 1 ? "" : "s"}</span>
        <button class="link-btn audit-row-toggle">Hide</button>
      </div>
      <div class="audit-flow">${auditFlowMarkup("reports")}</div>
    `;
    list.prepend(wrap);
    const toggle = wrap.querySelector(".audit-row-toggle");
    toggle.onclick = () => wrap.remove();
    const flow = wrap.querySelector(".audit-flow");
    // Override placeholder for reports response shape.
    flow.querySelector(".audit-response").placeholder = '{ "summary": "...", "resolutions": [ { "report_id": "...", "question_id": "...", "action": "fix|dismiss|drop", "resolution": "...", "fixed_question": { ... } | null } ] }';
    wireAuditFlow(flow, {
      kind: "reports",
      buildPrompt: () => buildReportAuditPrompt(reports),
      parse: validateReportAuditResponse,
      apply: applyReportAudit,
    });
  }
  function buildReportAuditPrompt(reports) {
    const qb = _qualityBarText();
    // Pair each report with its current question so Claude has context.
    const cases = reports.map((r, i) => {
      const q = state.questions.find(x => x.id === r.question_id);
      return `### Case ${i + 1}\n\nQUESTION (currently live):\n${q ? JSON.stringify(q, null, 2) : '(question not found in current bank - probably dropped already; resolution should be "dismiss" with note)'}\n\nREPORT:\n${JSON.stringify({ id: r.id, profile: r.profile, created: r.created, issue: r.issue, model: r.model }, null, 2)}`;
    }).join("\n\n");
    return `You are auditing user-submitted reports on questions in the
A to E Australian Y4 MCQ bank.

For each report, decide:
  - "dismiss" if the user's complaint is wrong (the question is
    factually correct). Provide a resolution explaining why.
  - "fix" if the user is right and there's a fixable issue. Provide the
    FULL corrected question JSON (every field) in fixed_question, plus a
    resolution explaining what changed.
  - "drop" if the question is fundamentally broken and cannot be
    salvaged (trick question, irretrievably wrong). Provide a resolution.

Edge case: if the complaint is "too hard", check the question for trick
anti-patterns (single-phrase recognition + giveaway answer, weight-based
dose arithmetic in the lead-in, etc.). If it's a legitimately hard but
valid question, action="dismiss" with resolution "valid 4/5 or 5/5
question; difficulty is appropriate".

${qb}

============================
INPUT - ${reports.length} report${reports.length === 1 ? "" : "s"} to audit
============================

${cases}

============================
OUTPUT FORMAT (strict, no prose)
============================

Output ONLY this JSON object. Start with \`{\`. End with \`}\`.

{
  "summary": "<2-4 sentences>",
  "resolutions": [
    {
      "report_id":     "<id matching INPUT>",
      "question_id":   "<question id>",
      "action":        "dismiss" | "fix" | "drop",
      "resolution":    "<2-3 sentences>",
      "fixed_question": <full question JSON if action=='fix', else null>
    }
  ]
}`;
  }
  function validateReportAuditResponse(raw) {
    let s = raw.trim();
    if (s.startsWith("```")) s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let obj;
    try { obj = JSON.parse(s); } catch (e) { throw new Error("not valid JSON: " + e.message); }
    if (!Array.isArray(obj.resolutions) || !obj.resolutions.length) throw new Error("missing resolutions array");
    obj.resolutions.forEach((r, i) => {
      if (!r.report_id) throw new Error(`resolutions[${i}].report_id missing`);
      if (!r.question_id) throw new Error(`resolutions[${i}].question_id missing`);
      if (!["dismiss", "fix", "drop"].includes(r.action)) throw new Error(`resolutions[${i}].action invalid`);
      if (r.action === "fix") {
        if (!r.fixed_question || !r.fixed_question.id || !r.fixed_question.topic) {
          throw new Error(`resolutions[${i}] is a fix but fixed_question is missing/invalid`);
        }
      }
    });
    return obj;
  }
  async function applyReportAudit(parsed) {
    // Tell the worker which bank files hold each question, so it edits
    // those directly instead of scanning all ~40 files on GitHub.
    const want = new Set(parsed.resolutions.map(r => r.question_id));
    const where = {};
    for (const f of state.bankFiles || []) {
      for (const q of f.questions || []) {
        if (q && want.has(q.id)) (where[q.id] = where[q.id] || []).includes(f.path) || where[q.id].push(f.path);
      }
    }
    const resolutions = parsed.resolutions.map(r => ({ ...r, files: where[r.question_id] || [] }));
    const res = await postBackend("apply-report", { resolutions });
    if (!res) return { ok: false, error: "backend unreachable" };
    if (res.ok) {
      // Reports that did not land stay open; say which, and why.
      const left = (res.outcomes || []).filter(o => !["fixed", "dropped", "dismissed"].includes(o.outcome));
      const why = left.map(o => `${o.question_id || o.report_id} (${o.outcome}${o.reason ? ": " + o.reason : ""})`).join("; ");
      return { ok: true, note: `Fixed: ${res.fixed || 0}, dropped: ${res.dropped || 0}, dismissed: ${res.dismissed || 0}.` +
        (left.length ? ` ${left.length} not applied, reports left open: ${why}.` : "") };
    }
    return res;
  }
  function renderReportsAdminList(filter) {
    const list = document.getElementById("reportsAdminList");
    list.innerHTML = "";
    _selectedReportIds = new Set();   // reset selection on re-render
    const bulkBtn = document.getElementById("auditBulkReports");
    if (bulkBtn) bulkBtn.disabled = true;
    const reports = state.reports
      .filter(r => filter === "all" ? true : r.status === filter)
      .slice().reverse();   // newest first
    if (!reports.length) {
      list.innerHTML = `<li class="dim small">${filter === "all"
        ? "No reports have been filed."
        : `No ${esc(filter)} reports.`}</li>`;
      return;
    }
    for (const r of reports) {
      const q = state.questions.find(x => x.id === r.question_id);
      const li = document.createElement("li");
      li.className = "report-row report-" + esc(r.status || "open");
      // Stored as UTC ISO; shown in the reader's own time.
      const t = Date.parse(r.created || "");
      const when = isNaN(t) ? "" : new Date(t).toLocaleString("en-AU",
        { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
      const qStem = q ? esc(q.stem.slice(0, 140)) + (q.stem.length > 140 ? "…" : "") : "<em>question not found in current bank</em>";
      const qModel = q && q.model ? `<span class="model-tag">${esc(q.model)}</span>` : "";
      const open = (r.status || "open") === "open";
      li.innerHTML = `
        <div class="report-head">
          ${open ? `<input type="checkbox" class="report-select" data-rep-id="${esc(r.id)}" title="Select for bulk audit" />` : ""}
          <span class="report-id">${esc(r.id)}</span>
          <span class="report-status status-${esc(r.status || "open")}">${esc(r.status || "open")}</span>
          <span class="report-when dim small">${esc(when)} · ${esc(r.profile || "guest")}</span>
          ${qModel}
          ${open ? `<button class="link-btn report-audit-one">Audit this report</button>` : ""}
          ${q ? `<button class="link-btn report-jump">Open Q</button>` : ""}
        </div>
        <div class="report-q"><b>Q: ${esc(r.question_id)}</b> - ${qStem}</div>
        <div class="report-issue">${esc(r.issue)}</div>
        ${r.resolution ? `<div class="report-resolution dim small">Resolution: ${esc(r.resolution)}</div>` : ""}
      `;
      const cb = li.querySelector(".report-select");
      if (cb) cb.onclick = (e) => {
        e.stopPropagation();
        if (cb.checked) _selectedReportIds.add(r.id);
        else _selectedReportIds.delete(r.id);
        if (bulkBtn) bulkBtn.disabled = _selectedReportIds.size === 0;
      };
      const auditBtn = li.querySelector(".report-audit-one");
      if (auditBtn) auditBtn.onclick = (e) => { e.stopPropagation(); showReportAuditFlow([r]); };
      const jumpBtn = li.querySelector(".report-jump");
      if (jumpBtn && q) jumpBtn.onclick = async (e) => {
        e.stopPropagation();
        // Jumping to a question means leaving the admin panel, and any
        // session in progress: ask first, and stay put on Cancel.
        if (!(await jumpToQuestionStandalone(q))) return;
        const am = document.getElementById("adminModal");
        if (am) { am.hidden = true; adminClear(); }
      };
      list.appendChild(li);
    }
  }
  // Returns false when the user chose to stay in their session.
  async function jumpToQuestionStandalone(q) {
    // Admins are full users, so a session of their own in progress is
    // left the same way as by Exit.
    const live = state.quiz && !state.quiz.finished && !state.quiz.ephemeral ? state.quiz : null;
    if (live && !(await closeLiveSession(live))) return false;
    // Start a tiny single-question study session for review. Ephemeral:
    // saveSession skips it, so it never becomes the resumable session.
    resetNavigator();
    state.quiz = {
      pool: [q], idx: 0, mode: "study",
      timerMins: 0, deadline: null,
      answers: {}, struck: {}, revealed: {}, finished: false,
      ephemeral: true,
    };
    state.sessionStart = Date.now();
    setScreen("quiz");
    document.getElementById("sessionMeta").textContent = "Report review";
    renderQuiz();
    startSessionTimer();
    return true;
  }

  // ── Paste questions ─────────────────────────────────────────────────────
  async function pasteAdd() {
    const box    = document.getElementById("pasteBox");
    const status = document.getElementById("pasteStatus");
    const btn    = document.getElementById("pasteAddBtn");
    const raw    = (box.value || "").trim();
    status.className = "dim small";
    if (!raw) {
      status.textContent = "Paste a JSON array first.";
      status.classList.add("bad");
      return;
    }
    const parsed = parseQuestionsPayload(raw);
    if (parsed.error) {
      status.textContent = parsed.error;
      status.classList.remove("dim"); status.classList.add("bad");
      return;
    }

    // De-duplicate against everything currently in the in-memory pool
    // (which already includes file-shipped + manifest-listed + locally-
    // pasted entries).
    const existingIds = new Set(state.questions.map(q => q.id));
    const added = [], skipped = [];
    for (const q of parsed.questions) {
      if (existingIds.has(q.id)) skipped.push(q.id);
      else { added.push(q); existingIds.add(q.id); }
    }
    if (!added.length) {
      status.textContent = `0 added. All ${parsed.questions.length} IDs already in the bank.`;
      status.classList.remove("dim"); status.classList.add("bad");
      refreshLocalBankSummary();
      return;
    }

    btn.disabled = true;
    status.textContent = "Saving…";

    // The LLM is supposed to self-declare its model in each question's
    // top-level `model` field (the prompt instructs this). Anything
    // missing falls back to "unknown" so audit can flag the generator
    // for not following the rule.
    for (const q of added) { if (!q.model) q.model = "unknown"; }

    // Try the remote worker first, then local backend. Both write
    // to data/inbox/ so the audit flow picks it up. Fall back to
    // localStorage only if both fail (offline / no backend / no worker).
    const res = await postBackend("paste", { questions: added });
    const savedToInbox = res && res.ok ? (res.saved || true) : null;
    // A server that answered with a reason (401 admin session, 400 bad
    // field) is not "unreachable"; keep the reason for the status line.
    const rejected = !savedToInbox && res && res.status > 0 ? res.error : null;

    if (!savedToInbox) {
      const existing = load(ns(LOCAL_QUESTIONS_KEY), []);
      save(ns(LOCAL_QUESTIONS_KEY), existing.concat(added));
    }
    state.questions = state.questions.concat(added);
    box.value = "";
    btn.disabled = false;

    let msg = `Added ${plural(added.length, "question")}.`;
    if (skipped.length) msg += ` Skipped ${plural(skipped.length, "duplicate id")}.`;
    if (savedToInbox && typeof savedToInbox === "string") {
      msg += ` Saved to the inbox at data/${savedToInbox}. It loads for everyone on next reload.`;
    } else if (savedToInbox) {
      msg += " Saved to the inbox.";
    } else if (rejected) {
      msg += ` Not saved to the inbox. ${rejected} Kept in this browser only; use 'Export local additions' to share.`;
    } else {
      msg += ` Saved in this browser only. ${SERVER_UNREACHABLE} Use 'Export local additions' to share.`;
    }
    status.textContent = msg;
    status.classList.remove("dim", "bad", "ok");
    // A browser-only save is a warning: it must stay on screen, so it
    // does not take the auto-clearing "ok" class.
    status.classList.add(savedToInbox ? "ok" : "bad");
    refreshLocalBankSummary();
    setTimeout(() => { if (status.classList.contains("ok")) status.textContent = ""; }, 7000);
  }

  function pasteDownload() {
    const box    = document.getElementById("pasteBox");
    const status = document.getElementById("pasteStatus");
    const raw    = (box.value || "").trim();
    status.className = "dim small";
    if (!raw) {
      status.textContent = "Paste a JSON array first.";
      status.classList.add("bad");
      return;
    }
    const parsed = parseQuestionsPayload(raw);
    if (parsed.error) {
      status.textContent = parsed.error;
      status.classList.add("bad");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const guess = parsed.questions[0].id ? String(parsed.questions[0].id).split(/[-_]/).slice(0, 3).join("-") : "batch";
    const filename = `${guess}-${stamp}.json`;
    const blob = new Blob(
      [JSON.stringify(parsed.questions, null, 2) + "\n"],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = `Downloaded ${filename}. Drop into data/inbox/ and add to inbox_manifest.json to ship via the repo.`;
    status.classList.add("ok");
  }

  function exportLocalBank() {
    const local = load(ns(LOCAL_QUESTIONS_KEY), []);
    if (!local.length) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `local-export-${stamp}.json`;
    const blob = new Blob(
      [JSON.stringify(local, null, 2) + "\n"],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const status = document.getElementById("pasteStatus");
    status.textContent = `Exported ${plural(local.length, "question")} to ${filename}. Drop it into data/inbox/ for the next audit.`;
    status.className = "dim small ok";
  }

  async function clearLocalBank() {
    const existing = load(ns(LOCAL_QUESTIONS_KEY), []);
    if (!existing.length) return;
    if (!await adminConfirm({
          title: `Remove ${existing.length} pasted question${existing.length === 1 ? "" : "s"}?`,
          body: "They are only in this browser, so this cannot be undone from here. "
              + "Questions that ship with the bank are untouched.",
          confirmLabel: "Remove them",
        })) return;
    const removedIds = new Set(existing.map(q => q.id));
    save(ns(LOCAL_QUESTIONS_KEY), []);
    state.questions = state.questions.filter(q => !removedIds.has(q.id));
    refreshLocalBankSummary();
    const status = document.getElementById("pasteStatus");
    status.textContent = "Local additions cleared.";
    status.className = "dim small ok";
    setTimeout(() => { status.textContent = ""; }, 4000);
  }

  function refreshLocalBankSummary() {
    const row = document.getElementById("localBankRow");
    const sum = document.getElementById("localBankSummary");
    if (!row || !sum) return;
    const local = load(ns(LOCAL_QUESTIONS_KEY), []);
    if (!local.length) { row.hidden = true; return; }
    row.hidden = false;
    sum.textContent = `${local.length} locally-pasted question${local.length === 1 ? "" : "s"} stored in this browser.`;
  }

  // Permissive validator. Accepts a JSON array, a single object, or an
  // object with a top-level `questions` array. Strips ```json fences if
  // the user pasted a code block. Returns { questions, error }.
  function parseQuestionsPayload(raw) {
    let s = raw.trim();
    if (s.startsWith("```")) {
      s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    }
    let data;
    try { data = JSON.parse(s); }
    catch (e) { return { error: `JSON parse failed: ${e.message}` }; }
    let arr;
    if (Array.isArray(data)) arr = data;
    else if (data && Array.isArray(data.questions)) arr = data.questions;
    else if (data && typeof data === "object" && data.id && data.options) arr = [data];
    else return { error: "Expected a JSON array of questions, or an object with a `questions` array." };
    if (!arr.length) return { error: "Array is empty." };

    const problems = [];
    arr.forEach((q, i) => {
      const tag = `Q${i + 1}${q && q.id ? ` (${q.id})` : ""}`;
      if (!q || typeof q !== "object") return problems.push(`${tag}: not an object`);
      if (!q.id || typeof q.id !== "string") return problems.push(`${tag}: missing string \`id\``);
      if (!q.topic) return problems.push(`${tag}: missing \`topic\``);
      if (!q.lead_in) return problems.push(`${tag}: missing \`lead_in\``);
      if (!Array.isArray(q.options) || q.options.length < 2)
        return problems.push(`${tag}: \`options\` must be an array (>= 2 entries)`);
      // Auto-fill letters if missing.
      const letters = "ABCDE";
      q.options.forEach((opt, oi) => {
        if (!opt || typeof opt !== "object") return;
        if (!opt.letter) opt.letter = letters[oi] || String(oi + 1);
      });
      const correct = q.options.filter(o => o && o.correct === true);
      if (correct.length !== 1)
        return problems.push(`${tag}: exactly one option must have \`correct: true\` (found ${correct.length})`);
      // Same rule the loader applies, so a paste cannot be accepted here
      // and then dropped (or made unreachable) on the next reload. A
      // missing difficulty is refused, not guessed: the mix is managed.
      if (typeof q.stem !== "string" || !q.stem.trim()) return problems.push(`${tag}: missing \`stem\``);
      if (!SERVABLE_TOPICS.includes(q.topic))
        return problems.push(`${tag}: \`topic\` must be one of ${SERVABLE_TOPICS.join(", ")}`);
      if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 5)
        return problems.push(`${tag}: \`difficulty\` is missing or not an integer 1-5`);
      if (!isServable(q)) return problems.push(`${tag}: every option must be an object`);
    });
    if (problems.length) {
      return { error: "Validation failed:\n  - " + problems.slice(0, 6).join("\n  - ") + (problems.length > 6 ? `\n  - ...and ${problems.length - 6} more` : "") };
    }
    return { questions: arr };
  }

  // ── Utility ─────────────────────────────────────────────────────────────
  const HOUSE_QUOTES = [
    { q: "Everybody lies.", who: "House" },
    { q: "It's a basic truth of the human condition that everybody lies. The only variable is about what.", who: "House" },
    { q: "I take risks, sometimes patients die. But not taking risks causes more patients to die, so I guess my biggest problem is I've been cursed with the ability to do the math.", who: "House" },
    { q: "Patients sometimes get better. You have no idea why, but unless you give a reason they won't pay you.", who: "House" },
    { q: "Anybody notice if there's a full moon? Nurses are eight times more likely to assault a doctor during a full moon.", who: "House" },
    { q: "If you talk to God, you're religious. If God talks to you, you're psychotic.", who: "House" },
    { q: "Reality is almost always wrong.", who: "House" },
    { q: "Diagnostics is solving puzzles. Puzzles where the wrong answer kills.", who: "House" },
    { q: "Treating illnesses is why we became doctors. Treating patients is what makes most doctors miserable.", who: "House" },
    { q: "There's no I in team. There's a me, though, if you jumble it up.", who: "House" },
    { q: "Test results are never a substitute for a good clinical history.", who: "House" },
    { q: "When you want to know the truth about someone, that someone is probably the last person you should ask.", who: "House" },
    { q: "The eyes can mislead, the smile can lie, but the shoes always tell the truth.", who: "House" },
    { q: "It's never lupus.", who: "House" },
    { q: "Idiopathic, from the Latin meaning we're idiots cause we can't figure out what's causing it.", who: "House" },
    { q: "Patients lie. People die. You ought to be used to it by now.", who: "House" },
    { q: "Humanity is overrated.", who: "House" },
    { q: "I don't ask questions. I make connections.", who: "House" },
    { q: "If her DNA was off by one percentage point she'd be a dolphin.", who: "House" },
    { q: "You can't always get what you want.", who: "House" },
    { q: "Wisdom is acknowledging what you don't know.", who: "House" },
    { q: "Almost dying changes nothing. Dying changes everything.", who: "House" },
    { q: "You talk to God, you're religious. God talks back, congratulations - you're a schizophrenic.", who: "House" },
    { q: "Differential diagnosis, people. The annoying thing about eliminating impossibilities is that it takes time.", who: "House" },
    { q: "If nobody hates you, you're doing something wrong.", who: "House" },
    { q: "The most successful marriages are based on lies. You're off to a great start.", who: "House" },
    { q: "Everything's conditional. You just can't always anticipate the conditions.", who: "House" },
    { q: "Tests take time. Treatment's quicker.", who: "House" },
    { q: "Either he was thinking, or he was dead. Coma was my third guess.", who: "House" },
    { q: "It's a good thing to assume you're wrong. It's also a good thing to assume the test is wrong.", who: "House" },
    { q: "What would you prefer - a doctor who holds your hand while you die, or one who ignores you while you get better?", who: "House" },
    { q: "I assume nothing. Except that the patient is lying.", who: "House" },
    { q: "Symptoms don't lie. People do.", who: "House" },
    { q: "Patients always want proof. We don't give them proof, we give them confidence. Sometimes wrongly.", who: "House" },
    { q: "Occam's razor: the simplest explanation is almost always somebody screwed up.", who: "House" },
    { q: "I see no reason to disbelieve the lab. Other than the fact that the lab is run by idiots.", who: "House" },
    { q: "Boring people live longer. Or it just seems longer to them.", who: "House" },
  ];
  function maybeShowHouseQuote() {
    // Every 50th unique question answered in this study session (Q50,
    // Q100, ...); re-answers don't tick the counter. Outside a session
    // the count lives in this tab's sessionStorage.
    let count = 0;
    if (state && state.quiz && state.quiz.pool && state.quiz.answers) {
      const answered = new Set(Object.keys(state.quiz.answers));
      const inPool = state.quiz.pool.filter(q => answered.has(q.id));
      count = inPool.length;
    } else {
      const KEY = ns("y4mcq.house.sessionCount");
      count = (parseInt(sessionStorage.getItem(KEY) || "0", 10) || 0) + 1;
      sessionStorage.setItem(KEY, String(count));
    }
    if (count <= 0 || count % 50 !== 0) return;
    // Track which quotes have fired this session so we cycle through
    // them all before repeating.
    const QKEY = ns("y4mcq.house.recent");
    let recent = [];
    try { recent = JSON.parse(sessionStorage.getItem(QKEY) || "[]"); } catch (_) {}
    if (recent.length >= HOUSE_QUOTES.length) recent = [];
    const remaining = HOUSE_QUOTES
      .map((q, i) => ({ q, i }))
      .filter(({ i }) => !recent.includes(i));
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    recent.push(pick.i);
    sessionStorage.setItem(QKEY, JSON.stringify(recent));
    showHouseQuote(pick.q);
  }
  function showHouseQuote({ q, who }) {
    const old = document.querySelector(".house-toast");
    if (old) old.remove();
    const toast = document.createElement("div");
    toast.className = "house-toast";
    // Quote marks and the attribution dash come from the stylesheet.
    toast.innerHTML = `<span class="hq-quote">${esc(q)}</span><span class="hq-attrib">${esc(who)}</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    const dismiss = () => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 320); };
    toast.addEventListener("click", dismiss);
    setTimeout(dismiss, 9000);
  }

  // Which reference categories may appear under which question. An
  // authoring pass can tag an adult stem with a paediatric panel, so the
  // population is checked here whatever the question's tags claim.
  const TOPIC_POPULATION = {
    "Paediatrics": "paediatric",
    "Obstetrics & Gynaecology": "obstetric",
    "Psychiatry": "adult",
    "Medicine": "adult",
  };
  function categoryFitsTopic(cat, topic) {
    const pop = (cat && cat.population) || "any";
    if (pop === "any") return true;
    const want = TOPIC_POPULATION[topic];
    if (!want) return true;
    // Only one direction is actually dangerous: a paediatric question
    // must never show adult values, because a child's normal is not an
    // adult's. Everything else is the author's own tag - a psychiatry
    // question about a pregnant patient asks for maternal observations
    // on purpose, and an obstetric question needs the adult panels
    // alongside the pregnancy-specific ones. Blocking those would empty
    // the block on perinatal questions in three of the four modules.
    return want !== "paediatric" || pop === "paediatric";
  }

  // One definition of a reference row, shared by the side panel and the
  // post-answer block. The unit lives in `units` and is never repeated
  // inside `value`, so it is appended here exactly once.
  function refRowHtml(r) {
    const t = r.test || r.label || r.name || "";
    const v = r.value != null ? r.value : (r.range != null ? r.range : (r.normal || ""));
    const u = (r.units || r.unit || "").trim();
    const note = (r.note || "").trim();
    return `<div class="rr">` +
           `<div class="rr-test">${esc(t)}</div>` +
           `<div class="rr-value">${esc(String(v))}${u ? ` <span class="rr-unit">${esc(u)}</span>` : ""}` +
           `${note ? `<span class="rr-note">${esc(note)}</span>` : ""}</div>` +
           `</div>`;
  }

  // After the answer: the panels this question was tagged with, named in
  // one line, each opening the reference panel at that panel. Printed in
  // full they would put several screens of often unrelated ranges
  // between the commentary and Next on a phone.
  function renderInlineRanges(keys, topic) {
    const cats = (state.ranges && state.ranges.categories) || {};
    const rows = [];
    const links = [];
    const seen = new Set();
    // Panels the population guard held back, so a question that asked
    // for nothing but adult panels does not just render an empty space.
    const suppressed = [];
    (keys || []).forEach(rawKey => {
      // A handful of questions carry an inline {analyte, range} object
      // instead of a library key. It is specific to the question and not
      // in the panel, so it stays as a row.
      if (rawKey && typeof rawKey === "object") {
        rows.push(refRowHtml({
          test: rawKey.analyte || rawKey.test, value: rawKey.range || rawKey.value, units: rawKey.units,
        }));
        return;
      }
      if (typeof rawKey !== "string") return;
      const cat = cats[rawKey];
      if (!cat || !Array.isArray(cat.ranges) || !cat.ranges.length) return;
      if (!categoryFitsTopic(cat, topic)) { suppressed.push(cat.label || rawKey); return; }
      if (seen.has(rawKey)) return;
      seen.add(rawKey);
      links.push(`<button type="button" class="ir-open" data-ref-key="${esc(rawKey)}">` +
        `${esc(cat.label || rawKey)}</button>`);
    });
    const out = [];
    if (rows.length) out.push(`<div class="ir-cat"><div class="rrs">${rows.join("")}</div></div>`);
    if (links.length) out.push(`<p class="ir-line">Reference values: ${links.join(", ")}</p>`);
    else if (!rows.length && suppressed.length) {
      out.push(`<p class="ir-none">` +
        `The library has no ${topic === "Paediatrics" ? "paediatric" : "matching"} values for ` +
        `${esc(suppressed.slice(0, 3).join(", "))}.</p>`);
    }
    return out.join("");
  }

  // After the reveal, the authored clue phrases (explanation.stem_clues)
  // are marked in the stem. With none authored nothing is guessed.
  function renderStemWithClues(q) {
    const el = document.getElementById("qStem");
    if (!el) return;
    const revealed = state.quiz && state.quiz.revealed && state.quiz.revealed[q.id];
    if (!revealed) { el.textContent = q.stem; return; }
    const clues = (q.explanation && Array.isArray(q.explanation.stem_clues)) ? q.explanation.stem_clues : [];
    let html = esc(q.stem);
    const seen = new Set();
    for (const raw of clues) {
      const c = String(raw || "").trim();
      if (!c || seen.has(c)) continue;
      seen.add(c);
      const escClue = esc(c).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escClue, "g");
      html = html.replace(re, m => `<mark class="stem-clue">${m}</mark>`);
    }
    // Term hover spans: wrap recognised medical terms in
    // <span class="term" data-term="..."> so the hover handler can
    // surface the glossary entry. Only active post-reveal.
    html = wrapTerms(html);
    el.innerHTML = html;
  }

  // Minimal curated glossary - the smallest useful set for the
  // current bank. Expand opportunistically as the question pool
  // grows. Keys are matched case-insensitively as whole words.
  const TERM_GLOSSARY = {
    // DKA potassium: Queensland Health adult DKA guideline (2023) and SCHN
    // paediatric DKA guideline 2015-9075 both start insulin only once K+
    // is 3.5 mmol/L or more. RCH Melbourne uses 3.0 for children.
    "DKA": "Diabetic ketoacidosis. Hyperglycaemia + ketonaemia + metabolic acidosis. Common precipitants: missed insulin, infection, new-onset T1DM. Management: fluids first; check K+ before starting insulin and hold insulin while K+ is below 3.5 mmol/L; replace K+ alongside insulin.",
    "PPH": "Postpartum haemorrhage. ≥500 mL blood loss after vaginal delivery (≥1000 mL caesarean) or any loss causing haemodynamic compromise. 4 Ts: Tone, Trauma, Tissue, Thrombin.",
    "ACS": "Acute coronary syndrome. Umbrella for unstable angina, NSTEMI, STEMI. ECG + troponin + risk stratify.",
    "SSRI": "Selective serotonin reuptake inhibitor. First-line for moderate-severe depression and most anxiety disorders. Common: sertraline, escitalopram, fluoxetine.",
    "SNRI": "Serotonin-noradrenaline reuptake inhibitor. e.g. venlafaxine, duloxetine.",
    "NSAID": "Non-steroidal anti-inflammatory drug. e.g. ibuprofen, naproxen, diclofenac. GI / renal / CV cautions.",
    "ECG": "Electrocardiogram. 12-lead is the standard initial cardiac investigation in chest pain, syncope, palpitations.",
    "CTG": "Cardiotocograph. Continuous fetal heart rate + uterine activity trace. Used antenatally and in labour.",
    "GBS": "Group B Streptococcus. Maternal carriage screened ~36 wk; intrapartum penicillin if positive or risk factors.",
    "PPROM": "Preterm pre-labour rupture of membranes (before 37 wk, before labour onset).",
    "PROM": "Pre-labour rupture of membranes at term (≥37 wk, before labour onset).",
    "HELLP": "Haemolysis, Elevated Liver enzymes, Low Platelets. Severe pre-eclampsia variant; deliver after stabilisation.",
    "CTPA": "CT pulmonary angiogram. First-line for suspected PE in non-pregnant adults.",
    "PE": "Pulmonary embolism. Clot in pulmonary arteries; sudden dyspnoea, pleuritic chest pain, tachycardia.",
    "DVT": "Deep vein thrombosis. Most commonly in the calf; risk factors via Wells / Caprini.",
    "COPD": "Chronic obstructive pulmonary disease. Spirometry: post-bronchodilator FEV1/FVC <0.7.",
    "CKD": "Chronic kidney disease. eGFR <60 mL/min/1.73 m² or markers of kidney damage for ≥3 months.",
    "AKI": "Acute kidney injury. Cr rise ≥26 micromol/L in 48 h, or ≥1.5× baseline in 7 d, or urine output <0.5 mL/kg/h for 6 h.",
    "T1DM": "Type 1 diabetes mellitus. Autoimmune beta-cell destruction; lifelong insulin required.",
    "T2DM": "Type 2 diabetes mellitus. Insulin resistance + relative deficiency; lifestyle + metformin first-line.",
    "GTT": "Glucose tolerance test. 75 g oral glucose; fasting + 1 h + 2 h plasma glucose. Gestational diabetes screen.",
    "HbA1c": "Glycated haemoglobin; reflects average plasma glucose over preceding ~3 months. Diabetes diagnostic threshold ≥48 mmol/mol (6.5%).",
    // ASD - see disambiguated entry below.
    "VSD": "Ventricular septal defect. Pansystolic murmur, lower-left sternal edge.",
    "FBC": "Full blood count. Hb, WCC, platelets ± differential.",
    "UEC": "Urea, electrolytes, creatinine. Renal function + Na/K screen.",
    "LFT": "Liver function tests. ALT, AST, ALP, GGT, bilirubin, albumin.",
    "TFT": "Thyroid function tests. TSH ± free T4 and free T3.",
    "CRP": "C-reactive protein. Acute-phase reactant; rises hours after inflammatory stimulus.",
    "ESR": "Erythrocyte sedimentation rate. Slower-rising inflammatory marker.",
    "eGFR": "Estimated glomerular filtration rate. Calculated from creatinine + age ± sex.",
    "BMI": "Body mass index, kg/m². AU adult cut-offs: <18.5 underweight, 25-29.9 overweight, ≥30 obese.",
    "GCS": "Glasgow Coma Scale. Eye, verbal, motor; range 3-15. ≤8: secure the airway.",
    "BNP": "B-type natriuretic peptide. Marker of cardiac wall stretch; rises in heart failure.",
    "TSH": "Thyroid-stimulating hormone. First-line thyroid screen; raised in primary hypothyroidism.",
    "ICU": "Intensive care unit.",
    "GP": "General practitioner.",
    "OGTT": "Oral glucose tolerance test. See GTT.",
    "STI": "Sexually transmitted infection.",
    "UTI": "Urinary tract infection.",
    "MSU": "Midstream urine sample.",
    "CPAP": "Continuous positive airway pressure. Non-invasive ventilation; first-line in obstructive sleep apnoea.",
    "BiPAP": "Bilevel positive airway pressure. Non-invasive ventilation with distinct inspiratory + expiratory pressures.",
    "AED": "Antiepileptic drug.",
    "TCA": "Tricyclic antidepressant. e.g. amitriptyline, nortriptyline.",
    "MAOI": "Monoamine oxidase inhibitor.",
    "GORD": "Gastro-oesophageal reflux disease.",
    "IBS": "Irritable bowel syndrome.",
    "IBD": "Inflammatory bowel disease. Covers Crohn's disease and ulcerative colitis.",
    "OCD": "Obsessive-compulsive disorder.",
    "PTSD": "Post-traumatic stress disorder.",
    "ADHD": "Attention-deficit hyperactivity disorder.",
    "ASD": "Autism spectrum disorder (psych/paeds context) or atrial septal defect (cardiac context).",
    "TIA": "Transient ischaemic attack. Stroke-like deficit resolving within 24 h (most <1 h).",
    "MI": "Myocardial infarction.",
    "CHF": "Congestive heart failure.",
    "AF": "Atrial fibrillation.",
    "VT": "Ventricular tachycardia.",
    "VF": "Ventricular fibrillation.",
  };

  // Precompile regex outside the hot path. Word-boundary on both
  // sides so we don't match inside other words ("PEs" doesn't match
  // "PE", "DKAish" doesn't match "DKA"). Longest-first so "HELLP"
  // matches before any shorter prefix would.
  const TERM_KEYS = Object.keys(TERM_GLOSSARY).sort((a, b) => b.length - a.length);
  const TERM_REGEX = new RegExp(
    "\\b(" + TERM_KEYS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b",
    "g"
  );

  function wrapTerms(html) {
    // Avoid wrapping inside existing tags (e.g. <mark>...). The stem
    // HTML at this point only contains <mark class="stem-clue">
    // wrappers from the clue pass, so a simple split on tag boundaries
    // is enough.
    const parts = html.split(/(<[^>]+>)/);
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith("<")) continue;
      parts[i] = parts[i].replace(TERM_REGEX, m =>
        `<span class="term" data-term="${esc(m)}" tabindex="0" role="button">${m}</span>`);
    }
    return parts.join("");
  }

  // One popup element, created lazily and positioned against the term.
  // Opening a definition is a deliberate act: a tap or click toggles it,
  // keyboard focus opens it, and a mouse has to rest on the term for
  // TERM_HOVER_MS first, so moving the pointer across a paragraph full of
  // dotted terms does not flicker popups over the text being read. Once
  // one is open, the next term under the mouse opens at once.
  const TERM_HOVER_MS = 350;
  let _termPopup = null;
  let _termOpenFor = null;
  let _termHoverTimer = null;
  function getTermPopup() {
    if (_termPopup) return _termPopup;
    _termPopup = document.createElement("div");
    _termPopup.className = "term-popup";
    _termPopup.id = "termPopup";
    _termPopup.setAttribute("role", "tooltip");
    _termPopup.hidden = true;
    document.body.appendChild(_termPopup);
    return _termPopup;
  }
  function showTermPopup(span) {
    const term = span.getAttribute("data-term");
    if (!term) return;
    const def = TERM_GLOSSARY[term] || TERM_GLOSSARY[term.toUpperCase()];
    if (!def) return;
    const pop = getTermPopup();
    pop.innerHTML = `<div class="term-popup-head">${esc(term)}</div><div class="term-popup-body">${esc(def)}</div>`;
    pop.hidden = false;
    if (_termOpenFor && _termOpenFor !== span) _termOpenFor.removeAttribute("aria-describedby");
    _termOpenFor = span;
    span.setAttribute("aria-describedby", "termPopup");
    // Position below the span by default; flip above if it would
    // overflow the viewport bottom; clamp horizontally so the popup
    // never disappears off the left/right edges.
    const r = span.getBoundingClientRect();
    pop.style.left = "0px";
    pop.style.top  = "0px";
    const pr = pop.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth  || document.documentElement.clientWidth;
    let top = r.bottom + 6;
    if (top + pr.height > vh - 8) top = r.top - pr.height - 6;
    let left = r.left;
    if (left + pr.width > vw - 8) left = vw - pr.width - 8;
    if (left < 8) left = 8;
    pop.style.left = `${left + window.scrollX}px`;
    pop.style.top  = `${top + window.scrollY}px`;
  }
  function hideTermPopup() {
    clearTimeout(_termHoverTimer);
    if (_termPopup) _termPopup.hidden = true;
    if (_termOpenFor) _termOpenFor.removeAttribute("aria-describedby");
    _termOpenFor = null;
  }
  const termAt = t => (t instanceof Element) ? t.closest(".term") : null;
  // Pointer events carry the device, so hover logic applies to a mouse
  // only; a tap arrives as the click below.
  document.addEventListener("pointerover", e => {
    const t = termAt(e.target);
    if (!t || e.pointerType !== "mouse") return;
    clearTimeout(_termHoverTimer);
    if (_termOpenFor) showTermPopup(t);
    else _termHoverTimer = setTimeout(() => showTermPopup(t), TERM_HOVER_MS);
  });
  document.addEventListener("pointerout", e => {
    const t = termAt(e.target);
    if (!t || e.pointerType !== "mouse" || t.contains(e.relatedTarget)) return;
    clearTimeout(_termHoverTimer);
    if (document.activeElement !== t) hideTermPopup();
  });
  document.addEventListener("click", e => {
    const t = termAt(e.target);
    if (!t) { if (_termOpenFor && !(_termPopup && _termPopup.contains(e.target))) hideTermPopup(); return; }
    clearTimeout(_termHoverTimer);
    if (_termOpenFor === t && e.pointerType !== "mouse") hideTermPopup();
    else showTermPopup(t);
  });
  // Keyboard focus only: a tap also focuses the term, and opening here
  // would let the click that follows toggle it straight back shut.
  document.addEventListener("focusin", e => {
    const t = termAt(e.target);
    let kb = false;
    try { kb = !!(t && t.matches(":focus-visible")); } catch (_) { /* old engine */ }
    if (kb) showTermPopup(t);
  });
  document.addEventListener("focusout", e => { if (termAt(e.target) === _termOpenFor) hideTermPopup(); });
  // Capture phase on window, so Escape (or Enter/Space on a focused term)
  // is spent here and does not also reach the quiz keys, which would
  // clear the selection or move to the next question.
  window.addEventListener("keydown", e => {
    const t = termAt(e.target);
    if (t && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault(); e.stopPropagation();
      if (_termOpenFor === t) hideTermPopup(); else showTermPopup(t);
      return;
    }
    if (e.key === "Escape" && _termOpenFor) { e.stopPropagation(); hideTermPopup(); }
  }, true);
  window.addEventListener("scroll", () => { if (_termOpenFor) hideTermPopup(); }, { passive: true });

  // Fisher-Yates, drawing from crypto.getRandomValues where it exists.
  function shuffle(arr) {
    const a = arr.slice();
    const n = a.length;
    if (n < 2) return a;
    const buf = new Uint32Array(n);
    const cryptoApi = (typeof crypto !== "undefined" && crypto.getRandomValues) ? crypto : null;
    if (cryptoApi) cryptoApi.getRandomValues(buf);
    for (let i = n - 1; i > 0; i--) {
      const r = cryptoApi ? buf[i] / 4294967296 : Math.random();
      const j = Math.floor(r * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function esc(s) {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  // Counts and dates follow the Australian Government Style Manual:
  // "7,053", "23 Sept 2026", whatever the browser's own locale is.
  const NUM_AU = new Intl.NumberFormat("en-AU");
  function fmtNum(n) { return NUM_AU.format(n); }
  // plural(1, "question") -> "1 question"; plural(3, "match", "matches").
  function plural(n, one, many) {
    return `${fmtNum(n)} ${n === 1 ? one : (many || one + "s")}`;
  }
  function fmtDate(ms, withYear) {
    return new Date(ms).toLocaleDateString("en-AU",
      withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
  }
})();
