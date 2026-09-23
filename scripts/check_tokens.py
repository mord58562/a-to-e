#!/usr/bin/env python3
"""Banned-token gate for the A to E bank.

The generation prompt names this script as the list of record, so the
rules live here rather than being spelled out on a public page. Run it
over the served bank, over a batch before merging, or over any file.

    python3 scripts/check_tokens.py                  # the served bank
    python3 scripts/check_tokens.py data/inbox/*.json
    python3 scripts/check_tokens.py --selftest

It also runs the truncation check below over the same files.

Exit code 1 means a banned token was found or a question looks cut off.
"""
import bisect
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Each rule is (id, description, compiled pattern, suggested fix).
# Patterns are built from character codes where writing the token out
# would itself violate the rule.
RULES = [
    ("EMDASH", "em-dash (U+2014)", re.compile("—"),
     "rewrite with the mark the sentence needs: full stop, comma, colon or parentheses"),
    ("A1", "initialism standing in for Aboriginal and Torres Strait Islander",
     re.compile(r"\b" + "".join(chr(c) for c in (65, 84, 83, 73)) + r"\b"),
     "spell the phrase out, or name only the applicable half"),
    ("C1", "the word meaning authoritative-by-designation",
     re.compile("".join(chr(c) for c in (99, 97, 110, 111, 110, 105, 99, 97, 108)), re.I),
     "use primary, core, main, live or promoted"),
    ("MD", "markdown emphasis markers", re.compile(r"\*\*"),
     "the site renders plain text; drop them"),
    ("FOET", "foet- spelling", re.compile(r"\bfoet", re.I),
     "RANZCOG uses fet- (fetal, fetus, feto-)"),
    # Lowercase only. A title-cased "Sulphate" is part of a named
    # guideline ("RANZCOG Magnesium Sulphate for Neuroprotection
    # Statement") and renaming a document makes it unfindable.
    ("SULPH", "sulph- spelling in running prose",
     re.compile(r"\bsulph"),
     "the TGA uses sulf-; a guideline's own title is exempt"),
]

# Fields whose contents are proper nouns: document titles and URLs.
# A rule that renames a source makes the reference impossible to find.
# Exemption applies to everything nested underneath, not just the key.
EXEMPT_KEYS = {"source_refs", "sources", "url", "id", "model", "created"}


def served_files():
    man = json.loads((ROOT / "data/batches_manifest.json").read_text())
    paths = [b["path"] if isinstance(b, dict) else b for b in man.get("batches", [])]
    base = ["data/questions_paeds.json", "data/questions_obgyn.json",
            "data/questions_psych.json", "data/questions_medicine.json"]
    return [ROOT / p for p in base] + \
           [ROOT / (p if p.startswith("data/") else "data/" + p.lstrip("/")) for p in paths]


def walk(node, exempt=False):
    """Yield every string a rule should apply to.

    Exemption propagates into nested containers. `sources` is a list of
    {label, url} objects, so exempting the key alone left every `label`
    exposed and the scanner flagged guideline titles as prose.
    """
    if isinstance(node, str):
        if not exempt:
            yield node
    elif isinstance(node, list):
        for v in node:
            yield from walk(v, exempt)
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from walk(v, exempt or k in EXEMPT_KEYS)


def scan(paths):
    hits = []
    for p in paths:
        try:
            data = json.loads(Path(p).read_text())
        except FileNotFoundError:
            continue
        except json.JSONDecodeError as e:
            hits.append((str(p), "?", "JSON", f"file does not parse: {e}", ""))
            continue
        for q in (data if isinstance(data, list) else [data]):
            qid = q.get("id", "?") if isinstance(q, dict) else "?"
            for text in walk(q):
                for rid, desc, rx, fix in RULES:
                    m = rx.search(text)
                    if m:
                        ctx = text[max(0, m.start() - 40):m.start() + 40]
                        hits.append((str(p), qid, rid, desc, ctx))
    return hits


