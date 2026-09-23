#!/usr/bin/env python3
"""Banned-token gate for the A to E bank.

The generation prompt names this script as the list of record, so the
rules live here rather than being spelled out on a public page. Run it
over the served bank, over a batch before merging, or over any file.

    python3 scripts/check_tokens.py                  # the served bank
    python3 scripts/check_tokens.py data/inbox/*.json
    python3 scripts/check_tokens.py --selftest

Exit code 1 means at least one banned token was found.
"""
import json
import re
import sys
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
    print("selftest:", "pass" if ok else "FAIL")
    return 0 if ok else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    paths = [a for a in argv if not a.startswith("-")] or served_files()
    hits = scan(paths)
    if not hits:
        print(f"clean: no banned tokens in {len(list(paths))} file(s)")
        return 0
    for path, qid, rid, desc, ctx in hits[:200]:
        print(f"{rid:6} {qid:28} {desc}\n       ...{ctx}...")
    print(f"\n{len(hits)} banned token(s) found")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
