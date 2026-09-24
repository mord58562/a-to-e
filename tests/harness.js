/* Shared jsdom harness for the tests in this folder.
 *
 * boot() loads the real index.html from the local server, evals the real
 * assets/preauth.js and assets/app.js into it, and lets jsdom fire
 * DOMContentLoaded itself, so the app boots once as it does in a browser.
 * Static files come from the local server. Every request to the worker is
 * routed to a fake: `routes` maps "METHOD /path" to a reply, and a request
 * no route matches is recorded as an error, so a test fails when the app
 * calls an endpoint it should not.
 *
 *   REPO=<repo root>        default: the folder above this one
 *   ORIGIN=<local server>   default: http://127.0.0.1:8765/
 *   APP=<path to app.js>    default: REPO/assets/app.js (mutation runs)
 */
const path = require("path"), fs = require("fs");

const REPO = process.env.REPO ? path.resolve(process.env.REPO) : path.resolve(__dirname, "..");
const ORIGIN = process.env.ORIGIN || "http://127.0.0.1:8765/";
const APP = process.env.APP || path.join(REPO, "assets/app.js");
const WORKER = "https://a-to-e-inbox.mord58562.workers.dev";

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require(require.resolve("jsdom", { paths: [REPO, process.cwd(), __dirname] })));
} catch (_) {
  console.error("jsdom not found. From the repo root: npm i --no-save jsdom");
  process.exit(1);
}

