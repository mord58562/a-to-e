#!/usr/bin/env python3
"""Triage the duplicate clusters that dupe_gate --all finds.

dupe_gate says which pairs are the same question twice. It does not say
what to do about them, and the answer is not the same for every cluster.
A pair is two attempts at one exam point, so one of them goes. A cluster
of twelve questions on group B streptococcus prophylaxis is a topic the
bank over-wrote from one angle: those are worth keeping and pointing at
twelve different decisions.

    python3 scripts/dupe_triage.py plan --pairs report.json -o plan.json
    python3 scripts/dupe_triage.py retire plan.json [--apply]
    python3 scripts/dupe_triage.py validate rewrite.json
    python3 scripts/dupe_triage.py apply rewrite.json

plan      groups the pairs into clusters and splits them: clusters of
          three or more go to the differentiate list, straight pairs to
          the retire list.
retire    archives the older question of each pair into
          data/_archived_dupes/ and removes it from the served file.
validate  gates a differentiation rewrite: new ids, one correct option,
          craft rules, and - the point of the exercise - the rewrites
          must no longer duplicate each other or the bank.
apply     writes a validated rewrite into the files holding the originals.
"""
import argparse
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import dupe_gate  # noqa: E402  (same directory, and the scoring must be identical)
import manifest_hashes  # noqa: E402

ARCHIVE = ROOT / "data/_archived_dupes"
# A cluster this big is a topic the bank kept re-asking from one angle.
# Below it, the pair is simply one question written twice.
DIFFERENTIATE_FROM = 3
PARITY_CAP = 1.35
PRE_ANSWER_CAP = 150


def served_paths():
    man = json.loads((ROOT / "data/batches_manifest.json").read_text())
    batches = [b["path"] if isinstance(b, dict) else b for b in man.get("batches", [])]
    base = ["data/questions_paeds.json", "data/questions_obgyn.json",
            "data/questions_psych.json", "data/questions_medicine.json"]
    return [ROOT / p for p in base] + \
           [ROOT / (p if p.startswith("data/") else "data/" + p.lstrip("/")) for p in batches]


def load_served():
    """id -> (question, path). First file wins, as the site does."""
    out = {}
    for p in served_paths():
        try:
            arr = json.loads(p.read_text())
        except FileNotFoundError:
            continue
        for q in arr if isinstance(arr, list) else []:
            if q.get("id") and q["id"] not in out:
                out[q["id"]] = (q, p)
    return out


def clusters(pairs):
    """Connected components over the duplicate pairs."""
    parent = {}

    def find(x):
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for row in pairs:
        union(row["a"]["id"], row["b"]["id"])
    groups = defaultdict(set)
    for qid in parent:
        groups[find(qid)].add(qid)
    return [sorted(g) for g in groups.values()]


_first_commit = {}


def file_date(path):
    """When a batch file first landed. The stand-in for a missing `created`."""
    key = str(path)
    if key not in _first_commit:
        try:
            out = subprocess.run(
                ["git", "log", "--diff-filter=A", "--format=%as", "-1", "--", key],
                cwd=ROOT, capture_output=True, text=True, timeout=30).stdout.strip()
        except (OSError, subprocess.SubprocessError):
            out = ""
        _first_commit[key] = out
    return _first_commit[key]


def age_key(qid, served):
    """Sort key: oldest first. Craft rules tightened over time, so the
    newest member of a duplicate pair is the one worth keeping."""
    q, path = served[qid]
    return (q.get("created") or file_date(path.relative_to(ROOT)) or "", qid)


