#!/usr/bin/env python3
"""Tooling for the concision + difficulty re-rating campaign.

Two jobs, one file, because they run over the same questions and the
validator has to know what the measurer measured.

    python3 scripts/content_pass.py report            # where the bank stands
    python3 scripts/content_pass.py plan              # emit work units
    python3 scripts/content_pass.py validate <file>   # gate a rewritten file
    python3 scripts/content_pass.py apply <file>      # merge a validated file

The rewrite changes stems and options but must never change what is
being tested. `validate` is what enforces that: same ids, same number
of options, the same option still correct, source_refs intact.
"""
import argparse
import json
import re
import statistics
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Where the campaign is aiming. Word counts are for everything the
# candidate reads before choosing: stem, data table and option texts.
# A Geeky Medics or AMC-style vignette sits near 90; this bank averages
# 234, and length is not difficulty - it is just reading time.
TARGET_PRE_ANSWER_WORDS = 110
HARD_CAP_PRE_ANSWER_WORDS = 150
TARGET_STEM_WORDS = 70
# The difficulty distribution the 2026-06-01 overhaul was built around:
# L4 at 15 to 20%, L5 around 6%, L1 vanishingly rare. Written out so it
# sums to 100, which the first version of this table did not - it came
# to 85, so every "gap" it printed was wrong in the same direction.
TARGET_MIX = {1: 1.0, 2: 28.0, 3: 46.0, 4: 19.0, 5: 6.0}
assert abs(sum(TARGET_MIX.values()) - 100) < 0.01, "TARGET_MIX must sum to 100"


def served_paths():
    man = json.loads((ROOT / "data/batches_manifest.json").read_text())
    batches = [b["path"] if isinstance(b, dict) else b for b in man.get("batches", [])]
    base = ["data/questions_paeds.json", "data/questions_obgyn.json",
            "data/questions_psych.json", "data/questions_medicine.json"]
    return [ROOT / p for p in base] + \
           [ROOT / (p if p.startswith("data/") else "data/" + p.lstrip("/")) for p in batches]


def load_served():
    """id -> (question, source path). First file wins, as the site does."""
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


def words(s):
    return len((s or "").split())


def measure(q):
    stem = words(q.get("stem"))
    dt = sum(words(v) for v in (q.get("data_table") or {}).values() if isinstance(v, str))
    lead = words(q.get("lead_in"))
    opts = [words(o.get("text")) for o in q.get("options", [])]
    return {
        "stem": stem, "data_table": dt, "lead_in": lead,
        "options": sum(opts),
        "pre_answer": stem + dt + lead + sum(opts),
        "longest_option": max(opts) if opts else 0,
        "shortest_option": min(opts) if opts else 0,
    }


# A number carrying a unit, a percentage, a blood pressure, or an age.
# Matching the unit alongside the number is what makes "1" in "1 g" a
# clinical fact and "1" in "one of three siblings" not, which a
# digit-length filter cannot tell apart.
UNIT_WORDS = (r"mg|mcg|microgram|nanogram|g|kg|mL|L|mmol/L|micromol/L|nmol/L|pmol/L|"
              r"mmHg|cmH2O|kPa|units?|IU|x10\^9/L|x10\^6/L|g/L|U/L|mm/h|"
              r"degrees? C|degC|weeks?|days?|hours?|hourly|minutes?|months?|years?|"
              r"month-old|year-old|week-old|day-old|/min|bpm|%|per cent")
CLINICAL_NUM_RE = re.compile(
    r"(?<![\w.])(\d+(?:\.\d+)?)\s*(?:-\s*\d+(?:\.\d+)?\s*)?(?:" + UNIT_WORDS + r")\b"
    r"|(?<![\w.])(\d+/\d+)(?![\w.])"                    # 110/68, 20/20
    r"|(?<![\w.])(\d+\.\d+)(?![\w.])",                  # any decimal
    re.I)


def clinical_numbers(q):
    """Every number-with-a-unit a candidate reads before answering.

    The real risk in a concision pass is not verbosity, it is an agent
    quietly dropping a dose or a lab value while trimming. Numbers are
    cheap to compare and they are what the question turns on.
    """
    parts = [q.get("stem") or "", q.get("lead_in") or ""]
    parts += [v for v in (q.get("data_table") or {}).values() if isinstance(v, str)]
    parts += [o.get("text") or "" for o in q.get("options", [])]
    text = " ".join(parts)
    found = []
    for m in CLINICAL_NUM_RE.finditer(text):
        found.append(m.group(0).strip().lower())
    return Counter(found)


