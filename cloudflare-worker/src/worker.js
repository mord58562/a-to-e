/* A to E remote inbox + reports backend.
 *
 * Cloudflare Worker. Two endpoints:
 *
 *   POST /paste   { questions: [...], model?: "Claude 3.5" }
 *     - Commits data/inbox/pasted-<UTC-stamp>-<short-id>.json to the
 *       GitHub repo and appends the path to data/inbox_manifest.json.
 *     - GitHub Pages rebuilds within ~30 s, so the new questions appear
 *       for every visitor on the next reload.
 *
 *   POST /report  { question_id, issue, profile?, model? }
 *     - Appends a report entry to data/reports.json on the repo.
 *     - Rob's profile shows these in the in-app Reports admin view.
 *
 * Secrets / vars (set via `wrangler secret put` or the dashboard):
 *   GITHUB_TOKEN   fine-grained PAT, repo: mord58562/y4-pocket-companion,
 *                  scope: contents:write
 *   GITHUB_OWNER   "mord58562"
 *   GITHUB_REPO    "y4-pocket-companion"
 *   GITHUB_BRANCH  "main"
 *   ALLOW_ORIGIN   "https://mord58562.github.io"  (or "*" for dev)
 */

const JSON_HEADERS = { "Content-Type": "application/json" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return json({ ok: false, error: "POST only" }, 405, cors);
    }
    try {
      if (url.pathname === "/paste")   return await handlePaste(request, env, cors);
      if (url.pathname === "/report")  return await handleReport(request, env, cors);
      return json({ ok: false, error: "not found" }, 404, cors);
    } catch (e) {
      return json({ ok: false, error: String(e && e.message || e) }, 500, cors);
    }
  },
};

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin":  env.ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age":       "86400",
  };
}

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...JSON_HEADERS, ...(extraHeaders || {}) },
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

/* ── GitHub helpers (Contents API; one PUT per file with optimistic
 *    SHA-based retry on 409). ─────────────────────────────────────────── */

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