def cmd_plan(args):
    pairs = json.loads(Path(args.pairs).read_text())
    served = load_served()
    missing = {r[s]["id"] for r in pairs for s in ("a", "b")} - set(served)
    if missing:
        print(f"note: {len(missing)} flagged id(s) are not served (already retired); "
              "they are dropped from the plan", file=sys.stderr)

    groups = [[q for q in g if q in served] for g in clusters(pairs)]
    groups = [g for g in groups if len(g) > 1]

    differentiate, retire = [], []
    for g in sorted(groups, key=lambda g: (-len(g), g[0])):
        members = sorted(g, key=lambda qid: age_key(qid, served))
        q0 = served[members[0]][0]
        entry = {
            "topic": q0.get("topic"),
            "size": len(members),
            "members": [{
                "id": qid,
                "file": str(served[qid][1].relative_to(ROOT)),
                "created": served[qid][0].get("created") or file_date(served[qid][1].relative_to(ROOT)),
                "difficulty": served[qid][0].get("difficulty"),
                "subtopic": served[qid][0].get("subtopic"),
                "subtopic_detail": served[qid][0].get("subtopic_detail"),
                "answer": dupe_gate.correct_option(served[qid][0]),
            } for qid in members],
        }
        if len(members) >= DIFFERENTIATE_FROM:
            differentiate.append(entry)
        else:
            entry["keep"] = members[-1]
            entry["retire"] = members[0]
            retire.append(entry)

    plan = {"differentiate": differentiate, "retire": retire}
    Path(args.out).write_text(json.dumps(plan, indent=1, ensure_ascii=False))

    dq = sum(c["size"] for c in differentiate)
    print(f"{len(differentiate) + len(retire)} clusters over "
          f"{dq + sum(c['size'] for c in retire)} questions")
    print(f"  differentiate: {len(differentiate)} clusters, {dq} questions")
    print(f"  retire:        {len(retire)} pairs, {len(retire)} questions removed")
    by_topic = defaultdict(int)
    for c in differentiate + retire:
        by_topic[c["topic"]] += c["size"]
    for t, n in sorted(by_topic.items(), key=lambda kv: -kv[1]):
        print(f"    {t}: {n}")
    print(f"\nwrote {args.out}")
    return 0


def cmd_retire(args):
    plan = json.loads(Path(args.plan).read_text())
    served = load_served()
    by_path = defaultdict(list)
    for cluster in plan["retire"]:
        qid = cluster["retire"]
        if qid not in served:
            continue
        by_path[served[qid][1]].append(qid)

    total = 0
    for path, ids in sorted(by_path.items()):
        arr = json.loads(path.read_text())
        removed = [q for q in arr if q.get("id") in set(ids)]
        kept = [q for q in arr if q.get("id") not in set(ids)]
        total += len(removed)
        print(f"  {path.relative_to(ROOT)}: retiring {len(removed)} of {len(arr)}")
        if not args.apply:
            continue
        ARCHIVE.mkdir(parents=True, exist_ok=True)
        dest = ARCHIVE / path.name
        prior = json.loads(dest.read_text()) if dest.exists() else []
        dest.write_text(json.dumps(prior + removed, indent=1, ensure_ascii=False))
        path.write_text(json.dumps(kept, indent=1, ensure_ascii=False))
    if args.apply:
        manifest_hashes.refresh()  # rewritten files need new cache keys
    print(f"{total} question(s) {'retired' if args.apply else 'would be retired'}")
    if not args.apply:
        print("dry run; pass --apply to write")
    return 0


def parity(q):
    lens = [len(o.get("text") or "") for o in q.get("options", [])]
    lens = [n for n in lens if n]
    return (max(lens) / min(lens)) if lens else 1.0


def pre_answer_words(q):
    parts = [q.get("stem") or "", q.get("lead_in") or ""]
    parts += [v for v in (q.get("data_table") or {}).values() if isinstance(v, str)]
    parts += [o.get("text") or "" for o in q.get("options", [])]
    return sum(len(p.split()) for p in parts)