const wait = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, ms = 15000, what = "condition") {
  const end = Date.now() + ms;
  for (;;) {
    let v;
    try { v = fn(); } catch (_) { v = false; }
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out after ${ms} ms waiting for ${what}`);
    await wait(25);
  }
}

// jsdom has no layout, cannot parse modern CSS, and does not fetch
// Google Fonts from a test run; none of those is a bug in the page.
const JSDOM_GAPS = /Not implemented|Could not parse CSS|Could not load link: "https:\/\/fonts\./i;

/* opts:
 *   hash       fragment for the first load, without the #
 *   storage    localStorage to seed ({ key: string | object })
 *   routes     { "GET /api/me": reply | (req) => reply }
 *              reply: { status = 200, body = { ok: true }, delay = 0 } or "network"
 *   warnOk     RegExp for console.warn lines the test expects
 */
async function boot({ hash = "", storage = {}, routes = {}, warnOk = null } = {}) {
  const errors = [], warns = [], calls = [], statics = new Map();
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => { const m = e.stack || e.message; if (!JSDOM_GAPS.test(m)) errors.push("jsdomError: " + m); });
  vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));
  vc.on("warn", (...a) => {
    const m = a.map(String).join(" ");
    warns.push(m);
    if (!(warnOk && warnOk.test(m))) errors.push("console.warn: " + m);
  });

  const html = await (await fetch(ORIGIN)).text();
  const dom = new JSDOM(html, { url: ORIGIN + (hash ? "#" + hash : ""), runScripts: "outside-only",
    resources: "usable", pretendToBeVisual: true, virtualConsole: vc });
  const { window } = dom;

  window.fetch = async (u, o) => {
    const href = new URL(typeof u === "string" ? u : u.url, ORIGIN).href;
    if (href.startsWith(WORKER)) {
      const p = href.slice(WORKER.length).split("?")[0];
      const method = ((o && o.method) || "GET").toUpperCase();
      let body = null;
      try { body = o && o.body ? JSON.parse(o.body) : null; } catch (_) { body = o.body; }
      const call = { method, path: p, body, auth: o && o.headers && o.headers.Authorization, at: Date.now() };
      calls.push(call);
      const key = method + " " + p;
      let r = routes[key];
      if (r === undefined) {
        errors.push("unexpected worker call: " + key);
        r = { status: 404, body: { ok: false, code: "not_found", error: "Not found." } };
      }
      if (typeof r === "function") r = await r(call);
      if (r === "network") throw new TypeError("Failed to fetch");
      const { status = 200, body: out = { ok: true }, delay = 0 } = r || {};
      if (delay) {
        await new Promise((res, rej) => {
          const tm = setTimeout(res, delay);
          if (o && o.signal) o.signal.addEventListener("abort", () => { clearTimeout(tm); rej(new window.DOMException("aborted", "AbortError")); });
        });
      }
      call.status = status;
      return new Response(JSON.stringify(out), { status, headers: { "content-type": "application/json" } });
    }
    const rel = href.startsWith(ORIGIN) ? href.slice(ORIGIN.length).split("?")[0] : href;
    statics.set(rel, (statics.get(rel) || 0) + 1);
    // Node's fetch refuses jsdom's AbortSignal; bridge it to a Node one.
    if (o && o.signal) {
      const c = new AbortController(), s = o.signal;
      if (s.aborted) c.abort(); else s.addEventListener("abort", () => c.abort());
      o = { ...o, signal: c.signal };
    }
    return fetch(href, o);
  };
  window.scrollTo = () => {};
  window.matchMedia = q => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  if (!window.crypto.subtle) window.crypto.subtle = require("crypto").webcrypto.subtle;
  if (!window.HTMLDialogElement.prototype.showModal) {
    window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event("close")); };
  }
  for (const [k, v] of Object.entries(storage)) window.localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));

  let dcl = 0;
  window.document.addEventListener("DOMContentLoaded", () => { dcl++; });
  window.eval(fs.readFileSync(path.join(REPO, "assets/preauth.js"), "utf8"));
  window.eval(fs.readFileSync(APP, "utf8"));
  // jsdom fires DOMContentLoaded itself once parsing finishes. Firing it
  // by hand as well would run the app's boot twice.
  if (window.document.readyState !== "loading") throw new Error("the page finished parsing before app.js was loaded");

  const t = {
    window, document: window.document, errors, warns, calls, statics,
    $: s => window.document.querySelector(s),
    $$: s => [...window.document.querySelectorAll(s)],
    get bootCount() { return dcl; },
    screen: () => window.document.body.dataset.screen,
    callsTo: (method, p) => calls.filter(c => c.method === method && c.path === p),
  };
  // Booted: the gate is wired, or a stored session or guest went past it.
  // (body starts as data-screen="home" class="locked" in the static HTML.)
  await waitFor(() => dcl && (window.__gateWired || !window.document.body.classList.contains("locked")),
    20000, "the gate or the app");
  await wait(150);
  return t;
}

// Guest (if the gate is up) -> home -> options -> Begin; returns on the quiz screen.
async function startSession(t, { mode = "study", count = null } = {}) {
  const gate = t.$("#gate");
  if (gate && !gate.hidden) t.$("#gateGuestBtn").click();
  await waitFor(() => t.screen() === "home" && t.$("#startBtn"), 30000, "the home screen");
  const pick = (name, v) => {
    const b = t.$(`.setup-options[data-name="${name}"] .opt[data-value="${v}"]`);
    if (!b) throw new Error(`no ${name} option ${v}`);
    b.click();
  };
  pick("mode", mode);
  if (count != null) pick("count", count);
  await wait(50);
  t.$("#startBtn").click();
  await waitFor(() => t.screen() === "quiz" && t.$("#qOptions li"), 10000, "the quiz screen");
  await wait(50);
}

function key(t, k, extra = {}) {
  const target = extra.target || t.document.body;
  const code = extra.code || (/^[1-5]$/.test(k) ? "Digit" + k : /^[a-z]$/i.test(k) ? "Key" + k.toUpperCase() : k);
  target.dispatchEvent(new t.window.KeyboardEvent("keydown", { key: k, code, bubbles: true, cancelable: true, shiftKey: !!extra.shift }));
}

// Tiny assertion runner: prints one line per test file, exits 1 on any
// failed assertion or any page error from the pages passed to done().
function runner(name) {
  const fails = [], passes = [];
  const T = {
    ok(cond, msg) { (cond ? passes : fails).push(msg); return !!cond; },
    eq(a, b, msg) { const ok = a === b; (ok ? passes : fails).push(ok ? msg : `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); return ok; },
    // Boots once: one DOMContentLoaded, and the first discipline file
    // fetched once (a double boot fetched every bank file twice).
    async booted(t, label = "") {
      T.eq(t.bootCount, 1, `${label}DOMContentLoaded fired once`);
      const n = () => t.statics.get("data/questions_paeds.json") || 0;
      await waitFor(() => n() > 0, 15000, "the bank to start loading").catch(() => {});
      await wait(300);
      T.eq(n(), 1, `${label}the bank is fetched once (questions_paeds.json)`);
    },
    done(...pages) {
      const errs = pages.flatMap(p => p.errors || []);
      console.log(`${name}: ${passes.length} passed, ${fails.length} failed${errs.length ? `, ${errs.length} page error(s)` : ""}`);
      fails.forEach(f => console.log("  FAIL " + f));
      errs.slice(0, 8).forEach(e => console.log("  PAGE " + e.slice(0, 300)));
      process.exit(fails.length || errs.length ? 1 : 0);
    },
  };
  return T;
}

// A test file's top level: any throw is a failure with its stack.
function main(fn) {
  fn().catch(e => { console.log("HARNESS " + (e && e.stack || e)); process.exit(1); });
}

const SIGNED_IN = "f".repeat(64);
const userRoutes = (user, extra = {}) => ({
  "GET /api/me": { body: { ok: true, user } },
  "GET /api/state": { body: { ok: true, history: {}, flags: {}, settings: null } },
  ...extra,
});

module.exports = { boot, startSession, key, runner, main, wait, waitFor, userRoutes, SIGNED_IN, WORKER, REPO, APP, ORIGIN };
