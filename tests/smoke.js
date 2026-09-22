/* End-to-end smoke test.
 *
 * The Qt-less equivalent of actually opening the site: loads the real
 * index.html and the real app.js in jsdom against a local server,
 * enters as a guest, starts a session and drives 25 questions, then
 * reports every console error and uncaught exception along the way.
 *
 * This exists because `node --check` proves a file parses and nothing
 * else. A missing element id, a handler bound to a removed node, a
 * renderer that throws on one question's data shape - none of those
 * show up until someone opens the page.
 *
 *   python3 -m http.server 8765 --bind 127.0.0.1 &
 *   npm i --no-save jsdom
 *   REPO=$PWD node tests/smoke.js
 *
 * Exit 0 clean, 1 harness failure, 2 the page logged errors.
 */
const path = require("path");
const fs = require("fs");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (_) {
  try {
    ({ JSDOM, VirtualConsole } = require("/tmp/node_modules/jsdom"));
  } catch (e) {
    console.error("jsdom not found. npm i --no-save jsdom");
    process.exit(1);
  }
}

const ORIGIN = process.env.ORIGIN || "http://127.0.0.1:8765/";
const REPO = process.env.REPO || path.resolve(__dirname, "..");
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => errors.push("jsdomError: " + (e.stack || e.message)));
  vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));
  vc.on("warn", (...a) => {
    // jsdom cannot parse modern CSS and has no layout; neither is a bug.
    if (!/Could not parse CSS|Not implemented/i.test(a.join(" "))) {
      errors.push("console.warn: " + a.join(" "));
    }
  });

  const html = await (await fetch(ORIGIN)).text();
  const dom = new JSDOM(html, {
    url: ORIGIN, runScripts: "outside-only", resources: "usable",
    pretendToBeVisual: true, virtualConsole: vc,
  });
  const { window } = dom;
  // jsdom ships no fetch, no layout and no dialog methods.
  window.fetch = (u, o) => fetch(new URL(u, ORIGIN).href, o);
  window.scrollTo = () => {};
  window.matchMedia = q => ({ matches: false, media: q, addListener() {},
    removeListener() {}, addEventListener() {}, removeEventListener() {} });
  if (!window.crypto.subtle) window.crypto.subtle = require("crypto").webcrypto.subtle;
  if (!window.HTMLDialogElement.prototype.showModal) {
    window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    window.HTMLDialogElement.prototype.close = function () {
      this.open = false; this.dispatchEvent(new window.Event("close"));
    };
  }
  for (const src of ["assets/preauth.js", "assets/app.js"]) {
    window.eval(fs.readFileSync(path.join(REPO, src), "utf8"));
  }
  window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
  await wait(2500);

  const $ = s => window.document.querySelector(s);
  const fail = m => { console.error("FAIL: " + m); process.exit(1); };

  const guest = window.document.getElementById("gateGuestBtn");
  if (!guest) fail("no guest button on the gate");
  guest.click();
  await wait(4500);  // 40 JSON files

  const start = [...window.document.querySelectorAll("button")]
    .find(b => /start|begin/i.test(b.textContent));
  if (!start) fail("no start button on the home screen");
  start.click();
  await wait(900);
  if (window.document.body.dataset.screen !== "quiz") fail("did not reach the quiz screen");

  const r = { questions: 0, withObsSet: 0, withRanges: 0, doubledUnits: 0, revealed: 0 };

  // Option semantics and the rule-out round trip, on the first question.
  const opts = [...window.document.querySelectorAll("#qOptions li")];
  if (opts.length !== 5) fail(`expected 5 options, got ${opts.length}`);
  if (!$("#qOptions [role=\"radio\"]")) fail("options are not a radiogroup");
  const strike = opts[0].querySelector(".opt-strike");
  if (!strike) fail("no rule-out control");
  strike.click(); await wait(50);
  if (!opts[0].classList.contains("struck")) fail("clicking rule-out did not strike the option");
  if (strike.getAttribute("aria-pressed") !== "true") fail("aria-pressed did not flip");
  const struckIcon = strike.innerHTML;
  strike.click(); await wait(50);
  if (opts[0].classList.contains("struck")) fail("second click did not restore the option");
  if (strike.innerHTML === struckIcon) fail("the rule-out icon did not change between states");

  if (!$("#navRail") || $("#navRail").hidden) fail("the navigator rail is not rendered");
  if (!window.document.querySelectorAll(".nav-chip").length) fail("the navigator has no chips");

  for (let i = 0; i < 25; i++) {
    r.questions++;
    if ($(".obs-set")) r.withObsSet++;
    const choice = $("#qOptions li .opt-choice");
    if (choice) {
      choice.click(); await wait(30);
      const sb = window.document.getElementById("submitBtn");
      if (sb && !sb.disabled) { sb.click(); await wait(250); }
    }
    if ($("#qOptions li.revealed")) r.revealed++;
    const rb = window.document.getElementById("explainRanges");
    if (rb && rb.innerHTML.trim()) {
      r.withRanges++;
      // The bug this guards: the unit lived in both `value` and `units`
      // and the renderer appended it again, giving "135 - 145 mmol/L mmol/L".
      const t = rb.textContent;
      if (/(\b[a-zA-Z^/0-9]+\/[a-zA-Z^0-9]+)\s*\1\b/.test(t)) r.doubledUnits++;
    }
    if ($("#explainStats")) fail("the removed answer-distribution panel is back");
    const nb = window.document.getElementById("nextBtn");
    if (nb && !nb.hidden) { nb.click(); await wait(200); } else break;
  }

  if (r.revealed === 0) fail("no question ever revealed an answer");
  if (r.doubledUnits) fail(`${r.doubledUnits} question(s) rendered a doubled unit`);

  console.log(JSON.stringify(r, null, 2));
  console.log(`\n${errors.length} console error(s)`);
  errors.slice(0, 20).forEach(e => console.log("  " + e.slice(0, 300)));
  process.exit(errors.length ? 2 : 0);
})().catch(e => { console.error("HARNESS FAILURE:", e.stack); process.exit(1); });
