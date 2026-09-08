#!/usr/bin/env python3
"""Near-duplicate detection for the A to E MCQ bank.

Keyword novelty checks miss spelling and synonym variants (foetal/fetal,
shingles/herpes zoster, "secondary PPH"/"heavy bleeding on day twelve"), so
duplicates accumulated silently. This compares questions on the pairing that
actually defines a duplicate: what the question is about (subtopic_detail) and
what it wants you to do (the correct option).

Two modes:

  gate   python3 scripts/dupe_gate.py --new data/batches/new_*.json
         Scores each new question against the existing bank. Exit 1 if any
         question duplicates one already published. Run before publishing.

  audit  python3 scripts/dupe_gate.py --all [--json report.json]
         Scores the whole bank against itself and reports the bands.

Comparison is within a topic only; the same detail in Paediatrics and Medicine
is a different question.
"""

import argparse
import difflib
import glob
import json
import os
import re
import sys
from collections import defaultdict

# Spelling variants that keyword matching treats as different words. AU spelling
# is the house style; these fold to a comparison form only, nothing is rewritten.
SPELLING = [
    ("foetal", "fetal"), ("foetus", "fetus"), ("oedema", "edema"),
    ("paediatric", "pediatric"), ("anaemia", "anemia"), ("anaemic", "anemic"),
    ("diarrhoea", "diarrhea"), ("gynaecolog", "gynecolog"), ("haemo", "hemo"),
    ("haema", "hema"), ("oesophag", "esophag"), ("orthopaedic", "orthopedic"),
    ("caesarean", "cesarean"), ("leucocyte", "leukocyte"), ("tumour", "tumor"),
    ("behaviour", "behavior"), ("sulphur", "sulfur"), ("ischaemi", "ischemi"),
    ("paralys", "paralyz"), ("anaesthe", "anesthe"), ("gonorrhoea", "gonorrhea"),
    ("dyspnoea", "dyspnea"), ("apnoea", "apnea"), ("coeliac", "celiac"),
    ("orthopaed", "orthoped"), ("pyrexia", "fever"),
]

# Clinical terms that name the same thing. Kept short and specific on purpose:
# an over-eager map collapses genuinely different questions.
SYNONYMS = [
    (r"\bshingles\b", "herpes zoster"),
    (r"\bchicken ?pox\b", "varicella"),
    (r"\bpph\b", "postpartum haemorrhage"),
    (r"\bpost ?partum\b", "postpartum"),
    (r"\bwhooping cough\b", "pertussis"),
    (r"\bglandular fever\b", "infectious mononucleosis"),
    (r"\bheart attack\b", "myocardial infarction"),
    (r"\bmi\b", "myocardial infarction"),
    (r"\bdvt\b", "deep vein thrombosis"),
    (r"\bpe\b", "pulmonary embolism"),
    (r"\buti\b", "urinary tract infection"),
    (r"\bdka\b", "diabetic ketoacidosis"),
    (r"\bcopd\b", "chronic obstructive pulmonary disease"),
    (r"\bgord\b", "gastro oesophageal reflux"),
    (r"\bgdm\b", "gestational diabetes"),
    (r"\biugr\b", "fetal growth restriction"),
    (r"\bfgr\b", "fetal growth restriction"),
    (r"\btia\b", "transient ischaemic attack"),
    (r"\baki\b", "acute kidney injury"),
    (r"\bckd\b", "chronic kidney disease"),
]

TOPICS = ["Paediatrics", "Obstetrics & Gynaecology", "Psychiatry", "Medicine"]

# A pair at or above HARD is the same question twice.
HARD = 0.80
# A pair at or above SOFT is worth a human look but is often ordinary
# same-topic variation.
SOFT = 0.62
# An identical action on a near-identical presentation is a duplicate even when
# the wording diverges.
ANSWER_HARD = 0.85
ANSWER_DETAIL_FLOOR = 0.62


def normalise(text):
    s = str(text or "").lower()
    for pat, rep in SYNONYMS:
        s = re.sub(pat, rep, s)
    for src, dst in SPELLING:
        s = s.replace(src, dst)
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def correct_option(q):
    for o in q.get("options") or []:
        if isinstance(o, dict) and (o.get("correct") or o.get("is_correct")):
            return o.get("text", "")
    answer = q.get("answer")
    if isinstance(answer, str):
        return answer
    if isinstance(answer, int) and isinstance(q.get("options"), list):
        try:
            opt = q["options"][answer]
            return opt.get("text", "") if isinstance(opt, dict) else opt
        except (IndexError, KeyError, TypeError):
            return ""
    return ""


def load(paths):
    records = []
    for fp in paths:
        try:
            data = json.load(open(fp))
        except (json.JSONDecodeError, OSError) as exc:
            print(f"warning: could not read {fp}: {exc}", file=sys.stderr)
            continue
        if not isinstance(data, list):
            continue
        for q in data:
            if not isinstance(q, dict):
                continue
            det = normalise(q.get("subtopic_detail"))
            ans = normalise(correct_option(q))
            records.append({
                "id": q.get("id"),
                "topic": q.get("topic"),
                "file": fp,
                "det": det,
                "ans": ans,
                "key": det + " || " + ans,
            })
    return records


# Pairs below this on the combined key cannot reach any flagging rule, so the
# expensive per-field comparisons are skipped.
PREFILTER = 0.55


