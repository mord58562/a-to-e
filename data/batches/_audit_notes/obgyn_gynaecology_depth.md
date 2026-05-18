# Audit notes - obgyn_gynaecology_depth

- Source: `data/batches/obgyn_gynaecology_depth.json`
- Audited output: `data/batches/_audited/obgyn_gynaecology_depth.json`

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

### obgyn-gynae-001

- added model="unknown"

### obgyn-gynae-002

- added model="unknown"

### obgyn-gynae-003

- added model="unknown"

### obgyn-gynae-004

- added model="unknown"

### obgyn-gynae-005

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=24w vs distractor mean=13w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-006

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=7w vs distractor mean=3w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-007

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=26w vs distractor mean=10w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-008

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=12w vs distractor mean=5w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-009

- added model="unknown"

### obgyn-gynae-010

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=44w vs distractor mean=15w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-011

- added model="unknown"

### obgyn-gynae-012

- added model="unknown"

### obgyn-gynae-013

- added model="unknown"

### obgyn-gynae-014

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=23w vs distractor mean=11w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-gynae-015

- added model="unknown"