def option_parity(q):
    """Longest-to-shortest option character ratio. The rule is 1.35."""
    lens = [len(o.get("text") or "") for o in q.get("options", [])]
    lens = [n for n in lens if n]
    return (max(lens) / min(lens)) if lens else 1.0


def cmd_report(_args):
    served = load_served()
    ms = {qid: measure(q) for qid, (q, _) in served.items()}
    n = len(served)
    print(f"{n:,} questions\n")

    print("Length, words")
    print(f"  {'field':<16}{'mean':>8}{'median':>8}{'p90':>8}{'max':>8}")
    for f in ("stem", "data_table", "options", "pre_answer"):
        v = sorted(m[f] for m in ms.values())
        print(f"  {f:<16}{statistics.mean(v):>8.0f}{statistics.median(v):>8.0f}"
              f"{v[int(0.9 * len(v))]:>8}{v[-1]:>8}")
    over = sum(1 for m in ms.values() if m["pre_answer"] > HARD_CAP_PRE_ANSWER_WORDS)
    tgt = sum(1 for m in ms.values() if m["pre_answer"] > TARGET_PRE_ANSWER_WORDS)
    print(f"\n  over the {TARGET_PRE_ANSWER_WORDS}-word target: {tgt:,} ({100*tgt/n:.0f}%)")
    print(f"  over the {HARD_CAP_PRE_ANSWER_WORDS}-word cap:    {over:,} ({100*over/n:.0f}%)")

    print("\nDifficulty")
    d = Counter(q.get("difficulty") for q, _ in served.values())
    for k in sorted(x for x in d if x):
        share = 100 * d[k] / n
        gap = share - TARGET_MIX.get(k, 0)
        print(f"  {k}/5  {d[k]:>6,}  {share:>5.1f}%   target {TARGET_MIX.get(k,0):>4.1f}%   "
              f"gap {gap:+5.1f}")

    # The 2026-06-01 split: the cloud agent was briefed to aim for 45%
    # L4 and complied for months, so the cohorts are not comparable.
    early = [q for q, _ in served.values() if (q.get("created") or "") < "2026-06-01"]
    late = [q for q, _ in served.values() if (q.get("created") or "") >= "2026-06-01"]
    for name, cohort in (("before 2026-06-01", early), ("from 2026-06-01", late)):
        if not cohort:
            continue
        c = Counter(q.get("difficulty") for q in cohort)
        l4 = 100 * c[4] / len(cohort)
        print(f"  {name}: {len(cohort):,} questions, L4 {l4:.1f}%")

    bad = [qid for qid, (q, _) in served.items() if option_parity(q) > 1.35]
    print(f"\nOption-length parity over 1.35: {len(bad):,} ({100*len(bad)/n:.0f}%)")


def cmd_plan(args):
    """Emit one work unit per served file, worst first."""
    served = load_served()
    by_file = {}
    for qid, (q, p) in served.items():
        by_file.setdefault(p, []).append(q)
    units = []
    for p, qs in by_file.items():
        ms = [measure(q) for q in qs]
        if not ms:
            continue
        units.append({
            "file": str(p.relative_to(ROOT)),
            "questions": len(qs),
            "mean_pre_answer": round(statistics.mean(m["pre_answer"] for m in ms)),
            "over_cap": sum(1 for m in ms if m["pre_answer"] > HARD_CAP_PRE_ANSWER_WORDS),
            "l4_share": round(100 * sum(1 for q in qs if q.get("difficulty") == 4) / len(qs), 1),
        })
    units.sort(key=lambda u: (-u["over_cap"], -u["mean_pre_answer"]))
    print(json.dumps(units, indent=2))


