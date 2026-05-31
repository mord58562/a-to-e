# Length-parity fixes - Round 1 (2026-06-01)

Top-30 worst offenders from `data/_audit/session_2026-06-01/content_audit.json` `length_parity[]`. Strategy: pad distractor `text` (and matching `rationale` for cases where rationale parity also needed lift) to match the correct option's specificity. Correct option was never trimmed. All 30 now have max:min option `text` ratio <=1.35.

| ID | File | Before (ratio / max / min) | After (ratio / max / min) |
|----|------|----------------------------|----------------------------|
| `psych-anxocd-016-l4` | `data/batches/psych_anxiety_ocd_ptsd_depth.json` | 36.67 / 110 / 3 | 1.18 / 124 / 105 |
| `psych-clozapine-deep-011-l3` | `data/batches/psych_clozapine_deepdive.json` | 27.00 / 216 / 8 | 1.20 / 249 / 208 |
| `psych-substance-011-l3` | `data/batches/psych_substance_alcohol_opioid_amphet.json` | 23.20 / 116 / 5 | 1.15 / 133 / 116 |
| `psych-lithium-deep-015-l5` | `data/batches/psych_lithium_deepdive.json` | 17.79 / 249 / 14 | 1.06 / 252 / 237 |
| `psych-clozapine-deep-010-l5` | `data/batches/psych_clozapine_deepdive.json` | 13.88 / 236 / 17 | 1.07 / 242 / 226 |
| `psych-clozapine-deep-006-l3` | `data/batches/psych_clozapine_deepdive.json` | 13.53 / 230 / 17 | 1.14 / 252 / 222 |
| `psych-lithium-deep-013-l3` | `data/batches/psych_lithium_deepdive.json` | 13.05 / 248 / 19 | 1.10 / 248 / 225 |
| `med-gerip-018` | `data/batches/medicine_geri_pall_depth.json` | 12.22 / 220 / 18 | 1.20 / 263 / 220 |
| `psych-acute-behaviour-011-l4` | `data/batches/psych_acute_behavioural_emergency.json` | 11.94 / 203 / 17 | 1.34 / 203 / 151 |
| `psych-anxocd-019-l2` | `data/batches/psych_anxiety_ocd_ptsd_depth.json` | 9.80 / 49 / 5 | 1.21 / 51 / 42 |
| `psych-clozapine-deep-012-l4` | `data/batches/psych_clozapine_deepdive.json` | 9.75 / 312 / 32 | 1.31 / 312 / 238 |
| `psych-anxocd-009-l4` | `data/batches/psych_anxiety_ocd_ptsd_depth.json` | 9.42 / 113 / 12 | 1.21 / 137 / 113 |
| `psych-clozapine-deep-004-l4` | `data/batches/psych_clozapine_deepdive.json` | 9.24 / 351 / 38 | 1.32 / 351 / 265 |
| `med-gerip-015` | `data/batches/medicine_geri_pall_depth.json` | 9.22 / 295 / 32 | 1.25 / 313 / 251 |
| `psych-clozapine-deep-008-l3` | `data/batches/psych_clozapine_deepdive.json` | 9.19 / 193 / 21 | 1.18 / 193 / 164 |
| `psych-clozapine-deep-003-l3` | `data/batches/psych_clozapine_deepdive.json` | 9.12 / 237 / 26 | 1.32 / 252 / 191 |
| `med-gerip-004` | `data/batches/medicine_geri_pall_depth.json` | 8.97 / 260 / 29 | 1.33 / 260 / 195 |
| `psych-lithium-deep-016-l2` | `data/batches/psych_lithium_deepdive.json` | 8.75 / 210 / 24 | 1.19 / 214 / 180 |
| `psych-acute-behaviour-017-l5` | `data/batches/psych_acute_behavioural_emergency.json` | 8.22 / 222 / 27 | 1.19 / 265 / 222 |
| `psych-lithium-deep-012-l3` | `data/batches/psych_lithium_deepdive.json` | 8.13 / 244 / 30 | 1.06 / 244 / 231 |
| `med-gerip-010` | `data/batches/medicine_geri_pall_depth.json` | 7.22 / 130 / 18 | 1.04 / 135 / 130 |
| `psych-lithium-deep-002-l3` | `data/batches/psych_lithium_deepdive.json` | 7.00 / 210 / 30 | 1.12 / 235 / 210 |
| `med-gerip-009` | `data/batches/medicine_geri_pall_depth.json` | 6.24 / 231 / 37 | 1.25 / 245 / 196 |
| `psych-acute-behaviour-015-l3` | `data/batches/psych_acute_behavioural_emergency.json` | 6.17 / 185 / 30 | 1.31 / 185 / 141 |
| `med-neuroa-018` | `data/batches/medicine_neuro_acute.json` | 6.15 / 166 / 27 | 1.12 / 166 / 148 |
| `psych-acute-behaviour-013-l4` | `data/batches/psych_acute_behavioural_emergency.json` | 5.92 / 154 / 26 | 1.24 / 154 / 124 |
| `psych-clozapine-deep-009-l3` | `data/batches/psych_clozapine_deepdive.json` | 5.88 / 188 / 32 | 1.28 / 188 / 147 |
| `psych-acute-behaviour-014-l3` | `data/batches/psych_acute_behavioural_emergency.json` | 5.81 / 215 / 37 | 1.07 / 231 / 215 |
| `med-gerip-008` | `data/batches/medicine_geri_pall_depth.json` | 5.79 / 168 / 29 | 1.28 / 168 / 131 |
| `psych-anxocd-018-l5` | `data/batches/psych_anxiety_ocd_ptsd_depth.json` | 5.65 / 260 / 46 | 1.12 / 268 / 240 |

