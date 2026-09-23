/* A to E remote inbox + reports + accounts backend.
 *
 * Cloudflare Worker. Endpoints documented inline; routing in `fetch()`.
 *
 * Secrets / vars (set via `wrangler secret put` or the dashboard):
 *   GITHUB_TOKEN     fine-grained PAT, repo: mord58562/a-to-e,
 *                    scope: contents:write
 *   GITHUB_OWNER     "mord58562"
 *   GITHUB_REPO      "a-to-e"
 *   GITHUB_BRANCH    "main"
 *   ALLOW_ORIGIN     "https://mord58562.github.io"  (or "*" for dev)
 *
 * /commit-batch and its ROUTINE_TOKEN were removed 2026-09-23: the
 * scheduled routine publishes through the GitHub MCP, nothing called the
 * endpoint, and its meta.json patch could rewrite the file from {}.
 *
 * Encryption secrets (REQUIRED for /api/register, /api/login, /api/me;
 * the worker refuses to handle account routes if any are missing):
 *   EMAIL_HMAC_KEY   32+ bytes of base64-encoded entropy. Drives the
 *                    deterministic search hash on the users table so
 *                    lookups by email still work without decrypting.
 *   EMAIL_ENC_KEY    32 bytes (= AES-256) of base64-encoded entropy.
 *                    Drives AES-256-GCM envelope encryption of the
 *                    plaintext email at rest.
 *   SESSION_PEPPER   any string. Mixed into the session-token hash so a
 *                    DB dump alone can't be replayed against the worker.
 *
 * Generate them once with:
 *   node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))'
 * Then store with:
 *   wrangler secret put EMAIL_HMAC_KEY
 *   wrangler secret put EMAIL_ENC_KEY
 *   wrangler secret put SESSION_PEPPER
 *
 * NEVER rotate EMAIL_HMAC_KEY or EMAIL_ENC_KEY without a re-encryption
 * script; rotation invalidates every existing row.
 */

import { argon2id } from "@noble/hashes/argon2";

const JSON_HEADERS = { "Content-Type": "application/json" };

// Reject any POST body larger than this to keep the Worker from wasting CPU
// parsing hostile payloads. Legitimate payloads (paste of ~50 questions, audit
// of ~500 kept objects) fit inside this cap comfortably.
const MAX_BODY_BYTES = 1_000_000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    // Body-size cap for POSTs. Not a substitute for per-endpoint rate limits
    // but it prevents an unauth POST from tying up the isolate for seconds.
    if (request.method === "POST") {
      const raw = request.headers.get("Content-Length");
      const len = raw === null ? NaN : Number(raw);
      if (len > MAX_BODY_BYTES) {
        return json({ ok: false, error: "payload too large" }, 413, cors);
      }
      // A chunked request has no Content-Length and a junk header parses
      // to NaN, and both used to sail past the check above, so
      // request.json() would buffer whatever was sent. Without a usable
      // length, read the body here with the cap applied as it streams.
      if (!Number.isFinite(len) && request.body) {
        const capped = await readCapped(request.body, MAX_BODY_BYTES);
        if (capped === null) {
          return json({ ok: false, error: "payload too large" }, 413, cors);
        }
        request = new Request(request.url, { method: request.method, headers: request.headers, body: capped });
      }
    }
    try {
      // Account API: GET allowed for /api/me.
      if (url.pathname === "/api/register" && request.method === "POST") return await handleRegister(request, env, cors);
      if (url.pathname === "/api/login"    && request.method === "POST") return await handleLogin(request, env, cors);
      if (url.pathname === "/api/logout"   && request.method === "POST") return await handleLogout(request, env, cors);
      if (url.pathname === "/api/me"       && request.method === "GET")  return await handleMe(request, env, cors);
      if (url.pathname === "/api/answer"   && request.method === "POST") return await handleAnswer(request, env, cors);
      if (url.pathname === "/api/history"  && request.method === "GET")  return await handleHistory(request, env, cors);
      if (url.pathname === "/api/state"    && request.method === "GET")  return await handleState(request, env, cors);
      if (url.pathname === "/api/flag"     && request.method === "POST") return await handleFlag(request, env, cors);
      if (url.pathname === "/api/settings" && request.method === "POST") return await handleSettings(request, env, cors);
      if (url.pathname === "/api/account/delete" && request.method === "POST") return await handleAccountDelete(request, env, cors);
      if (url.pathname === "/api/admin/users" && request.method === "GET") return await handleAdminListUsers(request, env, cors);
      if (url.pathname.startsWith("/api/admin/users/") && url.pathname.endsWith("/delete") && request.method === "POST") {
        const id = url.pathname.split("/")[4];
        return await handleAdminDeleteUser(request, env, cors, id);
      }
      if (url.pathname.startsWith("/api/admin/users/") && url.pathname.endsWith("/promote") && request.method === "POST") {
        const id = url.pathname.split("/")[4];
        return await handleAdminPromote(request, env, cors, id, true);
      }
      if (url.pathname.startsWith("/api/admin/users/") && url.pathname.endsWith("/demote") && request.method === "POST") {
        const id = url.pathname.split("/")[4];
        return await handleAdminPromote(request, env, cors, id, false);
      }
      if (url.pathname === "/api/admin/quality" && request.method === "GET") return await handleAdminQuality(request, env, cors);
      if (url.pathname === "/api/password" && request.method === "POST") return await handlePasswordChange(request, env, cors);
      if (url.pathname === "/api/account/sessions/revoke" && request.method === "POST") return await handleRevokeSessions(request, env, cors);
      if (url.pathname === "/api/admin/invites" && request.method === "GET") return await handleAdminListInvites(request, env, cors);
      if (url.pathname === "/api/admin/invites" && request.method === "POST") return await handleAdminCreateInvite(request, env, cors);
      if (url.pathname === "/api/admin/invites/revoke" && request.method === "POST") return await handleAdminRevokeInvite(request, env, cors);
      // Existing GitHub-write endpoints (POST only).
      if (request.method !== "POST") {
        return json({ ok: false, error: "POST only" }, 405, cors);
      }
      if (url.pathname === "/paste")        return await handlePaste(request, env, cors);
      if (url.pathname === "/report")       return await handleReport(request, env, cors);
      if (url.pathname === "/apply-audit")           return await handleApplyAudit(request, env, cors);
      if (url.pathname === "/apply-live-audit") return await handleApplyLiveAudit(request, env, cors);
      if (url.pathname === "/apply-report")          return await handleApplyReport(request, env, cors);
      return json({ ok: false, error: "not found" }, 404, cors);
    } catch (e) {
      // Never hand the caller the raw message: requireEncryptionEnv names
      // exactly which secrets are missing, and D1 throws raw SQL. The
      // reference goes in the log and in the response so a report can be
      // matched to a line in `wrangler tail`.
      const ref = randomHex(4);
      console.error("[" + ref + "]", e && e.stack || e);
      return json({ ok: false, error: "server error", ref }, 500, cors);
    }
  },

  /* Cron sweeper. Nothing ever deleted expired sessions or the
   * rate-limit ledger, so both tables grew without bound. Scheduled in
   * wrangler.toml; safe to run as often as you like.
   */
  async scheduled(event, env, ctx) {
    if (!env.DB) return;
    const now = Math.floor(Date.now() / 1000);
    ctx.waitUntil(env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
      env.DB.prepare("DELETE FROM sessions WHERE created_at + ? < ?").bind(SESSION_MAX_AGE_SEC, now),
      // Keep a day of rate-limit history; the longest window is one hour.
      env.DB.prepare("DELETE FROM login_attempts WHERE ts < ?").bind(now - 86400),
      // used_at IS NULL: a redeemed code whose account was later deleted
      // has used_by nulled by the foreign key, and is a record, not junk.
      env.DB.prepare("DELETE FROM invite_codes WHERE used_by IS NULL AND used_at IS NULL AND revoked_at IS NULL AND expires_at IS NOT NULL AND expires_at < ?").bind(now - 86400 * 30),
    ]).catch(err => console.error("scheduled sweep failed:", err && err.stack || err)));
  },
};

// Read a request body stream, giving up (null) once it passes `max` bytes.
async function readCapped(stream, max) {
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      try { await reader.cancel(); } catch {}
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin":  env.ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age":       "86400",
  };
}

/* ── Account + stats API ────────────────────────────────────────────── */

// Sessions slide by SESSION_TTL_SEC on every /api/me, but are never
// refreshed past SESSION_MAX_AGE_SEC from the moment they were issued.
// Without the cap a token copied off a shared laptop worked forever,
// because the client calls /api/me on every page load.
const SESSION_TTL_SEC = 60 * 60 * 24 * 30;   // 30 days, sliding
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 90;  // 90 days, absolute
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Argon2id parameters. RFC 9106 "SECOND RECOMMENDED" profile (m=19456 KB,
// t=2, p=1) lands well inside a Cloudflare Worker invocation budget while
// remaining infeasible to brute-force GPU-side. Memory is the load-bearing
// cost; iteration count is intentionally low so login latency stays under
// ~500 ms even on cold-start.
const ARGON2_PARAMS = { m: 19456, t: 2, p: 1, dkLen: 32, version: 0x13 };
const ARGON2_ALGO_LABEL = "argon2id-v19-m19456-t2-p1";
const LEGACY_PBKDF2_LABEL = "pbkdf2-sha256-100k";
const LEGACY_PBKDF2_ITER = 100000;

// Rate-limit thresholds for /api/login. Window is rolling 15 min; after
// FAIL_THRESHOLD failed attempts inside the window we lock out for
// LOCKOUT_SEC seconds. ok=1 rows do not count toward the threshold but
// are still kept so we can purge cleanly.
const ATTEMPT_WINDOW_SEC = 15 * 60;
const FAIL_THRESHOLD = 8;
const LOCKOUT_SEC = 15 * 60;

// Per-IP budgets, checked BEFORE any Argon2id work. The email-keyed
// lockout above does not stop an attacker rotating fake addresses, and
// every register call and every failed login runs a full m=19456 KB
// hash, so an unlimited endpoint is a CPU amplifier as much as it is a
// spam hole.
const REG_IP_WINDOW_SEC = 60 * 60;
const REG_IP_MAX = 5;
const LOGIN_IP_WINDOW_SEC = 15 * 60;
const LOGIN_IP_MAX = 30;
// POST /api/password, per account: every attempt runs Argon2id.
const PW_CHANGE_WINDOW_SEC = 15 * 60;
const PW_CHANGE_MAX = 10;

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function randomHex(byteCount) {
  const b = new Uint8Array(byteCount);
  crypto.getRandomValues(b);
  return bytesToHex(b);
}
function randomBytes(byteCount) {
  const b = new Uint8Array(byteCount);
  crypto.getRandomValues(b);
  return b;
}
function bytesToBase64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function base64ToBytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
function constantTimeEq(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function requireEncryptionEnv(env) {
  const missing = [];
  if (!env.EMAIL_HMAC_KEY) missing.push("EMAIL_HMAC_KEY");
  if (!env.EMAIL_ENC_KEY)  missing.push("EMAIL_ENC_KEY");
  if (!env.SESSION_PEPPER) missing.push("SESSION_PEPPER");
  if (missing.length) {
    throw new Error(`worker missing secrets: ${missing.join(", ")} - see worker.js header`);
  }
}

// ── password hashing ────────────────────────────────────────────────────
// New rows always use Argon2id. Legacy rows (pbkdf2-sha256-100k) are
// migrated to Argon2id on next successful login.
async function hashPasswordArgon2(password, saltBytes) {
  const enc = new TextEncoder();
  // @noble/hashes argon2id returns a Uint8Array of dkLen bytes.
  const out = argon2id(enc.encode(password), saltBytes, ARGON2_PARAMS);
  return bytesToHex(out);
}
async function hashPasswordLegacyPbkdf2(password, saltHex) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(saltHex), iterations: LEGACY_PBKDF2_ITER, hash: "SHA-256" },
    key, 256
  );
  return bytesToHex(bits);
}
async function verifyPassword(password, row) {
  const algo = row.pw_algo || LEGACY_PBKDF2_LABEL;
  if (algo === ARGON2_ALGO_LABEL) {
    const salt = hexToBytes(row.password_salt);
    const got = await hashPasswordArgon2(password, salt);
    return constantTimeEq(got, row.password_hash);
  }
  // Legacy path.
  const got = await hashPasswordLegacyPbkdf2(password, row.password_salt);
  return constantTimeEq(got, row.password_hash);
}