def score(a, b):
    """Combined, detail and answer similarity, with cheap prefilters first."""
    ka, kb = a["key"], b["key"]
    if not ka or not kb:
        return 0.0, 0.0, 0.0
    if min(len(ka), len(kb)) / max(len(ka), len(kb)) < PREFILTER:
        return 0.0, 0.0, 0.0
    sm = difflib.SequenceMatcher(None, ka, kb, autojunk=False)
    if sm.real_quick_ratio() < PREFILTER or sm.quick_ratio() < PREFILTER:
        return 0.0, 0.0, 0.0
    combined = sm.ratio()
    if combined < PREFILTER:
        return combined, 0.0, 0.0
    det = difflib.SequenceMatcher(None, a["det"], b["det"], autojunk=False).ratio()
    ans = difflib.SequenceMatcher(None, a["ans"], b["ans"], autojunk=False).ratio()
    return combined, det, ans


def is_duplicate(combined, det, ans):
    return combined >= HARD or (ans >= ANSWER_HARD and det >= ANSWER_DETAIL_FLOOR)


def bank_paths(exclude=()):
    excluded = {os.path.normpath(p) for p in exclude}
    paths = sorted(glob.glob("data/questions_*.json") + glob.glob("data/batches/*.json"))
    return [p for p in paths if os.path.normpath(p) not in excluded]


def compare(new_records, old_records, report_soft):
    """Every new record against every old record, within topic."""
    by_topic = defaultdict(list)
    for r in old_records:
        by_topic[r["topic"]].append(r)

    duplicates, reviews = [], []
    for a in new_records:
        for b in by_topic.get(a["topic"], ()):
            if a["id"] and a["id"] == b["id"]:
                continue
            combined, det, ans = score(a, b)
            if is_duplicate(combined, det, ans):
                duplicates.append((combined, det, ans, a, b))
            elif report_soft and combined >= SOFT:
                reviews.append((combined, det, ans, a, b))
    return duplicates, reviews


def self_compare(records):
    by_topic = defaultdict(list)
    for r in records:
        by_topic[r["topic"]].append(r)

    duplicates = []
    bands = defaultdict(int)
    for items in by_topic.values():
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                combined, det, ans = score(items[i], items[j])
                if is_duplicate(combined, det, ans):
                    duplicates.append((combined, det, ans, items[i], items[j]))
                if combined >= 0.90:
                    bands["0.90+"] += 1
                elif combined >= 0.80:
                    bands["0.80-0.90"] += 1
                elif combined >= 0.70:
                    bands["0.70-0.80"] += 1
                elif combined >= SOFT:
                    bands["0.62-0.70"] += 1
    return duplicates, bands


def render(rows, label):
    print(f"=== {label}: {len(rows)} ===")
    for combined, det, ans, a, b in sorted(rows, key=lambda r: -r[0]):
        print(f"{combined:.3f} (detail {det:.2f}, answer {ans:.2f}) | {a['topic']}")
        print(f"    {a['id']}  [{a['file']}]")
        print(f"      det: {a['det'][:110]}")
        print(f"      ans: {a['ans'][:110]}")
        print(f"    {b['id']}  [{b['file']}]")
        print(f"      det: {b['det'][:110]}")
        print(f"      ans: {b['ans'][:110]}")


def as_json(rows):
    return [{
        "combined": round(c, 3), "detail": round(d, 3), "answer": round(n, 3),
        "topic": a["topic"],
        "a": {k: a[k] for k in ("id", "file", "det", "ans")},
        "b": {k: b[k] for k in ("id", "file", "det", "ans")},
    } for c, d, n, a, b in sorted(rows, key=lambda r: -r[0])]


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--new", nargs="+", metavar="PATH",
                    help="batch files to gate against the existing bank")
    ap.add_argument("--all", action="store_true",
                    help="audit the whole bank against itself")
    ap.add_argument("--json", metavar="PATH", help="write findings as JSON")
    ap.add_argument("--show-review", action="store_true",
                    help="also list pairs in the 0.62 to 0.80 review band")
    args = ap.parse_args()

    if not args.new and not args.all:
        ap.error("pass --new <files> to gate a batch, or --all to audit the bank")

    if args.new:
        new_paths = []
        for pattern in args.new:
            new_paths.extend(sorted(glob.glob(pattern)) or [pattern])
        new_records = load(new_paths)
        old_records = load(bank_paths(exclude=new_paths))
        print(f"gating {len(new_records)} new questions against {len(old_records)} existing")
        duplicates, reviews = compare(new_records, old_records, args.show_review)
        render(duplicates, "DUPLICATES (must be replaced)")
        if args.show_review:
            render(reviews, "review band")
        if args.json:
            json.dump(as_json(duplicates), open(args.json, "w"), indent=1)
        if duplicates:
            ids = sorted({r[3]["id"] for r in duplicates})
            print(f"\nFAIL: {len(ids)} of {len(new_records)} duplicate an existing "
                  f"question: {', '.join(str(i) for i in ids)}")
            return 1
        print(f"\nPASS: all {len(new_records)} clear.")
        return 0

    records = load(bank_paths())
    print(f"auditing {len(records)} questions")
    duplicates, bands = self_compare(records)
    for band in ("0.90+", "0.80-0.90", "0.70-0.80", "0.62-0.70"):
        print(f"  {band}: {bands[band]} pairs")
    render(duplicates, "DUPLICATE PAIRS")
    if args.json:
        json.dump(as_json(duplicates), open(args.json, "w"), indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
