#!/usr/bin/env python3
"""Build the served question/commentary split of each listed batch file.

The batch files in data/batches/ stay the single source of truth, and
every tool keeps writing full question objects to them. This script
derives two served files from each one, in data/split/:

    <name>.q.json   the batch with everything needed before answering:
                    the same array, the same objects, minus the
                    commentary fields below
    <name>.c.json   the commentary, one entry per question in the same
                    order: [{"id", "explanation", "sources",
                    "options": [{"letter", "rationale", "source_refs"}]}]

About 60% of the bank's bytes are commentary that nothing reads before
an answer is revealed, so the loader boots on the .q files and fetches
the .c files afterwards (assets/app.js, "Commentary").

The pair is recorded in data/batches_manifest.json beside the hashes:

    "split": {"batches/x.json": {"from": "<hash of batches/x.json>",
              "questions": "split/x.q.json", "questions_hash": "...",
              "commentary": "split/x.c.json", "commentary_hash": "..."}}

`from` is the manifest hash of the source file the pair was built from.
The loader uses the pair only while `from` equals the batch's current
hash in `hashes`; after an edit that refreshed the hash without
rebuilding the split (the worker's /apply-report and live audit), the
batch is loaded whole, so commentary is never stale.

manifest_hashes.refresh() calls sync() after rewriting the hashes, so
every tool that refreshes hashes also rebuilds the split, and
`manifest_hashes.py --check` reports a stale or missing split.

Usage:
    python3 scripts/split_bank.py            # same as manifest_hashes.py
    python3 scripts/split_bank.py --check    # exit 1 if anything is stale
    python3 scripts/split_bank.py --verify   # rebuild every pair in memory
                                             # and prove it merges back to
                                             # the source exactly
"""
import copy
import hashlib
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPLIT_DIR = "split"                       # under data/
# Read only after the answer is revealed (or in admin exports, which
# merge them back). Everything else stays in the question file.
QUESTION_POST = ("explanation", "sources")
OPTION_POST = ("rationale", "source_refs")
HASH_LEN = 12


def text_hash(data):
    return hashlib.sha1(data).hexdigest()[:HASH_LEN]


def file_hash(path):
    with open(path, "rb") as fh:
        return text_hash(fh.read())


def dumps(obj):
    # Compact: the served files are machine-read, and the sources keep the
    # readable indentation.
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n"


def split_questions(questions):
    """Returns (question_only_list, commentary_list) for one batch array."""
    q_out, c_out = [], []
    for q in questions:
        if not isinstance(q, dict):
            q_out.append(q)
            c_out.append(None)
            continue
        pre = {k: v for k, v in q.items() if k not in QUESTION_POST}
        post = {"id": q.get("id")}
        for k in QUESTION_POST:
            if k in q:
                post[k] = q[k]
        opts = q.get("options")
        if isinstance(opts, list):
            pre_opts, post_opts = [], []
            for o in opts:
                if isinstance(o, dict):
                    pre_opts.append({k: v for k, v in o.items() if k not in OPTION_POST})
                    po = {"letter": o.get("letter")}
                    for k in OPTION_POST:
                        if k in o:
                            po[k] = o[k]
                    post_opts.append(po)
                else:
                    pre_opts.append(o)
                    post_opts.append(None)
            pre["options"] = pre_opts
            post["options"] = post_opts
        q_out.append(pre)
        c_out.append(post)
    return q_out, c_out


def merge(q_list, c_list):
    """The client's merge (assets/app.js applyCommentary), for --verify."""
    out = copy.deepcopy(q_list)
    for q, c in zip(out, c_list):
        if not isinstance(q, dict) or not isinstance(c, dict) or c.get("id") != q.get("id"):
            continue
        for k, v in c.items():
            if k not in ("id", "options"):
                q[k] = v
        opts = q.get("options")
        if isinstance(opts, list) and isinstance(c.get("options"), list):
            for o, co in zip(opts, c["options"]):
                if isinstance(o, dict) and isinstance(co, dict) and co.get("letter") == o.get("letter"):
                    for k, v in co.items():
                        if k != "letter":
                            o[k] = v
    return out


def pair_paths(rel):
    """batches/x.json -> (split/x.q.json, split/x.c.json), relative to data/."""
    base = os.path.basename(rel)
    stem = base[:-5] if base.endswith(".json") else base
    return f"{SPLIT_DIR}/{stem}.q.json", f"{SPLIT_DIR}/{stem}.c.json"