// ── email encryption ────────────────────────────────────────────────────
async function emailLookup(env, emailLower) {
  // Deterministic HMAC-SHA256 so SELECT ... WHERE email_lookup = ? works.
  const keyBytes = base64ToBytes(env.EMAIL_HMAC_KEY);
  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(emailLower));
  return bytesToHex(sig);
}
async function fieldEncrypt(env, plaintext) {
  // AES-256-GCM with random 12-byte IV. Output = base64(iv || ct || tag).
  const keyBytes = base64ToBytes(env.EMAIL_ENC_KEY);
  if (keyBytes.length !== 32) throw new Error("EMAIL_ENC_KEY must decode to exactly 32 bytes");
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = randomBytes(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext)
  ));
  const packed = new Uint8Array(iv.length + ct.length);
  packed.set(iv, 0); packed.set(ct, iv.length);
  return bytesToBase64(packed);
}
async function fieldDecrypt(env, packedB64) {
  if (!packedB64) return null;
  const keyBytes = base64ToBytes(env.EMAIL_ENC_KEY);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const packed = base64ToBytes(packedB64);
  const iv = packed.slice(0, 12);
  const ct = packed.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// ── session tokens (stored hashed) ─────────────────────────────────────
async function hashSessionToken(env, tokenHex) {
  // SHA-256(token || SESSION_PEPPER). Pepper means a DB dump alone can't
  // be replayed - the attacker also needs the worker secret.
  const data = new TextEncoder().encode(tokenHex + ":" + env.SESSION_PEPPER);
  const h = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(h);
}

async function authUser(request, env) {
  if (!env.DB) return null;
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+([a-f0-9]{32,})$/i);
  if (!m) return null;
  const tokenHash = await hashSessionToken(env, m[1]);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    "SELECT u.id, u.email, u.email_enc, u.display_name, u.is_admin FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?"
  ).bind(tokenHash, now).first();
  if (!row) return null;
  // Prefer the decrypted email; fall back to legacy plaintext column
  // for accounts that haven't logged in since the migration.
  try {
    if (row.email_enc) row.email = await fieldDecrypt(env, row.email_enc);
  } catch { /* fall through to legacy plaintext */ }
  return row;
}

function publicUser(u) {
  return { id: u.id, email: u.email, display_name: u.display_name, is_admin: !!u.is_admin };
}

async function ipHash(request, env) {
  // Best-effort attacker fingerprint, stored only as a salted hash.
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const data = new TextEncoder().encode(ip + ":" + (env.SESSION_PEPPER || ""));
  const h = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(h).slice(0, 32);
}

async function recordAttempt(env, emailLookupHash, ok, ipH) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    "INSERT INTO login_attempts (email_lookup, ts, ok, ip_hash) VALUES (?, ?, ?, ?)"
  ).bind(emailLookupHash, now, ok ? 1 : 0, ipH).run();
  // Opportunistic purge of stale rows for this key.
  await env.DB.prepare(
    "DELETE FROM login_attempts WHERE email_lookup = ? AND ts < ?"
  ).bind(emailLookupHash, now - ATTEMPT_WINDOW_SEC).run();
}

async function isLockedOut(env, emailLookupHash) {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n, MAX(ts) AS last_ts FROM login_attempts WHERE email_lookup = ? AND ok = 0 AND ts > ?"
  ).bind(emailLookupHash, now - ATTEMPT_WINDOW_SEC).first();
  if (!row || row.n < FAIL_THRESHOLD) return 0;
  const unlockAt = row.last_ts + LOCKOUT_SEC;
  return unlockAt > now ? unlockAt - now : 0;
}

// Generic sliding-window counter over login_attempts, keyed by an
// arbitrary synthetic string. Returns true when the caller is over
// budget. Call this before doing expensive work, not after.
async function overBudget(env, key, windowSec, max) {
  if (!env.DB) return false;
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM login_attempts WHERE email_lookup = ? AND ts > ?"
  ).bind(key, now - windowSec).first();
  return !!row && row.n >= max;
}

async function noteAttempt(env, key) {
  if (!env.DB) return;
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    "INSERT INTO login_attempts (email_lookup, ts, ok, ip_hash) VALUES (?, ?, 0, '')"
  ).bind(key, now).run();
}

// ── invite codes ───────────────────────────────────────────────────────
// Registration is invite-only. Codes are stored hashed with the session
// pepper, so a database dump does not yield working codes.
// Codes are issued as XXXX-XXXX-XXXX. A code pasted without the dashes,
// or with spaces, used to hash differently and be refused as invalid.
// Twelve alphanumerics are put back into the issued shape; anything else
// is hashed as typed (upper-cased), which is what matched before.
function normaliseInviteCode(code) {
  const s = String(code || "").trim().toUpperCase();
  const bare = s.replace(/[^A-Z0-9]/g, "");
  return bare.length === 12 ? bare.replace(/(.{4})(?=.)/g, "$1-") : s;
}
async function hashInviteCode(env, code) {
  const data = new TextEncoder().encode(normaliseInviteCode(code) + ":invite:" + env.SESSION_PEPPER);
  return bytesToHex(await crypto.subtle.digest("SHA-256", data));
}

// Crockford-ish alphabet: no I, L, O, U, so a code read aloud or copied
// off a screen cannot be mistyped into a different valid code.
const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
function generateInviteCode() {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  let out = "";
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 8) out += "-";
    out += INVITE_ALPHABET[b[i] % INVITE_ALPHABET.length];
  }
  return out;  // XXXX-XXXX-XXXX, ~59 bits
}

// Every field the auth endpoints read has to be a string before it is
// trimmed or measured. A number threw a TypeError out of the handler as
// a 500, and an object slipped past `password.length < 8` and registered
// an account whose real secret was the string "[object Object]".
function str(v) {
  return typeof v === "string" ? v : "";
}

async function handleRegister(request, env, cors) {
  if (!env.DB) return json({ ok: false, error: "DB not bound" }, 500, cors);
  requireEncryptionEnv(env);
  const body = await request.json().catch(() => null);
  const email = str(body && body.email).trim().toLowerCase();
  const password = str(body && body.password);
  const displayName = str(body && body.display_name).trim().slice(0, 60) || email.split("@")[0];
  const inviteRaw = str(body && body.invite_code).trim().toUpperCase();

  // Per-IP budget first, before the email lookup and long before Argon2id.
  const regIpKey = "reg:" + await ipHash(request, env);
  if (await overBudget(env, regIpKey, REG_IP_WINDOW_SEC, REG_IP_MAX)) {
    return json({ ok: false, error: "too many sign-up attempts, try again later" }, 429, cors);
  }
  await noteAttempt(env, regIpKey);

  if (!EMAIL_RE.test(email)) return json({ ok: false, error: "invalid email" }, 400, cors);
  if (password.length < 8) return json({ ok: false, error: "password must be 8+ characters" }, 400, cors);
  if (password.length > 1024) return json({ ok: false, error: "password too long" }, 400, cors);
  if (!inviteRaw) return json({ ok: false, error: "an invite code is required" }, 400, cors);

  // Redeem the invite before touching the users table. One generic error
  // for every failure mode, so a stranger cannot probe which codes exist.
  const inviteHash = await hashInviteCode(env, inviteRaw);
  const nowTs = Math.floor(Date.now() / 1000);
  const invite = await env.DB.prepare(
    "SELECT code_hash, expires_at, used_by, used_at, revoked_at FROM invite_codes WHERE code_hash = ?"
  ).bind(inviteHash).first();
  // used_at as well as used_by: the used_by foreign key is ON DELETE SET
  // NULL, so deleting the account a code created put the code back into
  // circulation. An invited user could delete and re-register on the same
  // code indefinitely, or hand it on. used_at is the tombstone that
  // survives the cascade.
  if (!invite || invite.used_by || invite.used_at || invite.revoked_at ||
      (invite.expires_at && invite.expires_at < nowTs)) {
    return json({ ok: false, error: "that invite code is not valid" }, 403, cors);
  }

  let isAdmin = 0;

  const lookup = await emailLookup(env, email);
  // Block both the migrated lookup column AND the legacy plaintext column
  // so an in-flight migration can't double-register the same address.
  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE email_lookup = ? OR email = ?"
  ).bind(lookup, email).first();
  if (existing) return json({ ok: false, error: "email already registered" }, 409, cors);

  const id = crypto.randomUUID();
  const saltBytes = randomBytes(16);
  const saltHex = bytesToHex(saltBytes);
  const hash = await hashPasswordArgon2(password, saltBytes);
  const emailEnc = await fieldEncrypt(env, email);
  const now = Math.floor(Date.now() / 1000);
  // The legacy `email` column still has a UNIQUE constraint; we keep it
  // populated with the deterministic lookup hash so it stays unique
  // without storing plaintext. Once schema_003 drops the column this
  // line can be removed.
  // Create the account, burn the code and open the session as ONE batch
  // (a single D1 transaction), with the user INSERT itself conditional on
  // the code still being redeemable at that instant.
  //
  // This used to be three separate writes: insert the user, then a
  // guarded burn, then on a lost race a compensating DELETE of the user.
  // If that DELETE failed (a D1 error, the isolate dying after the Argon2
  // pass) the loser got a 500 but kept a committed account it could sign
  // in to, so one code yielded two accounts. Now a registration that
  // loses the race writes nothing at all, and there is nothing to undo.
  //
  // The WHERE repeats every validity test, not just used_by, so a code
  // revoked or expired between the SELECT above and this write cannot
  // still be redeemed by the in-flight registration.
  const INVITE_REDEEMABLE =
    "code_hash = ? AND used_by IS NULL AND used_at IS NULL AND revoked_at IS NULL " +
    "AND (expires_at IS NULL OR expires_at >= ?)";
  const tokenHex = randomHex(32);
  const tokenH = await hashSessionToken(env, tokenHex);
  // A UNIQUE violation on email_lookup means someone registered the same
  // address in the window between the SELECT above and this write - a
  // double-tapped sign-up button is enough, because Argon2id sits in the
  // middle of it. That aborts the batch and used to surface as a 500 for
  // an account that does in fact exist.
  let results;
  try {
    results = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO users (id, email, email_lookup, email_enc, password_hash, password_salt, pw_algo, display_name, is_admin, created_at, invited_via, last_seen_at) " +
        "SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM invite_codes WHERE " + INVITE_REDEEMABLE + ")"
      ).bind(id, "enc:" + lookup.slice(0, 32), lookup, emailEnc, hash, saltHex, ARGON2_ALGO_LABEL, displayName, isAdmin, now, invite.code_hash, now,
             invite.code_hash, nowTs),
      env.DB.prepare(
        // code_enc goes with the redemption: a spent code has nothing left
        // to show an admin, so it should not stay recoverable.
        "UPDATE invite_codes SET used_by = ?, used_at = ?, code_enc = NULL WHERE " + INVITE_REDEEMABLE +
        " AND EXISTS (SELECT 1 FROM users WHERE id = ?)"
      ).bind(id, now, invite.code_hash, nowTs, id),
      env.DB.prepare(
        "INSERT INTO sessions (token, token_hash, user_id, created_at, expires_at) " +
        "SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM users WHERE id = ?)"
      ).bind("h:" + tokenH.slice(0, 24), tokenH, id, now, now + SESSION_TTL_SEC, id),
    ]);
  } catch (e) {
    if (/UNIQUE|constraint/i.test(String(e && e.message))) {
      return json({ ok: false, error: "that email is already registered" }, 409, cors);
    }
    throw e;
  }
  const changed = (r) => (r && r.meta && r.meta.changes) || 0;
  if (changed(results[0]) !== 1 || changed(results[1]) !== 1 || changed(results[2]) !== 1) {
    return json({ ok: false, error: "that invite code is not valid" }, 403, cors);
  }

  return json({ ok: true, token: tokenHex, user: publicUser({ id, email, display_name: displayName, is_admin: isAdmin }) }, 200, cors);
}


