#!/usr/bin/env python3
"""Near-duplicate detection for the A to E MCQ bank.

Keyword novelty checks miss spelling and synonym variants (foetal/fetal,
shingles/herpes zoster, "secondary PPH"/"heavy bleeding on day twelve"), so
duplicates accumulated silently. This compares questions on the pairing that
actually defines a duplicate: what the question is about (subtopic_detail) and
what it wants you to do (the correct option).

Two modes:

  gate   python3 scripts/dupe_gate.py --new data/batches/new_*.json
         Scores each new question against the existing bank AND against the
         other questions being gated in the same invocation. Exit 1 if any
         question duplicates one already published or one of its siblings.
         Run before publishing.

         The sibling pass matters because a single scheduled fire writes many
         batch files at once (sixteen, on 2026-09-20). Scoring each of them
         only against the published bank let the same question be published
         twice in one push and still pass.

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

# Two questions can share almost every word and still be different questions
# when the dose differs: the 150 microgram and 300 microgram adrenaline bands
# are separate exam points. String similarity washes that out, so doses are
# compared as their own signal. Time spans ("over 2 to 5 minutes") are not
# doses and are deliberately excluded - they vary as wording, not as answer.
UNIT_BASE = {
    "mg": "mg", "milligram": "mg", "milligrams": "mg",
    "g": "g", "gram": "g", "grams": "g",
    "mcg": "mcg", "microgram": "mcg", "micrograms": "mcg", "microg": "mcg",
    "ml": "ml", "millilitre": "ml", "millilitres": "ml",
    "l": "l", "litre": "l", "litres": "l",
    "unit": "unit", "units": "unit", "iu": "unit",
    "mmol": "mmol", "mol": "mol", "kg": "kg",
}
DOSE_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(" + "|".join(sorted(UNIT_BASE, key=len, reverse=True)) + r")\b")
# A pair whose doses disagree is only a duplicate if it is otherwise nearly
# character-identical.
DOSE_MISMATCH_OVERRIDE = 0.93

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


def to_record(q, fp):
    raw_ans = correct_option(q)
    det = normalise(q.get("subtopic_detail"))
    ans = normalise(raw_ans)
    return {
        "id": q.get("id"),
        "topic": q.get("topic"),
        "file": fp,
        "det": det,
        "ans": ans,
        "doses": doses(raw_ans),
        "key": det + " || " + ans,
    }


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
            records.append(to_record(q, fp))
    return records


def doses(text):
    """The set of (amount, base unit) quantities named in the answer.

    Read from the raw option text, not the normalised form: normalising strips
    the decimal point, which would make 0.5 mg and 5 mg indistinguishable.
    """
    lowered = re.sub(r"[^a-z0-9. ]+", " ", str(text or "").lower())
    return {(amount.rstrip("."), UNIT_BASE[unit])
            for amount, unit in DOSE_RE.findall(lowered)}


def doses_agree(a, b):
    """Whether two answers name the same quantities.

    A subset counts as agreement: "magnesium 50 mg/kg to a maximum of 2 g" and
    "magnesium 50 mg/kg" are the same answer stated at different length, and a
    range written with a hyphen ("12-15 L/min") leaves both endpoints behind.
    Disjoint or conflicting quantities mean different questions: the 150 and
    300 microgram adrenaline bands are separate exam points.
    """
    return a <= b or b <= a


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


def is_duplicate(combined, det, ans, a, b):
    if not doses_agree(a["doses"], b["doses"]) and combined < DOSE_MISMATCH_OVERRIDE:
        return False
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
            if is_duplicate(combined, det, ans, a, b):
                duplicates.append((combined, det, ans, a, b))
            elif report_soft and combined >= SOFT:
                reviews.append((combined, det, ans, a, b))
    return duplicates, reviews


def self_compare(records, report_soft=False):
    """Every record against every other record in the set, within topic.

    Serves two callers. --all audits the whole published bank with it. --new
    runs it over the batch of files being gated, which is the only thing that
    catches a question duplicated across two files of the same push: compare()
    excludes those files from the bank side, so without this pass they are
    never scored against each other.
    """
    by_topic = defaultdict(list)
    for r in records:
        by_topic[r["topic"]].append(r)

    duplicates, reviews = [], []
    bands = defaultdict(int)
    for items in by_topic.values():
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                combined, det, ans = score(items[i], items[j])
                if is_duplicate(combined, det, ans, items[i], items[j]):
                    duplicates.append((combined, det, ans, items[i], items[j]))
                elif report_soft and combined >= SOFT:
                    reviews.append((combined, det, ans, items[i], items[j]))
                if combined >= 0.90:
                    bands["0.90+"] += 1
                elif combined >= 0.80:
                    bands["0.80-0.90"] += 1
                elif combined >= 0.70:
                    bands["0.70-0.80"] += 1
                elif combined >= SOFT:
                    bands["0.62-0.70"] += 1
    return duplicates, bands, reviews


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


def as_json(rows, kind=None):
    out = []
    for c, d, n, a, b in sorted(rows, key=lambda r: -r[0]):
        row = {
            "combined": round(c, 3), "detail": round(d, 3), "answer": round(n, 3),
            "topic": a["topic"],
            "a": {k: a[k] for k in ("id", "file", "det", "ans")},
            "b": {k: b[k] for k in ("id", "file", "det", "ans")},
        }
        if kind:
            row["class"] = kind
        out.append(row)
    return out


def run_gate(new_records, old_records, show_review=False, json_path=None):
    """Gate a set of new questions. 0 clear, 1 duplicates found.

    Two classes, reported separately because they are fixed differently: a
    hit against the bank means the new question is redundant, a hit within
    the new files means the push is publishing the same question twice.
    """
    print(f"gating {len(new_records)} new questions against "
          f"{len(old_records)} existing, and against each other")
    # An id collision is a failure in its own right. The loader keeps the
    # first copy of an id and silently hides the other, so a new question
    # that reuses a published id (or appears twice in one push) never
    # shows. compare() skips same-id pairs, so it has to be caught here.
    old_ids = {r["id"] for r in old_records if r["id"]}
    reused = sorted({str(r["id"]) for r in new_records if r["id"] in old_ids})
    counts = defaultdict(int)
    for r in new_records:
        if r["id"]:
            counts[r["id"]] += 1
    twice = sorted(str(i) for i, n in counts.items() if n > 1)
    missing = sum(1 for r in new_records if not r["id"])
    id_fail = bool(reused or twice or missing)
    if reused:
        print(f"FAIL: {len(reused)} new id(s) already exist in the bank: {', '.join(reused)}")
    if twice:
        print(f"FAIL: {len(twice)} id(s) appear more than once in this push: {', '.join(twice)}")
    if missing:
        print(f"FAIL: {missing} new question(s) have no id")
    bank_dupes, bank_reviews = compare(new_records, old_records, show_review)
    new_dupes, _bands, new_reviews = self_compare(new_records, show_review)

    render(bank_dupes, "DUPLICATES vs the published bank (must be replaced)")
    render(new_dupes, "DUPLICATES within the files being gated (must be replaced)")
    if show_review:
        render(bank_reviews, "review band vs the published bank")
        render(new_reviews, "review band within the files being gated")
    if json_path:
        json.dump(as_json(bank_dupes, "vs_bank") + as_json(new_dupes, "within_new"),
                  open(json_path, "w"), indent=1)

    if bank_dupes or new_dupes or id_fail:
        print()
        if bank_dupes:
            ids = sorted({str(r[3]["id"]) for r in bank_dupes})
            print(f"FAIL: {len(ids)} of {len(new_records)} duplicate an existing "
                  f"question: {', '.join(ids)}")
        if new_dupes:
            pairs = sorted({(str(r[3]["id"]), str(r[4]["id"])) for r in new_dupes})
            print(f"FAIL: {len(pairs)} pair(s) duplicate each other within this "
                  f"push: {', '.join(x + ' / ' + y for x, y in pairs)}")
        return 1

    print(f"\nPASS: all {len(new_records)} clear of the bank and of each other.")
    return 0


# Cases that have actually been got wrong. A regression here silently retires
# good questions, so they are cheap insurance.
DOSE_CASES = [
    ("adrenaline 150 micrograms IM", "adrenaline 300 micrograms IM", False),
    ("varenicline 0.5 mg twice daily", "varenicline 5 mg twice daily", False),
    ("mannitol 0.5 g/kg over 15 minutes", "mannitol 1 g/kg over 20 minutes", False),
    ("ursodeoxycholic acid 500 mg twice daily", "ursodeoxycholic acid 250 mg twice daily", False),
    ("magnesium 50 mg/kg (maximum 2 g)", "magnesium 50 mg per kg", True),
    ("high flow oxygen 12-15 L/min", "high flow oxygen 15 L/min", True),
    ("calcium gluconate 10% 10 mL over 2 to 3 minutes",
     "calcium gluconate 10% 10 mL over 2 to 5 minutes", True),
]


# The same question written into two different files of one push. This is the
# case the gate used to miss entirely: compare() excludes the files being
# gated from the bank side, so nothing ever scored these two against each
# other and the push published the question twice. The assertion below is
# deliberately two-sided - the bank pass must stay silent on it and the
# new-vs-new pass must catch it - so deleting the new pass cannot be papered
# over by loosening the other one.
NEW_VS_NEW_CASE = [
    {"id": "selftest-file-a-01", "topic": "Paediatrics",
     "subtopic_detail": "Peanut anaphylaxis in a 6 year old, immediate management",
     "options": [{"text": "Intramuscular adrenaline 300 micrograms to the lateral thigh",
                  "correct": True}]},
    {"id": "selftest-file-b-07", "topic": "Paediatrics",
     "subtopic_detail": "Peanut anaphylaxis in a 6 year old, immediate management",
     "options": [{"text": "Adrenaline 300 micrograms intramuscular to the lateral thigh",
                  "correct": True}]},
]


def selftest_new_vs_new():
    """Gating two files that duplicate each other must fail."""
    a = to_record(NEW_VS_NEW_CASE[0], "data/batches/selftest_push_a.json")
    b = to_record(NEW_VS_NEW_CASE[1], "data/batches/selftest_push_b.json")

    print("\n-- the gate run below is the case under test; it is expected to "
          "report one within-push duplicate --")
    failures = 0
    bank_only, _ = compare([a, b], [], False)
    if bank_only:
        failures += 1
        print("FAIL: the bank pass flagged the selftest pair; the case no "
              "longer isolates the new-vs-new gap")

    code = run_gate([a, b], [], show_review=False)
    if code != 1:
        failures += 1
        print("FAIL: gating two new files that duplicate each other returned "
              f"{code}, expected 1. New-vs-new comparison is not wired in.")

    print(f"{'0' if failures else '1'}/1 new-vs-new cases pass")
    return failures


def selftest_id_collision():
    """A new question reusing a bank id, or an id twice in one push, fails."""
    base = {"topic": "Paediatrics", "subtopic_detail": "unrelated detail text",
            "options": [{"text": "unrelated answer", "correct": True}]}
    bank = [to_record(dict(base, id="selftest-bank-01"), "data/questions_paeds.json")]
    reuse = [to_record(dict(base, id="selftest-bank-01",
                            subtopic_detail="a different presentation entirely"),
                       "data/batches/selftest_new.json")]
    twice = [to_record(dict(base, id="selftest-new-02", subtopic_detail="first"), "a.json"),
             to_record(dict(base, id="selftest-new-02", subtopic_detail="second one"), "b.json")]
    print("\n-- the two gate runs below are expected to report id failures --")
    failures = 0
    if run_gate(reuse, bank) != 1:
        failures += 1
        print("FAIL: a new question reusing a bank id passed the gate")
    if run_gate(twice, []) != 1:
        failures += 1
        print("FAIL: an id duplicated within one push passed the gate")
    print(f"{2 - failures}/2 id-collision cases pass")
    return failures


def selftest():
    failures = 0
    for a, b, expected in DOSE_CASES:
        got = doses_agree(doses(a), doses(b))
        if got != expected:
            failures += 1
            print(f"FAIL expected agree={expected} got={got}\n  {a}\n  {b}\n"
                  f"  {sorted(doses(a))} vs {sorted(doses(b))}")
    print(f"{len(DOSE_CASES) - failures}/{len(DOSE_CASES)} dose cases pass")
    failures += selftest_new_vs_new()
    failures += selftest_id_collision()
    return 1 if failures else 0


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
    ap.add_argument("--selftest", action="store_true",
                    help="check the dose comparison against known cases")
    args = ap.parse_args()

    if args.selftest:
        return selftest()

    if not args.new and not args.all:
        ap.error("pass --new <files> to gate a batch, --all to audit the bank, "
                 "or --selftest to check the dose comparison")

    if args.new:
        # Deduplicate the path list: overlapping globs would otherwise load the
        # same file twice and the new-vs-new pass would flag every question in
        # it as a duplicate of itself.
        new_paths, seen_paths = [], set()
        for pattern in args.new:
            for path in (sorted(glob.glob(pattern)) or [pattern]):
                key = os.path.normpath(path)
                if key in seen_paths:
                    continue
                seen_paths.add(key)
                new_paths.append(path)
        new_records = load(new_paths)
        old_records = load(bank_paths(exclude=new_paths))
        return run_gate(new_records, old_records, args.show_review, args.json)

    records = load(bank_paths())
    print(f"auditing {len(records)} questions")
    duplicates, bands, _reviews = self_compare(records)
    for band in ("0.90+", "0.80-0.90", "0.70-0.80", "0.62-0.70"):
        print(f"  {band}: {bands[band]} pairs")
    render(duplicates, "DUPLICATE PAIRS")
    if args.json:
        json.dump(as_json(duplicates), open(args.json, "w"), indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
