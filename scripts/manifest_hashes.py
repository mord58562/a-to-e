#!/usr/bin/env python3
"""Refresh the per-file content hashes in the batch and inbox manifests.

The site loader (assets/app.js loadData) fetches each listed file with
`?h=<hash>` when the manifest carries one, so a file is only downloaded
again when its bytes change. Without a hash it falls back to the meta.json
date key, which re-downloads every file whenever that date moves.

The hashes live in a `hashes` object beside the path list:

    {"batches": ["batches/x.json", ...], "hashes": {"batches/x.json": "3f2a..."}}

The path list itself is untouched, so every reader that expects a list of
strings (the worker's ghAppendManifest, merge_batches.sh, check_tokens.py)
keeps working. A path with no hash, or a stale one, is harmless: the loader
falls back, and Pages' max-age bounds how long a stale key can serve old
bytes.

The batches manifest also records `split`: the question-only and
commentary files that scripts/split_bank.py derives from each batch, and
the source hash each pair was built from. refresh() rebuilds a pair
whenever its batch's hash moves, so every caller below keeps the split in
step without knowing about it, and --check reports a stale split.

Run it after anything that rewrites a served file, and commit data/split/
with the manifest. merge_batches.sh, merge_inbox.sh, content_pass.py apply
and dupe_triage.py apply call it, and .github/workflows/rebuild-bank.yml
runs it on main after every push that touches the bank, which repairs a
batch committed without it.

Usage:
    python3 scripts/manifest_hashes.py            # rewrite the manifests
    python3 scripts/manifest_hashes.py --check    # exit 1 if any hash or split is stale
"""
import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import split_bank  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFESTS = (("data/batches_manifest.json", "batches"),
             ("data/inbox_manifest.json", "inbox"))
HASH_LEN = 12


def file_hash(path):
    with open(path, "rb") as fh:
        return hashlib.sha1(fh.read()).hexdigest()[:HASH_LEN]


def expected_hashes(manifest, key):
    out = {}
    for rel in manifest.get(key) or []:
        if not isinstance(rel, str):
            continue
        full = os.path.join(ROOT, "data", rel)
        if os.path.exists(full):
            out[rel] = file_hash(full)
    return out


def refresh(check=False, quiet=False):
    """Rewrite each manifest's `hashes`. Returns the number of stale entries."""
    stale_total = 0
    for rel_manifest, key in MANIFESTS:
        path = os.path.join(ROOT, rel_manifest)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as fh:
            raw = fh.read()
        manifest = json.loads(raw)
        if not isinstance(manifest, dict) or not isinstance(manifest.get(key), list):
            raise SystemExit(f"ABORT: {rel_manifest} has no {key!r} list; not touching it")
        want = expected_hashes(manifest, key)
        have = manifest.get("hashes") if isinstance(manifest.get("hashes"), dict) else {}
        stale = sorted(p for p in set(want) | set(have) if want.get(p) != have.get(p))
        stale_total += len(stale)
        if not quiet:
            print(f"{rel_manifest}: {len(want)} hashed, {len(stale)} changed")
        before_split = json.dumps(manifest.get("split"), sort_keys=True)
        if key == "batches":
            # Built from the new hashes, so a rewritten batch gets a fresh
            # pair in the same run.
            stale_total += split_bank.sync(manifest, want, check=check, quiet=quiet)
        split_moved = json.dumps(manifest.get("split"), sort_keys=True) != before_split
        if check or not (stale or split_moved):
            continue
        if want:
            manifest["hashes"] = want
        else:
            manifest.pop("hashes", None)
        text = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            fh.write(text)
        os.replace(tmp, path)
    return stale_total


def main(args=None):
    args = sys.argv[1:] if args is None else args
    if args not in ([], ["--check"]):
        print(__doc__)
        return 2
    stale = refresh(check=bool(args))
    if args and stale:
        print(f"{stale} stale hash(es) or split(s); run python3 scripts/manifest_hashes.py")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