async function handleLogin(request, env, cors) {
  if (!env.DB) return json({ ok: false, error: "DB not bound" }, 500, cors);
  requireEncryptionEnv(env);
  const body = await request.json().catch(() => null);
  const email = str(body && body.email).trim().toLowerCase();
  const password = str(body && body.password);
  if (!email || !password) return json({ ok: false, error: "email + password required" }, 400, cors);
  if (password.length > 1024) return json({ ok: false, error: "password too long" }, 400, cors);

  // Per-IP budget before the email lookup. The per-email lockout below
  // is bypassed entirely by rotating addresses, and the miss path runs
  // a full Argon2id pass on purpose, so this guard is what stops a
  // script pinning the isolate.
  const loginIpKey = "ip:" + await ipHash(request, env);
  if (await overBudget(env, loginIpKey, LOGIN_IP_WINDOW_SEC, LOGIN_IP_MAX)) {
    return json({ ok: false, error: "too many attempts, try again later" }, 429, cors);
  }
  await noteAttempt(env, loginIpKey);

  const lookup = await emailLookup(env, email);
  const lockSecondsLeft = await isLockedOut(env, lookup);
  if (lockSecondsLeft > 0) {
    return json({ ok: false, error: `too many failed attempts; try again in ${Math.ceil(lockSecondsLeft / 60)} min` }, 429, cors);
  }
  const ipH = await ipHash(request, env);

  // Try the migrated column first; fall back to legacy plaintext email
  // for rows that pre-date schema_002.
  let row = await env.DB.prepare(
    "SELECT id, email, email_enc, password_hash, password_salt, pw_algo, display_name, is_admin FROM users WHERE email_lookup = ?"
  ).bind(lookup).first();
  if (!row) {
    row = await env.DB.prepare(
      "SELECT id, email, email_enc, password_hash, password_salt, pw_algo, display_name, is_admin FROM users WHERE email = ?"
    ).bind(email).first();
  }

  // Constant-ish time: even on miss, do a full Argon2id pass against a
  // throwaway salt so timing leaks user existence as little as possible.
  // We discard the result on the miss path.
  let ok = false;
  if (row) {
    ok = await verifyPassword(password, row);
  } else {
    await hashPasswordArgon2(password, randomBytes(16));
  }

  if (!row || !ok) {
    await recordAttempt(env, lookup, false, ipH);
    return json({ ok: false, error: "invalid credentials" }, 401, cors);
  }

  await recordAttempt(env, lookup, true, ipH);
  // A correct password clears this address's failures. isLockedOut counts
  // ok = 0 rows only, so without this, 7 typos then a success then one
  // retry from a device still holding the old password locked the
  // account for 15 minutes straight after a good sign-in.
  //
  // The per-IP budget is refunded only for this address's own failures
  // from this IP, never wiped. Wiping it let anyone holding one valid
  // account spray 29 guesses across other addresses, sign in to their own,
  // and get the full budget back. The refund is bounded by the per-email
  // lockout, so it cannot be farmed into extra guesses at other accounts.
  const nowSec = Math.floor(Date.now() / 1000);
  const own = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM login_attempts WHERE email_lookup = ? AND ok = 0 AND ip_hash = ? AND ts > ?"
  ).bind(lookup, ipH, nowSec - LOGIN_IP_WINDOW_SEC).first();
  const refund = Math.min((own && own.n) || 0, FAIL_THRESHOLD);
  const clears = [
    env.DB.prepare("DELETE FROM login_attempts WHERE email_lookup = ? AND ok = 0").bind(lookup),
  ];
  if (refund > 0) {
    clears.push(env.DB.prepare(
      "DELETE FROM login_attempts WHERE rowid IN (SELECT rowid FROM login_attempts WHERE email_lookup = ? AND ts > ? ORDER BY ts DESC LIMIT ?)"
    ).bind("ip:" + ipH, nowSec - LOGIN_IP_WINDOW_SEC, refund));
  }
  await env.DB.batch(clears);

  // Lazy migration: if this account is still on legacy hashing /
  // plaintext email, upgrade it now that we have the password in hand.
  try {
    if (row.pw_algo !== ARGON2_ALGO_LABEL) {
      const newSaltBytes = randomBytes(16);
      const newHash = await hashPasswordArgon2(password, newSaltBytes);
      const emailEnc = await fieldEncrypt(env, email);
      await env.DB.prepare(
        "UPDATE users SET password_hash = ?, password_salt = ?, pw_algo = ?, email_lookup = ?, email_enc = ?, email = ? WHERE id = ?"
      ).bind(newHash, bytesToHex(newSaltBytes), ARGON2_ALGO_LABEL, lookup, emailEnc, "enc:" + lookup.slice(0, 32), row.id).run();
      row.email_enc = emailEnc;
    } else if (!row.email_enc) {
      // Argon2-hashed but missing email encryption (shouldn't happen post-002, but defensive).
      const emailEnc = await fieldEncrypt(env, email);
      await env.DB.prepare(
        "UPDATE users SET email_lookup = ?, email_enc = ?, email = ? WHERE id = ?"
      ).bind(lookup, emailEnc, "enc:" + lookup.slice(0, 32), row.id).run();
      row.email_enc = emailEnc;
    }
  } catch (e) {
    // Migration failure is non-fatal - the user still gets logged in;
    // we'll retry on their next login.
  }

  const now = Math.floor(Date.now() / 1000);
  const tokenHex = randomHex(32);
  const tokenH = await hashSessionToken(env, tokenHex);
  await env.DB.prepare(
    "INSERT INTO sessions (token, token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)"
  ).bind("h:" + tokenH.slice(0, 24), tokenH, row.id, now, now + SESSION_TTL_SEC).run();

  // Return the decrypted email in the user object so the UI shows the
  // real address rather than the placeholder we stash in the legacy
  // column.
  return json({ ok: true, token: tokenHex, user: publicUser({ id: row.id, email, display_name: row.display_name, is_admin: row.is_admin }) }, 200, cors);
}

async function handleMe(request, env, cors) {
  const user = await authUser(request, env);
  if (!user) return json({ ok: false, error: "not authenticated" }, 401, cors);
  // Sliding session: bump the current token's expiry on every /api/me call.
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+([a-f0-9]{32,})$/i);
  if (m) {
    const tokenH = await hashSessionToken(env, m[1]);
    const now = Math.floor(Date.now() / 1000);
    // Slide the expiry, but never past created_at + SESSION_MAX_AGE_SEC.
    // min() is what makes the 90-day cap absolute rather than advisory.
    await env.DB.prepare(
      "UPDATE sessions SET expires_at = MIN(?, created_at + ?) WHERE token_hash = ?"
    ).bind(now + SESSION_TTL_SEC, SESSION_MAX_AGE_SEC, tokenH).run();
    await env.DB.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?")
      .bind(now, user.id).run();
  }
  return json({ ok: true, user: publicUser(user) }, 200, cors);
}

async function handleLogout(request, env, cors) {
  // Best-effort: if a Bearer token is present, drop the matching session row so
  // the token can't be replayed even if it leaks. Silent on no-token / bad-token.
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+([a-f0-9]{32,})$/i);
  if (m && env.DB) {
    try {
      const tokenH = await hashSessionToken(env, m[1]);
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenH).run();
    } catch { /* swallow; client will clear its local token anyway */ }
  }
  return json({ ok: true }, 200, cors);
}

async function handleAccountDelete(request, env, cors) {
  const user = await authUser(request, env);
  if (!user) return json({ ok: false, error: "not authenticated" }, 401, cors);
  // Admin delete and demote already refused to remove the last admin;
  // self-delete did not, and registration is invite-only, so the last
  // admin deleting their own account left nobody able to let anyone in.
  const lastAdminMsg = "You are the last admin. Promote someone else before deleting this account.";
  if (user.is_admin && !(await hasAnotherAdmin(env, user.id))) {
    return json({ ok: false, error: lastAdminMsg }, 409, cors);
  }
  if (!(await deleteUserGuarded(env, user.id))) {
    // The guard in the DELETE lost a race with another admin removal.
    return json({ ok: false, error: lastAdminMsg }, 409, cors);
  }
  return json({ ok: true }, 200, cors);
}

