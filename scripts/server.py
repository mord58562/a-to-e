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
PORT = int(os.environ.get("Y4MCQ_PORT", "8765"))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("[y4mcq] " + (fmt % args) + "\n")

    def do_POST(self):
        if self.path != "/api/paste":
            self.send_error(404, "Not found")
            return
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length).decode("utf-8", errors="replace")
        try:
            payload = json.loads(body)
        except json.JSONDecodeError as e:
            return self._json(400, {"ok": False, "error": f"invalid JSON: {e}"})

        questions = payload.get("questions")
        if not isinstance(questions, list) or not questions:
            return self._json(400, {"ok": False, "error": "expected non-empty `questions` array"})

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
