# Bank audit - session 2026-05-27

## Per-topic counts

| Topic | Live | Batch files | Batch Qs |
|---|---:|---:|---:|
| paeds | 24 | 27 | 535 |
| obgyn | 21 | 20 | 342 |
| psych | 0 | 15 | 335 |
| medicine | 0 | 22 | 411 |
| mixed | 0 | 4 | 98 |

Total questions audited: 1766

Files touched (auto-fixes applied): 77

## Auto-fix counts by rule

| Rule | Count |
|---|---:|
| fetal_to_foetal | 157 |
| fetus_to_foetus | 22 |
| magnesium_sulfate | 4 |
| mu_to_mcg | 9 |

## Fix-queue summary

Total flags raised: 1366; queue cap: 200; queue length: 200

| Severity | Total raised | In queue |
|---|---:|---:|
| length-disparity | 690 | 0 |
| lab-without-range | 330 | 0 |
| diagnosis-leak | 301 | 200 |
| pertinent-negative-pileup | 40 | 0 |
| sulphate-non-magnesium | 4 | 0 |
| bland-correct-option | 1 | 0 |

## Top files touched

| File | em-dashes | mag-sulfate | fetal->foetal | hemorrhage->haem | pediatric->paed | bold-strip | mu->mcg |
|---|---:|---:|---:|---:|---:|---:|---:|
| data/batches/cross_topic_deficit_2026-05-26.json | 0 | 0 | 60 | 0 | 0 | 0 | 0 |
| data/batches/paeds_obgyn_l4l5_deficit_p2_2026-05-26.json | 0 | 0 | 31 | 0 | 0 | 0 | 0 |
| data/batches/creative_reasoning_types_2026-05-25.json | 0 | 2 | 23 | 0 | 0 | 0 | 0 |
| data/batches/medicine_cv_emergencies_v2.json | 0 | 0 | 0 | 0 | 0 | 0 | 9 |
| data/batches/psych_substance_alcohol_opioid_amphet.json | 0 | 0 | 7 | 0 | 0 | 0 | 0 |
| data/batches/paeds_obgyn_l4_deficit_2026-05-26.json | 0 | 0 | 7 | 0 | 0 | 0 | 0 |
| data/batches/obgyn_user_paste_emergency_2026-05-20.json | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| data/batches/paeds_rashes_exanthems.json | 0 | 0 | 6 | 0 | 0 | 0 | 0 |
| data/batches/creative_reasoning_set2_2026-05-25.json | 0 | 0 | 4 | 0 | 0 | 0 | 0 |
| data/batches/obgyn_med_deficit_fill_p1_2026-05-26.json | 0 | 0 | 4 | 0 | 0 | 0 | 0 |
| data/batches/paeds_neonatology_depth.json | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| data/batches/medicine_rheum_vasculitis.json | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| data/batches/obgyn_med_deficit_fill_p4_2026-05-26.json | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| data/batches/cross_topic_deficit_p2_2026-05-27.json | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| data/batches/medicine_cardio_resp_starter.json | 0 | 0 | 1 | 0 | 0 | 0 | 0 |

## Structural observations

- Questions missing 'In context' closer (in summary OR key_points): 1766 of 1766 (100%)
- Questions with short/missing explanation.summary (<100 chars): 0 (0%)
- Questions whose first source is NOT an AU body: 628 (36%)
- Questions with no sources array: 0 (0%)

Files with >30% missing 'In context':

- data/questions_paeds.json: 24/24 (100%)
- data/questions_obgyn.json: 21/21 (100%)
- data/batches/creative_reasoning_set2_2026-05-25.json: 8/8 (100%)
- data/batches/creative_reasoning_types_2026-05-25.json: 20/20 (100%)
- data/batches/cross_topic_deficit_2026-05-26.json: 40/40 (100%)
- data/batches/cross_topic_deficit_p2_2026-05-27.json: 30/30 (100%)
- data/batches/med_psych_l3l4_deficit_2026-05-26.json: 40/40 (100%)
- data/batches/med_psych_mixed_deficit_2026-05-26.json: 8/8 (100%)
- data/batches/med_psych_mixed_deficit_p2_2026-05-26.json: 8/8 (100%)
- data/batches/med_psych_mixed_deficit_p3_2026-05-26.json: 8/8 (100%)
- data/batches/med_psych_mixed_deficit_p4_2026-05-26.json: 8/8 (100%)
- data/batches/med_psych_mixed_deficit_p5_2026-05-26.json: 8/8 (100%)
- data/batches/med_psych_mixed_deficit_p6_2026-05-26.json: 32/32 (100%)
- data/batches/medicine_cardio_core_v1.json: 14/14 (100%)
- data/batches/medicine_cardio_resp_starter.json: 20/20 (100%)
- data/batches/medicine_cv_emergencies_v2.json: 20/20 (100%)
- data/batches/medicine_endo_emergencies_depth.json: 20/20 (100%)
- data/batches/medicine_endo_neuro_starter.json: 17/17 (100%)
- data/batches/medicine_geri_pall_depth.json: 20/20 (100%)
- data/batches/medicine_haem_onc_emergencies.json: 17/17 (100%)
- data/batches/medicine_id_rheumatology.json: 17/17 (100%)
- data/batches/medicine_neuro_acute.json: 20/20 (100%)
- data/batches/medicine_psych_deficit_fill_2026-05-25.json: 30/30 (100%)
- data/batches/medicine_psych_new_clusters_2026-05-25.json: 35/35 (100%)
- data/batches/medicine_renal_electrolytes.json: 19/19 (100%)