// Deletes a user and every per-user row in one batch. The users row goes
// first, and only while another admin remains if this one is an admin:
// the check sits inside the DELETE, so two admins removing each other at
// the same moment cannot both pass it, which a SELECT-then-DELETE allowed.
// The per-user deletes run only once the users row is gone, so a refused
// delete leaves the account intact. D1 ignores ON DELETE CASCADE unless
// PRAGMA foreign_keys is set, so each table is cleared by hand.
// Returns true when the account was deleted.
async function deleteUserGuarded(env, id) {
  const gone = "NOT EXISTS (SELECT 1 FROM users WHERE id = ?)";
  const res = await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM users WHERE id = ? AND (is_admin = 0 OR EXISTS (SELECT 1 FROM users WHERE is_admin = 1 AND id != ?))"
    ).bind(id, id),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ? AND ${gone}`).bind(id, id),
    env.DB.prepare(`DELETE FROM answers WHERE user_id = ? AND ${gone}`).bind(id, id),
    env.DB.prepare(`DELETE FROM flags WHERE user_id = ? AND ${gone}`).bind(id, id),
    env.DB.prepare(`DELETE FROM user_settings WHERE user_id = ? AND ${gone}`).bind(id, id),
  ]);
  return !!(res && res[0] && res[0].meta && res[0].meta.changes === 1);
}

async function handleAdminListUsers(request, env, cors) {
  const user = await authUser(request, env);
  if (!user || !user.is_admin) return json({ ok: false, error: "admin required" }, 403, cors);
  const { results } = await env.DB.prepare(
    "SELECT u.id, u.email, u.email_enc, u.display_name, u.is_admin, u.created_at, " +
    "u.last_seen_at, u.invited_via, COUNT(a.question_id) AS answers " +
    "FROM users u LEFT JOIN answers a ON a.user_id = u.id GROUP BY u.id ORDER BY u.created_at DESC"
  ).all();
  // Decrypt every email_enc in flight. Rows that pre-date migration still
  // have their plaintext in the legacy `email` column; we use that
  // verbatim so the admin UI keeps working through the rollover.
  const out = [];
  for (const r of (results || [])) {
    let email = r.email;
    if (r.email_enc) {
      try { email = await fieldDecrypt(env, r.email_enc); } catch {}
    }
    // last_seen_at is written on every /api/me but was never selected,
    // so the panel showed "never" for an account that signed in a
    // minute ago.
    out.push({ id: r.id, email, display_name: r.display_name, is_admin: r.is_admin,
               created_at: r.created_at, last_seen_at: r.last_seen_at,
               invited_via: r.invited_via, answers: r.answers });
  }
  return json({ ok: true, users: out }, 200, cors);
}

async function handleAdminDeleteUser(request, env, cors, targetId) {
  const user = await authUser(request, env);
  if (!user || !user.is_admin) return json({ ok: false, error: "admin required" }, 403, cors);
  if (!targetId || typeof targetId !== "string") return json({ ok: false, error: "missing user id" }, 400, cors);
  if (targetId === user.id) return json({ ok: false, error: "use /api/account/delete to remove your own account" }, 400, cors);
  // Refuse to remove the last remaining admin, so the instance cannot be
  // left with nobody who can administer it.
  const target = await env.DB.prepare("SELECT is_admin FROM users WHERE id = ?").bind(targetId).first();
  if (!target) return json({ ok: false, error: "no such user" }, 404, cors);
  if (target.is_admin && !(await hasAnotherAdmin(env, targetId))) {
    return json({ ok: false, error: "that is the last admin account" }, 409, cors);
  }
  if (!(await deleteUserGuarded(env, targetId))) {
    // Gone already, or a concurrent removal took the other admin.
    const still = await env.DB.prepare("SELECT is_admin FROM users WHERE id = ?").bind(targetId).first();
    if (!still) return json({ ok: false, error: "no such user" }, 404, cors);
    return json({ ok: false, error: "that is the last admin account" }, 409, cors);
  }
  return json({ ok: true }, 200, cors);
}

async function handleAdminPromote(request, env, cors, targetId, makeAdmin) {
  const user = await authUser(request, env);
  if (!user || !user.is_admin) return json({ ok: false, error: "admin required" }, 403, cors);
  if (!targetId) return json({ ok: false, error: "missing user id" }, 400, cors);
  if (targetId === user.id && !makeAdmin) return json({ ok: false, error: "cannot demote yourself" }, 400, cors);
  if (!makeAdmin && !(await hasAnotherAdmin(env, targetId))) {
    return json({ ok: false, error: "that is the last admin account" }, 409, cors);
  }
  if (makeAdmin) {
    const res = await env.DB.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").bind(targetId).run();
    if (!res.meta || res.meta.changes !== 1) return json({ ok: false, error: "no such user" }, 404, cors);
    return json({ ok: true }, 200, cors);
  }
  // The check above is advisory. Two admins demoting each other at once
  // both passed it and both writes landed, leaving no admin; the guard
  // inside this UPDATE is evaluated atomically, so the second one fails.
  const res = await env.DB.prepare(
    "UPDATE users SET is_admin = 0 WHERE id = ? AND (is_admin = 0 OR EXISTS (SELECT 1 FROM users WHERE is_admin = 1 AND id != ?))"
  ).bind(targetId, targetId).run();
  if (!res.meta || res.meta.changes !== 1) {
    const still = await env.DB.prepare("SELECT is_admin FROM users WHERE id = ?").bind(targetId).first();
    if (!still) return json({ ok: false, error: "no such user" }, 404, cors);
    return json({ ok: false, error: "that is the last admin account" }, 409, cors);
  }
  return json({ ok: true }, 200, cors);
}

// True when at least one admin exists other than `exceptId`. Every
// demote and every admin or self delete checks this first for a clear
// answer; the writes themselves carry the same guard (deleteUserGuarded,
// the demote UPDATE), so a race cannot leave zero administrators.
async function hasAnotherAdmin(env, exceptId) {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM users WHERE is_admin = 1 AND id != ?"
  ).bind(exceptId).first();
  return !!row && row.n > 0;
}

/* POST /api/password - change your own password.
 *
 * Requires the current password, not just a bearer token: a stolen token
 * should not be enough to lock the real owner out. Every other session
 * is revoked on success, which is what makes this useful after a leak.
 */
async function handlePasswordChange(request, env, cors) {
  const user = await authUser(request, env);
  if (!user) return json({ ok: false, error: "not authenticated" }, 401, cors);
  const body = await request.json().catch(() => null);
  // str(), as on register and login: `{"new_password": {}}` passed the
  // length check (undefined < 8 is false) and set the password to the
  // literal "[object Object]".
  const current = str(body && body.current_password);
  const next = str(body && body.new_password);
  if (next.length < 8) return json({ ok: false, error: "new password must be 8+ characters" }, 400, cors);
  if (next.length > 1024 || current.length > 1024) return json({ ok: false, error: "password too long" }, 400, cors);

  // Budget before the Argon2id pass. With none, a stolen bearer token
  // could guess the current password as fast as the worker answered,
  // each guess costing a full Argon2id run.
  const pwKey = "pw:" + user.id;
  if (await overBudget(env, pwKey, PW_CHANGE_WINDOW_SEC, PW_CHANGE_MAX)) {
    return json({ ok: false, error: "too many attempts, try again later" }, 429, cors);
  }
  await noteAttempt(env, pwKey);

  const row = await env.DB.prepare(
    "SELECT password_hash, password_salt, pw_algo FROM users WHERE id = ?"
  ).bind(user.id).first();
  if (!row || !(await verifyPassword(current, row))) {
    return json({ ok: false, error: "current password is wrong" }, 403, cors);
  }

  const saltBytes = randomBytes(16);
  const hash = await hashPasswordArgon2(next, saltBytes);
  const now = Math.floor(Date.now() / 1000);
  const tokenHex = randomHex(32);
  const tokenH = await hashSessionToken(env, tokenHex);
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ?, pw_algo = ? WHERE id = ?")
      .bind(hash, bytesToHex(saltBytes), ARGON2_ALGO_LABEL, user.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id),
    env.DB.prepare("INSERT INTO sessions (token, token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
      .bind("h:" + tokenH.slice(0, 24), tokenH, user.id, now, now + SESSION_TTL_SEC),
  ]);
  // The caller's old token died with the rest; hand back a fresh one so
  // they are not signed out of the tab they just changed it in.
  return json({ ok: true, token: tokenHex }, 200, cors);
}

/* POST /api/account/sessions/revoke - sign out everywhere.
 * Keeps the calling session alive so the admin is not locked out of the
 * page they clicked it on.
 */
async function handleRevokeSessions(request, env, cors) {
  const user = await authUser(request, env);
  if (!user) return json({ ok: false, error: "not authenticated" }, 401, cors);
  const m = (request.headers.get("Authorization") || "").match(/^Bearer\s+([a-f0-9]{32,})$/i);
  const keep = m ? await hashSessionToken(env, m[1]) : "";
  const res = await env.DB.prepare(
    // token_hash IS NULL too: pre-schema_002 rows have no hash, and in SQL
    // NULL != 'x' is NULL, not true, so they survived and the count
    // reported back was short.
    "DELETE FROM sessions WHERE user_id = ? AND (token_hash IS NULL OR token_hash != ?)"
  ).bind(user.id, keep).run();
  return json({ ok: true, revoked: (res.meta && res.meta.changes) || 0 }, 200, cors);
}

/* Invite codes. Registration is invite-only, so these are the admin's
 * only way to let a new person in.
 */
async function handleAdminListInvites(request, env, cors) {
  const user = await authUser(request, env);
  if (!user || !user.is_admin) return json({ ok: false, error: "admin required" }, 403, cors);
  const rows = await env.DB.prepare(
    `SELECT i.code_hash, i.code_hint, i.code_enc, i.label, i.created_at, i.expires_at,
            i.used_at, i.revoked_at, u.display_name AS used_by_name
     FROM invite_codes i LEFT JOIN users u ON u.id = i.used_by
     WHERE i.revoked_at IS NULL
     ORDER BY (i.used_at IS NULL) DESC, i.created_at DESC
     LIMIT 200`
  ).all();
  // A code the admin cannot read is a code they cannot send. It is held
  // encrypted rather than hashed for exactly this, and only a live code
  // is ever decrypted: a spent or revoked one has nothing to give and no
  // reason to leave the database.
  const now = Math.floor(Date.now() / 1000);
  const invites = [];
  for (const r of rows.results || []) {
    const live = !r.used_at && !r.revoked_at && (!r.expires_at || r.expires_at >= now);
    const { code_enc, ...rest } = r;
    if (live && code_enc) {
      try { rest.code = await fieldDecrypt(env, code_enc); } catch (_) { /* older key, hint only */ }
    }
    invites.push(rest);
  }
  return json({ ok: true, invites }, 200, cors);
}

async function handleAdminCreateInvite(request, env, cors) {
  const user = await authUser(request, env);
  if (!user || !user.is_admin) return json({ ok: false, error: "admin required" }, 403, cors);
  requireEncryptionEnv(env);
  const body = await request.json().catch(() => null);
  const label = str(body && body.label).trim().slice(0, 80);
  const days = Math.min(365, Math.max(1, parseInt((body && body.expires_days) || 30, 10) || 30));
  const code = generateInviteCode();
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    "INSERT INTO invite_codes (code_hash, code_hint, code_enc, label, created_by, created_at, expires_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(await hashInviteCode(env, code), code.slice(0, 4), await fieldEncrypt(env, code),
         label, user.id, now, now + days * 86400).run();
  // Redemption still matches on the hash, so a database dump on its own
  // redeems nothing without the worker's pepper. The encrypted copy is
  // what lets the admin read back a code they issued last week, and it
  // needs the encryption key, which is not in the database either.
  return json({ ok: true, code, expires_at: now + days * 86400 }, 200, cors);
}

async function handleAdminRevokeInvite(request, env, cors) {
  const user = await authUser(request, env);
  if (!user || !user.is_admin) return json({ ok: false, error: "admin required" }, 403, cors);
  const body = await request.json().catch(() => null);
  const codeHash = (body && body.code_hash) || "";
  if (!/^[a-f0-9]{64}$/.test(codeHash)) return json({ ok: false, error: "bad code" }, 400, cors);
  const res = await env.DB.prepare(
    "UPDATE invite_codes SET revoked_at = ?, code_enc = NULL " +
    "WHERE code_hash = ? AND used_by IS NULL AND used_at IS NULL AND revoked_at IS NULL"
  ).bind(Math.floor(Date.now() / 1000), codeHash).run();
  if (!res.meta || res.meta.changes !== 1) return json({ ok: false, error: "already used or revoked" }, 409, cors);
  return json({ ok: true }, 200, cors);
}

async function handleAdminQuality(request, env, cors) {
  const user = await authUser(request, env);
  if (!user || !user.is_admin) return json({ ok: false, error: "admin required" }, 403, cors);
  // Worst-performing questions: at least 5 answers, lowest correct-rate first.
  const { results: worst } = await env.DB.prepare(
    "SELECT question_id, COUNT(*) AS n, SUM(correct) AS c FROM answers GROUP BY question_id HAVING n >= 5 ORDER BY (1.0 * c / n) ASC, n DESC LIMIT 50"
  ).all();
  // Most-answered (engagement signal).
  const { results: top } = await env.DB.prepare(
    "SELECT question_id, COUNT(*) AS n, SUM(correct) AS c FROM answers GROUP BY question_id ORDER BY n DESC LIMIT 25"
  ).all();
  const totals = await env.DB.prepare("SELECT COUNT(DISTINCT question_id) AS qs, COUNT(*) AS answers, COUNT(DISTINCT user_id) AS users FROM answers").first();
  return json({ ok: true, worst, top, totals }, 200, cors);
}

async function handleAnswer(request, env, cors) {
  const user = await authUser(request, env);
  if (!user) return json({ ok: false, error: "not authenticated" }, 401, cors);
  const body = await request.json().catch(() => null);
  const qid = body && body.question_id;
  const srcLetter = body && body.source_letter;
  const correct = body && body.correct ? 1 : 0;
  if (typeof qid !== "string" || !/^[A-Za-z0-9_\-]+$/.test(qid) || qid.length > 200) {
    return json({ ok: false, error: "bad question_id" }, 400, cors);
  }
  // String.includes is a SUBSTRING test, so the old check passed "",
  // "AB", "BCD" and "ABCDE" straight into a TEXT NOT NULL column that
  // exists so cross-user aggregates compare like for like. The rows are
  // upserted, so a junk value stuck until the user answered again.
  if (typeof srcLetter !== "string" || srcLetter.length !== 1 || !"ABCDE".includes(srcLetter)) {
    return json({ ok: false, error: "source_letter must be a single letter A-E" }, 400, cors);
  }
  const now = Math.floor(Date.now() / 1000);
  // A client replaying its offline outbox sends `at` (ms, when the answer
  // was given) and `n` (attempts not yet posted). Clamped: never in the
  // future, never older than 90 days, n between 1 and 50. A live post
  // sends neither and behaves as before.
  const atRaw = Number(body && body.at);
  const at = Number.isFinite(atRaw) && atRaw > 0
    ? Math.max(now - 90 * 86400, Math.min(now, Math.floor(atRaw / 1000)))
    : now;
  const nRaw = parseInt(body && body.n, 10);
  const n = Number.isFinite(nRaw) ? Math.max(1, Math.min(50, nRaw)) : 1;
  // UPSERT: re-attempts MUST update the latest correctness + bump the
  // attempt counter + advance updated_at. INSERT-OR-IGNORE froze every
  // (user, question) at its first attempt and broke cross-device sync
  // when the user re-answered on another device. A replayed answer older
  // than the stored one adds its attempts but does not overwrite the
  // newer correctness.
  await env.DB.prepare(
    `INSERT INTO answers (user_id, question_id, source_letter, correct, ts, updated_at, attempt_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, question_id) DO UPDATE SET
       source_letter = CASE WHEN excluded.ts >= answers.ts THEN excluded.source_letter ELSE answers.source_letter END,
       correct       = CASE WHEN excluded.ts >= answers.ts THEN excluded.correct ELSE answers.correct END,
       ts            = MAX(answers.ts, excluded.ts),
       updated_at    = excluded.updated_at,
       attempt_count = answers.attempt_count + excluded.attempt_count`
  ).bind(user.id, qid, srcLetter, correct, at, now, n).run();

  return json({ ok: true }, 200, cors);
}

/* /api/history: returns the signed-in user's answered question_ids so
 * the client can hydrate cross-device. Each row carries the last-seen
 * correctness, attempt count, and timestamp so the Unseen / Previously-
 * incorrect filters AND per-Q attempt counters survive a fresh browser. */
async function handleHistory(request, env, cors) {
  const user = await authUser(request, env);
  if (!user) return json({ ok: false, error: "not authenticated" }, 401, cors);
  const history = await readHistory(env, user.id);
  return json({ ok: true, history }, 200, cors);
}

// One row per question the user has answered. Capped well above the size
// of the bank: without a limit, a client that posted fabricated question
// ids could grow this past what /api/state can serialise inside the
// isolate's memory, and take its own account down with it.
const MAX_HISTORY_ROWS = 20000;

async function readHistory(env, userId) {
  const rows = await env.DB.prepare(
    "SELECT question_id, correct, ts, attempt_count, updated_at FROM answers " +
    "WHERE user_id = ? ORDER BY ts DESC LIMIT ?"
  ).bind(userId, MAX_HISTORY_ROWS).all();
  const history = {};
  for (const r of (rows.results || [])) {
    history[r.question_id] = {
      lastCorrect: !!r.correct,
      count: r.attempt_count || 1,
      last_at: (r.ts || 0) * 1000,
      // Milliseconds, like last_at. It was seconds, sitting next to a
      // millisecond field in the same record, which is a trap for the
      // first caller that compares them.
      updated_at: (r.updated_at || r.ts || 0) * 1000,
    };
  }
  return history;
}

/* /api/state: single round-trip hydration. Returns the user's history,
 * flags, and settings so the new device has the full picture before
 * first paint. */
async function handleState(request, env, cors) {
  const user = await authUser(request, env);
  if (!user) return json({ ok: false, error: "not authenticated" }, 401, cors);
  const [history, flags, settings] = await Promise.all([
    readHistory(env, user.id),
    readFlags(env, user.id),
    readSettings(env, user.id),
  ]);
  return json({ ok: true, history, flags, settings }, 200, cors);
}

async function readFlags(env, userId) {
  const rows = await env.DB.prepare(
    "SELECT question_id, updated_at FROM flags WHERE user_id = ? " +
    "ORDER BY updated_at DESC LIMIT ?"
  ).bind(userId, MAX_HISTORY_ROWS).all();
  const out = {};
  for (const r of (rows.results || [])) out[r.question_id] = true;
  return out;
}

async function readSettings(env, userId) {
  const row = await env.DB.prepare(
    "SELECT settings FROM user_settings WHERE user_id = ?"
  ).bind(userId).first();
  if (!row || !row.settings) return null;
  try { return JSON.parse(row.settings); } catch { return null; }
}

/* /api/flag: body { question_id, on } - toggles a per-user star. */
async function handleFlag(request, env, cors) {
  const user = await authUser(request, env);
  if (!user) return json({ ok: false, error: "not authenticated" }, 401, cors);
  const body = await request.json().catch(() => null);
  const qid = body && body.question_id;
  const on  = !!(body && body.on);
  if (typeof qid !== "string" || !/^[A-Za-z0-9_\-]+$/.test(qid) || qid.length > 200) {
    return json({ ok: false, error: "bad question_id" }, 400, cors);
  }
  const now = Math.floor(Date.now() / 1000);
  if (on) {
    await env.DB.prepare(
      `INSERT INTO flags (user_id, question_id, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, question_id) DO UPDATE SET updated_at = excluded.updated_at`
    ).bind(user.id, qid, now).run();
  } else {
    await env.DB.prepare(
      "DELETE FROM flags WHERE user_id = ? AND question_id = ?"
    ).bind(user.id, qid).run();
  }
  return json({ ok: true, on }, 200, cors);
}

/* /api/settings: body { settings: {...} } - overwrites the user's
 * settings blob. We trust the client to send the full settings object;
 * partial updates would race in multi-device scenarios. */
async function handleSettings(request, env, cors) {
  const user = await authUser(request, env);
  if (!user) return json({ ok: false, error: "not authenticated" }, 401, cors);
  const body = await request.json().catch(() => null);
  const settings = body && body.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return json({ ok: false, error: "settings object required" }, 400, cors);
  }
  const serialized = JSON.stringify(settings);
  if (serialized.length > 10000) {
    return json({ ok: false, error: "settings too large" }, 400, cors);
  }
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO user_settings (user_id, settings, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       settings = excluded.settings,
       updated_at = excluded.updated_at`
  ).bind(user.id, serialized, now).run();
  return json({ ok: true }, 200, cors);
}

