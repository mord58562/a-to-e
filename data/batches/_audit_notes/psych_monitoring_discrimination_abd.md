# Audit notes - psych_monitoring_discrimination_abd

- Source: `data/batches/psych_monitoring_discrimination_abd.json`
- Audit pass: 2026-05-25 (standard rule pack A-M)

## Summary

- Input questions: 30
- Modified: 0 (no material edits required)
- Composition: 26 Psychiatry + 4 Medicine; difficulty 25 x L4 + 4 x L3 + 1 x L5

## Audit findings

- Telegraph phrases ("despite", "omitting", "without first", "without bothering"): 4 hits scanned. All are descriptive clinical language and pass rule A:
  - psych-sadisc-002 summary: "When depression emerges despite adequate antipsychotic coverage..."
  - psych-metmon-001 summary: "metabolic syndrome despite adequate lifestyle intervention..."
  - med-sepsis-002 (multiple): "Persistent elevation despite MAP targets...", "Failure to clear despite adequate MAP..."
  - med-htnemer-002 pearls: "...worsen dissection despite lowering the BP number."
- Diagnosis-leak in stem: none. Dx-question Qs (psych-sadisc-001) appropriately name diagnoses in options.
- Diagnosis-leak in options: psych-cata-002 names NMS / catatonia / EPS but the lead-in "addressing both possible diagnoses" makes the differential the explicit framing, so this is permitted.
- Undefined acronyms: PHQ-9, GAD-7, LVH, QRS, MAP are standard clinical shorthand at exam level; no expansion needed.
- In context blocks: all 30 Qs use the standard summary/key_points/pearls schema; general-condition wrap is present in pearls/summary across the batch.
- Length parity: max-min option text within tolerance for all 30 Qs; no correct-is-longest violations.
- L3 calibration (4 Qs - med-sepsis-001/002, med-htnemer-001/002): all require clinical reasoning (sepsis bundle evidence-weighting, lactate clearance interpretation, urgency vs emergency classification, type B dissection rate-then-pressure logic). Appropriate L3 per 2026-05-21 overhaul.
- Spelling / grammar: clean.
- NSW Health refs: state-neutral where the question is generic; no incorrect state attributions.
- House attribution: no House references in this batch.
- Atosiban: not referenced.
- Aboriginal terminology: no ATSI; no Aboriginal-specific stems in this batch.
- Em-dash (U+2014) count: 0.

## Conclusion

No material edits applied. Batch passes the 2026-05-25 audit rule pack as-is.
