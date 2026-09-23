/* A to E - SPA driver.
 *
 * Layout: centred 720px reading column always.
 * Top progress strip + question dropdown (no AMBOSS-style sidebar).
 * Reference panel = fixed right-side overlay (does NOT shift content).
 * Subtopic NEVER revealed before answer (would spoil the diagnosis).
 *
 * Study mode = continuous, instant explanation on submit.
 * Test mode  = no reveal until end, optional countdown timer.
 */

(function () {
  "use strict";

  // Web Storage that cannot take the app down. These names shadow the
  // globals for everything inside this IIFE.
  //
  // With site data blocked, merely reading `window.localStorage` throws
  // SecurityError; with a full quota every setItem throws
  // QuotaExceededError. The first killed the DOMContentLoaded handler on
  // its first line and left the gate locked over a blank page, guest
  // mode included. The second did the same at boot, and mid-session it
  // threw out of onSubmit so the answer was never revealed. Now a write
  // that fails is kept in memory for this tab (reads see it), the
  // failure is logged once, and the app keeps working unpersisted.
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

  // Remote backend (Cloudflare Worker). Set this to the URL printed by
  // `wrangler deploy` from cloudflare-worker/. While null/empty, the
  // site falls back to the local Python backend (scripts/server.py) for
  // dev or to localStorage as a last resort.
  const WORKER_URL = "https://a-to-e-inbox.mord58562.workers.dev";

  const HISTORY_KEY  = "y4mcq.history.v1";
  const FLAGS_KEY    = "y4mcq.flags.v1";
  const THEME_KEY    = "y4mcq.theme.v1";     // shared across profiles
  const SETTINGS_KEY = "y4mcq.settings.v3";
  const REMINDER_DISMISS_KEY = "y4mcq.reminder.dismissed";
  const LOCAL_QUESTIONS_KEY  = "y4mcq.local_questions.v1";
  const PROFILE_CURRENT_KEY  = "y4mcq.profile.current";
  const PROFILE_MIGRATED_KEY = "y4mcq.profile.migrated.v1";
  const AUTH_TOKEN_KEY       = "y4mcq.auth.token";
  // Last known masthead identity, so the name pill and the Admin button
  // can be painted with the rest of the row instead of arriving after
  // the round-trip that confirms them. Cosmetic only: every admin
  // surface is gated on the server, and the real answer overwrites this
  // as soon as /api/me lands.
  const CHROME_KEY           = "y4mcq.chrome.v1";
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

  async function apiFetch(path, options) {
    if (!WORKER_URL) throw new Error("Cloud backend not configured");
    const headers = { "Content-Type": "application/json", ...(options && options.headers || {}) };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    let r;
    try {
      r = await fetch(WORKER_URL.replace(/\/$/, "") + path, { ...(options || {}), headers });
    } catch (netErr) {
      // Distinguish offline / DNS / TLS failures from a well-formed server
      // 4xx/5xx. The signup + signin forms surface this straight to the user.
      throw new Error("Can't reach the server. Check your connection.");
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data.ok === false) {
      const serverMsg = data.error || "";
      let friendly = serverMsg;
      // 401 only means "wrong password" on the sign-in path. Everywhere
      // else it means the session died, and telling an admin mid-delete
      // that their password is wrong sends them looking for the wrong bug.
      if (r.status === 401) {
        friendly = path === "/api/login"
          ? "Wrong email or password."
          : "Your session expired. Sign in again.";
      } else if (r.status === 429) {
        friendly = serverMsg || "Too many attempts. Try again in a few minutes.";
      } else if (r.status === 413) {
        friendly = "That's too much data for one request.";
      } else if (r.status >= 500) {
        friendly = "Server error. Try again in a moment." + (data.ref ? ` (ref ${data.ref})` : "");
      }
      const e = new Error(friendly || `HTTP ${r.status}`);
      e.status = r.status;
      e.serverError = serverMsg;
      throw e;
    }
    return data;
  }

  async function cloudCheckAuth() {
    if (!WORKER_URL) return null;
    const t = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!t) return null;
    authToken = t;
    try {
      const { user } = await apiFetch("/api/me", { method: "GET" });
      cloudUser = user;
      return user;
    } catch (e) {
      authToken = null;
      // Only a 401 means the session is dead. Deleting the token on any
      // failure signed a user out for good whenever the worker blipped
      // or the network dropped at page load; if they then carried on as
      // a guest, that session's answers landed outside their account.
      // Keep the token so the next load can restore the session.
      if (e && e.status === 401) localStorage.removeItem(AUTH_TOKEN_KEY);
      else {
        authCheckFailed = true;
        console.warn("[auth] could not verify the saved session:", e && e.message || e);
      }
      return null;
    }
  }
  async function cloudSignIn(email, password) {
    const { token, user } = await apiFetch("/api/login", { method: "POST", body: JSON.stringify({ email, password }) });
    authToken = token; cloudUser = user;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    return user;
  }
  async function cloudSignUp(email, password, displayName, inviteCode) {
    const payload = { email, password, display_name: displayName, invite_code: inviteCode };
    const { token, user } = await apiFetch("/api/register", { method: "POST", body: JSON.stringify(payload) });
    authToken = token; cloudUser = user;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    return user;
  }
  function cloudSignOut() {
    // Best-effort server-side session revoke so the token can't be replayed
    // even if it leaked between issue and sign-out. Fire-and-forget; the
    // client-side clear below happens unconditionally so a network failure
    // never traps a user in a signed-in state locally.
    const wasToken = authToken;
    if (wasToken) {
      apiFetch("/api/logout", { method: "POST" }).catch(() => {});
    }
    authToken = null; cloudUser = null;
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
  // Pull the signed-in user's full state (answers + flags + settings)
  // from the worker so a fresh browser sees the same picture as the
  // original device. Server is the source of truth; localStorage is a
  // read-through cache that we OVERWRITE with this response.
  //
  // Returns { history, flags, settings } or null on failure. We do NOT
  // return empty shapes on failure - the caller needs to distinguish
  // "fetched and empty" from "couldn't reach the server" so it doesn't
  // wipe local state on a transient network blip.
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
  // Legacy single-endpoint hydrator, kept for callers that only need
  // history. Wraps cloudFetchState; returns {} on failure (legacy shape).
  async function cloudFetchHistory() {
    const s = await cloudFetchState();
    return (s && s.history) || {};
  }
  async function cloudPostAnswer(qid, sourceLetter, correct) {
    if (!cloudUser) return null;
    // Skip the round-trip when we don't have a real source letter, and
    // check for a single letter rather than a substring: "ABCDE".includes
    // is true for "", "AB" and "BCD" too. Guest-import replay hits this
    // path with sourceLetter=""; those answers are pre-account and
    // intentionally don't join the per-user server history.
    if (typeof sourceLetter !== "string" || sourceLetter.length !== 1 ||
        !"ABCDE".includes(sourceLetter)) return null;
    try {
      await apiFetch("/api/answer", { method: "POST", body: JSON.stringify({ question_id: qid, source_letter: sourceLetter, correct }) });
      return true;
    } catch (e) {
      console.warn("[sync] cloudPostAnswer failed:", e && e.message || e);
      return null;
    }
  }
  async function cloudPostFlag(qid, on) {
    if (!cloudUser) return false;
    try {
      await apiFetch("/api/flag", { method: "POST", body: JSON.stringify({ question_id: qid, on: !!on }) });
      return true;
    } catch (e) {
      console.warn("[sync] cloudPostFlag failed:", e && e.message || e);
      return false;
    }
  }
  async function cloudPostSettings(settings) {
    if (!cloudUser) return false;
    try {
      await apiFetch("/api/settings", { method: "POST", body: JSON.stringify({ settings }) });
      return true;
    } catch (e) {
      console.warn("[sync] cloudPostSettings failed:", e && e.message || e);
      return false;
    }
  }

  // Admin is a server-side fact (users.is_admin), re-checked by the worker
  // on every admin endpoint. The client class below only controls chrome.
  function isCurrentUserAdmin() {
    return !!(cloudUser && cloudUser.is_admin);
  }
  // Apply the is-admin class to <body> so the CSS rule
  // `body:not(.is-admin) .admin-only { display: none }` kicks in.
  // Same pattern for is-cloud so cloud-only chrome (Account modal,
  // settings, etc.) is hidden for guests / legacy profiles.
  function refreshAdminBodyClass() {
    document.body.classList.toggle("is-admin", isCurrentUserAdmin());
    document.body.classList.toggle("is-cloud", !!cloudUser);
    refreshAdminAccountVisibility();
  }
  // Deterministic per-user pill hue (one of 12 evenly-spaced hues around the
  // wheel). The CSS defines saturation + lightness so the colour lands in a
  // legible band in both light and dark themes.
  function pillHueFor(seed) {
    let h = 5381;
    for (let i = 0; i < (seed || "").length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) | 0;
    const idx = Math.abs(h) % 12;
    return idx * 30;
  }

  // The legacy local-profile path is gone (2026-09-22). It shipped an
  // unsalted SHA-256 of a three-character password in public client
  // source, and restored itself from localStorage with no password check
  // at all, so it was never a gate. It granted no server authority
  // either - every worker endpoint re-checks users.is_admin. Admin is
  // now the cloud account flag and nothing else. `currentProfile` stays
  // declared because ns() and the sign-out path still read it; it is
  // permanently null.
  let currentProfile = null;
  // Namespace a storage key by the current profile so each user has
  // their own history / flags / settings / reminders / pasted questions.
  // Falls back to the bare key if no profile is loaded yet (only happens
  // pre-gate, where we never actually read state-bearing keys).
  function ns(key) {
    // Cloud user takes precedence so a signed-in account's progress
    // always lives in its own cross-device namespace - never shadowed
    // by a stale legacy profile token left from earlier builds.
    if (cloudUser) return `${key}.cloud-${cloudUser.id}`;
    if (currentProfile) return `${key}.${currentProfile.id}`;
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
  // Inject live bank counts into the prompt so other LLMs (Gemini /
  // ChatGPT / Mistral / DeepSeek - the free-tier paste flow) know
  // where the bank currently is and which discipline most needs new
  // questions. The placeholder is optional; if the template doesn't
  // include it, this is a no-op.
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

  // POST to the remote worker first, then local backend, then null.
  // Returns the parsed response on success, or null if both failed.
  async function postBackend(endpoint, body) {
    const targets = [];
    if (WORKER_URL) targets.push(WORKER_URL.replace(/\/$/, "") + "/" + endpoint.replace(/^\//, ""));
    targets.push("api/" + endpoint.replace(/^\//, ""));
    const headers = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    // The reason the last target failed. Returning a bare null for every
    // failure told the user to check their connection when the server had
    // in fact answered with something specific - a 429, or a 400 naming
    // the problem - and left a TLS or CORS failure with no trace at all.
    let last = null;
    for (const url of targets) {
      try {
        const r = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        if (r.ok) return await r.json().catch(() => ({ ok: true }));
        const data = await r.json().catch(() => ({}));
        last = { ok: false, status: r.status, error: data.error || `HTTP ${r.status}` };
        console.warn("[backend]", url, r.status, data.error || "");
      } catch (e) {
        last = { ok: false, status: 0, error: (e && e.message) || "could not reach the server" };
        console.warn("[backend]", url, e && e.message);
      }
    }
    return last;
  }

  // The stored value has to be the same kind of thing as the default.
  // A key holding `{}` where an array belongs (or a string where an
  // object belongs) used to come straight back: `{}` in the pasted-
  // questions key made loadData throw "not iterable" and left the page
  // blank, and a string in the history key threw on the first submit.
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
  // guard, so a wrong-typed field stopped the home screen rendering.
  function normaliseSettings(s) {
    const out = Object.assign({}, DEFAULT_SETTINGS, (s && typeof s === "object" && !Array.isArray(s)) ? s : {});
    for (const f of ["disciplines", "difficulties"]) {
      // An empty stored list would now mean "nothing matches", and a
      // saved session should never open on an empty bank, so an empty
      // one resets to everything.
      if (!Array.isArray(out[f]) || !out[f].length) out[f] = DEFAULT_SETTINGS[f].slice();
    }
    if (out.subtopics !== null && !Array.isArray(out.subtopics)) out.subtopics = null;
    return out;
  }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  // Settings sync is debounced so rapid setting flips (e.g. clicking
  // through difficulty options) collapse into one POST per ~600ms idle
  // window. Local save is immediate.
  let _settingsSyncTimer = null;
  function saveSettings() {
    save(ns(SETTINGS_KEY), state.settings);
    if (!cloudUser) return;
    if (_settingsSyncTimer) clearTimeout(_settingsSyncTimer);
    _settingsSyncTimer = setTimeout(() => {
      _settingsSyncTimer = null;
      cloudPostSettings(state.settings);
    }, 600);
  }

  // Hydrate per-profile state after the gate has set currentProfile.
  // Pre-gate, state.history/flags/settings are empty defaults.
  function loadProfileState() {
    state.history  = load(ns(HISTORY_KEY), {});
    state.flags    = load(ns(FLAGS_KEY), {});
    state.settings = normaliseSettings(load(ns(SETTINGS_KEY), {}));
  }

  // One-time legacy migration. Older builds used unscoped keys (one
  // profile per browser). If we detect leftover unscoped data the first
  // time a profile signs in on this browser, move it into that
  // profile's namespace so existing history/flags/settings/questions
  // don't appear lost.
  function migrateLegacyIfNeeded() {
    if (!currentProfile && !cloudUser) return;
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
  function importLegacyHistoryIntoCloud() {
    if (!cloudUser) return;
    const importedFlag = "y4mcq.cloud.imported." + cloudUser.id;
    if (localStorage.getItem(importedFlag)) return;
    for (const profileId of LEGACY_PROFILE_IDS) {
      const profile = { id: profileId };
      const legHist = load(`${HISTORY_KEY}.${profile.id}`, null);
      if (!legHist) continue;
      const cloudKey = `${HISTORY_KEY}.cloud-${cloudUser.id}`;
      const existing = load(cloudKey, {});
      for (const qid in legHist) {
        if (!existing[qid] || (legHist[qid].count > (existing[qid].count || 0))) {
          existing[qid] = legHist[qid];
        }
      }
      save(cloudKey, existing);
      const legFlags = load(`${FLAGS_KEY}.${profile.id}`, null);
      if (legFlags) {
        const cloudFlagsKey = `${FLAGS_KEY}.cloud-${cloudUser.id}`;
        const ef = load(cloudFlagsKey, {});
        save(cloudFlagsKey, Object.assign({}, legFlags, ef));
      }
    }
    localStorage.setItem(importedFlag, "1");
  }

  // The gate. Note it is not a security boundary and never was: the
  // question JSON is public static files that anyone can fetch directly.
  // What it does is route a visitor to an account, a guest session, or
  // an invite. Everything that actually matters is enforced by the
  // worker against the bearer token.

  async function passGate() {
    return new Promise(async resolve => {
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

      // 1. Already signed in via cloud? Skip the gate AND clear any stale
      // legacy profile token so ns() never shadows the cloud namespace.
      const cloudCheck = await cloudCheckAuth();
      if (cloudCheck) {
        localStorage.removeItem(PROFILE_CURRENT_KEY);
        currentProfile = null;
        return unlock();
      }
      // preauth.js hid the gate before first paint because a token or a
      // guest id was stored. If the token has just failed (expired,
      // revoked, or the server unreachable) nothing un-hid it, so the
      // page sat blank with the gate display:none and nothing else
      // rendered. The guest path below unlocks straight away, so
      // dropping the class there costs nothing.
      document.documentElement.classList.remove("pre-authed");

      // 2. Clear any stored legacy profile id. It used to unlock the
      // admin chrome on its own, with no password check.
      localStorage.removeItem(PROFILE_CURRENT_KEY);

      // 3. Already in guest mode? Skip the gate (UNLESS the guest asked
      // to sign up, in which case we keep them at the gate so they can
      // create a cloud account that inherits their guest progress).
      const savedGuest = localStorage.getItem(GUEST_KEY);
      if (savedGuest && !signupIntent) { activateGuest(); return unlock(); }

      // Guest button: continue without an account; data lives in localStorage.
      const guestBtn = document.getElementById("gateGuestBtn");
      if (guestBtn) guestBtn.addEventListener("click", () => {
        activateGuest();
        unlock();
      });

      // 3. Cloud sign-in form.
      const signInForm = document.getElementById("cloudSignInForm");
      const signInErr  = document.getElementById("cloudSignInErr");
      if (authCheckFailed && signInErr) {
        signInErr.textContent = "Couldn't reach the server to restore your session. Reload to try again, or sign in.";
        signInErr.hidden = false;
      }
      signInForm.addEventListener("submit", async e => {
        e.preventDefault();
        signInErr.hidden = true;
        try {
          await cloudSignIn(
            document.getElementById("cloudSignInEmail").value.trim(),
            document.getElementById("cloudSignInPassword").value
          );
          localStorage.removeItem(PROFILE_CURRENT_KEY);
          currentProfile = null;
          localStorage.removeItem(GUEST_KEY);
          guestUser = null;
          unlock();
        } catch (err) {
          signInErr.textContent = (err && err.message) || "Sign in failed.";
          signInErr.hidden = false;
        }
      });

      // 4. Cloud sign-up form.
      const signUpForm = document.getElementById("cloudSignUpForm");
      const signUpErr  = document.getElementById("cloudSignUpErr");
      signUpForm.addEventListener("submit", async e => {
        e.preventDefault();
        signUpErr.hidden = true;
        const pw  = document.getElementById("cloudSignUpPassword").value;
        const pw2 = (document.getElementById("cloudSignUpPassword2") || {}).value || "";
        if (pw !== pw2) {
          signUpErr.textContent = "Passwords don't match.";
          signUpErr.hidden = false;
          return;
        }
        try {
          await cloudSignUp(
            document.getElementById("cloudSignUpEmail").value.trim(),
            pw,
            document.getElementById("cloudSignUpName").value.trim(),
            (document.getElementById("cloudSignUpInvite") || {}).value || "",
          );
          // Capture any pre-existing guest id BEFORE we clear it so we
          // can fold guest progress into the new cloud account.
          let prevGuestId = null;
          try {
            const g = localStorage.getItem(GUEST_KEY);
            if (g) prevGuestId = JSON.parse(g).id;
          } catch (_) {}
          if (prevGuestId) migrateGuestHistoryIntoCloud(prevGuestId);
          localStorage.removeItem(PROFILE_CURRENT_KEY);
          currentProfile = null;
          localStorage.removeItem(GUEST_KEY);
          guestUser = null;
          unlock();
        } catch (err) {
          signUpErr.textContent = (err && err.message) || "Sign up failed.";
          signUpErr.hidden = false;
        }
      });

      switchPane(signupIntent ? "signup" : "signin");
    });
  }

  function signOut() {
    localStorage.removeItem(PROFILE_CURRENT_KEY);
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
  // The rail's top used to be a hand-tuned 84px, which sat a few pixels
  // inside the topbar band and drifted with any change of font size or
  // safe-area inset. Measure it instead and let CSS read the number.
  function trackMastheadHeight() {
    const masthead = document.querySelector(".masthead");
    if (!masthead) return;
    const set = () => {
      const h = Math.round(masthead.getBoundingClientRect().height);
      // Zero means it is not on screen yet: behind the gate the whole app
      // shell is display:none, and writing 0px here overrode the
      // stylesheet's fallback and dropped the rail under the topbar.
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
    // Kick off the data load in parallel with the gate. The bank JSON does
    // not depend on which user is signed in, so we can overlap the ~54
    // file fetches with the /api/me round-trip + any password entry. On a
    // returning signed-in user this overlaps roughly 100-400ms of /api/me
    // latency with the dominant data download.
    const dataPromise = loadData();
    await passGate();
    migrateLegacyIfNeeded();
    importLegacyHistoryIntoCloud();
    loadProfileState();
    // Cloud user: SERVER IS THE SOURCE OF TRUTH. On every session start
    // we pull the full per-user state (history + flags + settings) and
    // REPLACE the local cache. Merge-bias-toward-local lost newer
    // updates from other devices; this replacement model can't.
    //
    // Defensive: only overwrite when the fetch actually succeeded. A
    // transient network failure must NOT wipe a returning user's local
    // cache - they can keep working offline against the last-known
    // server snapshot and we'll re-hydrate on the next reload.
    if (cloudUser) {
      const remote = await cloudFetchState();
      if (remote) {
        // The server's answers table has no time column, so its history rows
        // carry lastCorrect / count / last_at and nothing else. Replacing the
        // local row wholesale therefore destroyed time_ms_total on every
        // reload, and the stats panel flipped to "time not recorded" for a
        // user who had been timed all along.
        //
        // These fields are LOCAL-ONLY: they are never posted anywhere, so
        // the local copy is the only copy and there is no cross-device
        // update to lose. Carrying them across keeps the server the source
        // of truth for everything it actually knows about.
        const LOCAL_ONLY = ["time_ms_total", "first_correct"];
        const prevHistory = state.history || {};
        const remoteHistory = remote.history || {};
        // The server wins for every question it knows about, and rows it
        // has never seen are kept rather than dropped. Replacing the map
        // wholesale destroyed a guest's answers the moment they signed
        // up: the migration merges them into the cloud key during
        // passGate, and this ran a few lines later against an empty
        // server history. It also silently discarded anything answered
        // while the worker was unreachable, since those posts fail quietly.
        state.history = { ...prevHistory, ...remoteHistory };
        for (const qid in remoteHistory) {
          const prev = prevHistory[qid];
          if (!prev) continue;
          for (const f of LOCAL_ONLY) {
            if (prev[f] !== undefined && state.history[qid][f] === undefined) {
              state.history[qid][f] = prev[f];
            }
          }
        }
        // Flags are a small set and the server is authoritative, but the
        // same argument applies to one flagged locally and not yet synced.
        state.flags   = { ...(state.flags || {}), ...(remote.flags || {}) };
        if (remote.settings && typeof remote.settings === "object") {
          state.settings = normaliseSettings(remote.settings);
        }
        save(ns(HISTORY_KEY), state.history);
        save(ns(FLAGS_KEY),   state.flags);
        save(ns(SETTINGS_KEY), state.settings);
      }
    }
    await dataPromise;
    mergeLocalQuestions();
    // Wire each subsystem defensively so a single throw in any wiring
    // function can't leave the home view unrendered (the symptom that
    // looked like "blank screen until clicking the logo"). Each wire is
    // independent; a failure in one shouldn't suppress showHome().
    const wires = [
      ["masthead",   wireMasthead],
      ["colophon",   wireColophon],
      ["refPanel",   wireRefPanel],
      ["quizTopbar", wireQuizTopbar],
      ["howTo",      wireHowToModal],
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
  });

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
    // The legacy account modal is superseded by the unified Admin
    // interface; the Account / Admin buttons both route there.
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

  // ── Unified Admin interface ─────────────────────────────────────────
  // One modal, sidebar tabs. Non-admin cloud users see Account only;
  // admins see the full set. Each tab lazy-renders into #adminMain.
  // For tabs whose content lives in legacy modals (Add, Inbox, Reports,
  // Live), we re-parent the existing wired DOM into the active panel
  // on tab activation so the original event handlers keep working.
  // Four sections, not five. Overview and Quality were both "how is the
  // bank doing" and are now one Bank section; Add & audit keeps its own
  // because it is a working surface rather than a reading one. Users is
  // first because it is the one used daily.
  const ADMIN_TABS = [
    { id: "users",    label: "Users",    admin: true },
    { id: "bank",     label: "Bank",     admin: true },
    { id: "content",  label: "Content",  admin: true },
    { id: "account",  label: "Account",  admin: false },
  ];
  // Old deep links, kept so existing call sites do not silently land on
  // the wrong pane.
  const ADMIN_TAB_ALIASES = { overview: "bank", quality: "bank", addaudit: "content",
                              add: "content", inbox: "content" };

  /* ── status region ──────────────────────────────────────────────────
   * One element for the whole panel. Never auto-dismisses: an admin who
   * misses a toast has no other record that the action happened, and
   * auto-dismissal runs into WCAG 2.2.1. Success is role=status,
   * problems switch the element to role=alert so they interrupt.
   */
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

  /* ── confirmation ───────────────────────────────────────────────────
   * Friction proportional to the blast radius. A role change is
   * instantly reversible, so it gets none. Deleting an account destroys
   * data that cannot be recovered, so it gets a dialog that names the
   * person, states how many answers go with them, and requires their
   * email typed out. window.confirm can do none of that.
   */
  function adminConfirm({ title, body, confirmLabel, typeToMatch, typeLabel }) {
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
      } else {
        wrap.hidden = true;
        go.disabled = false;
        input.oninput = null;
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
    const want = ADMIN_TAB_ALIASES[initialTab] || initialTab;
    selectAdminTab(tabs.some(t => t.id === want) ? want : tabs[0].id);
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
      loadPromptTemplate();
      if (typeof refreshLocalBankSummary === "function") refreshLocalBankSummary();
      if (typeof refreshAuditInboxList === "function") {
        refreshAuditInboxList().then(() => {
          if (typeof renderAuditInbox === "function") renderAuditInbox();
        });
      }
      if (typeof renderReportsAdminList === "function") renderReportsAdminList(_reportFilter);
      if (typeof loadAndRenderAuditLive === "function") loadAndRenderAuditLive();
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
    const t = setTimeout(() => {
      root.innerHTML = `<div class="admin-skeleton">` +
        Array.from({ length: rows || 3 }, () => `<div class="sk-row"></div>`).join("") +
        `</div>`;
    }, 1000);
    return () => clearTimeout(t);
  }
  function adminLoadError(root, what, retry) {
    root.innerHTML = `<p class="admin-empty" role="alert">Could not load ${esc(what)}. ` +
      `<button type="button" class="link-btn" data-admin-retry>Try again</button></p>`;
    const b = root.querySelector("[data-admin-retry]");
    if (b) b.onclick = retry;
  }

  /* ── Bank ───────────────────────────────────────────────────────────
   * Overview and Quality merged. No stat tiles and no charts: a bare
   * number has no answer to "is that good?", and a bar chart of six
   * integers is decoration. One table with Target and Gap answers the
   * question the numbers exist to answer.
   */
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
        [1, 2, 3, 4, 5].map(d => `<td>${g[d]}</td>`).join("") +
        `<td class="num-strong">${byTopic[t] || 0}</td></tr>`;
    }).join("");
    const totalsRow = `<tr class="tr-total"><th scope="row">All</th>` +
      [1, 2, 3, 4, 5].map(d => `<td>${counts[d]}</td>`).join("") +
      `<td class="num-strong">${total}</td></tr>`;
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

    root.innerHTML = `
      <div class="admin-pane">
        <p class="admin-fact">${total.toLocaleString()} questions.
          Last added ${esc(String(meta.last_added || meta.updated || "unknown"))}.
          ${reportsOpen ? `<b>${reportsOpen}</b> open report${reportsOpen === 1 ? "" : "s"}.` : "No open reports."}
          ${inboxCount ? `<b>${inboxCount}</b> batch${inboxCount === 1 ? "" : "es"} in the inbox.` : ""}</p>

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
      const box = qRoot.querySelector(".admin-skeleton") || qRoot.appendChild(document.createElement("div"));
      box.outerHTML = "";
      return adminLoadError(qRoot, "answer quality", () => renderAdminBankTab(root));
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
      <p class="admin-fact">${totals.users || 0} ${totals.users === 1 ? "person" : "people"},
        ${(totals.answers || 0).toLocaleString()} answers across
        ${(totals.qs || 0).toLocaleString()} questions.</p>
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

  /* ── Users ──────────────────────────────────────────────────────────
   * A real table: left-aligned text, right-aligned numbers in tabular
   * figures, one hairline per row, no zebra, no avatars, no status
   * pills, action buttons always visible with the person's name in a
   * visually hidden span so a screen reader hears "Remove admin for
   * Jane Smith" rather than "Remove admin".
   */
  function relTime(ts) {
    if (!ts) return { text: "never", title: "" };
    const then = ts * 1000;
    const days = Math.floor((Date.now() - then) / 86400000);
    const text = days <= 0 ? "today" : days === 1 ? "yesterday"
      : days < 30 ? `${days} days ago`
      : days < 365 ? `${Math.floor(days / 30)} months ago`
      : `${Math.floor(days / 365)} years ago`;
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
      // The old code swallowed this and rendered "0 accounts", which is
      // indistinguishable from a working empty instance.
      return adminLoadError(root, "the user list", () => renderAdminUsersTab(root));
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
        <p class="admin-fact">${users.length} account${users.length === 1 ? "" : "s"},
          ${adminCount} admin${adminCount === 1 ? "" : "s"}.</p>
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
      const slow = setTimeout(() => { btn.textContent = act === "promote" ? "Promoting…" : "Demoting…"; }, 1000);
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
          .then(() => { adminSay("ok", "Reverted."); renderAdminUsersTab(root); })
          .catch(e => adminSay("error", e.message || String(e))));
    }

    if (act === "delete") {
      const okd = await adminConfirm({
        title: `Delete ${name}'s account?`,
        body: `This permanently deletes ${email} and ${answers} saved ` +
              `${answers === 1 ? "answer" : "answers"}. It cannot be undone.`,
        confirmLabel: `Delete ${email} permanently`,
        typeToMatch: email,
        typeLabel: `Type ${email} to confirm`,
      });
      if (!okd) return;
      // No undo offered, because there is none.
      return run(`/api/admin/users/${encodeURIComponent(id)}/delete`,
        `Deleted ${email} and ${answers} ${answers === 1 ? "answer" : "answers"}.`);
    }
  }

  /* ── Invite codes ───────────────────────────────────────────────────
   * Registration is invite-only, so this is the only way to let someone
   * in. The plaintext code exists exactly once, in the response to the
   * create call, so it is shown until dismissed rather than flashed.
   */
  // A code the admin has just created. renderInvites() rebuilds the whole
  // section, and it is called immediately after a create, which used to
  // wipe the reveal within the same tick - the code was on screen for
  // less time than it takes to read. Holding it here means the refresh
  // repaints it instead of destroying it.
  let freshInvite = null;

  function freshInviteHtml() {
    if (!freshInvite) return "";
    return `<div class="invite-fresh">
      <p>New code for ${esc(freshInvite.label || "no one in particular")}. Send it to one person.</p>
      <div class="invite-code-row">
        <code>${esc(freshInvite.code)}</code>
        <button type="button" class="secondary" data-copy-code="${esc(freshInvite.code)}">Copy</button>
        <button type="button" class="link-btn" id="inviteFreshDismiss">Dismiss</button>
      </div></div>`;
  }

  async function renderInvites(root, usersRoot) {
    if (!root) return;
    const token = _adminRenderSeq;
    const head = `<h3>Invite codes</h3>
      <p class="admin-fact">Registration is invite only. A code works once.</p>
      <form class="invite-new" id="inviteNew">
        <label>For <input id="inviteLabel" type="text" maxlength="80" placeholder="name or note" /></label>
        <label>Expires in
          <select id="inviteDays">
            <option value="7">7 days</option>
            <option value="30" selected>30 days</option>
            <option value="90">90 days</option>
            <option value="365">a year</option>
          </select></label>
        <button type="submit" class="primary">Create code</button>
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
      return adminLoadError(list, "invite codes", () => renderInvites(root, usersRoot));
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
          `<button type="button" class="row-act" data-copy-code="${esc(i.code)}">Copy</button>`
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
        freshInvite = { code: r.code, label: document.getElementById("inviteLabel").value };
        document.getElementById("inviteLabel").value = "";
        renderInvites(root, usersRoot);
      } catch (err) {
        adminSay("error", err.message || String(err));
      } finally { btn.disabled = false; }
    };

    root.querySelectorAll("[data-copy-code]").forEach(b => {
      b.onclick = () => {
        const code = b.dataset.copyCode;
        const done = () => {
          const was = b.textContent;
          b.textContent = "Copied";
          setTimeout(() => { b.textContent = was; }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(done).catch(() =>
            adminSay("error", "Could not reach the clipboard. Select the code and copy it."));
        } else {
          adminSay("error", "Could not reach the clipboard. Select the code and copy it.");
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
          freshInvite = { code: r.code, label: b.dataset.label || "" };
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
          adminSay("ok", "Code revoked. It will not let anyone sign up, and it is off this list.");
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
        <form id="pwForm" class="admin-form" autocomplete="on">
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
        <button class="danger-btn" id="acctSelfDeleteOpen">Delete my account</button>
        <div class="acct-delete-confirm" id="acctDeleteConfirm" hidden>
          <label class="acct-delete-label" for="acctDeleteEmailInput">
            Type <code>${esc(cloudUser.email || "")}</code> to confirm.
          </label>
          <input type="email" id="acctDeleteEmailInput" class="acct-delete-input" autocomplete="off" spellcheck="false" placeholder="${esc(cloudUser.email || "")}">
          <div class="acct-delete-actions">
            <button class="ghost-link" id="acctDeleteCancel" type="button">Cancel</button>
            <button class="danger-btn" id="acctDeleteGo" type="button" disabled>Permanently delete</button>
          </div>
          <p class="acct-delete-status dim small" id="acctDeleteStatus" aria-live="polite"></p>
        </div>
      </section>
      </div>`;

    document.getElementById("pwForm").onsubmit = async e => {
      e.preventDefault();
      const cur = document.getElementById("pwCurrent").value;
      const a = document.getElementById("pwNew").value;
      const b = document.getElementById("pwNew2").value;
      if (a !== b) return adminSay("error", "The two new passwords do not match.");
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
    const openBtn = document.getElementById("acctSelfDeleteOpen");
    const confirmPane = document.getElementById("acctDeleteConfirm");
    const emailInput = document.getElementById("acctDeleteEmailInput");
    const cancelBtn = document.getElementById("acctDeleteCancel");
    const goBtn = document.getElementById("acctDeleteGo");
    const statusEl = document.getElementById("acctDeleteStatus");
    if (openBtn && confirmPane) {
      openBtn.onclick = () => {
        confirmPane.hidden = false;
        openBtn.hidden = true;
        statusEl.textContent = "";
        emailInput.value = "";
        goBtn.disabled = true;
        setTimeout(() => emailInput.focus(), 30);
      };
    }
    if (cancelBtn && confirmPane && openBtn) {
      cancelBtn.onclick = () => {
        confirmPane.hidden = true;
        openBtn.hidden = false;
        statusEl.textContent = "";
        emailInput.value = "";
      };
    }
    if (emailInput && goBtn) {
      emailInput.oninput = () => {
        const target = (cloudUser.email || "").trim().toLowerCase();
        const typed = emailInput.value.trim().toLowerCase();
        goBtn.disabled = !target || typed !== target;
        statusEl.textContent = "";
      };
      emailInput.onkeydown = e => {
        if (e.key === "Enter" && !goBtn.disabled) { e.preventDefault(); goBtn.click(); }
      };
    }
    if (goBtn) {
      goBtn.onclick = async () => {
        if (goBtn.disabled) return;
        goBtn.disabled = true;
        statusEl.textContent = "Deleting…";
        try {
          await apiFetch("/api/account/delete", { method: "POST" });
          statusEl.textContent = "Account deleted. Reloading…";
          cloudSignOut();
          setTimeout(() => location.reload(), 600);
        } catch (e) {
          statusEl.textContent = "Could not delete: " + (e.message || e);
          goBtn.disabled = false;
        }
      };
    }
  }

  function formatDuration(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
  }
  function renderStats() {
    const body = document.getElementById("statsBody");
    if (!body) return;
    const history = state.history || {};
    const ids = Object.keys(history);
    const bankById = {}; (state.questions || []).forEach(q => { bankById[q.id] = q; });

    // `lastCorrect` is the only correctness the server round-trips, so this
    // is genuinely last-attempt accuracy, not first-attempt. The headline
    // used to be labelled "first-time correct", which overstated a user who
    // retried a question until they got it right.
    let answered = 0, lastAttemptCorrect = 0, totalMs = 0, timedCount = 0;
    const byTopic = {};
    const byDiff = {};
    let lastAt = 0;
    for (const id of ids) {
      const h = history[id]; if (!h || !h.count) continue;
      const q = bankById[id]; if (!q) continue;
      answered++;
      if (h.lastCorrect) lastAttemptCorrect++;
      // Only aggregate time for entries that actually recorded a duration.
      // Legacy entries (pre-stats-panel) carry no time_ms_total - excluding
      // them avoids skewing the average toward zero.
      if (h.time_ms_total && h.time_ms_total > 0) {
        totalMs += h.time_ms_total;
        timedCount++;
      }
      if ((h.last_at || 0) > lastAt) lastAt = h.last_at || 0;
      const t = q.topic || "Other";
      byTopic[t] = byTopic[t] || { n: 0, correct: 0 };
      byTopic[t].n++; if (h.lastCorrect) byTopic[t].correct++;
      const d = String(q.difficulty || "?");
      byDiff[d] = byDiff[d] || { n: 0, correct: 0 };
      byDiff[d].n++; if (h.lastCorrect) byDiff[d].correct++;
    }
    const total = (state.questions || []).length;
    const acc = answered ? Math.round((lastAttemptCorrect / answered) * 100) : 0;
    const avg = timedCount ? Math.round(totalMs / timedCount / 1000) : 0;

    if (!answered) {
      body.innerHTML = `<p class="stats-empty">Stats land here once you've answered a few questions.</p>`;
      return;
    }

    const head = `
      <div class="stats-head">
        <div class="stats-num"><span class="stats-num-value">${answered}</span><span class="stats-num-label">questions answered (${Math.round(answered / total * 100) || 0}% of bank)</span></div>
        <div class="stats-num"><span class="stats-num-value">${acc}%</span><span class="stats-num-label">correct on last attempt</span></div>
        <div class="stats-num"><span class="stats-num-value">${timedCount ? formatDuration(totalMs) : '-'}</span><span class="stats-num-label">${timedCount ? `time studying · ${avg}s avg / q` : `time not recorded for ${answered} earlier ${answered === 1 ? 'answer' : 'answers'}`}</span></div>
      </div>`;

    function rows(map, order) {
      const keys = order ? order.filter(k => map[k]) : Object.keys(map).sort();
      const maxN = Math.max(1, ...keys.map(k => map[k].n));
      return keys.map(k => {
        const { n, correct } = map[k];
        const pct = n ? Math.round((correct / n) * 100) : 0;
        const widthPct = Math.round((n / maxN) * 100);
        return `
          <div class="stats-label">${esc(k)}</div>
          <div class="stats-count">${correct} / ${n}</div>
          <div class="stats-bar-wrap"><span style="width:${widthPct}%"></span></div>
          <div class="stats-pct-cell">${pct}%</div>`;
      }).join("");
    }

    const topicOrder = ["Paediatrics","Obstetrics & Gynaecology","Psychiatry","Medicine"];
    const diffOrder = ["1","2","3","4","5"];
    const lastStr = lastAt ? new Date(lastAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "-";

    body.innerHTML = `
      ${head}
      <div class="stats-section">
        <h3>By discipline</h3>
        <div class="stats-table">${rows(byTopic, topicOrder)}</div>
      </div>
      <div class="stats-section">
        <h3>By difficulty</h3>
        <div class="stats-table">${rows(byDiff, diffOrder)}</div>
      </div>
      <div class="stats-section">
        <h3>Last activity</h3>
        <p class="stats-empty" style="margin:0">${lastStr}</p>
      </div>`;
  }

  async function loadData() {
    // Data JSON files don't carry the CSS/JS cache-bust query string, so a
    // browser-cached manifest can hide brand-new batches for hours after they
    // land. Fetch meta first (small, always fresh via short TTL) then reuse
    // its `updated` timestamp as the effective cache-bust key on everything
    // downstream, so a new deploy or a scheduled routine push invalidates the
    // JSON caches even without a code release.
    const metaPre = await fetchJson("data/meta.json?t=" + Date.now()).catch(() => ({}));
    const v = metaPre && metaPre.updated ? String(metaPre.updated).replace(/[^0-9-]/g, "") : String(Math.floor(Date.now()/3600000));
    const bust = "?v=" + v;
    // Every bank source is counted the same way. A fetch that fails, a body
    // that is not JSON, and a body that is valid JSON but not an array all
    // mean "this file contributed nothing", and all of them have to reach
    // the count the home screen shows.
    //
    // Before this, only the batch files were counted. A 404 on a main
    // question file, a manifest that failed to load (which hides EVERY
    // batch), or a file that parsed as an object all shortened the bank
    // silently, with no warning anywhere and `failed` still reading 0.
    // Worse, an object in a main file made the spread below throw
    // "paeds is not iterable", which rejected loadData, skipped showHome()
    // and left the page blank with nothing logged.
    let srcTotal = 0, srcFailed = 0;
    const pullArray = (p) => {
      srcTotal++;
      return fetchJson(p).then(
        d => { if (Array.isArray(d)) return d; srcFailed++; return []; },
        () => { srcFailed++; return []; }
      );
    };
    const pullManifest = (p, key) => {
      srcTotal++;
      return fetchJson(p).then(
        d => {
          const list = d && d[key];
          if (Array.isArray(list)) return list;
          srcFailed++; return [];
        },
        () => { srcFailed++; return []; }
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
    const extra = await Promise.all(allPaths.map(p => pullArray("data/" + p + bust)));
    const extraQuestions = extra.flat();
    state.batchLoadStats = { total: srcTotal, failed: srcFailed };
    if (srcFailed > 0 && console && console.warn) {
      console.warn(`[a-to-e] ${srcFailed} of ${srcTotal} bank files failed to load`);
    }

    // A question the quiz cannot render or grade is dropped, and counted
    // like a failed file. With no options array renderQuiz threw and left
    // an empty quiz screen; with no option (or two) marked correct the
    // question could never be answered right, and nothing said so.
    const raw = [...paeds, ...obgyn, ...psych, ...medicine, ...extraQuestions];
    const bad = raw.filter(q => q && q.id && !isServable(q));
    state.bankQuestions = raw.filter(q => !q || !q.id || isServable(q));
    state.batchLoadStats.invalid = bad.length;
    if (bad.length) {
      console.warn(`[a-to-e] ${bad.length} malformed question(s) skipped: ${bad.slice(0, 20).map(q => q.id).join(", ")}`);
    }
    state.ranges = ranges;
    state.meta = meta;
    // The first loadData() runs in parallel with the gate, so it usually
    // finishes before anyone is signed in. The boot path merges the local
    // questions again once the gate resolves; this call covers later
    // reloads, when the identity is already known.
    if (cloudUser || currentProfile || guestUser) mergeLocalQuestions();
    else state.questions = dedupeById(state.bankQuestions);
  }

  // Locally pasted questions live only in this browser's localStorage,
  // per user, and merge into the bank the same way as inbox files.
  //
  // This used to run inside loadData, which starts before the gate. So
  // when the bank downloaded before sign-in finished (a slow /api/me, or
  // anyone typing a password), ns() still returned the bare pre-gate key:
  // the user's own pasted questions were missing for the whole session
  // and whatever an older build had left under the bare key showed up
  // instead.
  function mergeLocalQuestions() {
    const local = load(ns(LOCAL_QUESTIONS_KEY), []).filter(isServable);
    state.questions = dedupeById([...(state.bankQuestions || []), ...local]);
  }
  function isServable(q) {
    return !!(q && q.id && typeof q.stem === "string" &&
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
  // Use the default browser HTTP cache. The HTML script/link tags carry a
  // ?v=YYYYMMDDx cache-bust string on every release, and JSON data files
  // are pulled relative to that page, so a fresh release picks up new data
  // without needing to revalidate every fetch on every page load (which
  // previously cost ~54 conditional GETs even when nothing changed).
  function fetchJson(p) {
    return fetch(p).then(r => {
      // A 404 from GitHub Pages serves an HTML page, so r.json() would
      // reject anyway, but a proxy or an error page can return valid JSON
      // of the wrong shape and that must not be mistaken for bank content.
      if (!r.ok) throw new Error(`${r.status} fetching ${p}`);
      return r.json();
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
  function rememberMastheadChrome(chip, nameEl, pillSeed) {
    if (!chip || chip.hidden || !nameEl) return;
    try {
      localStorage.setItem(CHROME_KEY, JSON.stringify({
        name: nameEl.textContent || "",
        profileId: chip.dataset.profileId || "",
        pillStyle: chip.dataset.pillStyle || "",
        hue: pillSeed ? pillHueFor(pillSeed) : null,
        admin: document.body.classList.contains("is-admin"),
        cloud: document.body.classList.contains("is-cloud"),
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
    if (cached.hue !== null && cached.hue !== undefined) {
      chip.style.setProperty("--pill-hue", String(cached.hue));
    }
    chip.hidden = false;
    document.body.classList.toggle("is-admin", !!cached.admin);
    document.body.classList.toggle("is-cloud", !!cached.cloud);
  }

  function wireMasthead() {
    document.getElementById("rangesBtn").onclick = () => toggleRefs();
    document.getElementById("themeBtn").onclick = toggleTheme;
    const goHome = async e => {
      if (e) e.preventDefault();
      if (state.quiz && !state.quiz.finished && !(await confirmLeaveSession(
            "Leave this session?", "Back to the home screen"))) return;
      stopSessionTimer();
      showHome();
    };
    const brand = document.querySelector(".masthead .brand");
    if (brand) brand.onclick = goHome;
    const chip = document.getElementById("profileChip");
    const nameEl = document.getElementById("profileName");
    let pillSeed = "";
    if (chip && currentProfile) {
      chip.hidden = false;
      chip.dataset.profileId = currentProfile.id;
      nameEl.textContent = currentProfile.name;
      pillSeed = currentProfile.id;
    } else if (chip && cloudUser) {
      chip.hidden = false;
      chip.dataset.profileId = "cloud-" + cloudUser.id;
      // Admin cloud accounts wear the same gold metallic pill as the
      // legacy admin so admin = gold across the whole site.
      if (cloudUser.is_admin) chip.dataset.pillStyle = "gold";
      else delete chip.dataset.pillStyle;
      nameEl.textContent = cloudUser.display_name || cloudUser.email;
      pillSeed = cloudUser.id;
    } else if (chip && guestUser) {
      chip.hidden = false;
      chip.dataset.profileId = "guest";
      delete chip.dataset.pillStyle;
      nameEl.textContent = "Guest";
      pillSeed = guestUser.id;
    }
    if (chip && pillSeed) {
      chip.style.setProperty("--pill-hue", String(pillHueFor(pillSeed)));
    }
    refreshAdminBodyClass();
    rememberMastheadChrome(chip, nameEl, pillSeed);
    const signOutBtn = document.getElementById("signOutBtn");
    if (signOutBtn) {
      const isGuest = guestUser && !currentProfile && !cloudUser;
      if (isGuest) {
        signOutBtn.textContent = "sign up";
        signOutBtn.title = "Create a cloud account and migrate your guest progress automatically";
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
        const label = currentProfile ? currentProfile.name : (cloudUser ? (cloudUser.display_name || cloudUser.email) : "");
        if (await adminConfirm({
              title: `Sign out ${label}?`,
              body: "Your answers, flags and settings stay saved against this account.",
              confirmLabel: "Sign out",
            })) signOut();
      };
    }
  }

  // Migrate localStorage progress from the guest namespace into the
  // signed-in cloud user's namespace. Called once immediately after
  // a successful signup while a guest token still exists. After
  // migration the guest token is cleared so the user never sees the
  // guest identity again.
  function migrateGuestHistoryIntoCloud(prevGuestId) {
    if (!cloudUser || !prevGuestId) return;
    const importedFlag = "y4mcq.cloud.guestmigrated." + cloudUser.id;
    if (localStorage.getItem(importedFlag)) return;
    const guestHist = load(`${HISTORY_KEY}.guest-${prevGuestId}`, null);
    if (guestHist) {
      const cloudKey = `${HISTORY_KEY}.cloud-${cloudUser.id}`;
      const existing = load(cloudKey, {});
      for (const qid in guestHist) {
        if (!existing[qid] || (guestHist[qid].count > (existing[qid].count || 0))) {
          existing[qid] = guestHist[qid];
        }
      }
      save(cloudKey, existing);
      localStorage.removeItem(`${HISTORY_KEY}.guest-${prevGuestId}`);
    }
    const guestFlags = load(`${FLAGS_KEY}.guest-${prevGuestId}`, null);
    if (guestFlags) {
      const cloudFlagsKey = `${FLAGS_KEY}.cloud-${cloudUser.id}`;
      save(cloudFlagsKey, Object.assign({}, guestFlags, load(cloudFlagsKey, {})));
      localStorage.removeItem(`${FLAGS_KEY}.guest-${prevGuestId}`);
    }
    localStorage.setItem(importedFlag, "1");
    // Guest-history rows don't carry a sourceLetter (the original
    // shuffle wasn't recorded), so the per-user server answers table
    // intentionally doesn't receive them - cloudPostAnswer rejects
    // empty letters and the worker would too. Local cache still shows
    // these as answered so the user's filter view is preserved.
    //
    // Flags ARE pushable, and so are settings - both are by-id state.
    if (guestFlags && cloudUser) {
      for (const qid in guestFlags) {
        if (guestFlags[qid]) cloudPostFlag(qid, true);
      }
    }
    const guestSettings = load(`${SETTINGS_KEY}.guest-${prevGuestId}`, null);
    if (guestSettings && cloudUser) cloudPostSettings(guestSettings);
  }

  function wireColophon() {
    document.getElementById("exitBtn").onclick = async () => {
      if (!state.quiz) return;
      if (await confirmLeaveSession("Leave this session?", "Leave the session")) {
        stopSessionTimer();
        showHome();
      }
    };
    document.getElementById("endNowBtn").onclick = async () => {
      if (!state.quiz) return;
      if (await confirmLeaveSession("Score the session now?", "Score it now")) {
        stopSessionTimer();
        showSummary(false);
      }
    };
    document.getElementById("pauseBtn").onclick = togglePause;
  }

  function wireQuizTopbar() {
    document.getElementById("qtPrev").onclick = () => navOffset(-1);
    document.getElementById("qtNext").onclick = () => navOffset(+1);
    document.getElementById("qtCounter").onclick = e => {
      e.stopPropagation();
      // The rail is the navigator from 1200px up, and the styling at
      // that width already says the counter is not a control. Only the
      // handler disagreed.
      if (window.matchMedia && window.matchMedia("(min-width: 1200px)").matches) return;
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

    // No greeting line. The user's name already sits in the profile
    // chip in the masthead; repeating it as "Hi, $name." reads as
    // welcome-template copy. Keep the element in the DOM (hidden) so
    // any callers that re-show it later still find it.
    const greet = document.getElementById("homeGreeting");
    if (greet) { greet.hidden = true; greet.textContent = ""; }
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
    document.getElementById("startBtn").onclick = startQuiz;
    onSettingsChange();
  }
  function renderSubtopicChips() {
    const wrap = document.getElementById("subtopicChips");
    if (!wrap) return;
    // Only show subtopic chips for currently-selected disciplines so the
    // list doesn't bloat to 70+ chips when filters are narrow.
    const visible = new Set(state.settings.disciplines);
    const counts = {};
    state.questions.forEach(q => {
      if (!visible.has(q.topic)) return;
      const k = q.subtopic || "Other";
      counts[k] = (counts[k] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
    wrap.innerHTML = "";
    const selected = state.settings.subtopics;
    sorted.forEach(([k, n]) => {
      const c = document.createElement("button");
      c.className = "opt" + (!selected || selected.includes(k) ? " selected" : "");
      c.dataset.value = k;
      c.textContent = `${k} (${n})`;
      wrap.appendChild(c);
    });
    document.getElementById("tagCountLabel").textContent =
      sorted.length ? `· ${sorted.length} areas` : "";
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
    // Track the discipline picker live, not just at session start, so
    // the wordmark matches what is selected on the home screen.
    refreshGlucoseSuffix();
    updatePool();
  }

  function getPool() {
    const s = state.settings;
    return state.questions.filter(q => {
      // An empty list is an empty selection, in all three facets. It used
      // to mean "no filter" for disciplines and difficulties and "match
      // nothing" for learning areas, so switching off every difficulty
      // chip left the pool at the full bank and started a session with
      // the levels the user had just turned off.
      if (!s.disciplines.includes(q.topic)) return false;
      if (!(s.difficulties || []).includes(q.difficulty)) return false;
      if (s.subtopics && !s.subtopics.includes(q.subtopic || "Other")) return false;
      const h = state.history[q.id];
      if (s.filter === "unseen" && h) return false;
      if (s.filter === "incorrect" && (!h || h.lastCorrect !== false)) return false;
      if (s.filter === "flagged" && !state.flags[q.id]) return false;
      return true;
    });
  }
  function updatePool() {
    const n = getPool().length;
    const el = document.getElementById("poolSize");
    const startBtn = document.getElementById("startBtn");
    if (!el || !startBtn) return;
    const s = state.settings;
    if (n === 0) {
      el.textContent = "No questions match. Try adding a difficulty level, another discipline, or clearing the Learning-areas filter.";
    } else if (s.mode === "study") {
      el.textContent = `${n} questions match · Study mode shuffles through them all - end whenever.`;
    } else {
      const take = s.count === 0 ? n : Math.min(s.count, n);
      const time = s.timer ? ` · ${s.timer} min` : " · untimed";
      el.textContent = `${take} of ${n} matching questions${time}.`;
    }
    // If any bank file failed to load, surface it once so the user knows
    // the bank they're seeing is a subset. Non-blocking (Begin still works).
    const bl = state.batchLoadStats;
    if (bl && bl.failed > 0) {
      el.textContent += `  (${bl.failed} of ${bl.total} bank files unavailable this load; refresh to retry.)`;
    }
    if (bl && bl.invalid > 0) {
      el.textContent += `  (${bl.invalid} malformed question${bl.invalid === 1 ? "" : "s"} skipped.)`;
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
    // Tag body with mode so CSS can hide the test-only countdown row in
    // study mode (per the "either fix or hide" call - a per-question timer
    // is meaningful only in test mode).
    document.body.dataset.mode = s.mode;
    setScreen("quiz");
    document.getElementById("sessionMeta").textContent =
      (s.mode === "study" ? "Study session" : "Test session") +
      " · " + new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" });
    refreshGlucoseSuffix();
    renderQuiz();
    startSessionTimer();
  }

  // "(+ glucose)" is a paediatrics in-joke, so it only makes sense when
  // the session IS paediatrics. It used to fire whenever any single
  // question in the pool was paeds, which meant it showed on nearly
  // every mixed session. Now: Paediatrics selected, and nothing else.
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

  // A clinical vignette hands you an observation set, not a sentence.
  // The data came in as one comma-joined string per row ("Pulse
  // 128/min, blood pressure 158/94 mmHg, respiratory rate 22/min,
  // SpO2 98% on room air, temperature 37.6 degrees C"), and rendering
  // that as running text is what made the block read as a generic
  // key-value dump. Where a row is clearly a list of measurements we
  // break it into discrete items so the numbers can be read off the
  // way they would be off a chart.
  const MEASUREMENT_ROWS = /^(vital signs|vitals|observations?|obs|obs on arrival|investigations?|bloods?|blood tests|pathology|examination findings|urine|urinalysis|urine dipstick|dipstick|blood gas|arterial blood gas|venous blood gas|abg|vbg)$/i;
  // Readings whose value is a word rather than a number. Without these
  // "C3 normal" and "SpO2 99% on room air" fell through the numeric
  // split and rendered as unemphasised grey text beside readings that
  // had a bold value, so one block carried two different treatments.
  const QUALITATIVE = /^(.*?)\s+(normal|nil|absent|present|positive|negative|clear|raised|reduced|elevated|low|high|trace|detected|not detected|pending|sinus rhythm|regular|irregular)\b(.*)$/i;
  // Batch authors capitalise the first reading of a row and not the
  // rest, so a column of names read "Pulse rate / blood pressure /
  // respiratory rate". Lower the first letter only where the word is
  // ordinary prose; an acronym (SpO2, CRP, INR) keeps its shape.
  function obsName(name) {
    // Any capital further along means the word is not ordinary prose:
    // SpO2, HbA1c, eGFR, C reactive protein all keep what they came with.
    const prose = /^[A-Z][a-z]/.test(name) && !/[A-Z]/.test(name.slice(1));
    return prose ? name[0].toLowerCase() + name.slice(1) : name;
  }

  function renderClinicalValue(dd, label, value) {
    const parts = value.split(/,\s+/).map(x => x.trim()).filter(Boolean);
    const numeric = parts.filter(x => /\d/.test(x) || QUALITATIVE.test(x)).length;
    // Only split when it genuinely is a list: at least three items, most
    // of them carrying a number, and none of them a full clause. A
    // narrative examination finding stays as prose.
    // The length ceiling used to be 46 characters, which is shorter than
    // a single thyroid result ("thyroid stimulating hormone less than
    // 0.01 mIU/L (0.4-4.0)" is 58), so a panel of labs fell back to
    // prose and sat under a row of aligned vital signs looking like a
    // different component. A reading is a phrase, not a clause: the test
    // that keeps narrative out is the absence of a verb-length run, so
    // the ceiling is generous and the shape rules do the work.
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
      let m = part.match(/^(.*?)\s+((?:less than|greater than|under|over|up to)\s+[\d.].*)$/i)
           || part.match(/^(.*?)\s+([<>=]?\s*[\d.].*)$/);
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
        item.innerHTML = `<span class="obs-name">${esc(part)}</span>`;
      }
      dd.appendChild(item);
    }
  }

  function renderQuiz() {
    const app = document.getElementById("app");
    app.innerHTML = "";
    app.appendChild(document.getElementById("tpl-quiz").content.cloneNode(true));
    renderTopbar();
    renderReadingPane();
    state.questionStart = Date.now();
    bindQuizKeys();
    // Always start a new question (or a re-rendered one after navigation)
    // at the top of the page so the full stem is in view. Use instant
    // behaviour - a smooth scroll feels laggy when paging through quickly.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  // Position indicator. The counter is the middle cell of a fixed
  // three-column grid, so it stays dead centre no matter how wide the
  // Previous / Next labels get - the panel used to be a fourth flex
  // item in a space-between row, which shoved the counter sideways
  // every time it opened.
  function renderTopbar() {
    const total = state.quiz.pool.length;
    const idx = state.quiz.idx;
    document.getElementById("qtNumber").textContent = `Question ${idx + 1} of ${total}`;
    document.getElementById("qtPrev").disabled = idx === 0;
    document.getElementById("qtNext").disabled = idx >= total - 1;
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

  function navigatorHtml() {
    const pool = state.quiz.pool;
    const total = pool.length;
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
      answered += 1;
      if (midTest) continue;
      if (answerWasCorrect(q, state.quiz.answers[qid])) correct += 1; else incorrect += 1;
    }
    let flagged = 0;
    for (const qid in state.flags) if (state.flags[qid] && byId[qid]) flagged += 1;

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
      if (ans) st = midTest ? "answered" : (answerWasCorrect(q, ans) ? "correct" : "incorrect");
      return { st, flagged: !!state.flags[q.id], i };
    });

    const chips = states.map(x => {
      const cls = ["nav-chip", x.st];
      if (x.i === state.quiz.idx) cls.push("current");
      if (x.flagged) cls.push("flagged");
      const label = `Question ${x.i + 1}, ${x.st === "unanswered" ? "unanswered" : x.st}` +
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
    const flag = flagged ? `, <b>${flagged}</b> flagged` : "";

    return `
      <p class="nav-stats"><b>${answered}</b> of ${total} answered${score}${flag}.</p>
      ${windowed ? `
        <div class="nav-window">
          <button type="button" class="nav-page" data-nav-page="-1" ${from === 0 ? "disabled" : ""}>‹</button>
          <span class="nav-range">${from + 1} to ${to}</span>
          <button type="button" class="nav-page" data-nav-page="1" ${to >= total ? "disabled" : ""}>›</button>
        </div>` : ""}
      <div class="nav-chips">${chips}</div>
      ${windowed ? `
        <form class="nav-jump">
          <label for="navJumpInput">Go to</label>
          <input id="navJumpInput" type="number" min="1" max="${total}" inputmode="numeric"
                 placeholder="${state.quiz.idx + 1}" />
          <button type="submit">Go</button>
        </form>` : ""}
      <details class="nav-keys">
        <summary>Keyboard</summary>
        <dl>
          <dt>1 to 5</dt><dd>choose an option</dd>
          <dt>shift + 1 to 5</dt><dd>rule one out</dd>
          <dt>Enter</dt><dd>submit, then next</dd>
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
    const digits = String(state.quiz.pool.length).length;
    // 8px per digit, not 7: the narrow-screen panel draws these at
    // 12.5px, where five digits overflowed a floor tuned for 11.5px.
    const chipMin = Math.max(30, 10 + 8 * digits) + "px";
    if (rail) rail.style.setProperty("--nav-chip-min", chipMin);
    if (list) list.style.setProperty("--nav-chip-min", chipMin);
    // The panel behind the counter is the same navigator, for widths
    // with no room for the rail. Only rebuild it while it is open.
    if (list && !list.hidden) list.innerHTML = html;
    wireNavigator(rail);
    if (list && !list.hidden) wireNavigator(list);
    // Only the dropdown gets scrolled to the current chip. The rail has
    // no scroll region of its own any more, so asking for the chip to be
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
          state.quiz.pool.length - navWindow, navWindowStart + dir * navWindow));
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

  // Leaving or ending a session throws away what has not been answered,
  // and how much that is depends on where you are. Name it.
  function confirmLeaveSession(title, confirmLabel) {
    const answered = Object.keys((state.quiz && state.quiz.answers) || {}).length;
    const total = state.quiz ? state.quiz.pool.length : 0;
    const left = Math.max(0, total - answered);
    return adminConfirm({
      title,
      body: left
        ? `${answered} of ${total} answered. The remaining ${left} score as unanswered.`
        : `All ${total} answered. Nothing is lost.`,
      confirmLabel,
    });
  }

  // Called when a session starts: the window and the follow flag are
  // module state, and a new quiz that inherited "301 to 400" showed a
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
  }
  function navOffset(d) {
    const i = state.quiz.idx + d;
    if (i < 0 || i >= state.quiz.pool.length) return;
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
  // Keyed off the question rather than written onto it. As an ordinary
  // property the cache was enumerable, so a question serialised into an
  // audit prompt carried a second, post-shuffle copy of its own options
  // under an instruction to return every field - and if the model echoed
  // it back, apply-report wrote it into the bank.
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
  // batches wrote it as a plain string, and reading `.summary` off a
  // string gives undefined, so the commentary block opened empty on a
  // question that had a perfectly good explanation.
  function explanationOf(q) {
    const e = q && q.explanation;
    if (typeof e === "string") return { summary: e };
    return e || {};
  }

  function renderReadingPane() {
    const q = state.quiz.pool[state.quiz.idx];
    const shuffled = _shuffledOptions(q);
    // No folio line: the topbar carries the position, and the pre-answer
    // view must not name the subtopic or the discipline, which is what
    // the rest of that header was for.
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
    shuffled.forEach((opt, i) => {
      const li = document.createElement("li");
      li.dataset.letter = opt.letter;
      const cite = opt.source_refs && opt.source_refs.length
        ? `<span class="cite">${esc(opt.source_refs.join(", "))}</span>` : "";
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
            <span class="opt-rationale"><b>${opt.correct ? "Correct." : "Incorrect."}</b> ${esc(opt.rationale)}${cite}</span>
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
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); selectOption(q, opt, li); }
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

    document.getElementById("submitBtn").onclick = onSubmit;
    document.getElementById("nextBtn").onclick = onNext;
    // classList.toggle throws SyntaxError on a token containing whitespace,
    // so we must toggle each class separately. The CSS rule that paints the
    // active-flagged state is `.action-link.active.flag` - both classes
    // need to be on the button at once for the warn-colour styling.
    const flagBtn = document.getElementById("flagBtn");
    flagBtn.onclick = () => {
      const on = !state.flags[q.id];
      // Optimistic local update so the star is instant. Cloud sync runs
      // in the background; failures log to console (no UX impact - the
      // next session-start hydration will reconcile from the server).
      if (on) state.flags[q.id] = true;
      else    delete state.flags[q.id];
      save(ns(FLAGS_KEY), state.flags);
      flagBtn.classList.toggle("active", on);
      flagBtn.classList.toggle("flag", on);
      renderTopbar();
      if (cloudUser) cloudPostFlag(q.id, on);
    };
    const flagOn = !!state.flags[q.id];
    flagBtn.classList.toggle("active", flagOn);
    flagBtn.classList.toggle("flag", flagOn);

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
    const chosen = _shuffledOptions(q).find(o => o.letter === state.quiz.answers[q.id]);
    const isC = !!(chosen && chosen.correct);
    const elapsedMs = state.questionStart ? Math.min(1000 * 60 * 30, Date.now() - state.questionStart) : 0;
    const prev = state.history[q.id] || {};
    state.history[q.id] = {
      lastCorrect: isC,
      count: (prev.count || 0) + 1,
      last_at: Date.now(),
      time_ms_total: (prev.time_ms_total || 0) + elapsedMs,
      first_correct: prev.first_correct ?? (prev.count ? prev.first_correct : isC),
    };
    save(ns(HISTORY_KEY), state.history);
    maybeShowHouseQuote();
    // Sync this answer to the server (fire-and-forget) so history, attempt
    // counts and the Unseen / Previously-incorrect filters survive a device
    // change. Test mode also logs; reveal happens at session end.
    if (cloudUser && chosen && chosen.sourceLetter) {
      cloudPostAnswer(q.id, chosen.sourceLetter, isC);
    }
    if (state.quiz.mode === "test") { onNext(); return; }
    state.quiz.revealed[q.id] = true;
    revealAnswer(q);
    renderTopbar();
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

    // The subtopic + difficulty + author model go on the commentary
    // eyebrow now, where they can be seen AFTER the user has committed
    // to an answer. `model` tags who/what produced the question so
    // audits can spot patterns by LLM.
    // Prefer the granular subtopic_detail (set during the broad-area
    // consolidation) for the post-reveal eyebrow - the broad q.subtopic
    // bucket is used for stats/grouping, not display.
    const subLabel = q.subtopic_detail || q.subtopic;
    const eb = ex.querySelector(".section-eyebrow");
    eb.innerHTML = `Commentary` +
      (subLabel ? `<span class="topic-tag">${esc(subLabel)}</span>` : "") +
      (q.difficulty ? `<span class="difficulty-tag">Difficulty ${q.difficulty}/5</span>` : "");

    // The Why-is-correct / Why-the-others-are-not commentary blocks are
    // intentionally NOT populated here - their content used to duplicate
    // the option-box rationales (which are now visible on every option
    // post-reveal). The blocks stay hidden via their `hidden` attribute
    // in HTML. "In context" (explainSummary) is the differentiating
    // explanation - condition background, key points, pearls.

    const sum = explanationOf(q);
    const sumWrap = document.getElementById("explainSummary");
    sumWrap.innerHTML = "";
    if (sum.summary) sumWrap.innerHTML += `<p>${esc(sum.summary)}</p>`;
    if (sum.key_points && sum.key_points.length) {
      sumWrap.innerHTML += `<ul>${sum.key_points.map(p => `<li>${esc(p)}</li>`).join("")}</ul>`;
    }
    if (sum.pearls) sumWrap.innerHTML += `<div class="pearl"><b>Pearl.</b> ${esc(sum.pearls)}</div>`;

    document.getElementById("explainSources").innerHTML = (q.sources || []).map(s =>
      s.url ? `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`
            : `<li>${esc(s.label)}</li>`
    ).join("");

    const rl = document.getElementById("explainRanges");
    rl.innerHTML = "";
    if (q.reference_ranges && q.reference_ranges.length) {
      // Render relevant ranges inline so the user sees them without
      // an extra click. The full Reference values panel remains
      // available from the masthead button.
      // q.topic gates which panels may appear: a paediatric panel never
      // renders under an adult question even if the question asks for it.
      rl.innerHTML = renderInlineRanges(q.reference_ranges, q.topic);
      if (!rl.dataset.wired) {
        rl.addEventListener("click", e => {
          const b = e.target.closest(".ir-more");
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
    // Frame the post-submit state so both the answers panel and the
    // Next button are visible without the user reaching for the wheel.
    // Prefer the chosen option (or the correct one if the user got it
    // wrong) as the anchor; fall back to the Next button. rAF defers
    // until the explainBlock has reflowed.
    requestAnimationFrame(() => {
      const ansLetter = state.quiz.answers[q.id];
      const anchorLi =
        (ansLetter && document.querySelector(`#qOptions li[data-letter="${ansLetter}"]`)) ||
        document.querySelector("#qOptions li.revealed.correct");
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
          window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
        }
      } else if (nextBtn) {
        nextBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
  }

  function onNext() {
    if (state.quiz.idx + 1 >= state.quiz.pool.length) {
      stopSessionTimer();
      showSummary(false);
      return;
    }
    state.quiz.idx += 1;
    renderQuiz();
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
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
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
  function startSessionTimer() {
    stopSessionTimer();
    // 1-second precision is enough for both the session clock and any
    // countdown; halving from 500ms cuts tick work by 50% over long sessions.
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
    } else if (state.quiz.mode === "test") {
      // Test mode without countdown: show stopwatch-style elapsed time
      // for the current question. By design we do NOT show a Q
      // timer in study mode - the per-question stopwatch added noise
      // without value.
      qEl.textContent = "Q " + fmtClock(Date.now() - state.questionStart);
      sep.hidden = false;
    } else {
      qEl.textContent = "";
      sep.hidden = true;
    }
  }
  function togglePause() {
    state.paused = !state.paused;
    document.getElementById("pauseBtn").textContent = state.paused ? "▶" : "⏸";
    if (state.quiz && state.quiz.deadline && state.paused) {
      state.quiz._pausedAt = Date.now();
    } else if (state.quiz && state.quiz.deadline && state.quiz._pausedAt) {
      const off = Date.now() - state.quiz._pausedAt;
      state.quiz.deadline += off;
      state.sessionStart += off;
      state.questionStart += off;
      state.quiz._pausedAt = null;
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
  // Direction map normalises arrow keys + WASD into a single token
  // ("up" / "down" / "left" / "right" / "submit") so the dispatch below
  // doesn't repeat itself. WASD only fires outside form fields.
  const DIR_MAP = {
    "arrowup": "up", "w": "up",
    "arrowdown": "down", "s": "down",
    "arrowleft": "left", "a": "left",
    "arrowright": "right", "d": "right",
  };
  function bindQuizKeys() {
    document.onkeydown = e => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      // Modifier-key shortcuts belong to the browser / OS. Shift is the
      // exception: shift+number is the qbank convention for ruling an
      // option out, handled below.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const q = state.quiz && state.quiz.pool[state.quiz.idx];
      if (!q) return;
      const k = e.key.toLowerCase();
      const dir = DIR_MAP[k];
      const submitBtn = document.getElementById("submitBtn");
      const nextBtn   = document.getElementById("nextBtn");
      const revealed  = !!state.quiz.revealed[q.id];
      const selected  = document.querySelector("#qOptions li.selected");
      const canSubmit = !revealed && submitBtn && !submitBtn.disabled;
      const canNext   = revealed && nextBtn && !nextBtn.hidden;

      if (e.shiftKey && ["!","@","#","$","%","1","2","3","4","5"].includes(e.key)) {
        // shift+1..5 rules out the matching option, and rules it back in.
        // Shift rewrites the digit on most layouts, so match both.
        const idx = "!@#$%".indexOf(e.key) >= 0
          ? "!@#$%".indexOf(e.key)
          : parseInt(e.key, 10) - 1;
        const letter = "ABCDE"[idx];
        const li = document.querySelector(`#qOptions li[data-letter="${letter}"]`);
        if (li && !revealed) toggleStrike(q.id, letter, li);
        e.preventDefault();
      } else if (["1","2","3","4","5"].includes(k)) {
        // Number keys SELECT the corresponding option (A-E). They do NOT
        // submit - the user still has to press Enter / Space / right /
        // d / Submit to commit.
        const letter = "ABCDE"[parseInt(k, 10) - 1];
        const li = document.querySelector(`#qOptions li[data-letter="${letter}"]`);
        if (li && !revealed) li.click();
        e.preventDefault();
      } else if (k === "enter" || k === " ") {
        // Enter / Space: submit when an answer is selected, otherwise
        // advance to the next question once revealed.
        if (canNext) nextBtn.click();
        else if (canSubmit) submitBtn.click();
        e.preventDefault();
      } else if (k === "escape") {
        // Escape clears a not-yet-submitted selection (so the user can
        // back out of a tentative choice without striking it). Post-
        // reveal, Escape is owned by the ref-panel / modal handlers.
        if (!revealed && selected) {
          selected.classList.remove("selected");
          delete state.quiz.answers[q.id];
          if (submitBtn) submitBtn.disabled = true;
          e.preventDefault();
        }
      } else if (k === "f") {
        document.getElementById("flagBtn").click();
      } else if (k === "x") {
        // x still rules out whatever is currently selected.
        if (selected) toggleStrike(q.id, selected.dataset.letter, selected);
      } else if (k === "l") {
        toggleRefs();
      } else if (dir === "left") {
        // Left / A = previous question (does not submit, even if an
        // answer is selected).
        navOffset(-1);
        e.preventDefault();
      } else if (dir === "right") {
        // Right / D is context-aware:
        //   not-yet-submitted + answer selected -> submit
        //   revealed                            -> advance to next
        //   otherwise                           -> navigate forward
        if (canSubmit) submitBtn.click();
        else if (canNext) nextBtn.click();
        else navOffset(1);
        e.preventDefault();
      } else if (dir === "up" || dir === "down") {
        if (revealed) { e.preventDefault(); return; }
        const items = Array.from(document.querySelectorAll("#qOptions li"));
        if (!items.length) { e.preventDefault(); return; }
        const n = items.length;
        const cur = items.findIndex(li => li.classList.contains("selected"));
        let nextIdx;
        if (cur === -1) {
          nextIdx = dir === "down" ? 0 : n - 1;
        } else {
          nextIdx = dir === "down" ? (cur + 1) % n : (cur - 1 + n) % n;
        }
        items[nextIdx].click();
        // Keep the newly-selected option in view so keyboard browsing
        // works on short viewports without the user reaching for the
        // wheel. `block: nearest` won't scroll if already in view.
        items[nextIdx].scrollIntoView({ block: "nearest", behavior: "smooth" });
        e.preventDefault();
      }
    };
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  function showSummary(timeUp) {
    state.quiz.finished = true;
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
      const t = q.subtopic || q.topic;
      byTopic[t] = byTopic[t] || { c: 0, n: 0, attempted: 0 };
      byTopic[t].n++;
      if (ans) byTopic[t].attempted++;
      if (isC) byTopic[t].c++;
    });
    const denom = state.quiz.mode === "study" ? answered.length : pool.length;
    const pct = denom ? Math.round(100 * correct / denom) : 0;
    document.getElementById("scorePct").textContent = `${pct}%`;
    let line = `${correct} of ${denom} answered correctly`;
    if (state.quiz.mode === "study" && answered.length < pool.length)
      line += `, ${pool.length - answered.length} unanswered`;
    if (timeUp) line += " (time ran out)";
    line += ".";
    document.getElementById("scoreLine").textContent = line;

    const tb = document.getElementById("topicBreakdown");
    tb.innerHTML = "";
    Object.entries(byTopic).sort().forEach(([t, r]) => {
      const d = state.quiz.mode === "study" ? r.attempted : r.n;
      const p = d ? Math.round(100 * r.c / d) : 0;
      const row = document.createElement("div");
      row.className = "topic-row";
      row.innerHTML =
        `<span>${esc(t)}</span>` +
        `<div class="bar-track"><div class="bar-fill" style="width:${p}%;"></div></div>` +
        `<span class="topic-pct">${r.c}/${d}</span>`;
      tb.appendChild(row);
    });

    renderReviewList("all");
    document.querySelectorAll("#reviewFilters .opt").forEach(c => {
      c.onclick = () => {
        document.querySelectorAll("#reviewFilters .opt").forEach(x => x.classList.remove("selected"));
        c.classList.add("selected");
        renderReviewList(c.dataset.review);
      };
    });
    document.querySelector('#reviewFilters .opt[data-review="all"]').classList.add("selected");

    document.getElementById("retryBtn").onclick = retryIncorrect;
    document.getElementById("newQuizBtn").onclick = showHome;
  }

  function renderReviewList(filter) {
    const ol = document.getElementById("reviewList");
    ol.innerHTML = "";
    state.quiz.pool.forEach((q, i) => {
      const ans = state.quiz.answers[q.id];
      const isC = ans && _shuffledOptions(q).find(o => o.letter === ans)?.correct;
      const flagged = !!state.flags[q.id];
      if (filter === "incorrect" && (isC || !ans)) return;
      if (filter === "flagged" && !flagged) return;
      const li = document.createElement("li");
      li.className = (!ans ? "unanswered" : (isC ? "correct" : "incorrect")) + (flagged ? " flagged" : "");
      const glyph = !ans ? "·" : (isC ? "✓" : "✗");
      li.innerHTML =
        `<span class="rv-status">${glyph}</span>` +
        `<span class="rv-id">${esc(q.id)}</span>` +
        `<span class="rv-stem">${esc(q.stem.slice(0, 110))}${q.stem.length > 110 ? "…" : ""}</span>`;
      li.onclick = () => {
        state.quiz.idx = i;
        // The session has been scored, so review is read-only. Revealing
        // only the clicked question left every other one answerable: in
        // test mode the user could step to the next question, answer it
        // after seeing the score, and have that land in history. And the
        // countdown is over: leaving the deadline set meant the first
        // timer tick after a timed test ran out went straight back to
        // the summary, so no question from it could ever be reviewed.
        for (const p of state.quiz.pool) state.quiz.revealed[p.id] = true;
        state.quiz.deadline = null;
        state.quiz.finished = false;
        setScreen("quiz");
        renderQuiz();
        startSessionTimer();
      };
      ol.appendChild(li);
    });
    if (!ol.children.length) {
      // One string for three different situations said nothing about any
      // of them. Each filter empties for its own reason.
      const EMPTY = {
        incorrect: "Nothing wrong in this session. Switch to All to read back over the ones you got right.",
        flagged: "You did not flag anything. Press F on a question to flag it for later.",
      };
      ol.innerHTML = `<li class="rv-empty">${EMPTY[filter] || "This session had no questions."}</li>`;
    }
  }

  function retryIncorrect() {
    const wrong = state.quiz.pool.filter(q => {
      const ans = state.quiz.answers[q.id];
      return !ans || !_shuffledOptions(q).find(o => o.letter === ans)?.correct;
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
  }

  // ── Content pane wiring ─────────────────────────────────────────────
  // Named wireHowToModal for historical reasons; the how-to modal it
  // was built around is long gone. It now wires the generation-prompt
  // controls and owns the app's Escape handling.
  function wireHowToModal() {
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
    });
    const toggleBtn = document.getElementById("promptToggleBtn");
    const promptPre = document.getElementById("promptText");
    if (toggleBtn && promptPre) toggleBtn.onclick = () => {
      promptPre.hidden = !promptPre.hidden;
      toggleBtn.textContent = promptPre.hidden ? "show prompt" : "hide prompt";
    };
    // Populate the LLM prompt + copy button. The prompt text has
    // placeholders ({{FOCUS_DIRECTIVE}}, {{BANK_STATE}}) substituted
    // at copy time so the directive and the live bank counts are
    // always current.
    const promptText = document.getElementById("promptText");
    if (promptText) {
      loadPromptTemplate().then(t => {
        promptText.textContent = t ? renderPrompt(t) : "Could not load the prompt template.";
      });
    }
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
        copyBtn.textContent = "Copied  ✓";
        copyStatus.textContent = `Now paste it into ${auditLlmLabel()}.`;
        copyStatus.classList.add("ok");
      } else {
        copyBtn.classList.add("copy-failed");
        copyBtn.textContent = "Select & copy manually";
        copyStatus.textContent = "Clipboard blocked - the prompt is selected; press Cmd-C.";
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
    if (currentProfile) return currentProfile.id;
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
      openReportModal(q.id, q.model);
    });
  }
  function openReportModal(qid, model) {
    _reportingQId = qid;
    _reportingModel = model || null;
    document.getElementById("reportQId").textContent = `Question: ${qid}`;
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
    status.className = "dim small";
    if (text.length < 3) {
      status.textContent = "Add a short description of the issue.";
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
      status.textContent = "Sent. It goes into the next audit pass.";
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
      // Say what actually went wrong. "Check your connection" is wrong
      // advice when the server answered with a reason.
      status.textContent = (res && res.error)
        ? `Not sent: ${res.error}`
        : "Could not reach the server. Try again, or open an issue at github.com/mord58562/a-to-e/issues.";
      status.classList.add("bad");
    }
  }

  // ── Audit dashboard (admin only) ───────────────────────────────────────
  // Two tabs: Inbox (pending batches) and Reports (user-submitted issues).
  // Each row offers a copy-prompt → paste-response → apply workflow that
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
  /* The generation prompt used to be 332 lines of authoring rules in a
   * <script type="text/template"> inside index.html, so every visitor
   * downloaded it and it sat in view-source of the front page. It is
   * admin-only content, it is 15 KB, and nothing outside the Content
   * tab reads it. Fetched once, on demand, and cached.
   */
  let _promptTemplate = null;
  async function loadPromptTemplate() {
    if (_promptTemplate !== null) return _promptTemplate;
    try {
      const r = await fetch("assets/prompt-template.txt?v=" + encodeURIComponent(
        (state.meta && state.meta.updated) || "1"));
      if (!r.ok) throw new Error("HTTP " + r.status);
      _promptTemplate = (await r.text()).trim();
    } catch (e) {
      console.warn("[prompt] template fetch failed:", e && e.message || e);
      _promptTemplate = "";
    }
    return _promptTemplate;
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
    // This used to open with a guard on #reportsAdminBtn and
    // #reportsAdminModal, neither of which has existed for some time.
    // The function therefore returned on its third line and nothing
    // below it ever ran, which left fourteen visible controls inert:
    // the five report filter pills, the seven live-audit filter pills,
    // the bulk-audit button and the LLM picker. They all had hover
    // states and did nothing, so clicking "Fixed" and seeing the same
    // open reports read as the data being wrong rather than the button
    // being broken.
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


  // The list of pending inbox batches, hydrated from inbox_manifest.json
  // at modal-open time (the user may have just pasted, so this is the
  // freshest source of truth).
  let _inboxBatches = [];   // [{ path: "inbox/...json", questions: [...], _fetched: bool }]
  async function refreshAuditInboxList() {
    const manifest = await fetchJson("data/inbox_manifest.json").catch(() => ({ inbox: [] }));
    const paths = (manifest && manifest.inbox) || [];
    _inboxBatches = await Promise.all(paths.map(async (p) => {
      const qs = await fetchJson("data/" + p).catch(() => []);
      return { path: p, questions: Array.isArray(qs) ? qs : [] };
    }));
    // Filter out empty batches (already audited and cleared).
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
    list.innerHTML = "";
    if (!_inboxBatches.length) {
      list.innerHTML = `<li class="dim small">No inbox batches awaiting audit. Pasted content goes through this list before being promoted to the live per-topic files.</li>`;
      return;
    }
    for (const b of _inboxBatches) {
      const li = document.createElement("li");
      li.className = "audit-row";
      const topicsCount = {};
      for (const q of b.questions) topicsCount[q.topic || "?"] = (topicsCount[q.topic || "?"] || 0) + 1;
      const topicSummary = Object.entries(topicsCount).map(([t, n]) => `${esc(t)}=${n}`).join(", ");
      const modelsCount = {};
      for (const q of b.questions) modelsCount[q.model || "unknown"] = (modelsCount[q.model || "unknown"] || 0) + 1;
      const modelSummary = Object.entries(modelsCount).map(([m, n]) => `${esc(m)}×${n}`).join(", ");
      li.innerHTML = `
        <div class="audit-row-head">
          <div class="audit-row-text">
            <span class="audit-row-name">${esc(b.path)}</span>
            <span class="audit-row-meta dim small">${b.questions.length} Q · ${topicSummary} · author(s): ${modelSummary}</span>
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
      const text = opts.buildPrompt();
      try {
        await navigator.clipboard.writeText(text);
        copyStatus.textContent = `Copied. Paste into ${auditLlmLabel()}.`;
        copyStatus.className = "audit-copy-status dim small ok";
      } catch {
        // Fallback: drop into the response textarea reversed? No - put in a
        // hidden textarea and select it.
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch {}
        document.body.removeChild(ta);
        copyStatus.textContent = "Clipboard blocked - copied via fallback. If it didn't take, hit copy again.";
        copyStatus.className = "audit-copy-status dim small";
      }
    };
    applyBtn.onclick = async () => {
      applyStatus.textContent = "Validating…";
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
        applyStatus.textContent = "Validation failed: " + (e && e.message);
        applyStatus.classList.remove("dim", "ok"); applyStatus.classList.add("bad");
        return;
      }
      applyBtn.disabled = true;
      applyStatus.textContent = "Applying via backend…";
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
          applyStatus.textContent = "Backend rejected: " + (res && res.error || "unknown");
          applyStatus.classList.add("bad");
        }
      } catch (e) {
        applyStatus.textContent = "Apply failed: " + (e && e.message);
        applyStatus.classList.add("bad");
      } finally {
        applyBtn.disabled = false;
      }
    };
  }

  // Build the audit prompt for a single inbox batch. Reuses the
  // generation prompt template's quality bar (sections 1-7), strips
  // Section 0 (focus directive  -  partial applicability) and Section 8
  // (how reach the site), and wraps with audit-specific intro + output
  // spec.
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
    // Strip Section 8 (how questions reach the site) if present
    // before INPUT FROM ME (it isn't, in the current template, but be
    // defensive in case the template moves things).
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
  async function loadAndRenderAuditLive() {
    const manifest = await fetchJson("data/batches_manifest.json").catch(() => ({ batches: [] }));
    const batchPaths = ((manifest && manifest.batches) || []).map(p => "data/" + p);
    const mainPaths = [
      "data/questions_paeds.json",
      "data/questions_obgyn.json",
      "data/questions_psych.json",
      "data/questions_medicine.json",
    ];
    const all = mainPaths.concat(batchPaths);
    _liveFiles = await Promise.all(all.map(async (p) => {
      const qs = await fetchJson(p).catch(() => []);
      return { path: p, questions: Array.isArray(qs) ? qs : [] };
    }));
    _liveFiles = _liveFiles.filter(f => f.questions.length > 0);
    const c = document.getElementById("auditLiveCount");
    if (c) c.textContent = _liveFiles.length ? String(_liveFiles.length) : "";
    renderAuditLive("all");
  }
  function renderAuditLive(filter) {
    const list = document.getElementById("auditLiveList");
    list.innerHTML = "";
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
      list.innerHTML = `<li class="dim small">No files match this filter.</li>`;
      return;
    }
    for (const f of visible) {
      const li = document.createElement("li");
      li.className = "audit-row";
      const isMain = !f.path.startsWith("data/batches/");
      const subjects = {};
      for (const q of f.questions) subjects[q.subtopic || q.topic || "?"] = (subjects[q.subtopic || q.topic || "?"] || 0) + 1;
      const topSubjects = Object.entries(subjects).sort((a,b) => b[1]-a[1]).slice(0, 3)
        .map(([k, n]) => `${esc(k)}×${n}`).join(", ");
      const models = {};
      for (const q of f.questions) models[q.model || "unknown"] = (models[q.model || "unknown"] || 0) + 1;
      const modelSummary = Object.entries(models).map(([m, n]) => `${esc(m)}×${n}`).join(", ");
      li.innerHTML = `
        <div class="audit-row-head">
          <div class="audit-row-text">
            <span class="audit-row-name">${isMain ? "★ " : ""}${esc(f.path)}</span>
            <span class="audit-row-meta dim small">${f.questions.length} Q · top: ${topSubjects} · author(s): ${modelSummary}</span>
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
      profile: currentProfile ? currentProfile.id : "rob",
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
      profile: currentProfile ? currentProfile.id : "rob",
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
    // Build an inline flow row at the top of the reports list.
    const list = document.getElementById("reportsAdminList");
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
    const res = await postBackend("apply-report", { resolutions: parsed.resolutions });
    if (!res) return { ok: false, error: "backend unreachable" };
    if (res.ok) {
      return { ok: true, note: `Fixed: ${res.fixed || 0}, dropped: ${res.dropped || 0}, dismissed: ${res.dismissed || 0}.` };
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
      const when = (r.created || "").replace("T", " ").slice(0, 16);
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
      if (jumpBtn && q) jumpBtn.onclick = (e) => {
        e.stopPropagation();
        // Jumping to a question means leaving the admin panel.
        const am = document.getElementById("adminModal");
        if (am) am.hidden = true;
        jumpToQuestionStandalone(q);
      };
      list.appendChild(li);
    }
  }
  function jumpToQuestionStandalone(q) {
    // Start a tiny single-question study session for review.
    resetNavigator();
    state.quiz = {
      pool: [q], idx: 0, mode: "study",
      timerMins: 0, deadline: null,
      answers: {}, struck: {}, revealed: {}, finished: false,
    };
    state.sessionStart = Date.now();
    setScreen("quiz");
    document.getElementById("sessionMeta").textContent = "Report review";
    renderQuiz();
    startSessionTimer();
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

    if (!savedToInbox) {
      const existing = load(ns(LOCAL_QUESTIONS_KEY), []);
      save(ns(LOCAL_QUESTIONS_KEY), existing.concat(added));
    }
    state.questions = state.questions.concat(added);
    box.value = "";
    btn.disabled = false;

    let msg = `Added ${added.length} question${added.length === 1 ? "" : "s"}.`;
    if (skipped.length) msg += ` Skipped ${skipped.length} duplicate ID${skipped.length === 1 ? "" : "s"}.`;
    if (savedToInbox && typeof savedToInbox === "string") {
      msg += ` Saved to the live bank at data/${savedToInbox}. Everyone sees these on next reload.`;
    } else if (savedToInbox) {
      msg += " Saved to the live bank inbox.";
    } else {
      msg += " Saved in this browser only (backend unreachable - hit 'Export for audit' to share).";
    }
    status.textContent = msg;
    status.classList.remove("dim", "bad"); status.classList.add("ok");
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
    status.textContent = `Exported ${local.length} question${local.length === 1 ? "" : "s"} to ${filename}. Drop into data/inbox/ for the next audit pass.`;
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
      if (typeof q.difficulty !== "number") q.difficulty = 3;
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
    // Spec: fire reliably on every 50th UNIQUE answered question
    // in this study session - Q50, Q100, Q150, etc. The trigger counts
    // unique questions answered in the current in-memory pool, not raw
    // answer-events (re-answers don't tick the counter). Falls back to
    // the live tab session's sessionStorage so it survives navigation.
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
    toast.innerHTML = `<span class="hq-quote">"${esc(q)}"</span><span class="hq-attrib">- ${esc(who)}</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    const dismiss = () => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 320); };
    toast.addEventListener("click", dismiss);
    setTimeout(dismiss, 9000);
  }

  // Render a small inline list of reference ranges relevant to the
  // current question. Looks up each key in state.ranges and renders
  // a compact name/range pair. Unknown keys render their bare key
  // so authors can spot typos.
  // Resolve a reference_ranges key against state.ranges.categories.
  // Categories look like:
  //   "paeds_fbc_age_bands": { "label": "...", "ranges": [{test, value, units}, ...] }
  // A key can be:
  //   (a) a category key - render the whole category's rows
  //   (b) a single test key inside a category - render just that row
  //   (c) a guess with common aliases - we map a few historical names
  //   (d) unknown - skip silently rather than show "(not in reference set)"
  // Which reference categories may appear under which question. The
  // reported bug was an adult psychiatry stem showing "Paediatric blood
  // glucose & hypoglycaemia", because the authoring pass tagged it
  // bsl_paeds and nothing downstream ever objected. The data has been
  // corrected, and this is the guard that stops it recurring: a
  // paediatric panel never renders under a non-paediatric question, no
  // matter what the question claims.
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
    // Obstetric questions legitimately need adult panels alongside the
    // pregnancy-specific ones; the reverse is not true.
    if (want === "obstetric") return pop === "obstetric" || pop === "adult";
    return pop === want;
  }

  // Single source of truth for a reference row, shared by the side panel
  // and the post-answer block. The unit lives in `units` and is never
  // repeated inside `value`, so it is appended here exactly once - the
  // old inline renderer appended it to values that already ended with it,
  // which is where "135 - 145 mmol/L mmol/L" came from.
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

  function renderInlineRanges(keys, topic) {
    const cats = (state.ranges && state.ranges.categories) || {};
    const blocks = [];
    const seen = new Set();
    (keys || []).forEach(rawKey => {
      // A handful of questions carry an inline {analyte, range} object
      // instead of a library key. These used to throw a TypeError out of
      // the loop and take the whole block down with them.
      if (rawKey && typeof rawKey === "object") {
        blocks.push(`<div class="ir-cat"><div class="rrs">${refRowHtml({
          test: rawKey.analyte || rawKey.test, value: rawKey.range || rawKey.value, units: rawKey.units,
        })}</div></div>`);
        return;
      }
      if (typeof rawKey !== "string") return;
      const cat = cats[rawKey];
      if (!cat || !Array.isArray(cat.ranges) || !cat.ranges.length) return;
      if (!categoryFitsTopic(cat, topic)) return;
      if (seen.has(rawKey)) return;
      seen.add(rawKey);
      const MAX = 10;
      const shown = cat.ranges.slice(0, MAX);
      const more = cat.ranges.length - shown.length;
      blocks.push(
        `<div class="ir-cat">` +
        `<div class="ir-cat-head">${esc(cat.label || rawKey)}</div>` +
        `<div class="rrs">${shown.map(refRowHtml).join("")}</div>` +
        (more > 0 ? `<button type="button" class="ir-more" data-ref-key="${esc(rawKey)}">${more} more, open the full panel</button>` : "") +
        `</div>`
      );
    });
    return blocks.join("");
  }

  // Render the stem, optionally highlighting authored clue phrases after
  // the answer has been revealed. q.explanation.stem_clues (when present)
  // is an array of substrings; matching spans are wrapped in <mark>. If
  // no clues are authored, the stem renders as plain text - never
  // synthetic guesses. Highlights only show after reveal.
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
    "DKA": "Diabetic ketoacidosis. Hyperglycaemia + ketonaemia + metabolic acidosis. Common precipitants: missed insulin, infection, new-onset T1DM. Mgmt: fluids first, then insulin, then K+.",
    "PPH": "Postpartum haemorrhage. >=500 mL blood loss after vaginal delivery (>=1000 mL caesarean) or any loss causing haemodynamic compromise. 4 Ts: Tone, Trauma, Tissue, Thrombin.",
    "ACS": "Acute coronary syndrome. Umbrella for unstable angina, NSTEMI, STEMI. ECG + troponin + risk stratify.",
    "SSRI": "Selective serotonin reuptake inhibitor. First-line for moderate-severe depression and most anxiety disorders. Common: sertraline, escitalopram, fluoxetine.",
    "SNRI": "Serotonin-noradrenaline reuptake inhibitor. e.g. venlafaxine, duloxetine.",
    "NSAID": "Non-steroidal anti-inflammatory drug. e.g. ibuprofen, naproxen, diclofenac. GI / renal / CV cautions.",
    "ECG": "Electrocardiogram. 12-lead is the standard initial cardiac investigation in chest pain, syncope, palpitations.",
    "CTG": "Cardiotocograph. Continuous fetal heart rate + uterine activity trace. Used antenatally and in labour.",
    "GBS": "Group B Streptococcus. Maternal carriage screened ~36 wk; intrapartum penicillin if positive or risk factors.",
    "PPROM": "Preterm pre-labour rupture of membranes (before 37 wk, before labour onset).",
    "PROM": "Pre-labour rupture of membranes at term (>=37 wk, before labour onset).",
    "HELLP": "Haemolysis, Elevated Liver enzymes, Low Platelets. Severe pre-eclampsia variant; deliver after stabilisation.",
    "CTPA": "CT pulmonary angiogram. First-line for suspected PE in non-pregnant adults.",
    "PE": "Pulmonary embolism. Clot in pulmonary arteries; sudden dyspnoea, pleuritic chest pain, tachycardia.",
    "DVT": "Deep vein thrombosis. Most commonly in the calf; risk factors via Wells / Caprini.",
    "COPD": "Chronic obstructive pulmonary disease. Spirometry: post-bronchodilator FEV1/FVC < 0.7.",
    "CKD": "Chronic kidney disease. eGFR < 60 mL/min/1.73m^2 OR markers of kidney damage for >=3 months.",
    "AKI": "Acute kidney injury. Cr rise >=26 micromol/L in 48 h, or >=1.5× baseline in 7 d, or urine output <0.5 mL/kg/h x 6 h.",
    "T1DM": "Type 1 diabetes mellitus. Autoimmune beta-cell destruction; lifelong insulin required.",
    "T2DM": "Type 2 diabetes mellitus. Insulin resistance + relative deficiency; lifestyle + metformin first-line.",
    "GTT": "Glucose tolerance test. 75 g oral glucose; fasting + 1 h + 2 h plasma glucose. Gestational diabetes screen.",
    "HbA1c": "Glycated haemoglobin; reflects average plasma glucose over preceding ~3 months. Diabetes diagnostic threshold >=48 mmol/mol (6.5%).",
    // ASD - see disambiguated entry below.
    "VSD": "Ventricular septal defect. Pansystolic murmur, lower-left sternal edge.",
    "FBC": "Full blood count. Hb, WCC, platelets +/- differential.",
    "UEC": "Urea, electrolytes, creatinine. Renal function + Na/K screen.",
    "LFT": "Liver function tests. ALT, AST, ALP, GGT, bilirubin, albumin.",
    "TFT": "Thyroid function tests. TSH +/- free T4 / free T3.",
    "CRP": "C-reactive protein. Acute-phase reactant; rises hours after inflammatory stimulus.",
    "ESR": "Erythrocyte sedimentation rate. Slower-rising inflammatory marker.",
    "eGFR": "Estimated glomerular filtration rate. Calculated from creatinine + age +/- sex.",
    "BMI": "Body mass index. kg/m^2. AU adult cut-offs: <18.5 underweight, 25-29.9 overweight, >=30 obese.",
    "GCS": "Glasgow Coma Scale. Eye/Verbal/Motor; range 3-15. <=8 = secure airway.",
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
    "IBD": "Inflammatory bowel disease - umbrella for Crohn's disease + ulcerative colitis.",
    "OCD": "Obsessive-compulsive disorder.",
    "PTSD": "Post-traumatic stress disorder.",
    "ADHD": "Attention-deficit hyperactivity disorder.",
    "ASD": "Autism spectrum disorder (psych/paeds context) OR atrial septal defect (cardiac context).",
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
        `<span class="term" data-term="${esc(m)}">${m}</span>`);
    }
    return parts.join("");
  }

  // Tooltip element is a singleton - created lazily, reparented as
  // needed, positioned relative to the hovered span. Body-level click
  // anywhere else dismisses it on touch devices.
  let _termPopup = null;
  function getTermPopup() {
    if (_termPopup) return _termPopup;
    _termPopup = document.createElement("div");
    _termPopup.className = "term-popup";
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
    if (_termPopup) _termPopup.hidden = true;
  }
  // Delegated hover handler - attached once. Mouseover bubbles; mouseout
  // fires when leaving the span.
  document.addEventListener("mouseover", e => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (!t.classList.contains("term")) return;
    showTermPopup(t);
  });
  document.addEventListener("mouseout", e => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (!t.classList.contains("term")) return;
    hideTermPopup();
  });

  // Fisher-Yates shuffle. Uses crypto.getRandomValues when available so
  // the next-question stream is uniform across the eligible pool with
  // no positional bias and no recency clustering. Math.random fallback
  // for ancient browsers.
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
})();
