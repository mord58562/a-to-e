#!/usr/bin/env bash
# Y4 MCQ Bank - prints a Claude Code prompt template to copy in.
set -euo pipefail

cd "$(dirname "$0")/.."

PAEDS_COUNT=$(python3 -c "import json; print(len(json.load(open('data/questions_paeds.json'))))" 2>/dev/null || echo 0)
OBGYN_COUNT=$(python3 -c "import json; print(len(json.load(open('data/questions_obgyn.json'))))" 2>/dev/null || echo 0)
TOTAL=$((PAEDS_COUNT + OBGYN_COUNT))
TODAY=$(date +%Y-%m-%d)

cat <<EOF
======================================================================
Y4 MCQ Bank - add more questions
======================================================================
Current bank: ${PAEDS_COUNT} paeds + ${OBGYN_COUNT} O&G = ${TOTAL} total.

To add more, open a Claude Code conversation in this directory
(cd ~/y4-mcq && claude) and paste the prompt below. Edit the COUNT
and TOPIC lines first.

----------------------------------------------------------------------
Add N more Y4-level single-best-answer MCQs to the Y4 MCQ Bank at
~/y4-mcq/. Append them to the appropriate file:
  - paeds questions  -> data/questions_paeds.json
  - O&G questions    -> data/questions_obgyn.json

COUNT:   <how many, e.g. 10>
TOPIC:   <paeds | obgyn | both>
FOCUS:   <optional, e.g. "neonatology" / "labour & delivery" / "contraception">

Requirements (must match existing schema exactly):
* Schema: {id, topic, subtopic, difficulty, tags, stem, data_table?,
  lead_in, options[5] (each with letter, text, correct, rationale),
  explanation {summary, key_points[], pearls?}, sources[2+] with
  {label, url}, reference_ranges[] keyed against
  data/reference_ranges.json categories, created (today's ISO date).
* IDs continue the sequence (e.g. paeds-026, paeds-027, obgyn-026 ...).
* USMLE / Geeky Medics / AMBOSS / Osmosis-calibre vignettes.
* Australian SI units only (mmol/L, μmol/L, g/L, ×10^9/L, °C, etc.).
* Every claim verifiable in a cited reputable free-tier source -
  prioritise Australian: RCH CPG, RANZCOG, KEMH, Royal Women's,
  Therapeutic Guidelines, AMH, NHMRC, ADIPS, NCSP Cervical Screening,
  then international (NICE, BMJ Best Practice, StatPearls, Cochrane).
* No em-dashes (U+2014). Use space-hyphen-space.
* No references to specific universities, course codes, JMP, UNE,
  OSCE rubrics, or any uni-specific framing.
* Difficulty mostly 3-4 with a few 5s.

After writing, update data/meta.json:
  last_added: "${TODAY}"

Verify with:
  python3 -c "import json; q=json.load(open('data/questions_paeds.json')); print(len(q))"
  python3 -c "import json; q=json.load(open('data/questions_obgyn.json')); print(len(q))"
----------------------------------------------------------------------

Tip: ask Claude Code for thematic batches (eg "10 paeds emergency
medicine questions focussing on shock, sepsis, anaphylaxis, status
epilepticus, DKA") to keep questions cohesive and reduce duplication.
EOF
