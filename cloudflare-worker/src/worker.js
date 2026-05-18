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
      if (url.pathname === "/paste")        return await handlePaste(request, env, cors);
      if (url.pathname === "/report")       return await handleReport(request, env, cors);
      if (url.pathname === "/apply-audit")           return await handleApplyAudit(request, env, cors);
      if (url.pathname === "/apply-live-audit") return await handleApplyLiveAudit(request, env, cors);
      if (url.pathname === "/apply-report")          return await handleApplyReport(request, env, cors);
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
