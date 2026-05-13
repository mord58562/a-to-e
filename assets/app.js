/* Y4 Pocket Companion - SPA driver.
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

  const HISTORY_KEY  = "y4mcq.history.v1";
  const FLAGS_KEY    = "y4mcq.flags.v1";
  const THEME_KEY    = "y4mcq.theme.v1";
  const SETTINGS_KEY = "y4mcq.settings.v3";
  const REMINDER_DISMISS_KEY = "y4mcq.reminder.dismissed";

  const DEFAULT_SETTINGS = {
    mode: "study",
    count: 20,
    timer: 0,
    disciplines: ["Paediatrics", "Obstetrics & Gynaecology"],
    filter: "all",
    subtopics: null,
  };

  const state = {
    questions: [],
    ranges: null,
    meta: null,
    history: load(HISTORY_KEY, {}),
    flags:   load(FLAGS_KEY, {}),
    settings: Object.assign({}, DEFAULT_SETTINGS, load(SETTINGS_KEY, {})),
    quiz: null,
    sessionStart: 0,
    questionStart: 0,
    timerInterval: null,
    paused: false,
    refsOpen: false,
  };

  function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function saveSettings() { save(SETTINGS_KEY, state.settings); }

  document.addEventListener("DOMContentLoaded", async () => {
    applyTheme(localStorage.getItem(THEME_KEY) || "light");
    await loadData();
    wireMasthead();
    wireColophon();
    wireRefPanel();
    wireQuizTopbar();
    wireHowToModal();
    maybeShowReminder();
    showHome();
  });

  async function loadData() {
    const [paeds, obgyn, ranges, meta, batchManifest] = await Promise.all([
      fetchJson("data/questions_paeds.json").catch(() => []),
      fetchJson("data/questions_obgyn.json").catch(() => []),
      fetchJson("data/reference_ranges.json").catch(() => null),
      fetchJson("data/meta.json").catch(() => ({})),
      fetchJson("data/batches_manifest.json").catch(() => ({ batches: [] })),
    ]);

    // Pull every staging batch listed in the manifest. Each batch is its
    // own JSON array of questions in the same schema. Failures are silent
    // so the manifest can list in-flight batches that don't yet exist.
    const batchPaths = (batchManifest && batchManifest.batches) || [];
    const batches = await Promise.all(
      batchPaths.map(p => fetchJson("data/" + p).catch(() => []))
    );
    const batchQuestions = batches.flat();

    // Deduplicate by id - if a batch is later merged into the main file,
    // the main-file entry wins.
    const seen = new Set();
    const all = [...paeds, ...obgyn, ...batchQuestions];
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
    document.getElementById("homeBtn").onclick = () => {
      if (state.quiz && !state.quiz.finished &&
          !confirm("End this session and return to the index?")) return;
      stopSessionTimer();
      showHome();
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
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(REMINDER_DISMISS_KEY) === today) return;
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
      localStorage.setItem(REMINDER_DISMISS_KEY, today);
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
    } else if (name === "subtopics") {
      const total = row.querySelectorAll(".opt").length;
      state.settings.subtopics = values.length === total ? null : values;
    }
    saveSettings();
  }

  function renderSubtopicChips() {
    const wrap = document.getElementById("subtopicChips");
    if (!wrap) return;
    const counts = {};
    state.questions.forEach(q => {
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
      `· ${sorted.length} subjects, all on by default`;
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
      el.textContent = `${n} questions match · Study mode shuffles through them all; end whenever.`;
    } else {
      const take = Math.min(s.count, n);
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
    const take = s.mode === "study" ? pool.length : Math.min(s.count, pool.length);
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
      save(FLAGS_KEY, state.flags);
      document.getElementById("flagBtn").classList.toggle("active flag", !!state.flags[q.id]);
      renderTopbar();
    };
    document.getElementById("flagBtn").classList.toggle("active flag", !!state.flags[q.id]);

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
    save(HISTORY_KEY, state.history);
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

    // The subtopic + difficulty go on the commentary eyebrow now, where
    // they can be seen AFTER the user has committed to an answer.
    const eb = ex.querySelector(".section-eyebrow");
    eb.innerHTML = `Commentary` +
      (q.subtopic ? `<span class="topic-tag">${esc(q.subtopic)}</span>` : "") +
      (q.difficulty ? `<span class="difficulty-tag">Difficulty ${q.difficulty}/5</span>` : "");

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
    if (state.paused || !state.quiz) return;
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
      } else if (k === "enter") {
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
      } else if (k === "arrowright") {
        navOffset(+1);
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
  }
  function openHowTo()  { document.getElementById("howToModal").hidden = false; }
  function closeHowTo() { document.getElementById("howToModal").hidden = true; }

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