function json(obj, status, extraHeaders) {
  // Defense-in-depth headers on every JSON response. Bearer-token auth
  // means we never set cookies, so HttpOnly/Secure/SameSite don't apply
  // here - the token sits in the SPA's localStorage and is sent as an
  // Authorization header (NOT a query param, NOT a cookie). Trade-off:
  // localStorage is exposed to XSS but immune to CSRF. The SPA mitigates
  // XSS by avoiding innerHTML on untrusted strings and serving from a
  // static GitHub Pages origin with a tight CSP at the page level.
  const security = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Cache-Control": "no-store",
  };
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...JSON_HEADERS, ...security, ...(extraHeaders || {}) },
  });
}

/* ── /paste ──────────────────────────────────────────────────────────── */

async function handlePaste(request, env, cors) {
  const user = await authUser(request, env);
  if (!user || !user.is_admin) {
    return json({ ok: false, error: "admin session required" }, 401, cors);
  }
  const body = await request.json().catch(() => null);
  const questions = body && body.questions;
  if (!Array.isArray(questions) || !questions.length) {
    return json({ ok: false, error: "expected non-empty `questions` array" }, 400, cors);
  }
  // Stamp every pasted question with the user-supplied model attribution
  // (best-effort - the user picks from a dropdown in the paste UI).
  if (body.model) {
    for (const q of questions) {
      if (q && typeof q === "object" && !q.model) q.model = body.model;
    }
  }

  const stamp = utcStamp();
  const shortId = randomId(4);
  const filename = `pasted-${stamp}-${shortId}.json`;
  const inboxPath = `data/inbox/${filename}`;
  const fileContent = JSON.stringify(questions, null, 2) + "\n";

  // 1. Create the inbox file.
  await ghPutFile(env, inboxPath, fileContent, `Add ${questions.length} pasted question(s) via web`);

  // 2. Append to inbox_manifest.json.
  await ghAppendManifest(env, "data/inbox_manifest.json", "inbox", `inbox/${filename}`);

  return json({
    ok: true,
    saved: `inbox/${filename}`,
    count: questions.length,
  }, 200, cors);
}

/* ── /report ─────────────────────────────────────────────────────────── */