def check_one(q, served, problems):
    qid = q.get("id")
    old_id = q.get("replaces")
    if not qid:
        problems.append(("?", "no id"))
        return
    if not old_id:
        problems.append((qid, "no `replaces` field naming the question it rewrites"))
        return
    if old_id not in served:
        problems.append((qid, f"replaces {old_id!r}, which is not in the served bank"))
        return
    old = served[old_id][0]
    if qid in served:
        problems.append((qid, "id already exists in the bank; a rewrite takes a new id "
                              "so user history reads it as unseen"))
    if not re.fullmatch(re.escape(old_id) + r"-[a-z0-9]+(-[a-z0-9]+)*", qid):
        problems.append((qid, f"id must be the original plus a kebab-case suffix "
                              f"({old_id}-d2), so the lineage is readable"))
    if q.get("topic") != old.get("topic"):
        problems.append((qid, "topic changed"))
    opts = q.get("options") or []
    if len(opts) != 5:
        problems.append((qid, f"{len(opts)} options, expected 5"))
    if sum(1 for o in opts if o.get("correct")) != 1:
        problems.append((qid, "expected exactly 1 correct option"))
    for i, o in enumerate(opts):
        if not (o.get("text") or "").strip():
            problems.append((qid, f"option {i+1} has no text"))
        if not o.get("source_refs"):
            problems.append((qid, f"option {i+1} has no source_refs"))
        if not (o.get("rationale") or "").strip():
            problems.append((qid, f"option {i+1} has no rationale"))
    if q.get("difficulty") not in (1, 2, 3, 4, 5):
        problems.append((qid, f"difficulty {q.get('difficulty')!r} is not 1-5"))
    for f in ("stem", "lead_in", "explanation", "subtopic", "subtopic_detail", "sources"):
        if not q.get(f):
            problems.append((qid, f"missing {f}"))
    par = parity(q)
    if par > PARITY_CAP:
        problems.append((qid, f"option-length parity {par:.2f} exceeds {PARITY_CAP}"))
    n = pre_answer_words(q)
    if n > PRE_ANSWER_CAP:
        problems.append((qid, f"{n} words before the answer, cap is {PRE_ANSWER_CAP}"))
    blob = json.dumps(q, ensure_ascii=False)
    for rx, why in (("\u2014", "em-dash"), (r"\*\*", "markdown emphasis"),
                    # Spelled from character codes, as in check_tokens.py.
                    (r"(?i)\b" + "".join(map(chr, (65, 84, 83, 73))) + r"\b",
                     "the banned initialism"),
                    ("(?i)" + chr(99) + "anonical", "the banned word")):
        if re.search(rx, blob):
            problems.append((qid, f"contains {why}"))
    # The whole point: the rewrite has to be a different question.
    a, b = dupe_gate.to_record(q, "rewrite"), dupe_gate.to_record(old, "bank")
    combined, det, ans = dupe_gate.score(a, b)
    if dupe_gate.is_duplicate(combined, det, ans, a, b):
        problems.append((qid, f"still duplicates the original it replaces "
                              f"({combined:.2f}); it has to test something else"))


def cmd_validate(args):
    served = load_served()
    try:
        new = json.loads(Path(args.file).read_text())
    except (json.JSONDecodeError, OSError) as e:
        print(f"FAIL: {args.file} does not parse: {e}")
        return 1
    if not isinstance(new, list):
        print("FAIL: expected a JSON array of questions")
        return 1

    problems = []
    seen = set()
    for q in new:
        if q.get("id") in seen:
            problems.append((q.get("id"), "id appears twice in this file"))
        seen.add(q.get("id"))
        check_one(q, served, problems)

    # Against each other, and against the bank minus the originals they replace.
    replaced = {q.get("replaces") for q in new}
    records = [dupe_gate.to_record(q, args.file) for q in new]
    bank = [dupe_gate.to_record(q, str(p)) for qid, (q, p) in served.items()
            if qid not in replaced and qid not in seen]
    bank_dupes, _ = dupe_gate.compare(records, bank, False)
    self_dupes, _bands, _ = dupe_gate.self_compare(records)
    for combined, _d, _a, a, b in bank_dupes:
        problems.append((a["id"], f"duplicates published {b['id']} ({combined:.2f})"))
    for combined, _d, _a, a, b in self_dupes:
        problems.append((a["id"], f"duplicates {b['id']} in this same file ({combined:.2f})"))

    print(f"{len(new)} rewrite(s) in {args.file}")
    if problems:
        print(f"\n{len(problems)} problem(s):")
        for qid, why in problems[:80]:
            print(f"  {str(qid):28} {why}")
        if len(problems) > 80:
            print(f"  ... and {len(problems) - 80} more")
        return 1
    print("\nclean")
    return 0


