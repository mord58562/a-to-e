#!/usr/bin/env python3
"""A to E local server.

Serves the static site AND accepts pasted questions at POST /api/paste,
writing them to data/inbox/pasted-<UTC-timestamp>.json and appending the
filename to data/inbox_manifest.json. The existing audit flow ("audit
inbox before generating new questions") picks the file up automatically
on the next batch, so the maintainer does not have to flag pasted
questions manually.

The site falls back to localStorage if this backend is not running
(e.g., when served via plain `python -m http.server` or GitHub Pages).
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INBOX_DIR = os.path.join(ROOT, "data", "inbox")
MANIFEST = os.path.join(ROOT, "data", "inbox_manifest.json")
REPORTS  = os.path.join(ROOT, "data", "reports.json")
PORT = int(os.environ.get("Y4MCQ_PORT", "8765"))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("[y4mcq] " + (fmt % args) + "\n")

    def do_POST(self):
        if self.path == "/api/paste":
            return self._handle_paste()
        if self.path == "/api/report":
            return self._handle_report()
        if self.path == "/api/apply-audit":
            return self._handle_apply_audit()
        if self.path == "/api/apply-live-audit":
            return self._handle_apply_live_audit()
        if self.path == "/api/apply-report":
            return self._handle_apply_report()
        self.send_error(404, "Not found")

    def _read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length).decode("utf-8", errors="replace")
        try:
            return json.loads(body), None
        except json.JSONDecodeError as e:
            return None, f"invalid JSON: {e}"

    def _handle_paste(self):
        payload, err = self._read_json()
        if err:
            return self._json(400, {"ok": False, "code": "bad_request", "error": err})
        questions = payload.get("questions")
        if not isinstance(questions, list) or not questions:
            return self._json(400, {"ok": False, "code": "bad_request", "error": "expected non-empty `questions` array"})
        model = payload.get("model")
        if model:
            for q in questions:
                if isinstance(q, dict) and not q.get("model"):
                    q["model"] = model

        os.makedirs(INBOX_DIR, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H%M%S")
        filename = f"pasted-{stamp}.json"
        path = os.path.join(INBOX_DIR, filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
            f.write("\n")

        rel = f"inbox/{filename}"
        try:
            with open(MANIFEST, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            manifest = {"inbox": []}
        manifest.setdefault("inbox", [])
        if rel not in manifest["inbox"]:
            manifest["inbox"].append(rel)
        with open(MANIFEST, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
            f.write("\n")

        return self._json(200, {
            "ok": True,
            "saved": rel,
            "count": len(questions),
        })

    def _handle_report(self):
        payload, err = self._read_json()
        if err:
            return self._json(400, {"ok": False, "code": "bad_request", "error": err})
        qid = payload.get("question_id")
        issue = payload.get("issue")
        if not isinstance(qid, str) or not qid:
            return self._json(400, {"ok": False, "code": "bad_request", "error": "missing question_id"})
        if not isinstance(issue, str) or len(issue.strip()) < 3:
            return self._json(400, {"ok": False, "code": "report_short", "error": "issue text too short"})
        import secrets
        entry = {
            "id":           f"report-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(2)}",
            "question_id":  qid[:200],
            "issue":        issue[:4000],
            "profile":      (payload.get("profile") or "guest")[:40],
            "model":        payload.get("model"),
            "created":      datetime.now(timezone.utc).isoformat(),
            "status":       "open",
            "resolution":   None,
        }
        try:
            with open(REPORTS, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            data = {"reports": []}
        data.setdefault("reports", []).append(entry)
        with open(REPORTS, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        return self._json(200, {"ok": True, "id": entry["id"]})

    TOPIC_TO_FILE = {
        "Paediatrics":              os.path.join(ROOT, "data", "questions_paeds.json"),
        "Obstetrics & Gynaecology": os.path.join(ROOT, "data", "questions_obgyn.json"),
        "Psychiatry":               os.path.join(ROOT, "data", "questions_psych.json"),
        "Medicine":                 os.path.join(ROOT, "data", "questions_medicine.json"),
    }

    def _read_main(self, path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _write_main(self, path, arr):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(arr, f, indent=2, ensure_ascii=False)
            f.write("\n")

    def _handle_apply_audit(self):
        payload, err = self._read_json()
        if err:
            return self._json(400, {"ok": False, "code": "bad_request", "error": err})
        audit = payload.get("audit") or {}
        batch_path = payload.get("batch_path")    # "inbox/...json" or None
        kept = audit.get("kept") or []
        dropped = audit.get("dropped") or []
        if not isinstance(kept, list) or not isinstance(dropped, list):
            return self._json(400, {"ok": False, "code": "bad_request", "error": "audit.kept and audit.dropped must be arrays"})

        moved = {"Paediatrics": 0, "Obstetrics & Gynaecology": 0, "Psychiatry": 0, "Medicine": 0, "_unknown": 0}
        buckets = {}
        for q in kept:
            target = self.TOPIC_TO_FILE.get(q.get("topic"))
            if not target:
                moved["_unknown"] += 1
                continue
            buckets.setdefault(target, []).append(q)
            moved[q["topic"]] += 1

        for path, items in buckets.items():
            existing = self._read_main(path)
            by_id = {q.get("id"): i for i, q in enumerate(existing)}
            for q in items:
                qid = q.get("id")
                if qid in by_id:
                    existing[by_id[qid]] = q
                else:
                    by_id[qid] = len(existing)
                    existing.append(q)
            self._write_main(path, existing)

        # Drop from inbox manifest + clear the inbox file.
        if batch_path:
            try:
                with open(MANIFEST, "r", encoding="utf-8") as f:
                    manifest = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                manifest = {"inbox": []}
            manifest["inbox"] = [p for p in manifest.get("inbox", []) if p != batch_path]
            with open(MANIFEST, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2)
                f.write("\n")
            full = os.path.join(ROOT, "data", batch_path)
            if os.path.exists(full):
                with open(full, "w", encoding="utf-8") as f:
                    f.write("[]\n")

        # Append to audit log.
        stamp = datetime.now(timezone.utc).isoformat()
        log_path = os.path.join(ROOT, "data", "audit_log.md")
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"\n## {stamp} - audit of {batch_path or '(report batch)'} by {payload.get('profile') or 'rob'}\n\n")
            f.write((audit.get("summary") or "(no summary)") + "\n\n")
            f.write(f"**Kept:** {len(kept)} - " + ", ".join(f"{k}={v}" for k, v in moved.items() if v > 0) + "\n\n")
            if dropped:
                f.write("**Dropped:**\n" + "\n".join(f"- `{d.get('id','?')}` - {d.get('reason','')}" for d in dropped) + "\n")

        return self._json(200, {"ok": True, "moved": moved, "dropped": len(dropped)})

    def _handle_apply_live_audit(self):
        payload, err = self._read_json()
        if err:
            return self._json(400, {"ok": False, "code": "bad_request", "error": err})
        file_path = payload.get("file_path") or ""
        audit = payload.get("audit") or {}
        allowed_main = {
            "data/questions_paeds.json", "data/questions_obgyn.json",
            "data/questions_psych.json", "data/questions_medicine.json",
        }
        is_batch = (file_path.startswith("data/batches/")
                    and file_path.endswith(".json")
                    and ".." not in file_path
                    and "/_" not in file_path)
        is_main = file_path in allowed_main
        if not (is_batch or is_main):
            return self._json(400, {"ok": False, "code": "bad_request", "error": "file_path must be data/batches/*.json or a main questions file"})
        kept = audit.get("kept") or []
        dropped = audit.get("dropped") or []
        if not isinstance(kept, list) or not isinstance(dropped, list):
            return self._json(400, {"ok": False, "code": "bad_request", "error": "audit.kept and audit.dropped must be arrays"})
        full = os.path.join(ROOT, file_path)
        # The audit replaces the whole file, so it must account for every
        # id in it (mirrors /apply-live-audit in the worker).
        try:
            with open(full, "r", encoding="utf-8") as f:
                original = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            original = None
        mismatch = (self._audit_mismatch(original, kept, dropped) if isinstance(original, list)
                    else "That file is missing or is not a question array.")
        if mismatch:
            return self._json(409, {"ok": False, "code": "audit_mismatch", "error": mismatch})
        with open(full, "w", encoding="utf-8") as f:
            json.dump(kept, f, indent=2, ensure_ascii=False)
            f.write("\n")
        self._refresh_manifest_hashes([full])
        stamp = datetime.now(timezone.utc).isoformat()
        with open(os.path.join(ROOT, "data", "audit_log.md"), "a", encoding="utf-8") as f:
            f.write(f"\n## {stamp} - live audit of {file_path} by {payload.get('profile') or 'rob'}\n\n")
            f.write((audit.get("summary") or "(no summary)") + "\n\n")
            f.write(f"**Kept:** {len(kept)}\n\n")
            if dropped:
                f.write("**Dropped:**\n" + "\n".join(f"- `{d.get('id','?')}` - {d.get('reason','')}" for d in dropped) + "\n")
        return self._json(200, {"ok": True, "kept": len(kept), "dropped": len(dropped)})

    def _handle_apply_report(self):
        payload, err = self._read_json()
        if err:
            return self._json(400, {"ok": False, "code": "bad_request", "error": err})
        resolutions = payload.get("resolutions") or []
        if not isinstance(resolutions, list) or not resolutions:
            return self._json(400, {"ok": False, "code": "bad_request", "error": "expected non-empty resolutions array"})

        # Mirrors /apply-report in cloudflare-worker/src/worker.js: search
        # every file loadData() serves, edit every copy, and close a report
        # only once its edit has landed (or it was dismissed).
        def s(v):
            return v if isinstance(v, str) else ""
        outcomes, first_edit = [], {}
        for r in resolutions:
            r = r if isinstance(r, dict) else {}
            o = {"report_id": s(r.get("report_id")), "question_id": s(r.get("question_id")),
                 "action": s(r.get("action")), "outcome": None, "files": []}
            if not o["report_id"]:
                o.update(outcome="invalid", reason="missing report_id")
            elif o["action"] not in ("fix", "drop", "dismiss"):
                o.update(outcome="invalid", reason="unknown action")
            elif o["action"] != "dismiss" and not o["question_id"]:
                o.update(outcome="invalid", reason="missing question_id")
            elif o["action"] == "fix" and not self._servable(r.get("fixed_question")):
                o.update(outcome="invalid", reason="fixed_question is not a complete question")
            elif o["action"] != "dismiss":
                prev = first_edit.get(o["question_id"])
                if prev is None:
                    first_edit[o["question_id"]] = (o, r)
                elif prev[0]["action"] != o["action"]:
                    o.update(outcome="invalid", reason="conflicts with another resolution for this question")
                else:
                    o["_same"] = prev[0]
            outcomes.append(o)

        # Hinted files (the client's `files` per resolution) first; only ids
        # none of them held fall back to scanning every bank file.
        bank = self._bank_paths()
        rel = {os.path.relpath(p, ROOT): p for p in bank}
        hinted = {}
        for qid, (o, r) in first_edit.items():
            for h in (r.get("files") if isinstance(r.get("files"), list) else [])[:10]:
                if isinstance(h, str) and h in rel:
                    hinted.setdefault(rel[h], set()).add(qid)
        written = [p for p in bank if self._apply_edits(p, hinted.get(p), first_edit)]
        rest = {qid for qid, (o, r) in first_edit.items() if not o["files"]}
        written += [p for p in bank if self._apply_edits(p, rest, first_edit)]
        self._refresh_manifest_hashes(written)

        for o in outcomes:
            if o["outcome"]:
                continue
            src = o.pop("_same", None) or o
            if o["action"] == "dismiss":
                o["outcome"] = "dismissed"
            elif src["files"]:
                o["outcome"] = "fixed" if o["action"] == "fix" else "dropped"
                o["files"] = list(src["files"])
            else:
                o.update(outcome="missed", reason="question not found in the bank")
        return self._close_reports(resolutions, outcomes, s)

    def _apply_edits(self, path, ids, first_edit):
        """Apply the edits for `ids` to one file; record the file on each hit.
        Returns True when the file was rewritten."""
        if not ids:
            return False
        arr = self._read_main(path)
        if not isinstance(arr, list):
            return False
        changed = False
        for qid, (o, r) in first_edit.items():
            if qid not in ids or not any(isinstance(q, dict) and q.get("id") == qid for q in arr):
                continue
            if o["action"] == "fix":
                arr = [r["fixed_question"] if isinstance(q, dict) and q.get("id") == qid else q for q in arr]
            else:
                arr = [q for q in arr if not (isinstance(q, dict) and q.get("id") == qid)]
            o["files"].append(os.path.relpath(path, ROOT))
            changed = True
        if changed:
            self._write_main(path, arr)
        return changed

    def _refresh_manifest_hashes(self, paths):
        """Update manifest `hashes` for rewritten files, as manifest_hashes.py
        would: sha1 of the file bytes, first 12 hex, only for paths the
        manifest lists, same json.dumps formatting. A hash that cannot be
        computed is deleted so the loader falls back to ?v=."""
        import hashlib
        for manifest, key in ((os.path.join(ROOT, "data", "batches_manifest.json"), "batches"), (MANIFEST, "inbox")):
            try:
                with open(manifest, encoding="utf-8") as f:
                    data = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                continue
            hashes = data.get("hashes") if isinstance(data, dict) else None
            if not isinstance(hashes, dict) or not isinstance(data.get(key), list):
                continue
            changed = False
            for full in paths:
                rel = os.path.relpath(full, os.path.join(ROOT, "data")).replace(os.sep, "/")
                if rel not in data[key]:
                    continue
                try:
                    with open(full, "rb") as f:
                        h = hashlib.sha1(f.read()).hexdigest()[:12]
                except OSError:
                    h = None
                if h and hashes.get(rel) != h:
                    hashes[rel] = h
                    changed = True
                elif not h and rel in hashes:
                    del hashes[rel]
                    changed = True
            if changed:
                tmp = manifest + ".tmp"
                with open(tmp, "w", encoding="utf-8") as f:
                    f.write(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
                os.replace(tmp, manifest)

    def _close_reports(self, resolutions, outcomes, s):
        """Close the reports whose edit landed (or were dismissed), then answer."""
        for o in outcomes:
            o.pop("_same", None)
        closing = {}
        for r, o in zip(resolutions, outcomes):
            if o["outcome"] in ("fixed", "dropped", "dismissed"):
                res_text = r.get("resolution") if isinstance(r, dict) else ""
                closing[o["report_id"]] = (o["outcome"], s(res_text)[:4000])
        unmatched = []
        if closing:
            try:
                with open(REPORTS, "r", encoding="utf-8") as f:
                    rdata = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                rdata = {"reports": []}
            rdata.setdefault("reports", [])
            now = datetime.now(timezone.utc).isoformat()
            seen = set()
            for rep in rdata["reports"]:
                c = closing.get(rep.get("id")) if isinstance(rep, dict) else None
                if c:
                    rep["status"], rep["resolution"], rep["resolved_at"] = c[0], c[1], now
                    seen.add(rep["id"])
            unmatched = [k for k in closing if k not in seen]
            with open(REPORTS, "w", encoding="utf-8") as f:
                json.dump(rdata, f, indent=2, ensure_ascii=False)
                f.write("\n")

        def count(k):
            return sum(1 for o in outcomes if o["outcome"] == k)
        missed_ids = list(dict.fromkeys(o["question_id"] for o in outcomes if o["outcome"] == "missed"))
        return self._json(200, {
            "ok": True, "fixed": count("fixed"), "dropped": count("dropped"),
            "dismissed": count("dismissed"), "missed": count("missed"),
            "failed": count("failed"), "invalid": count("invalid"),
            "missed_ids": missed_ids, "unmatched_reports": unmatched, "outcomes": outcomes,
        })

    @staticmethod
    def _servable(q):
        return (isinstance(q, dict) and isinstance(q.get("id"), str) and q["id"]
                and isinstance(q.get("stem"), str) and isinstance(q.get("options"), list)
                and len(q["options"]) >= 2 and all(isinstance(o, dict) for o in q["options"])
                and sum(1 for o in q["options"] if o.get("correct") is True) == 1)

    def _bank_paths(self):
        """Every file loadData() in app.js serves the bank from, in load order."""
        import re
        paths = list(self.TOPIC_TO_FILE.values())
        for manifest, key in ((os.path.join(ROOT, "data", "batches_manifest.json"), "batches"), (MANIFEST, "inbox")):
            try:
                with open(manifest, "r", encoding="utf-8") as f:
                    listed = json.load(f).get(key) or []
            except (FileNotFoundError, json.JSONDecodeError, AttributeError):
                continue
            for p in listed:
                if isinstance(p, str) and re.fullmatch(r"(batches|inbox)/[A-Za-z0-9._-]+\.json", p):
                    full = os.path.join(ROOT, "data", p)
                    if full not in paths:
                        paths.append(full)
        return paths

    @staticmethod
    def _audit_mismatch(original, kept, dropped):
        """None when kept + dropped name every id in original exactly once."""
        def id_of(x):
            return x.get("id") if isinstance(x, dict) and isinstance(x.get("id"), str) else None
        want = {i for i in map(id_of, original) if i}
        seen, dupes, unknown, no_id = set(), [], [], 0
        for x in list(kept) + list(dropped):
            i = id_of(x)
            if not i:
                no_id += 1
                continue
            if i in seen:
                dupes.append(i)
            elif i not in want:
                unknown.append(i)
            seen.add(i)
        missing = [i for i in want if i not in seen]
        if not (no_id or dupes or unknown or missing):
            return None
        def lst(a):
            return ", ".join(a[:5]) + (f", +{len(a) - 5} more" if len(a) > 5 else "")
        parts = []
        if missing: parts.append(f"{len(missing)} in the file but in neither list ({lst(missing)})")
        if unknown: parts.append(f"{len(unknown)} not in the file ({lst(unknown)})")
        if dupes: parts.append(f"{len(dupes)} listed twice ({lst(dupes)})")
        if no_id: parts.append(f"{no_id} without an id")
        return "Audit does not match the file. Nothing was written: " + "; ".join(parts) + "."

    def _json(self, status, obj):
        data = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def end_headers(self):
        # Defeat aggressive caching during local dev.
        if self.path.endswith((".html", ".js", ".css", ".json")):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main():
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    sys.stderr.write(f"[y4mcq] serving {ROOT} at http://127.0.0.1:{PORT}/  (POST /api/paste enabled)\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        sys.stderr.write("\n[y4mcq] shutting down\n")
        server.server_close()


if __name__ == "__main__":
    main()