async function handleReport(request, env, cors) {
  // Public endpoint: rate-limit per-IP to stop reports.json growing without
  // bound. 10 reports/hour/IP is generous for legitimate use and cheap to
  // check against the existing login_attempts table (reused as a general
  // sliding-window counter keyed by a synthetic "ip:report" identifier).
  if (env.DB) {
    const ipH = await ipHash(request, env);
    const key = "report:" + ipH;
    const now = Math.floor(Date.now() / 1000);
    const windowSec = 3600;
    const limit = 10;
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM login_attempts WHERE email_lookup = ? AND ts > ?"
    ).bind(key, now - windowSec).first();
    if (row && row.n >= limit) {
      return json({ ok: false, error: "too many reports, try later" }, 429, cors);
    }
    await env.DB.prepare(
      "INSERT INTO login_attempts (email_lookup, ts, ok, ip_hash) VALUES (?, ?, 1, ?)"
    ).bind(key, now, ipH).run();
  }

  const body = await request.json().catch(() => null);
  const qid = body && body.question_id;
  const issue = body && body.issue;
  if (!qid || typeof qid !== "string") {
    return json({ ok: false, error: "missing question_id" }, 400, cors);
  }
  if (!issue || typeof issue !== "string" || issue.trim().length < 3) {
    return json({ ok: false, error: "issue text too short" }, 400, cors);
  }
  if (issue.length > REPORT_ISSUE_MAX) {
    return json({ ok: false, error: `Report is too long. Keep it under ${REPORT_ISSUE_MAX} characters.` }, 413, cors);
  }
  // The per-IP limit alone let a handful of addresses grow reports.json
  // past the Contents API's 1 MB inline limit, after which every /report
  // and /apply-report failed until the file was trimmed by hand. A global
  // daily budget and the open-count and size caps below bound it.
  if (await overBudget(env, "report:global", 86400, REPORT_GLOBAL_DAY_MAX)) {
    return json({ ok: false, error: "Too many reports today. Try again tomorrow." }, 429, cors);
  }

  const entry = {
    id:           `report-${utcStamp()}-${randomId(4)}`,
    question_id:  qid.slice(0, 200),
    issue:        issue,
    profile:      (str(body.profile) || "guest").slice(0, 40),
    // The only field here that was neither type-checked nor capped, in
    // the one endpoint that takes an unauthenticated body and commits it
    // to a file in the repo.
    model:        str(body.model).slice(0, 80) || null,
    created:      new Date().toISOString(),
    status:       "open",
    resolution:   null,
  };

  let full = null;
  await ghMutateJson(env, "data/reports.json", (data) => {
    full = null;
    const reports = (data && Array.isArray(data.reports)) ? data.reports : [];
    const open = reports.filter(r => r && (r.status || "open") === "open").length;
    if (open >= REPORTS_OPEN_MAX) { full = "count"; throw new ReportsFull(); }
    const out = { ...(data && typeof data === "object" ? data : {}), reports: reports.concat([entry]) };
    if (new TextEncoder().encode(JSON.stringify(out, null, 2)).length > REPORTS_FILE_MAX_BYTES) { full = "size"; throw new ReportsFull(); }
    return out;
  }, `Add report for ${entry.question_id} via web`).catch(e => {
    if (!(e instanceof ReportsFull)) throw e;
  });
  if (full) {
    return json({ ok: false, error: "The report queue is full. Try again once the open reports have been reviewed." },
      full === "size" ? 413 : 429, cors);
  }
  await noteAttempt(env, "report:global");

  return json({ ok: true, id: entry.id }, 200, cors);
}

// Caps on data/reports.json, which is committed to the public repo and
// written by an unauthenticated endpoint. The file stays well under the
// Contents API's 1 MB inline limit.
const REPORT_ISSUE_MAX = 4000;          // matches the textarea maxlength
const REPORTS_OPEN_MAX = 200;
const REPORTS_FILE_MAX_BYTES = 800_000;
const REPORT_GLOBAL_DAY_MAX = 100;
class ReportsFull extends Error {}

/* ── /apply-audit ────────────────────────────────────────────────────
 *  body: { batch_path, audit: { summary, kept[], dropped[] }, profile }
 *  - Merges kept[] into the appropriate main file by topic.
 *  - Drops the batch from inbox_manifest.json (and physically removes
 *    the inbox file by overwriting it with an empty array - safer than
 *    contents-delete which requires SHA roundtrip).
 *  - Appends a one-line summary + per-Q decisions to audit_log.md.
 *
 *  Admin session required.
 */
const TOPIC_TO_FILE = {
  "Paediatrics":               "data/questions_paeds.json",
  "Obstetrics & Gynaecology":  "data/questions_obgyn.json",
  "Psychiatry":                "data/questions_psych.json",
  "Medicine":                  "data/questions_medicine.json",
};

async function handleApplyAudit(request, env, cors) {
  const user = await authUser(request, env);
  if (!user || !user.is_admin) {
    return json({ ok: false, error: "admin session required" }, 401, cors);
  }
  const body = await request.json().catch(() => null);
  const audit = body && body.audit;
  const batchPath = body && body.batch_path;   // e.g. "inbox/pasted-...json"
  if (!audit || !Array.isArray(audit.kept) || !Array.isArray(audit.dropped)) {
    return json({ ok: false, error: "expected { batch_path, audit: { kept[], dropped[] } }" }, 400, cors);
  }
  // batch_path is written to as `data/<batch_path>` with "[]" below, so it
  // needs the same allowlist its sibling /apply-live-audit already has.
  // Unvalidated, `"questions_paeds.json"` emptied the live paediatrics
  // bank in one commit, and `"../.github/workflows/x.yml"` survived
  // ghPutFile's encoder (encodeURIComponent leaves "." alone).
  if (batchPath && !/^inbox\/[a-zA-Z0-9._-]+\.json$/.test(batchPath)) {
    return json({ ok: false, error: "batch_path must be inbox/<name>.json" }, 400, cors);
  }
  const moved = { Paediatrics: 0, "Obstetrics & Gynaecology": 0, Psychiatry: 0, Medicine: 0, _unknown: 0 };

  // Bucket kept questions by topic.
  const buckets = {};
  for (const q of audit.kept) {
    const t = q && q.topic;
    const target = TOPIC_TO_FILE[t];
    if (!target) { moved._unknown++; continue; }
    buckets[target] = buckets[target] || [];
    buckets[target].push(q);
    moved[t]++;
  }

  // For each affected main file: read, merge by id (audit version
  // wins on collision), write back.
  for (const [path, addQs] of Object.entries(buckets)) {
    await ghMergeArray(env, path, addQs, "id",
      `Promote ${addQs.length} audited q(s) from ${batchPath || "(unspecified)"}`);
  }

  // Drop batch_path from inbox_manifest.json if present.
  if (batchPath) {
    await ghRemoveFromManifest(env, "data/inbox_manifest.json", "inbox", batchPath);
    // Empty the inbox file so dedup-by-id during load doesn't double-show.
    await ghPutFile(env, "data/" + batchPath, "[]\n",
      `Clear ${batchPath} after audit promotion`);
  }

  // Append summary to data/audit_log.md.
  const stamp = new Date().toISOString();
  const summaryLine = `\n## ${stamp} - audit of ${batchPath || "(report batch)"} by ${body.profile || "rob"}\n\n` +
    `${audit.summary || "(no summary)"}\n\n` +
    `**Kept:** ${audit.kept.length} - ` +
    Object.entries(moved).filter(([_, n]) => n > 0).map(([t, n]) => `${t}=${n}`).join(", ") + "\n\n" +
    (audit.dropped.length
      ? "**Dropped:**\n" + audit.dropped.map(d => `- \`${d.id}\` - ${d.reason}`).join("\n") + "\n"
      : "");
  await ghAppendText(env, "data/audit_log.md", summaryLine,
    `Append audit log entry`);

  return json({ ok: true, moved, dropped: audit.dropped.length }, 200, cors);
}

/* ── /apply-live-audit ──────────────────────────────────────────
 *  body: { file_path, audit: { summary, kept[], dropped[] }, profile }
 *  - file_path must start with "data/batches/" or be one of the four
 *    main questions_*.json paths. Other paths are rejected.
 *  - Replaces the file at file_path with the kept[] array (the audit
 *    is authoritative for that file's contents).
 *  - Appends summary + dropped[] to data/audit_log.md.
 */
const ALLOWED_LIVE_FILES = new Set([
  "data/questions_paeds.json",
  "data/questions_obgyn.json",
  "data/questions_psych.json",
  "data/questions_medicine.json",
]);
async function handleApplyLiveAudit(request, env, cors) {
  const user = await authUser(request, env);
  if (!user || !user.is_admin) {
    return json({ ok: false, error: "admin session required" }, 401, cors);
  }
  const body = await request.json().catch(() => null);
  const filePath = body && body.file_path;
  const audit = body && body.audit;
  if (!filePath || typeof filePath !== "string") {
    return json({ ok: false, error: "missing file_path" }, 400, cors);
  }
  // Strict allowlist regex for batch paths: only a flat filename directly
  // under data/batches/, alphanumerics + . _ -, ending in .json. Blocks any
  // subdirectory traversal or shell-glob character.
  const isBatch = /^data\/batches\/[a-zA-Z0-9._-]+\.json$/.test(filePath)
                  && !filePath.startsWith("data/batches/_");
  const isMain = ALLOWED_LIVE_FILES.has(filePath);
  if (!isBatch && !isMain) {
    return json({ ok: false, error: "file_path must be data/batches/*.json or a main questions file" }, 400, cors);
  }
  if (!audit || !Array.isArray(audit.kept) || !Array.isArray(audit.dropped)) {
    return json({ ok: false, error: "expected audit.kept[] and audit.dropped[]" }, 400, cors);
  }
  // The audit replaces the whole file, so it has to account for every
  // question in it. A model that returned a truncated or partial kept[]
  // used to delete every question it left out, with no drop reason and
  // no log line. Checked against the file as it is at write time.
  let mismatch = null;
  let text;
  try {
    text = await ghMutateJson(env, filePath, (data) => {
      mismatch = Array.isArray(data)
        ? auditIdMismatch(data, audit.kept, audit.dropped)
        : "That file is missing or is not a question array.";
      if (mismatch) throw new AuditMismatch();
      return audit.kept;
    }, `Live-audit ${filePath}: ${audit.kept.length} kept, ${audit.dropped.length} dropped`);
  } catch (e) {
    if (!(e instanceof AuditMismatch)) {
      // The PUT may have landed; drop the file's cache hash to be safe.
      await refreshManifestHashes(env, new Map([[filePath, null]]));
      throw e;
    }
  }
  if (mismatch) return json({ ok: false, error: mismatch }, 409, cors);
  await refreshManifestHashes(env, new Map([[filePath, text]]));

  const stamp = new Date().toISOString();
  const summary = `\n## ${stamp} - live audit of ${filePath} by ${body.profile || "rob"}\n\n` +
    `${audit.summary || "(no summary)"}\n\n` +
    `**Kept:** ${audit.kept.length}\n\n` +
    (audit.dropped.length
      ? "**Dropped:**\n" + audit.dropped.map(d => `- \`${d.id}\` - ${d.reason}`).join("\n") + "\n"
      : "");
  await ghAppendText(env, "data/audit_log.md", summary, "Append live-audit log entry");

  return json({ ok: true, kept: audit.kept.length, dropped: audit.dropped.length }, 200, cors);
}

class AuditMismatch extends Error {}

// Null when kept[] and dropped[] together name every id in `original`
// exactly once and nothing else; otherwise a short message for the admin.
function auditIdMismatch(original, kept, dropped) {
  const idOf = (x) => (x && typeof x.id === "string") ? x.id : null;
  const want = new Set(original.map(idOf).filter(Boolean));
  const seen = new Set();
  const dupes = [], unknown = [];
  let noId = 0;
  for (const x of [...kept, ...dropped]) {
    const id = idOf(x);
    if (!id) { noId++; continue; }
    if (seen.has(id)) dupes.push(id);
    else if (!want.has(id)) unknown.push(id);
    seen.add(id);
  }
  const missing = [...want].filter(id => !seen.has(id));
  if (!noId && !dupes.length && !unknown.length && !missing.length) return null;
  const list = (a) => a.slice(0, 5).join(", ") + (a.length > 5 ? `, +${a.length - 5} more` : "");
  const parts = [];
  if (missing.length) parts.push(`${missing.length} in the file but in neither list (${list(missing)})`);
  if (unknown.length) parts.push(`${unknown.length} not in the file (${list(unknown)})`);
  if (dupes.length) parts.push(`${dupes.length} listed twice (${list(dupes)})`);
  if (noId) parts.push(`${noId} without an id`);
  return "Audit does not match the file. Nothing was written: " + parts.join("; ") + ".";
}

