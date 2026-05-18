# Audit notes - obgyn_gynae_high_yield

- Source: `data/batches/obgyn_gynae_high_yield.json`
- Audited output: `data/batches/_audited/obgyn_gynae_high_yield.json`

## Summary

- Input questions: 15
- Kept: 15
- Dropped: 0
- Questions modified: 15

## Global modifications

- Added top-level `model: "unknown"` field (no generator metadata in source).
- Australian spellings applied case-preservingly to all narrative fields (stem, lead-in, subtopic, options, rationales, explanation summary/key_points/pearls, tags, data_table): fetal->foetal, fetus->foetus, sulfate->sulphate, sulfa*->sulpha*, cesarean->caesarean, hemorrhage->haemorrhage etc.
- Source labels NOT modified (proper names of guidelines such as 'RANZCOG Intrapartum Fetal Surveillance Clinical Guideline' must stay as the publishers wrote them).
- Em-dash (U+2014) count: 0 in input, 0 in output.
- Reference-range slugs (`reference_ranges` array) untouched - these are dataset keys, not display text.

## Per-question audit

### obgyn-gynae-hy-001

- added model="unknown"

### obgyn-gynae-hy-002

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=14w vs distractor mean=8w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-hy-003

- added model="unknown"

### obgyn-gynae-hy-004

- added model="unknown"

### obgyn-gynae-hy-005

- added model="unknown"

### obgyn-gynae-hy-006

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=21w vs distractor mean=11w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-hy-007

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=16w vs distractor mean=6w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-hy-008

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=8w vs distractor mean=4w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-hy-009

- added model="unknown"

### obgyn-gynae-hy-010

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=28w vs distractor mean=10w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-hy-011

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=13w vs distractor mean=7w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-hy-012

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=16w vs distractor mean=9w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-hy-013

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=32w vs distractor mean=9w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-hy-014

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=13w vs distractor mean=7w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-hy-015

- added model="unknown"

