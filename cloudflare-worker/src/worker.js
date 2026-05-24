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
 *   ROUTINE_TOKEN    bearer for the scheduled remote-agent /commit-batch caller
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    try {
      // Account + stats API: GET allowed for /api/me, /api/stats/:qid.
      if (url.pathname === "/api/register" && request.method === "POST") return await handleRegister(request, env, cors);
      if (url.pathname === "/api/login"    && request.method === "POST") return await handleLogin(request, env, cors);
      if (url.pathname === "/api/me"       && request.method === "GET")  return await handleMe(request, env, cors);
      if (url.pathname === "/api/answer"   && request.method === "POST") return await handleAnswer(request, env, cors);
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
      if (url.pathname.startsWith("/api/stats/") && request.method === "GET") {
        return await handleStats(request, env, cors, url.pathname.slice("/api/stats/".length));
      }
      // Existing GitHub-write endpoints (POST only).
      if (request.method !== "POST") {
        return json({ ok: false, error: "POST only" }, 405, cors);
      }
      if (url.pathname === "/paste")        return await handlePaste(request, env, cors);
      if (url.pathname === "/report")       return await handleReport(request, env, cors);
      if (url.pathname === "/apply-audit")           return await handleApplyAudit(request, env, cors);
      if (url.pathname === "/apply-live-audit") return await handleApplyLiveAudit(request, env, cors);
      if (url.pathname === "/apply-report")          return await handleApplyReport(request, env, cors);
      if (url.pathname === "/commit-batch")          return await handleCommitBatch(request, env, cors);
      return json({ ok: false, error: "not found" }, 404, cors);
    } catch (e) {
      return json({ ok: false, error: String(e && e.message || e) }, 500, cors);
    }
  },
};

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin":  env.ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age":       "86400",
  };
}

/* ── /commit-batch ───────────────────────────────────────────────────
 *  body: { batch_name: "<snake_case>", questions: [...] }
 *  header: Authorization: Bearer <ROUTINE_TOKEN>
 *
 *  Writes data/batches/<batch_name>.json, appends to
 *  data/batches_manifest.json, and bumps data/meta.json last_added.
 *  Used by the scheduled remote agent so it can publish a batch
 *  without needing git push credentials inside the ephemeral
 *  container - the worker is the credentialed boundary.
 */
async function handleCommitBatch(request, env, cors) {
  const expected = env.ROUTINE_TOKEN;
  if (!expected) return json({ ok: false, error: "ROUTINE_TOKEN not set on worker" }, 500, cors);
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/);
  if (!m || m[1] !== expected) return json({ ok: false, error: "unauthorised" }, 401, cors);

  const body = await request.json().catch(() => null);
  const name = body && body.batch_name;
  const questions = body && body.questions;
  if (typeof name !== "string" || !/^[a-z0-9_]{4,80}$/.test(name)) {
    return json({ ok: false, error: "batch_name must be snake_case, 4-80 chars" }, 400, cors);
  }
  if (!Array.isArray(questions) || questions.length < 5 || questions.length > 50) {
    return json({ ok: false, error: "questions must be array of 5-50 items" }, 400, cors);
  }
  const filename = `${name}.json`;
  const batchPath = `data/batches/${filename}`;
  const manifestEntry = `batches/${filename}`;
  const today = new Date().toISOString().slice(0, 10);
  const content = JSON.stringify(questions, null, 2) + "\n";

  // 1. Write the batch file.
  await ghPutFile(env, batchPath, content,
    `Add ${filename} batch (${questions.length} Qs) via scheduled remote agent`);

  // 2. Append to batches_manifest.json (idempotent: skip if already there).
  await ghAppendManifest(env, "data/batches_manifest.json", "batches", manifestEntry);

  // 3. Bump meta.json last_added to today.
  await ghPatchMeta(env, "data/meta.json", { last_added: today });

  return json({ ok: true, path: batchPath, count: questions.length }, 200, cors);
}

async function ghPatchMeta(env, path, patch) {
  const cur = await ghGetFileJson(env, path) || {};
  Object.assign(cur, patch);
  const content = JSON.stringify(cur, null, 2) + "\n";
  await ghPutFile(env, path, content, `Bump meta.json (${Object.keys(patch).join(', ')})`);
}