# ── Truncation ──────────────────────────────────────────────────────
# A generator that caps field lengths cuts words in half and adds a full
# stop ("predicting IVIG resistan."), and the site strips the trailing
# "(Source: X)", so the cut word ends the sentence on screen. A cap cuts
# most long fields of a question, so evidence is summed per question:
#   CUT-WORD  a field ends in a lowercase word the bank almost never uses
#             that begins a word the bank uses often ("resistan" ->
#             "resistance"). The bank is the dictionary, so no system word
#             list is needed and the clinical vocabulary is known. A real
#             but rare word can match ("drool", "pyelo"), so one is weak.
#   DANGLING  a field ends in a word no sentence ends in ("the.", "and.")
#             or a lone letter that is not a unit ("vasa praevia w."). Strong.
#   LENGTH    three or more rationales of one question end at exactly the
#             same length: the mark of a fixed cap. Weak on its own.
# A question fails on one strong hit, two weak cut words, or a cut word
# with a LENGTH repeat.

SOURCE_TAIL = re.compile(r"\s*\(Sources?:(?:[^()]|\([^()]*\))*\)\s*\.?\s*$", re.I)
PROSE_KEYS = {"stem", "lead_in", "text", "rationale", "summary", "pearls", "context",
              "key_points", "explanation"}
WORD = re.compile(r"[A-Za-z][A-Za-z'-]*[A-Za-z]|[A-Za-z]")
LAST_WORD = re.compile(r"(?<![A-Za-z0-9'-])([a-z]+)\.\s*$")
# "with." and "of." can end a sentence ("dealt with."), so they are not here.
DANGLING = {"the", "a", "an", "and", "or", "but", "nor", "than"}
UNIT_LETTERS = {"h", "g", "l"}   # "per h.", "10 g", "5 L" after a space
CUT_RARE_MAX = 3       # the cut word appears at most this often in the bank
CUT_COMMON_MIN = 5     # and begins a word that appears at least this often
LENGTH_MIN = 60        # shorter rationales share lengths by chance
LENGTH_REPEAT = 3


def prose(node, key=None):
    """Yield (key, text) for every prose string, with the key that holds it."""
    if isinstance(node, str):
        if key in PROSE_KEYS:
            yield key, node
    elif isinstance(node, list):
        for v in node:
            yield from prose(v, key)
    elif isinstance(node, dict):
        for k, v in node.items():
            if k not in EXEMPT_KEYS:
                yield from prose(v, k)


def load_questions(paths):
    out = []
    for p in paths:
        try:
            data = json.loads(Path(p).read_text())
        except (FileNotFoundError, json.JSONDecodeError):
            continue
        out += [(str(p), q) for q in (data if isinstance(data, list) else [data]) if isinstance(q, dict)]
    return out


def bank_vocab(questions):
    vocab = Counter()
    for _, q in questions:
        for _, text in prose(q):
            vocab.update(w.lower() for w in WORD.findall(text))
    return vocab


def ending(text, vocab, common):
    """("DANGLING"|"CUT-WORD", word) when `text` ends like a cut, else None."""
    m = LAST_WORD.search(SOURCE_TAIL.sub("", text))
    if not m:
        return None
    w = m.group(1)
    if w in DANGLING or (len(w) == 1 and w not in UNIT_LETTERS):
        return "DANGLING", w
    if vocab[w] > CUT_RARE_MAX:
        return None
    i = bisect.bisect_right(common, w)
    if i < len(common) and common[i].startswith(w):
        return "CUT-WORD", w
    return None


