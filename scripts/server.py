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
            return self._json(400, {"ok": False, "error": err})
        questions = payload.get("questions")
        if not isinstance(questions, list) or not questions:
            return self._json(400, {"ok": False, "error": "expected non-empty `questions` array"})
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
            return self._json(400, {"ok": False, "error": err})
        qid = payload.get("question_id")
        issue = payload.get("issue")
        if not isinstance(qid, str) or not qid:
            return self._json(400, {"ok": False, "error": "missing question_id"})
        if not isinstance(issue, str) or len(issue.strip()) < 3:
            return self._json(400, {"ok": False, "error": "issue text too short"})
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
            return self._json(400, {"ok": False, "error": err})
        audit = payload.get("audit") or {}
        batch_path = payload.get("batch_path")    # "inbox/...json" or None
        kept = audit.get("kept") or []
        dropped = audit.get("dropped") or []
        if not isinstance(kept, list) or not isinstance(dropped, list):
            return self._json(400, {"ok": False, "error": "audit.kept and audit.dropped must be arrays"})

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

    def _handle_apply_report(self):
        payload, err = self._read_json()
        if err:
            return self._json(400, {"ok": False, "error": err})
        resolutions = payload.get("resolutions") or []
        if not isinstance(resolutions, list) or not resolutions:
            return self._json(400, {"ok": False, "error": "expected non-empty resolutions array"})

        # 1. Update reports.json statuses.
        try:
            with open(REPORTS, "r", encoding="utf-8") as f:
                rdata = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            rdata = {"reports": []}
        rdata.setdefault("reports", [])
        rep_by_id = {r["id"]: r for r in rdata["reports"]}
        now = datetime.now(timezone.utc).isoformat()
        for r in resolutions:
            rep = rep_by_id.get(r.get("report_id"))
            if rep:
                action = r.get("action", "dismiss")
                rep["status"] = "fixed" if action == "fix" else ("dropped" if action == "drop" else "dismissed")
                rep["resolution"] = r.get("resolution", "")
                rep["resolved_at"] = now
        with open(REPORTS, "w", encoding="utf-8") as f:
            json.dump(rdata, f, indent=2, ensure_ascii=False)
            f.write("\n")

        # 2. Apply fix/drop to question files.
        result = {"fixed": 0, "dropped": 0, "dismissed": sum(1 for r in resolutions if r.get("action") == "dismiss")}
        # Build qid -> file lookup across all main files.
        qid_to_path = {}
        files_cache = {}
        for path in self.TOPIC_TO_FILE.values():
            arr = self._read_main(path)
            files_cache[path] = arr
            for q in arr:
                if q.get("id"):
                    qid_to_path[q["id"]] = path

        for r in resolutions:
            action = r.get("action")
            if action not in ("fix", "drop"):
                continue
            qid = r.get("question_id")
            fq = r.get("fixed_question")
            path = (fq and self.TOPIC_TO_FILE.get(fq.get("topic"))) or qid_to_path.get(qid)
            if not path:
                continue
            arr = files_cache.setdefault(path, self._read_main(path))
            idx = next((i for i, q in enumerate(arr) if q.get("id") == qid), -1)
            if action == "fix" and fq:
                if idx >= 0: arr[idx] = fq
                else: arr.append(fq)
                result["fixed"] += 1
            elif action == "drop":
                if idx >= 0:
                    del arr[idx]
                    result["dropped"] += 1

        for path, arr in files_cache.items():
            self._write_main(path, arr)

        return self._json(200, {"ok": True, **result})

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