/* ── /apply-report ───────────────────────────────────────────────────
 *  body: { resolutions: [ { report_id, question_id, action, resolution, fixed_question?, files? } ] }
 *  - `files` is the client's hint of which bank files hold the question.
 *    Hinted files are edited directly (about 7 GitHub requests for one
 *    fix); only ids not found there trigger the full scan below.
 *  - Looks for each fix/drop question in every file loadData() in
 *    app.js serves the bank from: the four main files, then every file
 *    listed in batches_manifest.json and inbox_manifest.json. The main
 *    files hold under 1% of the bank, and they were the only place this
 *    used to look.
 *  - Replaces (fix) or removes (drop) it in every file that holds it, so
 *    a duplicate further down the load order cannot resurface.
 *  - Only then writes reports.json, closing a report only when its edit
 *    landed or it was dismissed. It used to close every report first, so
 *    a fix that matched nothing still read "fixed" and left the open list.
 *  - Returns counts, missed_ids, and one entry per resolution in
 *    `outcomes` (fixed | dropped | dismissed | missed | failed | invalid).
 */
const MAX_REPORT_RESOLUTIONS = 100;
class NoChange extends Error {}

async function handleApplyReport(request, env, cors) {
  const user = await authUser(request, env);
  if (!user || !user.is_admin) {
    return json({ ok: false, error: "admin session required" }, 401, cors);
  }
  const body = await request.json().catch(() => null);
  const resolutions = body && body.resolutions;
  if (!Array.isArray(resolutions) || !resolutions.length) {
    return json({ ok: false, error: "expected non-empty `resolutions` array" }, 400, cors);
  }
  if (resolutions.length > MAX_REPORT_RESOLUTIONS) {
    return json({ ok: false, error: `Too many resolutions. Apply at most ${MAX_REPORT_RESOLUTIONS} at a time.` }, 400, cors);
  }

  // One outcome per resolution, in request order.
  const firstEdit = new Map();   // question_id -> the first fix/drop for it
  const outcomes = resolutions.map((r) => {
    const o = { report_id: str(r && r.report_id), question_id: str(r && r.question_id),
                action: str(r && r.action), outcome: null, files: [] };
    if (!o.report_id) { o.outcome = "invalid"; o.reason = "missing report_id"; }
    else if (!["fix", "drop", "dismiss"].includes(o.action)) { o.outcome = "invalid"; o.reason = "unknown action"; }
    else if (o.action !== "dismiss" && !o.question_id) { o.outcome = "invalid"; o.reason = "missing question_id"; }
    else if (o.action === "fix" && !isServableQuestion(r.fixed_question)) {
      o.outcome = "invalid"; o.reason = "fixed_question is not a complete question";
    } else if (o.action !== "dismiss") {
      const prev = firstEdit.get(o.question_id);
      if (!prev) { firstEdit.set(o.question_id, { o, r }); }
      else if (prev.o.action !== o.action) {
        o.outcome = "invalid"; o.reason = "conflicts with another resolution for this question";
      } else { o.sameAs = prev.o; }   // two reports on one question, same verdict
    }
    return o;
  });
  const edits = [...firstEdit.values()];
  const written = new Map();   // "data/..." path -> text written, or null

  // Write each file that holds a question once. The client sends
  // `files` per resolution: the bank files it loaded that question from
  // (state.bankFiles). Hinted files are tried first; only ids none of
  // them held fall back to scanning the whole bank. A hint is used only
  // if it names a file the bank is actually served from.
  if (edits.length) {
    let paths;
    try {
      paths = await bankFilePaths(env);
    } catch (e) {
      console.error("apply-report manifest read failed:", e && e.stack || e);
      return json({ ok: false, error: `Could not read the bank from GitHub (${e && e.message}). Nothing was changed.` }, 502, cors);
    }
    const known = new Set(paths);
    const hinted = new Map();   // path -> Set of question ids
    for (const e of edits) {
      const hint = Array.isArray(e.r.files) ? e.r.files.slice(0, 10) : [];
      for (const p of hint) {
        if (typeof p !== "string" || !known.has(p)) continue;
        if (!hinted.has(p)) hinted.set(p, new Set());
        hinted.get(p).add(e.o.question_id);
      }
    }
    for (const p of paths) if (hinted.has(p)) await applyReportEdits(env, p, hinted.get(p), edits, written);
    const rest = edits.filter(e => !e.o.files.length && !e.o.failedFiles);
    if (rest.length) {
      let where;
      try {
        where = await locateQuestions(env, new Set(rest.map(e => e.o.question_id)), paths);
      } catch (e) {
        console.error("apply-report scan failed:", e && e.stack || e);
        if (!edits.some(x => x.o.files.length)) {
          return json({ ok: false, error: `Could not read the bank from GitHub (${e && e.message}). Nothing was changed.` }, 502, cors);
        }
        for (const x of rest) x.o.failedFiles = ["(bank scan failed)"];
        where = new Map();
      }
      for (const [path, ids] of where) await applyReportEdits(env, path, ids, rest, written);
    }
    await refreshManifestHashes(env, written);
  }

  for (const o of outcomes) {
    if (o.outcome) continue;
    const src = o.sameAs || o;
    if (o.action === "dismiss") o.outcome = "dismissed";
    else if (src.failedFiles) { o.outcome = "failed"; o.reason = "write failed: " + src.failedFiles.join(", "); o.files = src.files; }
    else if (src.files.length) { o.outcome = o.action === "fix" ? "fixed" : "dropped"; o.files = src.files; }
    else { o.outcome = "missed"; o.reason = "question not found in the bank"; }
  }
  for (const o of outcomes) delete o.sameAs;
  return await closeReports(env, cors, resolutions, outcomes);
}

// Apply the fix/drop edits whose ids are in `ids` to one file, in one
// commit. Records the path on each edit that landed, or on failedFiles.
// `written` collects path -> new text (or null if unknown) for
// refreshManifestHashes.
async function applyReportEdits(env, path, ids, edits, written) {
  const items = edits.filter(e => ids.has(e.o.question_id));
  if (!items.length) return;
  let hits = new Set();
  try {
    const text = await ghMutateJsonArray(env, path, (arr) => {
      hits = new Set();
      let out = arr;
      for (const { o, r } of items) {
        const qid = o.question_id;
        if (!out.some(q => q && q.id === qid)) continue;
        out = o.action === "fix"
          ? out.map(q => (q && q.id === qid) ? r.fixed_question : q)
          : out.filter(q => !(q && q.id === qid));
        hits.add(qid);
      }
      // A stale hint, or the file changed since the scan; writing it back
      // unchanged would only add an empty commit.
      if (!hits.size) throw new NoChange();
      return out;
    }, `Apply ${items.length} report resolution(s) to ${path}`);
    written.set(path, text);
    for (const { o } of items) if (hits.has(o.question_id)) o.files.push(path);
  } catch (e) {
    if (e instanceof NoChange) return;
    written.set(path, null);   // the PUT may or may not have landed
    console.error(`apply-report write to ${path} failed:`, e && e.stack || e);
    for (const { o } of items) { o.failedFiles = (o.failedFiles || []).concat(path); }
  }
}

// Write reports.json for the resolutions whose outcome is final, then
// answer the /apply-report call.
async function closeReports(env, cors, resolutions, outcomes) {
  // Close only the reports whose outcome is final.
  const closing = new Map();
  resolutions.forEach((r, i) => {
    const o = outcomes[i];
    if (o.outcome === "fixed" || o.outcome === "dropped" || o.outcome === "dismissed") {
      closing.set(o.report_id, { status: o.outcome, resolution: str(r.resolution).slice(0, 4000) });
    }
  });
  let unmatchedReports = [];
  if (closing.size) {
    try {
      await ghMutateJson(env, "data/reports.json", (data) => {
        const reports = (data && Array.isArray(data.reports)) ? data.reports : [];
        const now = new Date().toISOString();
        const seen = new Set();
        for (const found of reports) {
          const c = found && closing.get(found.id);
          if (!c) continue;
          found.status = c.status;
          found.resolution = c.resolution;
          found.resolved_at = now;
          seen.add(found.id);
        }
        unmatchedReports = [...closing.keys()].filter(id => !seen.has(id));
        return { ...(data && typeof data === "object" ? data : {}), reports };
      }, `Resolve ${closing.size} report(s)`);
    } catch (e) {
      const ref = randomHex(4);
      console.error("[" + ref + "] apply-report reports.json write failed:", e && e.stack || e);
      return json({ ok: false, ref, outcomes,
        error: "The question edits landed, but reports.json could not be updated. Close those reports by hand." }, 500, cors);
    }
  }

  const count = (k) => outcomes.filter(o => o.outcome === k).length;
  return json({
    ok: true,
    fixed: count("fixed"), dropped: count("dropped"), dismissed: count("dismissed"),
    missed: count("missed"), failed: count("failed"), invalid: count("invalid"),
    missed_ids: [...new Set(outcomes.filter(o => o.outcome === "missed").map(o => o.question_id))],
    unmatched_reports: unmatchedReports,
    outcomes,
  }, 200, cors);
}

// The same test loadData() applies before it will serve a question.
function isServableQuestion(q) {
  return !!(q && typeof q === "object" && typeof q.id === "string" && q.id &&
    typeof q.stem === "string" && Array.isArray(q.options) && q.options.length >= 2 &&
    q.options.every(o => o && typeof o === "object") &&
    q.options.filter(o => o.correct === true).length === 1);
}

// Every file the client loads the bank from, in its load order.
async function bankFilePaths(env) {
  const paths = Object.values(TOPIC_TO_FILE);
  for (const [manifest, key] of [["data/batches_manifest.json", "batches"], ["data/inbox_manifest.json", "inbox"]]) {
    const f = await ghReadFile(env, manifest);
    if (!f.exists) continue;
    let list;
    try { list = JSON.parse(f.text)[key]; } catch { throw new Error(`${manifest} did not parse`); }
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      if (typeof p !== "string" || !/^(batches|inbox)\/[a-zA-Z0-9._-]+\.json$/.test(p)) continue;
      if (!paths.includes("data/" + p)) paths.push("data/" + p);
    }
  }
  return paths;
}

// Map of path -> Set of the wanted ids that file holds, in load order.
// Files are read raw (one request each, any size up to 100 MB) and only
// parsed when the text contains a wanted id, so a scan of the whole bank
// costs about 40 fetches and a couple of parses.
async function locateQuestions(env, wanted, paths) {
  const needles = [...wanted].map(id => [id, JSON.stringify(id)]);
  const found = new Map();
  const CONCURRENCY = 6;
  for (let i = 0; i < paths.length; i += CONCURRENCY) {
    const chunk = paths.slice(i, i + CONCURRENCY);
    const hits = await Promise.all(chunk.map(async (path) => {
      const text = await ghReadRaw(env, path);
      if (text === null) return null;
      if (!needles.some(([, n]) => text.includes(n))) return null;
      let arr;
      try { arr = JSON.parse(text); } catch { throw new Error(`${path} did not parse`); }
      if (!Array.isArray(arr)) return null;
      const ids = new Set();
      for (const q of arr) if (q && wanted.has(q.id)) ids.add(q.id);
      return ids.size ? ids : null;
    }));
    chunk.forEach((path, j) => { if (hits[j]) found.set(path, hits[j]); });
  }
  return found;
}