def truncation_hits(paths, vocab_paths=()):
    """(path, id, verdict, details) per question with cut-off evidence.

    verdict is "FAIL" or "WARN" (one weak hit, printed for review). The
    vocabulary is built from the files checked plus `vocab_paths`, so a
    new batch is judged against the published bank.
    """
    checked = load_questions(paths)
    vocab = bank_vocab(checked + load_questions(vocab_paths))
    common = sorted(w for w, n in vocab.items() if n >= CUT_COMMON_MIN)
    out = []
    for path, q in checked:
        details, strong, weak = [], 0, 0
        for key, text in prose(q):
            e = ending(text, vocab, common)
            if e:
                details.append(f'{e[0]} {key}: ...{SOURCE_TAIL.sub("", text)[-50:]}')
                strong += e[0] == "DANGLING"
                weak += e[0] == "CUT-WORD"
        lengths = Counter(len(SOURCE_TAIL.sub("", o.get("rationale") or ""))
                          for o in q.get("options") or [] if isinstance(o, dict) and isinstance(o.get("rationale"), str))
        repeat = [(n, c) for n, c in lengths.items() if n >= LENGTH_MIN and c >= LENGTH_REPEAT]
        if repeat:
            details.append("LENGTH " + ", ".join(f"{c} rationales end at {n} characters" for n, c in repeat))
        if not details:
            continue
        failed = strong or weak >= 2 or (weak and repeat)
        out.append((path, q.get("id", "?"), "FAIL" if failed else "WARN", details))
    return out


def report_truncation(hits):
    """Print the hits; 1 when any question fails."""
    fails = [h for h in hits if h[2] == "FAIL"]
    for path, qid, verdict, details in sorted(hits, key=lambda h: h[2])[:200]:
        print(f"TRUNC {verdict} {qid}  [{path}]")
        for d in details[:6]:
            print(f"       {d}")
    warns = len(hits) - len(fails)
    if warns:
        print(f"\n{warns} question(s) with one weak sign of a cut (not failing; review if new)")
    if fails:
        print(f"{len(fails)} question(s) look cut off mid-text: {', '.join(sorted(h[1] for h in fails))}")
        return 1
    return 0


def selftest():
    cases = [("a — b", "EMDASH"), ("the " + chr(99) + "anonical form", "C1"),
             ("**bold**", "MD"), ("foetal heart", "FOET"),
             ("magnesium sulphate", "SULPH"), ("clean text", None)]
    ok = True
    for text, want in cases:
        got = next((r[0] for r in RULES if r[2].search(text)), None)
        if got != want:
            print(f"  FAIL {text!r}: expected {want}, got {got}")
            ok = False
    vocab = Counter({"resistance": 40, "resistant": 30, "drooling": 50, "drool": 2, "with": 900})
    common = sorted(w for w, n in vocab.items() if n >= CUT_COMMON_MIN)
    endings = [("scores predicting IVIG resistan. (Source: RCH CPG)", ("CUT-WORD", "resistan")),
               ("the child is drool.", ("CUT-WORD", "drool")),
               ("born by caesarean and t.", ("DANGLING", "t")),
               ("give it now and.", ("DANGLING", "and")),
               ("once the cause has been dealt with.", None),
               ("onset in his 50s.", None), ("run at 10 mL per h.", None),
               ("HbA1c.", None), ("Resistance.", None)]
    for text, want in endings:
        got = ending(text, vocab, common)
        if got != want:
            print(f"  FAIL ending {text!r}: expected {want}, got {got}")
            ok = False
    print("selftest:", "pass" if ok else "FAIL")
    return 0 if ok else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    given = [a for a in argv if not a.startswith("-")]
    paths = given or served_files()
    hits = scan(paths)
    if hits:
        for path, qid, rid, desc, ctx in hits[:200]:
            print(f"{rid:6} {qid:28} {desc}\n       ...{ctx}...")
        print(f"\n{len(hits)} banned token(s) found")
    else:
        print(f"clean: no banned tokens in {len(list(paths))} file(s)")
    # A batch is judged against the published bank's vocabulary.
    given_set = {Path(p).resolve() for p in given}
    vocab_paths = [p for p in served_files() if Path(p).resolve() not in given_set] if given else ()
    cut = report_truncation(truncation_hits(paths, vocab_paths))
    if not cut:
        print("clean: no text cut off mid-word")
    return 1 if hits or cut else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