## Per-Q final option lengths

- `psych-anxocd-016-l4`: A=110 B=105 C=108 D=123 E=124 (ratio 1.18)
- `psych-clozapine-deep-011-l3`: A=216 B=249 C=237 D=234 E=208 (ratio 1.20)
- `psych-substance-011-l3`: A=116 B=133 C=125 D=116 E=119 (ratio 1.15)
- `psych-lithium-deep-015-l5`: A=249 B=242 C=249 D=252 E=237 (ratio 1.06)
- `psych-clozapine-deep-010-l5`: A=236 B=242 C=226 D=238 E=239 (ratio 1.07)
- `psych-clozapine-deep-006-l3`: A=230 B=252 C=247 D=235 E=222 (ratio 1.14)
- `psych-lithium-deep-013-l3`: A=248 B=233 C=238 D=225 E=238 (ratio 1.10)
- `med-gerip-018`: A=220 B=263 C=231 D=224 E=223 (ratio 1.20)
- `psych-acute-behaviour-011-l4`: A=203 B=166 C=151 D=156 E=163 (ratio 1.34)
- `psych-anxocd-019-l2`: A=49 B=51 C=48 D=42 E=43 (ratio 1.21)
- `psych-clozapine-deep-012-l4`: A=312 B=238 C=264 D=270 E=256 (ratio 1.31)
- `psych-anxocd-009-l4`: A=113 B=133 C=131 D=137 E=122 (ratio 1.21)
- `psych-clozapine-deep-004-l4`: A=351 B=310 C=271 D=280 E=265 (ratio 1.32)
- `med-gerip-015`: A=295 B=280 C=313 D=292 E=251 (ratio 1.25)
- `psych-clozapine-deep-008-l3`: A=193 B=165 C=164 D=189 E=190 (ratio 1.18)
- `psych-clozapine-deep-003-l3`: A=237 B=191 C=252 D=228 E=234 (ratio 1.32)
- `med-gerip-004`: A=260 B=195 C=197 D=236 E=229 (ratio 1.33)
- `psych-lithium-deep-016-l2`: A=210 B=180 C=212 D=214 E=206 (ratio 1.19)
- `psych-acute-behaviour-017-l5`: A=222 B=240 C=265 D=237 E=235 (ratio 1.19)
- `psych-lithium-deep-012-l3`: A=244 B=242 C=239 D=231 E=231 (ratio 1.06)
- `med-gerip-010`: A=130 B=132 C=131 D=133 E=135 (ratio 1.04)
- `psych-lithium-deep-002-l3`: A=210 B=225 C=218 D=231 E=235 (ratio 1.12)
- `med-gerip-009`: A=231 B=245 C=239 D=210 E=196 (ratio 1.25)
- `psych-acute-behaviour-015-l3`: A=185 B=163 C=141 D=143 E=155 (ratio 1.31)
- `med-neuroa-018`: A=166 B=150 C=154 D=151 E=148 (ratio 1.12)
- `psych-acute-behaviour-013-l4`: A=154 B=141 C=140 D=148 E=124 (ratio 1.24)
- `psych-clozapine-deep-009-l3`: A=188 B=161 C=153 D=151 E=147 (ratio 1.28)
- `psych-acute-behaviour-014-l3`: A=215 B=231 C=225 D=221 E=216 (ratio 1.07)
- `med-gerip-008`: A=168 B=146 C=162 D=143 E=131 (ratio 1.28)
- `psych-anxocd-018-l5`: A=260 B=268 C=240 D=241 E=246 (ratio 1.12)

## Notes

- No em-dashes (U+2014) introduced; verified by codepoint grep on all three patch scripts and target Q option fields after final write.
- AU spellings preserved (haematology, oedema, anaemia, paediatric, dyspnoea, foetal, caesarean where applicable).
- Correct options unchanged in all 30 questions.
- Distractor text padded with plausible clinical detail (drug doses, monitoring intervals, rationale qualifiers) consistent with the stem; not nonsense filler.
- Rationale fields were updated for a subset of distractors where the original rationale was very short (single phrase + 'Would be wrong (Source: X)'); padded rationales remain clinically accurate and source-cited.
- Three sequential rounds of patching were required because round-1 distractor lengths were calibrated relative to the correct option but min-lengths needed further pad to bring ratios <=1.35.