def cmd_apply(args):
    if cmd_validate(args) != 0:
        print("\nrefusing to apply a file that does not validate")
        return 1
    served = load_served()
    new = json.loads(Path(args.file).read_text())
    by_path = defaultdict(dict)
    for q in new:
        by_path[served[q["replaces"]][1]][q["replaces"]] = q
    total = 0
    for path, updates in sorted(by_path.items()):
        arr = json.loads(path.read_text())
        for i, q in enumerate(arr):
            old_id = q.get("id")
            if old_id in updates:
                replacement = dict(updates[old_id])
                replacement.pop("replaces", None)
                replacement["revised_from"] = old_id
                arr[i] = replacement
                total += 1
        path.write_text(json.dumps(arr, indent=1, ensure_ascii=False))
        print(f"  {path.relative_to(ROOT)}: {len(updates)} replaced")
    manifest_hashes.refresh()  # rewritten files need new cache keys
    print(f"{total} question(s) applied.")
    return 0


# Cases the validator has to keep catching. A differentiation rewrite is
# the one edit that deliberately changes the keyed answer, so the usual
# content validator cannot gate it and this one is the only thing
# standing between a "rewrite" and the same question with a new id.
def _fake(qid, replaces, detail, answer, **over):
    q = {
        "id": qid, "replaces": replaces, "topic": "Paediatrics",
        "subtopic": "Respiratory", "subtopic_detail": detail, "difficulty": 3,
        "stem": "A 6 year old presents to the emergency department.",
        "lead_in": "What is the most appropriate next step?",
        "explanation": {"summary": "Because."}, "sources": ["Therapeutic Guidelines"],
        "options": [{"letter": "ABCDE"[i], "text": (answer if i == 0 else f"A plausible alternative number {i}"),
                     "correct": i == 0, "rationale": "Because.",
                     "source_refs": ["Therapeutic Guidelines"]} for i in range(5)],
    }
    q.update(over)
    return q


def selftest():
    """Every case here is a way a rewrite has actually gone wrong."""
    original = _fake("paeds-1", None, "acute asthma, intravenous escalation",
                     "Intravenous magnesium sulfate 50 mg/kg over 20 minutes")
    original.pop("replaces")
    served = {"paeds-1": (original, ROOT / "data/batches/selftest.json")}

    def check(q):
        problems = []
        check_one(q, served, problems)
        return problems

    cases = [
        ("an unchanged copy under a new id",
         _fake("paeds-1-d2", "paeds-1", "acute asthma, intravenous escalation",
               "Intravenous magnesium sulfate 50 mg/kg over 20 minutes"), True),
        ("no `replaces` field",
         _fake("paeds-1-d2", None, "oxygen target in acute asthma",
               "Titrate oxygen to 92 to 95 per cent"), True),
        ("keeping the original id",
         _fake("paeds-1", "paeds-1", "oxygen target in acute asthma",
               "Titrate oxygen to 92 to 95 per cent"), True),
        ("an id with no lineage",
         _fake("something-else", "paeds-1", "oxygen target in acute asthma",
               "Titrate oxygen to 92 to 95 per cent"), True),
        ("an option-length parity breach",
         _fake("paeds-1-d2", "paeds-1", "oxygen target in acute asthma",
               "Titrate the inspired oxygen to a saturation of 92 to 95 per cent and reassess"), True),
        ("a genuine differentiation",
         _fake("paeds-1-d2", "paeds-1", "oxygen target in acute asthma",
               "Titrate oxygen to 92 to 95 per cent"), False),
    ]

    failures = 0
    for name, q, should_fail in cases:
        problems = check(q)
        if bool(problems) != should_fail:
            failures += 1
            print(f"FAIL: {name} -> {'rejected' if problems else 'accepted'}, expected "
                  f"{'rejected' if should_fail else 'accepted'}"
                  + (f"\n      {problems[0][1]}" if problems else ""))
    print(f"{len(cases) - failures}/{len(cases)} validator cases pass")
    return 1 if failures else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("selftest")
    p = sub.add_parser("plan")
    p.add_argument("--pairs", required=True, help="JSON from dupe_gate --all --json")
    p.add_argument("-o", "--out", default="dupe_plan.json")
    p = sub.add_parser("retire")
    p.add_argument("plan")
    p.add_argument("--apply", action="store_true")
    for name in ("validate", "apply"):
        p = sub.add_parser(name)
        p.add_argument("file")
    args = ap.parse_args()
    if args.cmd == "selftest":
        return selftest()
    return {"plan": cmd_plan, "retire": cmd_retire,
            "validate": cmd_validate, "apply": cmd_apply}[args.cmd](args) or 0


if __name__ == "__main__":
    sys.exit(main())
