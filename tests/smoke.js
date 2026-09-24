/* End-to-end smoke test.
 *
 * The Qt-less equivalent of actually opening the site: loads the real
 * index.html and the real app.js in jsdom against a local server,
 * enters as a guest, starts a study session and drives 25 questions,
 * and fails on any console error, warning or uncaught exception along
 * the way.
 *
 * This exists because `node --check` proves a file parses and nothing
 * else. A missing element id, a handler bound to a removed node, a
 * renderer that throws on one question's data shape - none of those
 * show up until someone opens the page.
 *
 *   python3 -m http.server 8765 --bind 127.0.0.1 &
 *   npm i --no-save jsdom
 *   node tests/smoke.js        (or tests/run.sh for every test)
 *
 * Exit 0 clean, 1 on any failed check or page error.
 */
const { boot, startSession, runner, main, wait } = require("./harness");
const N = 25;

main(async () => {
  const T = runner("smoke");
  const t = await boot();
  const { $ } = t;
  T.ok(!!$("#gateGuestBtn"), "the gate offers guest mode");
  await startSession(t, { mode: "study" });
  await T.booted(t);
  T.eq(t.screen(), "quiz", "reached the quiz screen");

  // Option semantics and the rule-out round trip, on the first question.
  const opts = t.$$("#qOptions li");
  T.eq(opts.length, 5, "five options");
  T.ok(!!$('#qOptions [role="radio"]'), "options are a radiogroup");
  const strike = opts[0] && opts[0].querySelector(".opt-strike");
  if (T.ok(!!strike, "each option has a rule-out control")) {
    strike.click(); await wait(50);
    T.ok(opts[0].classList.contains("struck"), "clicking rule-out strikes the option");
    T.eq(strike.getAttribute("aria-pressed"), "true", "aria-pressed flips");
    const struckIcon = strike.innerHTML;
    strike.click(); await wait(50);
    T.ok(!opts[0].classList.contains("struck"), "a second click restores the option");
    T.ok(strike.innerHTML !== struckIcon, "the rule-out icon differs between states");
  }
  T.ok($("#navRail") && !$("#navRail").hidden, "the navigator rail is rendered");
  T.ok(t.$$(".nav-chip").length > 0, "the navigator has chips");

  const r = { questions: 0, withObsSet: 0, withRanges: 0, doubledUnits: 0, revealed: 0 };
  for (let i = 0; i < N; i++) {
    r.questions++;
    if ($(".obs-set")) r.withObsSet++;
    const choice = $("#qOptions li .opt-choice");
    if (choice) {
      choice.click(); await wait(30);
      const sb = $("#submitBtn");
      if (sb && !sb.disabled) { sb.click(); await wait(250); }
    }
    if ($("#qOptions li.revealed")) r.revealed++;
    const rb = $("#explainRanges");
    if (rb && rb.innerHTML.trim()) {
      r.withRanges++;
      // The bug this guards: the unit lived in both `value` and `units`
      // and the renderer appended it again, giving "135 - 145 mmol/L mmol/L".
      if (/(\b[a-zA-Z^/0-9]+\/[a-zA-Z^0-9]+)\s*\1\b/.test(rb.textContent)) r.doubledUnits++;
    }
    if ($("#explainStats")) T.ok(false, "the removed answer-distribution panel is back");
    if (i === N - 1) break;
    const nb = $("#nextBtn");
    if (!nb || nb.hidden) break;
    nb.click(); await wait(200);
  }

  console.log(JSON.stringify(r));
  T.eq(r.questions, N, `drove all ${N} questions (Next stopped appearing otherwise)`);
  T.eq(r.revealed, N, `every question revealed its answer`);
  // The bank is large enough that 25 questions always include both.
  T.ok(r.withObsSet > 0, "some question rendered an observation set");
  T.ok(r.withRanges > 0, "some question rendered reference ranges");
  T.eq(r.doubledUnits, 0, "no question rendered a doubled unit");
  T.eq(t.calls.length, 0, "a guest session makes no worker call");
  T.done(t);
});
