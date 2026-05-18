# Audit notes - obgyn_antenatal_complications

- Source: `data/batches/obgyn_antenatal_complications.json`
- Audited output: `data/batches/_audited/obgyn_antenatal_complications.json`

## Summary

- Input questions: 15
- Kept: 14
- Dropped: 1
- Questions modified: 14

## Dropped

- **obgyn-antenatal-008** - Lead-in: "Which weight-adjusted enoxaparin dose..." - weight-band dose-arithmetic lookup violates rule #9 (no weight-based dose arithmetic in lead-in). Options are five dose values requiring memorisation of RCOG GTG 37a weight bands - retrieval, not reasoning.

## Global modifications

- Added top-level `model: "unknown"` field (no generator metadata in source).
- Australian spellings applied case-preservingly to all narrative fields (stem, lead-in, subtopic, options, rationales, explanation summary/key_points/pearls, tags, data_table): fetal->foetal, fetus->foetus, sulfate->sulphate, sulfa*->sulpha*, cesarean->caesarean, hemorrhage->haemorrhage etc.
- Source labels NOT modified (proper names of guidelines such as 'RANZCOG Intrapartum Fetal Surveillance Clinical Guideline' must stay as the publishers wrote them).
- Em-dash (U+2014) count: 0 in input, 0 in output.
- Reference-range slugs (`reference_ranges` array) untouched - these are dataset keys, not display text.

## Per-question audit

### obgyn-antenatal-001

- spelling: fetal→foetal x2
- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=16w vs distractor mean=7w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-antenatal-002

- spelling: fetus→foetus x1, sulfate→sulphate x5, sulfa→sulpha x5
- added model="unknown"

### obgyn-antenatal-003

- spelling: fetal→foetal x2, fetus→foetus x2, sulfate→sulphate x5, sulfa→sulpha x5
- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=40w vs distractor mean=10w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-antenatal-004

- spelling: fetal→foetal x1
- added model="unknown"

### obgyn-antenatal-005

- added model="unknown"

### obgyn-antenatal-006

- spelling: fetal→foetal x2
- added model="unknown"

### obgyn-antenatal-007

- spelling: fetal→foetal x2
- added model="unknown"

### obgyn-antenatal-009

- spelling: fetal→foetal x2, sulfa→sulpha x2
- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=15w vs distractor mean=6w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-antenatal-010

- spelling: fetal→foetal x13, fetus→foetus x1, sulfa→sulpha x5
- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=28w vs distractor mean=7w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-antenatal-011

- spelling: fetal→foetal x9
- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=44w vs distractor mean=14w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-antenatal-012

- spelling: fetal→foetal x3, fetus→foetus x2, sulfate→sulphate x1, sulfa→sulpha x1
- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=39w vs distractor mean=11w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-antenatal-013

- spelling: fetal→foetal x3
- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=62w vs distractor mean=13w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-antenatal-014

- spelling: fetal→foetal x4, fetus→foetus x2
- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=60w vs distractor mean=16w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-antenatal-015

- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=54w vs distractor mean=12w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