def build(rel, source_hash):
    """Writes the pair for one batch and returns its manifest entry."""
    with open(os.path.join(ROOT, "data", rel), encoding="utf-8") as fh:
        questions = json.load(fh)
    if not isinstance(questions, list):
        return None
    q_list, c_list = split_questions(questions)
    q_rel, c_rel = pair_paths(rel)
    entry = {"from": source_hash, "questions": q_rel, "commentary": c_rel}
    for key, rel_out, obj in (("questions_hash", q_rel, q_list), ("commentary_hash", c_rel, c_list)):
        data = dumps(obj).encode("utf-8")
        full = os.path.join(ROOT, "data", rel_out)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        tmp = full + ".tmp"
        with open(tmp, "wb") as fh:
            fh.write(data)
        os.replace(tmp, full)
        entry[key] = text_hash(data)
    return entry


def entry_current(entry, source_hash):
    if not isinstance(entry, dict) or entry.get("from") != source_hash:
        return False
    for path_key, hash_key in (("questions", "questions_hash"), ("commentary", "commentary_hash")):
        rel = entry.get(path_key)
        if not isinstance(rel, str):
            return False
        full = os.path.join(ROOT, "data", rel)
        if not os.path.exists(full) or file_hash(full) != entry.get(hash_key):
            return False
    return True


def sync(manifest, hashes, check=False, quiet=False):
    """Brings manifest["split"] in step with `hashes` ({batch rel: hash}).

    Rebuilds the pair of every batch whose entry is missing or stale,
    drops entries for batches no longer listed and deletes their files.
    With check=True nothing is written. Returns the number of batches
    whose split is stale (or would be removed)."""
    have = manifest.get("split") if isinstance(manifest.get("split"), dict) else {}
    want = {}
    stale = []
    for rel, h in hashes.items():
        if entry_current(have.get(rel), h):
            want[rel] = have[rel]
            continue
        stale.append(rel)
        if check:
            continue
        entry = build(rel, h)
        if entry:
            want[rel] = entry
    removed = sorted(set(have) - set(hashes))
    if not quiet and (stale or removed):
        print(f"split: {len(stale)} stale or missing, {len(removed)} unlisted"
              + ("" if check else " (rebuilt)"))
        for rel in stale[:20]:
            print(f"  stale split: {rel}")
    if check:
        return len(stale) + len(removed)
    if want:
        manifest["split"] = want
    else:
        manifest.pop("split", None)
    # Files in data/split/ that no entry names are left over from a
    # renamed or retired batch.
    keep = {os.path.normpath(e[k]) for e in want.values() for k in ("questions", "commentary")}
    split_dir = os.path.join(ROOT, "data", SPLIT_DIR)
    if os.path.isdir(split_dir):
        for name in os.listdir(split_dir):
            rel = os.path.normpath(f"{SPLIT_DIR}/{name}")
            if (name.endswith(".q.json") or name.endswith(".c.json")) and rel not in keep:
                os.remove(os.path.join(split_dir, name))
    return len(stale) + len(removed)


def verify():
    """Rebuilds every listed pair in memory and checks it merges back to
    the source exactly, and that the files on disk match."""
    with open(os.path.join(ROOT, "data", "batches_manifest.json"), encoding="utf-8") as fh:
        manifest = json.load(fh)
    split = manifest.get("split") or {}
    bad = 0
    for rel in manifest.get("batches") or []:
        full = os.path.join(ROOT, "data", rel)
        if not os.path.exists(full):
            continue
        with open(full, encoding="utf-8") as fh:
            src = json.load(fh)
        q_list, c_list = split_questions(src)
        if merge(q_list, c_list) != src:
            print(f"MISMATCH (merge != source): {rel}")
            bad += 1
            continue
        e = split.get(rel)
        if not e:
            print(f"no split entry: {rel}")
            bad += 1
            continue
        for key, obj in (("questions", q_list), ("commentary", c_list)):
            with open(os.path.join(ROOT, "data", e[key]), encoding="utf-8") as fh:
                if json.load(fh) != obj:
                    print(f"stale on disk: {e[key]}")
                    bad += 1
    print(f"verify: {len(manifest.get('batches') or [])} batches, {bad} problem(s)")
    return 1 if bad else 0


def main():
    args = sys.argv[1:]
    if args == ["--verify"]:
        return verify()
    if args not in ([], ["--check"]):
        print(__doc__)
        return 2
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import manifest_hashes
    return manifest_hashes.main(args)


if __name__ == "__main__":
    sys.exit(main())