// Raw file text at the branch head, or null on 404. For scanning only:
// it carries no sha, so writes go through ghMutateJson.
async function ghReadRaw(env, path) {
  const branch = env.GITHUB_BRANCH || "main";
  const r = await fetch(`${ghContentsUrl(env, path)}?ref=${encodeURIComponent(branch)}`,
    { headers: { ...ghHeaders(env), "Accept": "application/vnd.github.raw+json" } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GET ${path} (${r.status})`);
  return await r.text();
}

/* ── GitHub helpers (Contents API; one PUT per file with optimistic
 *    SHA-based retry on 409). ─────────────────────────────────────────── */

// Read JSON, run mutator, write back. Retries on SHA collision.
async function ghMutateJson(env, path, mutator, message) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const branch = env.GITHUB_BRANCH || "main";
    // A 200 we cannot parse used to leave `data` null while `sha` was
    // already set, so the mutator ran against [] and the PUT succeeded
    // with a valid sha - replacing the entire file with whatever the
    // mutator produced. Fail closed: a 404 still creates the file, but a
    // file that exists must read in full and parse before we overwrite
    // it. ghReadFile fetches blobs over 1 MB by sha (every consolidated
    // batch file is about 2 MB) and throws on anything short of that.
    const file = await ghReadFile(env, path);
    let data = null;
    const sha = file.sha;
    if (file.exists) {
      try {
        data = JSON.parse(file.text);
      } catch {
        throw new Error(`refusing to rewrite ${path}: the existing content did not parse as JSON`);
      }
    }
    const next = mutator(data);
    const text = JSON.stringify(next, null, 2) + "\n";
    const put = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`, {
      method: "PUT",
      headers: { ...ghHeaders(env), "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        branch,
        content: utf8ToBase64(text),
        ...(sha ? { sha } : {}),
      }),
    });
    // The exact text written, so a caller can hash the new bytes.
    if (put.ok) return text;
    if (put.status !== 409) throw new Error(`PUT ${path} (${put.status}): ${await put.text()}`);
  }
  throw new Error(`mutate ${path}: too many SHA collisions`);
}

// Keep batches_manifest.json / inbox_manifest.json `hashes` in step with
// files this call rewrote. The loader fetches a listed file as ?h=<hash>,
// so a stale hash keeps serving the old bytes from cache. Same rule as
// scripts/manifest_hashes.py: sha1 of the file bytes, first 12 hex, and
// only for paths the manifest lists. `written` maps "data/..." paths to
// the text written, or to null when the outcome is unknown (a failed
// PUT); a null entry, or any hash that cannot be computed, is deleted so
// the loader falls back to ?v=. One GET and PUT per manifest touched.
const MANIFEST_HASH_LEN = 12;
async function refreshManifestHashes(env, written) {
  for (const [manifest, key] of [["data/batches_manifest.json", "batches"], ["data/inbox_manifest.json", "inbox"]]) {
    const prefix = key + "/";
    const mine = [...written.keys()].filter(p => p.startsWith("data/" + prefix));
    if (!mine.length) continue;
    const want = new Map();
    for (const p of mine) {
      let h = null;
      const text = written.get(p);
      if (typeof text === "string") {
        try {
          const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
          h = bytesToHex(d).slice(0, MANIFEST_HASH_LEN);
        } catch { h = null; }
      }
      want.set(p.slice("data/".length), h);
    }
    try {
      await ghMutateJson(env, manifest, (data) => {
        if (!data || typeof data !== "object" || !Array.isArray(data[key])) throw new NoChange();
        const hashes = (data.hashes && typeof data.hashes === "object" && !Array.isArray(data.hashes)) ? data.hashes : null;
        if (!hashes) throw new NoChange();   // this manifest is not hashed yet
        let changed = false;
        for (const [rel, h] of want) {
          if (!data[key].includes(rel)) continue;
          if (h && hashes[rel] !== h) { hashes[rel] = h; changed = true; }
          else if (!h && rel in hashes) { delete hashes[rel]; changed = true; }
        }
        if (!changed) throw new NoChange();
        return data;
      }, `Refresh ${manifest} hashes`);
    } catch (e) {
      if (!(e instanceof NoChange)) console.error(`manifest hash refresh for ${manifest} failed:`, e && e.stack || e);
    }
  }
}

function ghContentsUrl(env, path) {
  return `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
}

// Read a file with the sha a PUT must quote. Returns { exists, sha, text }.
// The Contents API inlines only blobs under 1 MB; above that it answers
// 200 with encoding "none" and no content. Those are read from the blob
// endpoint by the same sha, so the text and the sha always describe the
// same version, and the byte count is checked against the listed size.
async function ghReadFile(env, path) {
  const branch = env.GITHUB_BRANCH || "main";
  const r = await fetch(`${ghContentsUrl(env, path)}?ref=${encodeURIComponent(branch)}`, { headers: ghHeaders(env) });
  if (r.status === 404) return { exists: false, sha: undefined, text: null };
  if (r.status !== 200) throw new Error(`GET ${path} (${r.status})`);
  const meta = await r.json();
  if (!meta || meta.type !== "file" || !meta.sha) {
    throw new Error(`refusing to rewrite ${path}: not a file`);
  }
  if (meta.encoding === "base64" && meta.content) {
    return { exists: true, sha: meta.sha, text: ghInlineText(meta, path) };
  }
  if (meta.encoding === "none" || !meta.content) {
    const b = await fetch(
      `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/git/blobs/${meta.sha}`,
      { headers: { ...ghHeaders(env), "Accept": "application/vnd.github.raw+json" } });
    if (!b.ok) throw new Error(`refusing to rewrite ${path}: blob read failed (${b.status})`);
    const bytes = new Uint8Array(await b.arrayBuffer());
    if (typeof meta.size === "number" && bytes.length !== meta.size) {
      throw new Error(`refusing to rewrite ${path}: read ${bytes.length} of ${meta.size} bytes`);
    }
    return { exists: true, sha: meta.sha, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  }
  throw new Error(`refusing to rewrite ${path}: unexpected encoding ${meta.encoding}`);
}

// Specialisation: same as ghMutateJson but the file is a top-level
// JSON array (not an object with a key).
async function ghMutateJsonArray(env, path, mutator, message) {
  return ghMutateJson(env, path, (data) => mutator(Array.isArray(data) ? data : []), message);
}

// Read JSON array, append items deduped by `key`, write back.
async function ghMergeArray(env, path, items, key, message) {
  return ghMutateJsonArray(env, path, (arr) => {
    const out = arr.slice();
    const idx = new Map(out.map((q, i) => [q[key], i]));
    for (const it of items) {
      const k = it[key];
      if (idx.has(k)) out[idx.get(k)] = it;     // audit version wins
      else { idx.set(k, out.length); out.push(it); }
    }
    return out;
  }, message);
}

// Remove `value` from `obj[key]` (a string array) in a JSON file.
async function ghRemoveFromManifest(env, path, key, value) {
  return ghMutateJson(env, path, (data) => {
    data = data || {};
    if (!Array.isArray(data[key])) data[key] = [];
    data[key] = data[key].filter(v => v !== value);
    return data;
  }, `Remove ${value} from ${path}`);
}

// Append text to a UTF-8 file (creates if missing). Retries on SHA collision.
async function ghAppendText(env, path, text, message) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const branch = env.GITHUB_BRANCH || "main";
    const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(branch)}`;
    const r = await fetch(url, { headers: ghHeaders(env) });
    let existing = "";
    let sha;
    if (r.status === 200) {
      const meta = await r.json();
      sha = meta.sha;
      existing = ghInlineText(meta, path);
    } else if (r.status !== 404) {
      throw new Error(`GET ${path} (${r.status})`);
    }
    const put = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`, {
      method: "PUT",
      headers: { ...ghHeaders(env), "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        branch,
        content: utf8ToBase64(existing + text),
        ...(sha ? { sha } : {}),
      }),
    });
    if (put.ok) return;
    if (put.status !== 409) throw new Error(`PUT ${path} (${put.status}): ${await put.text()}`);
  }
  throw new Error(`append ${path}: too many SHA collisions`);
}

async function ghPutFile(env, path, content, message) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
  const branch = env.GITHUB_BRANCH || "main";
  // Look up SHA if file already exists (mostly relevant for manifest).
  const existing = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
    headers: ghHeaders(env),
  });
  const meta = existing.status === 200 ? await existing.json() : null;
  const payload = {
    message,
    branch,
    content: utf8ToBase64(content),
    ...(meta && meta.sha ? { sha: meta.sha } : {}),
  };
  const r = await fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`GitHub PUT ${path} failed (${r.status}): ${text}`);
  }
  return await r.json();
}

// The Contents API answers 200 with `encoding: "none"` and an empty
// body for a blob over 1 MB, and can hand back a truncated one on a bad
// day. Every helper below reads a file, changes it, and PUTs it back
// with the sha it just fetched, so a read that quietly yields nothing
// does not fail: it replaces the file with a one-entry version of
// itself. ghMutateJson already refuses that; these did not.
function ghInlineText(meta, path) {
  if (meta.encoding !== "base64" || !meta.content) {
    throw new Error(`refusing to rewrite ${path}: GitHub did not inline the content (blob over 1 MB?)`);
  }
  try {
    return base64ToUtf8(meta.content);
  } catch (e) {
    throw new Error(`refusing to rewrite ${path}: the content did not decode`);
  }
}

function ghInlineJson(meta, path) {
  try {
    return JSON.parse(ghInlineText(meta, path));
  } catch (e) {
    if (/refusing to rewrite/.test(e.message)) throw e;
    throw new Error(`refusing to rewrite ${path}: the existing content did not parse as JSON`);
  }
}

async function ghAppendManifest(env, path, key, value) {
  // Read existing JSON (default to { [key]: [] }) and append value if
  // not already present, then PUT back. Retries once on race.
  for (let attempt = 0; attempt < 3; attempt++) {
    const branch = env.GITHUB_BRANCH || "main";
    const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(branch)}`;
    const r = await fetch(url, { headers: ghHeaders(env) });
    let obj = { [key]: [] };
    let sha;
    if (r.status === 200) {
      const meta = await r.json();
      sha = meta.sha;
      obj = ghInlineJson(meta, path);
      if (!Array.isArray(obj[key])) obj[key] = [];
    }
    if (!obj[key].includes(value)) obj[key].push(value);
    const putUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
    const put = await fetch(putUrl, {
      method: "PUT",
      headers: { ...ghHeaders(env), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Append ${value} to ${path}`,
        branch,
        content: utf8ToBase64(JSON.stringify(obj, null, 2) + "\n"),
        ...(sha ? { sha } : {}),
      }),
    });
    if (put.ok) return;
    if (put.status !== 409) {
      throw new Error(`GitHub append ${path} failed (${put.status}): ${await put.text()}`);
    }
    // Race: someone else updated. Retry.
  }
  throw new Error(`GitHub append ${path}: too many SHA collisions`);
}

function ghHeaders(env) {
  return {
    "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "a-to-e-worker",
  };
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function utcStamp() {
  return new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}
function randomId(n) {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function utf8ToBase64(s) {
  // btoa needs a binary string; encodeURIComponent path handles UTF-8.
  return btoa(unescape(encodeURIComponent(s)));
}
function base64ToUtf8(s) {
  return decodeURIComponent(escape(atob(s)));
}