def cmd_validate(args):
    """Gate a rewritten file against the live bank."""
    served = load_served()
    try:
        new = json.loads(Path(args.file).read_text())
    except Exception as e:
        print(f"FAIL: {args.file} does not parse: {e}")
        return 1
    if not isinstance(new, list):
        print("FAIL: expected a JSON array of questions")
        return 1

    problems = []
    lost_numbers = []
    improved = shrunk = 0
    for q in new:
        qid = q.get("id")
        if not qid:
            problems.append(("?", "no id"))
            continue
        if qid not in served:
            problems.append((qid, "id is not in the served bank; the pass must not invent questions"))
            continue
        old, _ = served[qid]

        # What is being tested must not change.
        if len(q.get("options", [])) != len(old.get("options", [])):
            problems.append((qid, "option count changed"))
            continue
        old_correct = [o.get("text") for o in old["options"] if o.get("correct")]
        new_correct = [o.get("text") for o in q["options"] if o.get("correct")]
        if len(new_correct) != 1:
            problems.append((qid, f"{len(new_correct)} options marked correct, expected exactly 1"))
        if q.get("topic") != old.get("topic"):
            problems.append((qid, "topic changed"))
        for i, (no, oo) in enumerate(zip(q["options"], old["options"])):
            if bool(no.get("correct")) != bool(oo.get("correct")):
                problems.append((qid, f"option {i+1} flipped correctness; options must stay in order"))
                break
            if not no.get("source_refs"):
                problems.append((qid, f"option {i+1} lost its source_refs"))
                break
            added = set(no.get("source_refs") or []) - set(oo.get("source_refs") or [])
            if added and not args.allow_resource:
                problems.append((qid, f"option {i+1} invented a source_ref: "
                                      f"{sorted(added)[0][:60]!r}. Pass --allow-resource "
                                      f"if this pass is deliberately re-sourcing."))
                break
        d = q.get("difficulty")
        if d not in (1, 2, 3, 4, 5):
            problems.append((qid, f"difficulty {d!r} is not 1-5"))

        # Required fields survive.
        for f in ("stem", "lead_in", "explanation"):
            if not q.get(f):
                problems.append((qid, f"lost {f}"))

        # Craft rules.
        par = option_parity(q)
        if par > 1.35:
            problems.append((qid, f"option-length parity {par:.2f} exceeds 1.35"))
        m_new, m_old = measure(q), measure(old)
        if m_new["pre_answer"] > HARD_CAP_PRE_ANSWER_WORDS:
            problems.append((qid, f"{m_new['pre_answer']} words before the answer, cap is {HARD_CAP_PRE_ANSWER_WORDS}"))
        if m_new["pre_answer"] < m_old["pre_answer"]:
            shrunk += 1
        if m_new["pre_answer"] <= TARGET_PRE_ANSWER_WORDS:
            improved += 1

        gone = set(clinical_numbers(old) - clinical_numbers(q))
        if gone:
            lost_numbers.append((qid, gone))

        blob = json.dumps(q, ensure_ascii=False)
        for rx, why in (("—", "em-dash"), (r"\*\*", "markdown emphasis")):
            if re.search(rx, blob):
                problems.append((qid, f"contains {why}"))

    print(f"{len(new)} question(s) in {args.file}")
    print(f"  shorter than before: {shrunk}")
    print(f"  at or under the {TARGET_PRE_ANSWER_WORDS}-word target: {improved}")
    if lost_numbers:
        # Not a failure. Trimming a respiratory rate that changes no
        # answer is exactly the job. But a dropped dose is not, and
        # this is the only thing that would catch it.
        print(f"\n  {len(lost_numbers)} question(s) dropped a number. Check these by eye:")
        for qid, gone in lost_numbers[:25]:
            print(f"    {qid:28} dropped {', '.join(sorted(gone)[:8])}")
        if len(lost_numbers) > 25:
            print(f"    ... and {len(lost_numbers) - 25} more")
    if problems:
        print(f"\n{len(problems)} problem(s):")
        for qid, why in problems[:60]:
            print(f"  {qid:28} {why}")
        return 1
    print("\nclean")
    return 0


def cmd_apply(args):
    """Merge a validated file back into whichever served file holds each id."""
    if not hasattr(args, "allow_resource"):
        args.allow_resource = False
    if cmd_validate(args) != 0:
        print("\nrefusing to apply a file that does not validate")
        return 1
    served = load_served()
    new = {q["id"]: q for q in json.loads(Path(args.file).read_text())}
    by_path = {}
    for qid, q in new.items():
        by_path.setdefault(served[qid][1], {})[qid] = q
    total = 0
    for path, updates in by_path.items():
        arr = json.loads(path.read_text())
        for i, q in enumerate(arr):
            if q.get("id") in updates:
                arr[i] = updates[q["id"]]
                total += 1
        path.write_text(json.dumps(arr, indent=1, ensure_ascii=False))
        print(f"  {path.relative_to(ROOT)}: {len(updates)} updated")
    print(f"{total} question(s) applied. Bump data/meta.json `updated` before pushing.")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("report")
    sub.add_parser("plan")
    for name in ("validate", "apply"):
        p = sub.add_parser(name)
        p.add_argument("file")
        p.add_argument("--allow-resource", action="store_true",
                       help="permit changed source_refs. Only for a pass that is "
                            "deliberately re-sourcing; it disables the check that "
                            "stops a rewrite fabricating citations.")
    args = ap.parse_args()
    return {"report": cmd_report, "plan": cmd_plan,
            "validate": cmd_validate, "apply": cmd_apply}[args.cmd](args) or 0


if __name__ == "__main__":
    sys.exit(main())