async function ghGetFileJson(env, path) {
  // Minimal Contents-API read so we can re-write with merged content.
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(path)}?ref=${env.GITHUB_BRANCH || 'main'}`;
  const r = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "a-to-e-worker",
    },
  });
  if (!r.ok) return null;
  const j = await r.json();
  try { return JSON.parse(atob(j.content.replace(/\n/g, ""))); } catch { return null; }
}

/* ── Account + stats API ────────────────────────────────────────────── */

const SESSION_TTL_SEC = 60 * 60 * 24 * 365;  // 1 year; auto-refreshed on every /api/me
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
async function emailEncrypt(env, emailLower) {
  // AES-256-GCM with random 12-byte IV. Output = base64(iv || ct || tag).
  const keyBytes = base64ToBytes(env.EMAIL_ENC_KEY);
  if (keyBytes.length !== 32) throw new Error("EMAIL_ENC_KEY must decode to exactly 32 bytes");
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = randomBytes(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, new TextEncoder().encode(emailLower)
  ));
  const packed = new Uint8Array(iv.length + ct.length);
  packed.set(iv, 0); packed.set(ct, iv.length);
  return bytesToBase64(packed);
}
async function emailDecrypt(env, packedB64) {
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
    if (row.email_enc) row.email = await emailDecrypt(env, row.email_enc);
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

async function handleRegister(request, env, cors) {
  if (!env.DB) return json({ ok: false, error: "DB not bound" }, 500, cors);
  requireEncryptionEnv(env);
  const body = await request.json().catch(() => null);
  const email = (body && body.email || "").trim().toLowerCase();
  const password = body && body.password || "";
  const displayName = (body && body.display_name || "").trim().slice(0, 60) || email.split("@")[0];
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: "invalid email" }, 400, cors);
  if (password.length < 8) return json({ ok: false, error: "password must be 8+ characters" }, 400, cors);
  if (password.length > 1024) return json({ ok: false, error: "password too long" }, 400, cors);

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
  const emailEnc = await emailEncrypt(env, email);
  const now = Math.floor(Date.now() / 1000);
  // The legacy `email` column still has a UNIQUE constraint; we keep it
  // populated with the deterministic lookup hash so it stays unique
  // without storing plaintext. Once schema_003 drops the column this
  // line can be removed.
  await env.DB.prepare(
    "INSERT INTO users (id, email, email_lookup, email_enc, password_hash, password_salt, pw_algo, display_name, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, "enc:" + lookup.slice(0, 32), lookup, emailEnc, hash, saltHex, ARGON2_ALGO_LABEL, displayName, isAdmin, now).run();

  const tokenHex = randomHex(32);
  const tokenH = await hashSessionToken(env, tokenHex);
  await env.DB.prepare(
    "INSERT INTO sessions (token, token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)"
  ).bind("h:" + tokenH.slice(0, 24), tokenH, id, now, now + SESSION_TTL_SEC).run();

  return json({ ok: true, token: tokenHex, user: publicUser({ id, email, display_name: displayName, is_admin: isAdmin }) }, 200, cors);
}


async function handleLogin(request, env, cors) {
  if (!env.DB) return json({ ok: false, error: "DB not bound" }, 500, cors);
  requireEncryptionEnv(env);
  const body = await request.json().catch(() => null);
  const email = (body && body.email || "").trim().toLowerCase();
  const password = body && body.password || "";
  if (!email || !password) return json({ ok: false, error: "email + password required" }, 400, cors);
  if (password.length > 1024) return json({ ok: false, error: "password too long" }, 400, cors);

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

  // Lazy migration: if this account is still on legacy hashing /
  // plaintext email, upgrade it now that we have the password in hand.
  try {
    if (row.pw_algo !== ARGON2_ALGO_LABEL) {
      const newSaltBytes = randomBytes(16);
      const newHash = await hashPasswordArgon2(password, newSaltBytes);
      const emailEnc = await emailEncrypt(env, email);
      await env.DB.prepare(
        "UPDATE users SET password_hash = ?, password_salt = ?, pw_algo = ?, email_lookup = ?, email_enc = ?, email = ? WHERE id = ?"
      ).bind(newHash, bytesToHex(newSaltBytes), ARGON2_ALGO_LABEL, lookup, emailEnc, "enc:" + lookup.slice(0, 32), row.id).run();
      row.email_enc = emailEnc;
    } else if (!row.email_enc) {
      // Argon2-hashed but missing email encryption (shouldn't happen post-002, but defensive).
      const emailEnc = await emailEncrypt(env, email);
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
    await env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE token_hash = ?")
      .bind(now + SESSION_TTL_SEC, tokenH).run();
  }
  return json({ ok: true, user: publicUser(user) }, 200, cors);
}

async function handleAccountDelete(request, env, cors) {
  const user = await authUser(request, env);
  if (!user) return json({ ok: false, error: "not authenticated" }, 401, cors);
  // Delete in order: sessions, answers, user.
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();
  await env.DB.prepare("DELETE FROM answers WHERE user_id = ?").bind(user.id).run();
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id).run();
  return json({ ok: true }, 200, cors);
}

async function handleAdminListUsers(request, env, cors) {
  const user = await authUser(request, env);
  if (!user || !user.is_admin) return json({ ok: false, error: "admin required" }, 403, cors);
  const { results } = await env.DB.prepare(
    "SELECT u.id, u.email, u.email_enc, u.display_name, u.is_admin, u.created_at, COUNT(a.question_id) AS answers FROM users u LEFT JOIN answers a ON a.user_id = u.id GROUP BY u.id ORDER BY u.created_at DESC"
  ).all();
  // Decrypt every email_enc in flight. Rows that pre-date migration still
  // have their plaintext in the legacy `email` column; we use that
  // verbatim so the admin UI keeps working through the rollover.
  const out = [];
  for (const r of (results || [])) {
    let email = r.email;
    if (r.email_enc) {
      try { email = await emailDecrypt(env, r.email_enc); } catch {}
    }
    out.push({ id: r.id, email, display_name: r.display_name, is_admin: r.is_admin, created_at: r.created_at, answers: r.answers });
  }
  return json({ ok: true, users: out }, 200, cors);
}

async function handleAdminDeleteUser(request, env, cors, targetId) {
  const user = await authUser(request, env);
  if (!user || !user.is_admin) return json({ ok: false, error: "admin required" }, 403, cors);
  if (!targetId || typeof targetId !== "string") return json({ ok: false, error: "missing user id" }, 400, cors);
  if (targetId === user.id) return json({ ok: false, error: "use /api/account/delete to remove your own account" }, 400, cors);
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(targetId).run();
  await env.DB.prepare("DELETE FROM answers WHERE user_id = ?").bind(targetId).run();
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(targetId).run();
  return json({ ok: true }, 200, cors);
}

async function handleAdminPromote(request, env, cors, targetId, makeAdmin) {
  const user = await authUser(request, env);
  if (!user || !user.is_admin) return json({ ok: false, error: "admin required" }, 403, cors);
  if (!targetId) return json({ ok: false, error: "missing user id" }, 400, cors);
  if (targetId === user.id && !makeAdmin) return json({ ok: false, error: "cannot demote yourself" }, 400, cors);
  await env.DB.prepare("UPDATE users SET is_admin = ? WHERE id = ?").bind(makeAdmin ? 1 : 0, targetId).run();
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
  if (!"ABCDE".includes(srcLetter)) {
    return json({ ok: false, error: "source_letter must be A-E" }, 400, cors);
  }
  const now = Math.floor(Date.now() / 1000);
  // INSERT OR IGNORE so a user's first answer wins and replays don't skew the stats.
  await env.DB.prepare(
    "INSERT OR IGNORE INTO answers (user_id, question_id, source_letter, correct, ts) VALUES (?, ?, ?, ?, ?)"
  ).bind(user.id, qid, srcLetter, correct, now).run();

  const stats = await getStats(env, qid);
  return json({ ok: true, stats }, 200, cors);
}

async function handleStats(request, env, cors, qid) {
  if (!qid || !/^[A-Za-z0-9_\-]+$/.test(qid)) return json({ ok: false, error: "bad question id" }, 400, cors);
  return json({ ok: true, stats: await getStats(env, qid) }, 200, cors);
}

async function getStats(env, qid) {
  if (!env.DB) return { total: 0, A: 0, B: 0, C: 0, D: 0, E: 0 };
  const rows = await env.DB.prepare(
    "SELECT source_letter, COUNT(*) AS n FROM answers WHERE question_id = ? GROUP BY source_letter"
  ).bind(qid).all();
  const out = { total: 0, A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const r of (rows.results || [])) {
    out[r.source_letter] = r.n;
    out.total += r.n;
  }
  return out;
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
  const body = await request.json().catch(() => null);
  const qid = body && body.question_id;
  const issue = body && body.issue;
  if (!qid || typeof qid !== "string") {
    return json({ ok: false, error: "missing question_id" }, 400, cors);
  }
  if (!issue || typeof issue !== "string" || issue.trim().length < 3) {
    return json({ ok: false, error: "issue text too short" }, 400, cors);
  }

  const entry = {
    id:           `report-${utcStamp()}-${randomId(4)}`,
    question_id:  qid.slice(0, 200),
    issue:        issue.slice(0, 4000),
    profile:      (body.profile || "guest").slice(0, 40),
    model:        body.model || null,
    created:      new Date().toISOString(),
    status:       "open",
    resolution:   null,
  };

  await ghAppendArray(env, "data/reports.json", "reports", entry,
    `Add report for ${entry.question_id} via web`);

  return json({ ok: true, id: entry.id }, 200, cors);
}

/* ── /apply-audit ────────────────────────────────────────────────────
 *  body: { batch_path, audit: { summary, kept[], dropped[] }, profile }
 *  - Merges kept[] into the appropriate main file by topic.
 *  - Drops the batch from inbox_manifest.json (and physically removes
 *    the inbox file by overwriting it with an empty array - safer than
 *    contents-delete which requires SHA roundtrip).
 *  - Appends a one-line summary + per-Q decisions to audit_log.md.
 *
 *  Only Rob's profile should call this; the worker doesn't enforce
 *  that, but the frontend does.
 */
const TOPIC_TO_FILE = {
  "Paediatrics":               "data/questions_paeds.json",
  "Obstetrics & Gynaecology":  "data/questions_obgyn.json",
  "Psychiatry":                "data/questions_psych.json",
  "Medicine":                  "data/questions_medicine.json",
};

async function handleApplyAudit(request, env, cors) {
  const body = await request.json().catch(() => null);
  const audit = body && body.audit;
  const batchPath = body && body.batch_path;   // e.g. "inbox/pasted-...json"
  if (!audit || !Array.isArray(audit.kept) || !Array.isArray(audit.dropped)) {
    return json({ ok: false, error: "expected { batch_path, audit: { kept[], dropped[] } }" }, 400, cors);
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
  const body = await request.json().catch(() => null);
  const filePath = body && body.file_path;
  const audit = body && body.audit;
  if (!filePath || typeof filePath !== "string") {
    return json({ ok: false, error: "missing file_path" }, 400, cors);
  }
  const isBatch = filePath.startsWith("data/batches/") && filePath.endsWith(".json")
                  && !filePath.includes("..") && !filePath.includes("/_");
  const isMain = ALLOWED_LIVE_FILES.has(filePath);
  if (!isBatch && !isMain) {
    return json({ ok: false, error: "file_path must be data/batches/*.json or a main questions file" }, 400, cors);
  }
  if (!audit || !Array.isArray(audit.kept) || !Array.isArray(audit.dropped)) {
    return json({ ok: false, error: "expected audit.kept[] and audit.dropped[]" }, 400, cors);
  }
  await ghPutFile(env, filePath,
    JSON.stringify(audit.kept, null, 2) + "\n",
    `Live-audit ${filePath}: ${audit.kept.length} kept, ${audit.dropped.length} dropped`);

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

/* ── /apply-report ───────────────────────────────────────────────────
 *  body: { resolutions: [ { report_id, question_id, action, resolution, fixed_question? } ] }
 *  - For each resolution: edit reports.json (status + resolution),
 *    and if action=='fix' replace the question in its containing file,
 *    or if action=='drop' remove the question.
 */
async function handleApplyReport(request, env, cors) {
  const body = await request.json().catch(() => null);
  const resolutions = body && body.resolutions;
  if (!Array.isArray(resolutions) || !resolutions.length) {
    return json({ ok: false, error: "expected non-empty `resolutions` array" }, 400, cors);
  }

  // 1. Update reports.json by report_id - one pass.
  await ghMutateJson(env, "data/reports.json", (data) => {
    const reports = (data && data.reports) || [];
    for (const r of resolutions) {
      const found = reports.find(x => x.id === r.report_id);
      if (found) {
        found.status = r.action === "fix" ? "fixed"
                     : r.action === "drop" ? "dropped"
                     : "dismissed";
        found.resolution = r.resolution || "";
        found.resolved_at = new Date().toISOString();
      }
    }
    return { reports };
  }, `Resolve ${resolutions.length} report(s)`);

  // 2. Apply fixes / drops per resolution. To avoid re-reading every
  //    main file once per resolution, bucket by file path.
  const byPath = {};
  for (const r of resolutions) {
    if (r.action !== "fix" && r.action !== "drop") continue;
    const target = r.fixed_question && r.fixed_question.topic && TOPIC_TO_FILE[r.fixed_question.topic];
    // For drops we don't know the topic from the resolution alone; we
    // look it up by question_id below.
    const path = target || null;
    byPath[path || "_lookup"] = byPath[path || "_lookup"] || [];
    byPath[path || "_lookup"].push(r);
  }

  // For "_lookup" entries (mostly drops + fixes without topic), search
  // each main file for the id.
  const allMainFiles = Object.values(TOPIC_TO_FILE);
  const lookups = byPath["_lookup"] || [];
  delete byPath["_lookup"];
  if (lookups.length) {
    // Pull each main file once, find the resolutions whose ids are in
    // it, then route them to that path's bucket.
    for (const path of allMainFiles) {
      const r = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}?ref=${env.GITHUB_BRANCH || "main"}`,
        { headers: ghHeaders(env) });
      if (r.status !== 200) continue;
      const meta = await r.json();
      let arr;
      try { arr = JSON.parse(base64ToUtf8(meta.content)); } catch { continue; }
      if (!Array.isArray(arr)) continue;
      const idSet = new Set(arr.map(q => q.id));
      const here = lookups.filter(rr => idSet.has(rr.question_id));
      if (here.length) {
        byPath[path] = (byPath[path] || []).concat(here);
      }
    }
  }

  // Now mutate each main file once.
  const result = { fixed: 0, dropped: 0, dismissed: resolutions.filter(r => r.action === "dismiss").length };
  for (const [path, items] of Object.entries(byPath)) {
    await ghMutateJsonArray(env, path, (arr) => {
      const out = arr.slice();
      for (const r of items) {
        const idx = out.findIndex(q => q.id === r.question_id);
        if (r.action === "fix" && r.fixed_question) {
          if (idx >= 0) out[idx] = r.fixed_question;
          else out.push(r.fixed_question);
          result.fixed++;
        } else if (r.action === "drop") {
          if (idx >= 0) out.splice(idx, 1);
          result.dropped++;
        }
      }
      return out;
    }, `Apply ${items.length} report resolution(s) to ${path}`);
  }

  return json({ ok: true, ...result }, 200, cors);
}

