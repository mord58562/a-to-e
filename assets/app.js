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

  // Remote backend (Cloudflare Worker). Set this to the URL printed by
  // `wrangler deploy` from cloudflare-worker/. While null/empty, the
  // site falls back to the local Python backend (scripts/server.py) for
  // dev or to localStorage as a last resort.
  const WORKER_URL = "";   // e.g. "https://a-to-e-inbox.<subdomain>.workers.dev"

  const HISTORY_KEY  = "y4mcq.history.v1";
  const FLAGS_KEY    = "y4mcq.flags.v1";
  const THEME_KEY    = "y4mcq.theme.v1";     // shared across profiles
  const SETTINGS_KEY = "y4mcq.settings.v3";
  const REMINDER_DISMISS_KEY = "y4mcq.reminder.dismissed";
  const LOCAL_QUESTIONS_KEY  = "y4mcq.local_questions.v1";
  const PROFILE_CURRENT_KEY  = "y4mcq.profile.current";
  const PROFILE_MIGRATED_KEY = "y4mcq.profile.migrated.v1";

  // Profile registry. Each entry has a stable `id` (used as the
  // localStorage namespace), a human `name` (shown in the UI), and the
  // SHA-256 hash of the password. The plaintext password is never in
  // source. To add a new profile (e.g. Tom):
  //   1. Compute the hash:  printf '%s' 'tompassword' | shasum -a 256
  //   2. Append:  { id: "tom", name: "Tom", hash: "<hex>" }
  // Profile ids should be short, lowercase, and never reused.
  const PROFILES = [
    {
      id:   "rob",
      name: "Rob",
      hash: "84313ef39b0a979f0608491608870b3f2065f447d73e4373ba75ae2330aa82b5",
    },
  ];

  let currentProfile = null;
  // Namespace a storage key by the current profile so each user has
  // their own history / flags / settings / reminders / pasted questions.
  // Falls back to the bare key if no profile is loaded yet (only happens
  // pre-gate, where we never actually read state-bearing keys).
  function ns(key) {
    return currentProfile ? `${key}.${currentProfile.id}` : key;
  }

  const DEFAULT_SETTINGS = {
    mode: "study",
    count: 20,
    timer: 0,
    disciplines: ["Paediatrics", "Obstetrics & Gynaecology", "Psychiatry", "Medicine"],
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

  // Substitute today's date-driven focus directive into a prompt
  // template that contains {{FOCUS_DIRECTIVE}}. Rob's directive:
  // - until 6 June 2026: paste-flow LLMs generate only Paediatrics +
  //   Obstetrics & Gynaecology questions.
  // - from 6 June 2026: paste-flow LLMs generate primarily Medicine
  //   and Psychiatry. Paeds/O&G still acceptable in small numbers.
  function seasonalFocusDirective(now) {
    now = now || new Date();
    const flip = new Date("2026-06-06T00:00:00");
    if (now < flip) {
      return [
        "**Until 6 June 2026 (today is " + now.toISOString().slice(0, 10) + ")**: generate ONLY Paediatrics or Obstetrics & Gynaecology questions.",
        "Do NOT generate Psychiatry or Medicine questions in this period - they will be dropped from the bank.",
        "The site already has enough psych/medicine seed content; the maintainer is prioritising paeds + O&G coverage to 500 each before the next exam window.",
      ].join("\n");
    }
    return [
      "**From 6 June 2026 onwards (today is " + now.toISOString().slice(0, 10) + ")**: generate PRIMARILY Psychiatry and Medicine questions.",
      "Paediatrics and Obstetrics & Gynaecology questions are still acceptable but in much smaller numbers - no more than 1 in 5.",
      "The bank's paeds + O&G coverage is mature; psych + medicine are the current under-served disciplines.",
    ].join("\n");
  }
  function renderPrompt(tpl) {
    return tpl.replace(/\{\{FOCUS_DIRECTIVE\}\}/g, seasonalFocusDirective());
  }

  // POST to the remote worker first, then local backend, then null.
  // Returns the parsed response on success, or null if both failed.
  async function postBackend(endpoint, body) {
    const targets = [];
    if (WORKER_URL) targets.push(WORKER_URL.replace(/\/$/, "") + "/" + endpoint.replace(/^\//, ""));
    targets.push("api/" + endpoint.replace(/^\//, ""));
    for (const url of targets) {
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (r.ok) return await r.json().catch(() => ({ ok: true }));
      } catch (_) { /* try next */ }
    }
    return null;
  }

  function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function saveSettings() { save(ns(SETTINGS_KEY), state.settings); }

  // Hydrate per-profile state after the gate has set currentProfile.
  // Pre-gate, state.history/flags/settings are empty defaults.
  function loadProfileState() {
    state.history  = load(ns(HISTORY_KEY), {});
    state.flags    = load(ns(FLAGS_KEY), {});
    state.settings = Object.assign({}, DEFAULT_SETTINGS, load(ns(SETTINGS_KEY), {}));
  }

  // One-time legacy migration. Older builds used unscoped keys (one
  // profile per browser). If we detect leftover unscoped data the first
  // time a profile signs in on this browser, move it into that
  // profile's namespace so existing history/flags/settings/questions
  // don't appear lost.
  function migrateLegacyIfNeeded() {
    if (!currentProfile) return;
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
    // Old single-password gate flag is obsolete.
    localStorage.removeItem("y4mcq.gate.passed");
    localStorage.setItem(PROFILE_MIGRATED_KEY, "1");
  }

  // Client-side gate. Plaintext passwords are never in source - we ship
  // only the SHA-256 of each profile's password. A static-site gate is
  // theatre (anyone can fetch /data/*.json directly) but it filters
  // casual access and provides the profile-routing hook.

  async function sha256Hex(s) {
    const buf = new TextEncoder().encode(s);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function passGate() {
    return new Promise(resolve => {
      const gate = document.getElementById("gate");
      const form = document.getElementById("gateForm");
      const input = document.getElementById("gateInput");
      const err = document.getElementById("gateErr");
      const unlock = () => {
        if (gate) gate.hidden = true;
        document.body.classList.remove("locked");
        resolve();
      };
      if (!gate) { document.body.classList.remove("locked"); return resolve(); }

      const savedId = localStorage.getItem(PROFILE_CURRENT_KEY);
      if (savedId) {
        const p = PROFILES.find(p => p.id === savedId);
        if (p) { currentProfile = p; return unlock(); }
        // Saved id no longer matches any known profile - clear it.
        localStorage.removeItem(PROFILE_CURRENT_KEY);
      }

      setTimeout(() => input.focus(), 50);
      form.addEventListener("submit", async e => {
        e.preventDefault();
        const h = await sha256Hex((input.value || "").trim());
        const p = PROFILES.find(p => p.hash === h);
        if (p) {
          currentProfile = p;
          localStorage.setItem(PROFILE_CURRENT_KEY, p.id);
          unlock();
        } else {
          err.hidden = false;
          input.value = "";
          input.focus();
        }
      });
    });
  }

  function signOut() {
    localStorage.removeItem(PROFILE_CURRENT_KEY);
    // Hard reload so all in-memory state resets to the gate flow.
    location.reload();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    applyTheme(localStorage.getItem(THEME_KEY) || "light");
    await passGate();
    migrateLegacyIfNeeded();
    loadProfileState();
    await loadData();
    wireMasthead();
    wireColophon();
    wireRefPanel();
    wireQuizTopbar();
    wireHowToModal();
    wireReportModal();
    wireReportsAdmin();
    maybeShowReminder();
    updateReportsAdminBadge();
    showHome();
  });

  async function loadData() {
    const [paeds, obgyn, psych, medicine, ranges, meta, batchManifest, inboxManifest, reportsFile] = await Promise.all([
      fetchJson("data/questions_paeds.json").catch(() => []),
      fetchJson("data/questions_obgyn.json").catch(() => []),
      fetchJson("data/questions_psych.json").catch(() => []),
      fetchJson("data/questions_medicine.json").catch(() => []),
      fetchJson("data/reference_ranges.json").catch(() => null),
      fetchJson("data/meta.json").catch(() => ({})),
      fetchJson("data/batches_manifest.json").catch(() => ({ batches: [] })),
      fetchJson("data/inbox_manifest.json").catch(() => ({ inbox: [] })),
      fetchJson("data/reports.json").catch(() => ({ reports: [] })),
    ]);
    state.reports = (reportsFile && reportsFile.reports) || [];

    // Pull every staging batch listed in the manifests. Each is its own
    // JSON array of question objects matching the live schema.
    // Failures are silent so the manifests can list files that don't
    // yet exist (in-flight batches, expected inbox drops).
    const batchPaths = (batchManifest && batchManifest.batches) || [];
    const inboxPaths = (inboxManifest && inboxManifest.inbox) || [];
    const extra = await Promise.all(
      [...batchPaths, ...inboxPaths].map(p => fetchJson("data/" + p).catch(() => []))
    );
    const extraQuestions = extra.flat();

    // Locally pasted questions live only in this browser's localStorage.
    // They merge into the bank the same way as inbox files.
    const localQuestions = load(ns(LOCAL_QUESTIONS_KEY), []);

    // Deduplicate by id - if a question is later merged into the main
    // file, the main-file entry wins (it appears first in `all`).
    const seen = new Set();
    const all = [...paeds, ...obgyn, ...psych, ...medicine, ...extraQuestions, ...localQuestions];
    state.questions = all.filter(q => {
      if (!q || !q.id) return false;
      if (seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    });
    state.ranges = ranges;
    state.meta = meta;
  }
  function fetchJson(p) { return fetch(p, { cache: "no-cache" }).then(r => r.json()); }

  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(THEME_KEY, t);
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(cur === "light" ? "dark" : "light");
  }

  function wireMasthead() {
    document.getElementById("rangesBtn").onclick = () => toggleRefs();
    document.getElementById("themeBtn").onclick = toggleTheme;
    const goHome = e => {
      if (e) e.preventDefault();
      if (state.quiz && !state.quiz.finished &&
          !confirm("End this session and return to the index?")) return;
      stopSessionTimer();
      showHome();
    };
    const brand = document.querySelector(".masthead .brand");
    if (brand) brand.onclick = goHome;
    const chip = document.getElementById("profileChip");
    const nameEl = document.getElementById("profileName");
    if (chip && currentProfile) {
      chip.hidden = false;
      chip.dataset.profileId = currentProfile.id;
      nameEl.textContent = currentProfile.name;
    }
    const signOutBtn = document.getElementById("signOutBtn");
    if (signOutBtn) signOutBtn.onclick = e => {
      e.stopPropagation();
      if (confirm(`Sign out ${currentProfile ? currentProfile.name : ""}? Your progress stays saved against this profile.`)) signOut();
    };
  }

  function wireColophon() {
    document.getElementById("exitBtn").onclick = () => {
      if (!state.quiz) return;
      if (confirm("Exit this session?")) {
        stopSessionTimer();
        showHome();
      }
    };
    document.getElementById("endNowBtn").onclick = () => {
      if (!state.quiz) return;
      if (confirm("End this session and see results?")) {
        stopSessionTimer();
        showSummary(false);
      }
    };
    document.getElementById("pauseBtn").onclick = togglePause;
  }

  function wireQuizTopbar() {
    document.getElementById("qtPrev").onclick = () => navOffset(-1);
    document.getElementById("qtNext").onclick = () => navOffset(+1);
    document.getElementById("qtCounter").onclick = toggleQtList;
  }

  function setScreen(name) {
    document.body.setAttribute("data-screen", name);
    document.getElementById("colophon").hidden = name !== "quiz";
    document.getElementById("quizTopbar").hidden = name !== "quiz";
  }

  // ── Reminder ────────────────────────────────────────────────────────────
  function maybeShowReminder() {
    const banner = document.getElementById("reminderBanner");
    const text = document.getElementById("reminderText");
    const meta = state.meta || {};
    // sessionStorage: dismiss persists for the page session only and
    // resets on next reload, per Rob's spec.
    if (sessionStorage.getItem("y4mcq.reminder.sessionDismissed")) return;
    const total = state.questions.length;
    const updated = meta.last_added || meta.updated;
    if (!updated) {
      text.textContent = `${total} questions in the bank. Add more via Index → How to add.`;
      banner.hidden = false;
    } else {
      const days = Math.floor((Date.now() - new Date(updated).getTime()) / 86400000);
      if (days >= 7) {
        text.textContent = `${days} days since the last add. ${total} questions in the bank.`;
        banner.hidden = false;
      } else if (days >= 3) {
        text.textContent = `${days} days since last add. ${total} questions in the bank.`;
        banner.hidden = false;
      }
    }
    document.getElementById("reminderHowTo").onclick = openHowTo;
    document.getElementById("reminderDismiss").onclick = () => {
      sessionStorage.setItem("y4mcq.reminder.sessionDismissed", "1");
      banner.hidden = true;
    };
  }

  // ── Home ────────────────────────────────────────────────────────────────
  function showHome() {
    setScreen("home");
    state.quiz = null;
    closeRefs(true);
    const app = document.getElementById("app");
    app.innerHTML = "";
    app.appendChild(document.getElementById("tpl-home").content.cloneNode(true));
    document.getElementById("sessionMeta").textContent = "";

    const greet = document.getElementById("homeGreeting");
    if (greet && currentProfile) {
      greet.textContent = `Hi, ${currentProfile.name}.`;
      greet.hidden = false;
    }
    // Randomise the closing well-wish across the available languages.
    const luck = document.getElementById("luckPhrase");
    if (luck) {
      const phrases = [
        "Good luck.",
        "Dī bene vertant.",
        "Τύχῃ ἀγαθῇ.",
        "सौभाग्यम्।",
        "Ни пýха ни перá.",
        "Sretno Ti Bilo."
      ];
      luck.textContent = phrases[Math.floor(Math.random() * phrases.length)];
    }

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
    updatePool();
  }

  function getPool() {
    const s = state.settings;
    return state.questions.filter(q => {
      if (s.disciplines.length && !s.disciplines.includes(q.topic)) return false;
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
    if (s.mode === "study") {
      el.textContent = `${n} questions match · Study mode shuffles through them all - end whenever.`;
    } else {
      const take = s.count === 0 ? n : Math.min(s.count, n);
      const time = s.timer ? ` · ${s.timer} min` : " · untimed";
      el.textContent = `${take} of ${n} matching questions${time}.`;
    }
    startBtn.disabled = n === 0;
  }

  // ── Quiz ────────────────────────────────────────────────────────────────
  function startQuiz() {
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
    setScreen("quiz");
    document.getElementById("sessionMeta").textContent =
      (s.mode === "study" ? "Study session" : "Test session") +
      " · " + new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" });
    renderQuiz();
    startSessionTimer();
  }

  function renderQuiz() {
    const app = document.getElementById("app");
    app.innerHTML = "";
    app.appendChild(document.getElementById("tpl-quiz").content.cloneNode(true));
    renderTopbar();
    renderReadingPane();
    state.questionStart = Date.now();
    bindQuizKeys();
  }

  // Compact book-style position indicator (Previous / counter / Next).
  function renderTopbar() {
    document.getElementById("qtNumber").textContent =
      `Q ${state.quiz.idx + 1} / ${state.quiz.pool.length}`;
    document.getElementById("qtPrev").disabled = state.quiz.idx === 0;
    document.getElementById("qtNext").disabled = state.quiz.idx >= state.quiz.pool.length - 1;
    const list = document.getElementById("qtList");
    if (list) list.hidden = true;
  }

  function toggleQtList() {
    const list = document.getElementById("qtList");
    if (!list.children.length) renderQtList();
    list.hidden = !list.hidden;
  }
  function renderQtList() {
    const list = document.getElementById("qtList");
    list.innerHTML = "";
    const ol = document.createElement("ol");
    state.quiz.pool.forEach((q, i) => {
      const li = document.createElement("li");
      const ans = state.quiz.answers[q.id];
      const isC = ans && _shuffledOptions(q).find(o => o.letter === ans)?.correct;
      const flagged = !!state.flags[q.id];
      let statusGlyph = "·";
      let statusClass = "";
      if (ans) {
        if (state.quiz.mode === "test" && !state.quiz.finished) {
          statusGlyph = "•";
        } else if (isC) { statusGlyph = "✓"; statusClass = "correct"; }
        else            { statusGlyph = "✗"; statusClass = "incorrect"; }
      }
      li.className = statusClass + (i === state.quiz.idx ? " current" : "") + (flagged ? " flagged" : "");
      li.innerHTML = `
        <span class="qtl-status">${statusGlyph}</span>
        <span class="qtl-num">${String(i + 1).padStart(2, " ")}</span>
        <span class="qtl-stem">${esc(q.stem.slice(0, 80))}${q.stem.length > 80 ? "…" : ""}</span>
      `;
      li.onclick = () => { jumpTo(i); document.getElementById("qtList").hidden = true; };
      ol.appendChild(li);
    });
    list.appendChild(ol);
  }

  function jumpTo(i) {
    if (i === state.quiz.idx) return;
    state.quiz.idx = i;
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
  function _shuffledOptions(q) {
    if (q._shuffledOptions) return q._shuffledOptions;
    const order = _seededOrder(q.id || JSON.stringify(q.options.map(o => o.text)), q.options.length);
    const letters = ["A", "B", "C", "D", "E", "F", "G"];
    const out = order.map((origIdx, newIdx) => {
      const o = q.options[origIdx];
      return Object.assign({}, o, { letter: letters[newIdx] });
    });
    q._shuffledOptions = out;
    return out;
  }

  function renderReadingPane() {
    const q = state.quiz.pool[state.quiz.idx];
    const shuffled = _shuffledOptions(q);
    // Pre-answer folio: just the question number. NO subtopic, NO discipline,
    // NO subject category - those would spoil the diagnosis.
    document.getElementById("folio").textContent =
      `§ ${String(state.quiz.idx + 1).padStart(2, "0")} of ${state.quiz.pool.length}`;
    // Hide the subject element until reveal.
    const fs = document.getElementById("folioSubject");
    if (fs) fs.textContent = "";
    const fSep = document.querySelector(".folio-sep");
    if (fSep) fSep.style.display = "none";

    document.getElementById("qStem").textContent = q.stem;

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
    if (q.data_table && Object.keys(q.data_table).length) {
      dtWrap.hidden = false;
      const dl = document.createElement("dl");
      dl.className = "patient-table";
      dl.id = "qDataTable";
      for (const [k, v] of Object.entries(q.data_table)) {
        const dt = document.createElement("dt"); dt.textContent = k;
        const dd = document.createElement("dd"); dd.textContent = v;
        dl.appendChild(dt); dl.appendChild(dd);
      }
      dtWrap.replaceWith(dl);
    } else {
      dtWrap.hidden = true;
    }

    document.getElementById("qLeadIn").textContent = q.lead_in;

    const ol = document.getElementById("qOptions");
    ol.innerHTML = "";
    shuffled.forEach(opt => {
      const li = document.createElement("li");
      li.dataset.letter = opt.letter;
      const cite = opt.source_refs && opt.source_refs.length
        ? `<span class="cite">· ${esc(opt.source_refs.join(", "))}</span>` : "";
      li.innerHTML = `
        <span class="opt-letter">${opt.letter}</span>
        <div>
          <div class="opt-text">${esc(opt.text)}</div>
          <div class="opt-rationale"><b>${opt.correct ? "Correct." : "Incorrect."}</b> ${esc(opt.rationale)}${cite}</div>
        </div>
        <button class="opt-strike" title="Cross out (X)" data-letter="${opt.letter}">×</button>
      `;
      li.onclick = e => {
        if (e.target.classList.contains("opt-strike")) {
          toggleStrike(q.id, opt.letter, li); return;
        }
        if (state.quiz.revealed[q.id]) return;
        if (state.quiz.struck[q.id] && state.quiz.struck[q.id].has(opt.letter)) return;
        document.querySelectorAll("#qOptions li").forEach(x => x.classList.remove("selected"));
        li.classList.add("selected");
        state.quiz.answers[q.id] = opt.letter;
        document.getElementById("submitBtn").disabled = false;
      };
      ol.appendChild(li);
    });
    if (state.quiz.struck[q.id]) {
      state.quiz.struck[q.id].forEach(l => {
        const x = ol.querySelector(`li[data-letter="${l}"]`); if (x) x.classList.add("struck");
      });
    }
    if (state.quiz.answers[q.id]) {
      const sel = ol.querySelector(`li[data-letter="${state.quiz.answers[q.id]}"]`);
      if (sel) sel.classList.add("selected");
      document.getElementById("submitBtn").disabled = false;
    }

    document.getElementById("submitBtn").onclick = onSubmit;
    document.getElementById("nextBtn").onclick = onNext;
    document.getElementById("labsBtn").onclick = () => toggleRefs();
    document.getElementById("labsBtn").classList.toggle("active", state.refsOpen);
    document.getElementById("flagBtn").onclick = () => {
      state.flags[q.id] = !state.flags[q.id];
      save(ns(FLAGS_KEY), state.flags);
      document.getElementById("flagBtn").classList.toggle("active flag", !!state.flags[q.id]);
      renderTopbar();
    };
    document.getElementById("flagBtn").classList.toggle("active flag", !!state.flags[q.id]);

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
    if (state.quiz.struck[id].has(letter)) {
      state.quiz.struck[id].delete(letter); li.classList.remove("struck");
    } else {
      state.quiz.struck[id].add(letter); li.classList.add("struck");
      if (state.quiz.answers[id] === letter) {
        delete state.quiz.answers[id];
        li.classList.remove("selected");
        document.getElementById("submitBtn").disabled = true;
      }
    }
  }

  function onSubmit() {
    const q = state.quiz.pool[state.quiz.idx];
    if (!state.quiz.answers[q.id]) return;
    const isC = _shuffledOptions(q).find(o => o.letter === state.quiz.answers[q.id])?.correct;
    state.history[q.id] = { lastCorrect: !!isC, count: (state.history[q.id]?.count || 0) + 1 };
    save(ns(HISTORY_KEY), state.history);
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
      (q.difficulty ? `<span class="difficulty-tag">Difficulty ${q.difficulty}/5</span>` : "") +
      (q.model ? `<span class="model-tag" title="Question author">${esc(q.model)}</span>` : "");

    const correct = _shuffledOptions(q).find(o => o.correct);
    const correctCite = correct.source_refs && correct.source_refs.length
      ? `<span class="cite">Sources: ${esc(correct.source_refs.join("; "))}</span>` : "";
    document.getElementById("explainCorrect").innerHTML =
      `<p><b>${correct.letter}. ${esc(correct.text)}</b></p><p>${esc(correct.rationale)}</p>${correctCite}`;

    document.getElementById("explainDistractors").innerHTML =
      _shuffledOptions(q).filter(o => !o.correct).map(o => {
        const c = o.source_refs && o.source_refs.length
          ? `<span class="cite">· ${esc(o.source_refs.join(", "))}</span>` : "";
        return `<p><b>${o.letter}. ${esc(o.text)}</b><br/><span class="dim">${esc(o.rationale)}</span>${c}</p>`;
      }).join("");

    const sum = q.explanation || {};
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
      const btn = document.createElement("button");
      btn.className = "show-ranges";
      btn.textContent = `Open reference values (${q.reference_ranges.length})`;
      btn.onclick = () => openRefs(q.reference_ranges);
      rl.appendChild(btn);
    }

    document.getElementById("submitBtn").hidden = true;
    document.getElementById("nextBtn").hidden = false;
    document.getElementById("nextBtn").focus();
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
    const lb = document.getElementById("labsBtn");
    if (lb) lb.classList.add("active");
    document.getElementById("rangesSearch").value = "";
    // No focus theft - the user keeps interacting with the question.
  }
  function closeRefs() {
    state.refsOpen = false;
    const panel = document.getElementById("refPanel");
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("refs-open");
    const lb = document.getElementById("labsBtn");
    if (lb) lb.classList.remove("active");
  }
  function renderRefBody(restrictKeys) {
    const body = document.getElementById("rangesBody");
    body.innerHTML = "";
    const cats = (state.ranges && state.ranges.categories) || {};
    const keys = restrictKeys && restrictKeys.length ? restrictKeys : Object.keys(cats);
    keys.forEach(k => {
      const cat = cats[k]; if (!cat) return;
      const div = document.createElement("div");
      div.className = "range-cat";
      div.dataset.key = k;
      const rows = (cat.ranges || []).map(r => {
        const v = r.value != null ? r.value : (r.range != null ? r.range : "");
        const t = r.test || r.label || r.name || "";
        return `<tr><td class="test">${esc(t)}</td><td class="value">${esc(String(v))}</td></tr>`;
      }).join("");
      div.innerHTML = `<h3>${esc(cat.label || k)}</h3><table>${rows}</table>` +
        (cat.notes ? `<p class="range-note">${esc(cat.notes)}</p>` : "");
      body.appendChild(div);
    });
    if (!body.children.length) body.innerHTML = `<p class="dim">No reference data loaded.</p>`;
  }
  function filterRanges(term) {
    document.querySelectorAll("#rangesBody .range-cat").forEach(c => {
      const k = (c.dataset.key || "").toLowerCase();
      const t = c.textContent.toLowerCase();
      c.classList.toggle("hidden", !!term && !k.includes(term) && !t.includes(term));
    });
  }

  // ── Timers ──────────────────────────────────────────────────────────────
  function startSessionTimer() {
    stopSessionTimer();
    state.timerInterval = setInterval(tick, 500);
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
    } else {
      qEl.textContent = "Q " + fmtClock(Date.now() - state.questionStart);
      sep.hidden = false;
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
  function bindQuizKeys() {
    document.onkeydown = e => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const q = state.quiz && state.quiz.pool[state.quiz.idx];
      if (!q) return;
      const k = e.key.toLowerCase();
      if (["1","2","3","4","5"].includes(k)) {
        const letter = "ABCDE"[parseInt(k, 10) - 1];
        const li = document.querySelector(`#qOptions li[data-letter="${letter}"]`);
        if (li && !state.quiz.revealed[q.id]) li.click();
        e.preventDefault();
      } else if (k === "enter" || k === " " || k === "arrowright") {
        const submit = document.getElementById("submitBtn");
        const next   = document.getElementById("nextBtn");
        if (!next.hidden) next.click();
        else if (!submit.disabled) submit.click();
        e.preventDefault();
      } else if (k === "f") {
        document.getElementById("flagBtn").click();
      } else if (k === "x") {
        const sel = document.querySelector("#qOptions li.selected");
        if (sel) toggleStrike(q.id, sel.dataset.letter, sel);
      } else if (k === "l") {
        toggleRefs();
      } else if (k === "arrowleft") {
        navOffset(-1);
        e.preventDefault();
      } else if (k === "arrowup" || k === "arrowdown") {
        if (state.quiz.revealed[q.id]) { e.preventDefault(); return; }
        const items = Array.from(document.querySelectorAll("#qOptions li"));
        if (!items.length) { e.preventDefault(); return; }
        const n = items.length;
        const cur = items.findIndex(li => li.classList.contains("selected"));
        let nextIdx;
        if (cur === -1) {
          nextIdx = k === "arrowdown" ? 0 : n - 1;
        } else {
          nextIdx = k === "arrowdown" ? (cur + 1) % n : (cur - 1 + n) % n;
        }
        items[nextIdx].click();
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
        state.quiz.revealed[q.id] = true;
        state.quiz.finished = false;
        setScreen("quiz");
        renderQuiz();
        startSessionTimer();
      };
      ol.appendChild(li);
    });
    if (!ol.children.length) ol.innerHTML = `<li class="dim small" style="grid-column:1/-1;">Nothing in this filter.</li>`;
  }

  function retryIncorrect() {
    const wrong = state.quiz.pool.filter(q => {
      const ans = state.quiz.answers[q.id];
      return !ans || !_shuffledOptions(q).find(o => o.letter === ans)?.correct;
    });
    if (!wrong.length) { showHome(); return; }
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

  // ── How-to modal ────────────────────────────────────────────────────────
  function wireHowToModal() {
    document.getElementById("howToClose").onclick = closeHowTo;
    document.getElementById("howToModal").addEventListener("click", e => {
      if (e.target.id === "howToModal") closeHowTo();
    });
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if (!document.getElementById("howToModal").hidden) closeHowTo();
      else if (state.refsOpen) closeRefs();
    });

    // Populate the LLM prompt + copy button. The prompt text has
    // placeholders ({{FOCUS_DIRECTIVE}}) that are substituted at
    // copy time so today's date controls which discipline(s) are in
    // scope - see seasonalFocusDirective() below.
    const promptTpl = document.getElementById("addQuestionsPromptTemplate");
    const promptText = document.getElementById("promptText");
    if (promptTpl && promptText) {
      promptText.textContent = renderPrompt(promptTpl.textContent.trim());
    }
    const copyBtn = document.getElementById("copyPromptBtn");
    const copyStatus = document.getElementById("copyPromptStatus");
    const COPY_LABEL = copyBtn ? copyBtn.textContent : "";
    let copyResetTimer = null;
    if (copyBtn) copyBtn.onclick = async () => {
      // Re-render in case the calendar rolled past 1 July since the
      // modal was last opened.
      promptText.textContent = renderPrompt(promptTpl.textContent.trim());
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
    document.getElementById("pasteAddBtn").onclick = pasteAdd;
    document.getElementById("pasteDownloadBtn").onclick = pasteDownload;
    document.getElementById("localBankClear").onclick = clearLocalBank;
    document.getElementById("localBankExport").onclick = exportLocalBank;
    refreshLocalBankSummary();
  }

  // ── Report modal (per-question issue submission) ───────────────────────
  let _reportingQId = null;
  let _reportingModel = null;
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
    document.getElementById("reportText").value = "";
    document.getElementById("reportStatus").textContent = "";
    document.getElementById("reportStatus").className = "dim small";
    document.getElementById("reportModal").hidden = false;
    setTimeout(() => document.getElementById("reportText").focus(), 50);
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
    status.textContent = "Submitting…";
    const res = await postBackend("report", {
      question_id: _reportingQId,
      issue: text,
      profile: currentProfile ? currentProfile.id : "guest",
      model: _reportingModel,
    });
    btn.disabled = false;
    if (res && res.ok) {
      status.textContent = "Submitted. Thanks - this gets checked on the next audit pass.";
      status.classList.remove("bad"); status.classList.add("ok");
      // Optimistically include in local in-memory list so the badge updates.
      state.reports.push({
        id: res.id, question_id: _reportingQId, issue: text,
        profile: currentProfile ? currentProfile.id : "guest",
        model: _reportingModel, created: new Date().toISOString(),
        status: "open", resolution: null,
      });
      updateReportsAdminBadge();
      const repBtn = document.getElementById("reportBtn");
      if (repBtn) repBtn.classList.add("has-report");
      setTimeout(closeReportModal, 1200);
    } else {
      status.textContent = "Couldn't reach the backend. Try again, or screenshot + email Rob.";
      status.classList.add("bad");
    }
  }

  // ── Audit dashboard (Rob only) ─────────────────────────────────────────
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
  function wireReportsAdmin() {
    const btn = document.getElementById("reportsAdminBtn");
    const m = document.getElementById("reportsAdminModal");
    if (!btn || !m) return;
    btn.onclick = openReportsAdmin;
    document.getElementById("reportsAdminClose").onclick = () => m.hidden = true;
    m.addEventListener("click", e => { if (e.target.id === "reportsAdminModal") m.hidden = true; });
    const llmSel = document.getElementById("auditLlmSelect");
    if (llmSel) {
      llmSel.value = auditLlmId();
      llmSel.onchange = () => setAuditLlm(llmSel.value);
    }
    document.querySelectorAll('#reportsAdminModal [data-rep-filter]').forEach(b => {
      b.onclick = () => {
        document.querySelectorAll('#reportsAdminModal [data-rep-filter]').forEach(x => x.classList.remove("selected"));
        b.classList.add("selected");
        renderReportsAdminList(b.dataset.repFilter);
      };
    });
    document.querySelectorAll('#reportsAdminModal .audit-tab').forEach(b => {
      b.onclick = () => switchAuditTab(b.dataset.tab);
    });
    const bulkBtn = document.getElementById("auditBulkReports");
    if (bulkBtn) bulkBtn.onclick = startBulkReportAudit;
    document.querySelectorAll('#reportsAdminModal [data-live-filter]').forEach(b => {
      b.onclick = () => {
        document.querySelectorAll('#reportsAdminModal [data-live-filter]').forEach(x => x.classList.remove("selected"));
        b.classList.add("selected");
        renderAuditLive(b.dataset.liveFilter);
      };
    });
  }
  function updateReportsAdminBadge() {
    const btn = document.getElementById("reportsAdminBtn");
    const badge = document.getElementById("reportsAdminCount");
    if (!btn) return;
    const isAdmin = currentProfile && currentProfile.id === "rob";
    if (!isAdmin) { btn.hidden = true; return; }
    const open = state.reports.filter(r => r.status === "open").length;
    btn.hidden = false;
    badge.textContent = open > 0 ? String(open) : "";
    btn.classList.toggle("has-pending", open > 0);
  }
  async function openReportsAdmin() {
    if (!currentProfile || currentProfile.id !== "rob") return;
    document.getElementById("reportsAdminModal").hidden = false;
    await refreshAuditInboxList();
    switchAuditTab("inbox");
  }
  function switchAuditTab(name) {
    document.querySelectorAll('#reportsAdminModal .audit-tab').forEach(b => {
      b.classList.toggle("selected", b.dataset.tab === name);
    });
    document.querySelectorAll('#reportsAdminModal .audit-tab-panel').forEach(p => {
      p.hidden = p.dataset.tabPanel !== name;
    });
    if (name === "inbox") renderAuditInbox();
    else if (name === "live") loadAndRenderAuditLive();
    else renderReportsAdminList("open");
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
          <span class="audit-row-name">${esc(b.path)}</span>
          <span class="audit-row-meta dim small">${b.questions.length} Q · ${topicSummary} · author(s): ${modelSummary}</span>
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
          updateReportsAdminBadge();
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
    const tpl = document.getElementById("addQuestionsPromptTemplate");
    let t = renderPrompt(tpl.textContent.trim());
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
          <span class="audit-row-name">${isMain ? "★ " : ""}${esc(f.path)}</span>
          <span class="audit-row-meta dim small">${f.questions.length} Q · top: ${topSubjects} · author(s): ${modelSummary}</span>
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
      list.innerHTML = `<li class="dim small">No ${esc(filter)} reports.</li>`;
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
        document.getElementById("reportsAdminModal").hidden = true;
        jumpToQuestionStandalone(q);
      };
      list.appendChild(li);
    }
  }
  function jumpToQuestionStandalone(q) {
    // Start a tiny single-question study session for review.
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
  function openHowTo()  {
    document.getElementById("howToModal").hidden = false;
    refreshLocalBankSummary();
  }
  function closeHowTo() { document.getElementById("howToModal").hidden = true; }

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

  function clearLocalBank() {
    const existing = load(ns(LOCAL_QUESTIONS_KEY), []);
    if (!existing.length) return;
    if (!confirm(`Remove all ${existing.length} locally-pasted question${existing.length === 1 ? "" : "s"} from this browser? File-shipped questions are untouched.`)) return;
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
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
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