/* ── GitHub helpers (Contents API; one PUT per file with optimistic
 *    SHA-based retry on 409). ─────────────────────────────────────────── */

// Read JSON, run mutator, write back. Retries on SHA collision.
async function ghMutateJson(env, path, mutator, message) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const branch = env.GITHUB_BRANCH || "main";
    const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(branch)}`;
    const r = await fetch(url, { headers: ghHeaders(env) });
    let data = null;
    let sha;
    if (r.status === 200) {
      const meta = await r.json();
      sha = meta.sha;
      try { data = JSON.parse(base64ToUtf8(meta.content)); } catch {}
    }
    const next = mutator(data);
    const put = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`, {
      method: "PUT",
      headers: { ...ghHeaders(env), "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        branch,
        content: utf8ToBase64(JSON.stringify(next, null, 2) + "\n"),
        ...(sha ? { sha } : {}),
      }),
    });
    if (put.ok) return;
    if (put.status !== 409) throw new Error(`PUT ${path} (${put.status}): ${await put.text()}`);
  }
  throw new Error(`mutate ${path}: too many SHA collisions`);
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
      try { existing = base64ToUtf8(meta.content); } catch {}
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
      try { obj = JSON.parse(base64ToUtf8(meta.content)); } catch {}
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

async function ghAppendArray(env, path, key, entry, message) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const branch = env.GITHUB_BRANCH || "main";
    const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(branch)}`;
    const r = await fetch(url, { headers: ghHeaders(env) });
    let obj = { [key]: [] };
    let sha;
    if (r.status === 200) {
      const meta = await r.json();
      sha = meta.sha;
      try { obj = JSON.parse(base64ToUtf8(meta.content)); } catch {}
      if (!Array.isArray(obj[key])) obj[key] = [];
    }
    obj[key].push(entry);
    const putUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
    const put = await fetch(putUrl, {
      method: "PUT",
      headers: { ...ghHeaders(env), "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        branch,
        content: utf8ToBase64(JSON.stringify(obj, null, 2) + "\n"),
        ...(sha ? { sha } : {}),
      }),
    });
    if (put.ok) return;
    if (put.status !== 409) {
      throw new Error(`GitHub append ${path} failed (${put.status}): ${await put.text()}`);
    }
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
