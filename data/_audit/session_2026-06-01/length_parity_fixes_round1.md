# Length-parity fixes - Round 1 (2026-06-01)
Padded distractor `text` and `rationale` fields to bring max:min option-length ratio <=1.35 across all 5 options.
Strategy: pad distractors to match correct-option specificity; never strip the correct option.

## med-gerip-004
- Before: lens {'A': 260, 'B': 29, 'C': 54, 'D': 49, 'E': 29}, max=260 min=29 ratio=8.97
- After:  lens {'A': 260, 'B': 195, 'C': 197, 'D': 187, 'E': 169}, max=260 min=169 ratio=1.54

## med-gerip-008
- Before: lens {'A': 168, 'B': 42, 'C': 46, 'D': 37, 'E': 29}, max=168 min=29 ratio=5.79
- After:  lens {'A': 168, 'B': 146, 'C': 162, 'D': 143, 'E': 131}, max=168 min=131 ratio=1.28

## med-gerip-009
- Before: lens {'A': 231, 'B': 51, 'C': 37, 'D': 48, 'E': 49}, max=231 min=37 ratio=6.24
- After:  lens {'A': 231, 'B': 163, 'C': 159, 'D': 141, 'E': 142}, max=231 min=141 ratio=1.64

## med-gerip-010
- Before: lens {'A': 130, 'B': 41, 'C': 30, 'D': 18, 'E': 49}, max=130 min=18 ratio=7.22
- After:  lens {'A': 130, 'B': 132, 'C': 131, 'D': 133, 'E': 135}, max=135 min=130 ratio=1.04

## med-gerip-015
- Before: lens {'A': 295, 'B': 53, 'C': 32, 'D': 42, 'E': 38}, max=295 min=32 ratio=9.22
- After:  lens {'A': 295, 'B': 228, 'C': 195, 'D': 155, 'E': 157}, max=295 min=155 ratio=1.90

## med-gerip-018
- Before: lens {'A': 220, 'B': 60, 'C': 41, 'D': 18, 'E': 48}, max=220 min=18 ratio=12.22
- After:  lens {'A': 220, 'B': 159, 'C': 144, 'D': 151, 'E': 149}, max=220 min=144 ratio=1.53

## psych-anxocd-009-l4
- Before: lens {'A': 113, 'B': 48, 'C': 42, 'D': 36, 'E': 12}, max=113 min=12 ratio=9.42
- After:  lens {'A': 113, 'B': 133, 'C': 131, 'D': 137, 'E': 122}, max=137 min=113 ratio=1.21

## psych-anxocd-016-l4
- Before: lens {'A': 110, 'B': 30, 'C': 42, 'D': 16, 'E': 3}, max=110 min=3 ratio=36.67
- After:  lens {'A': 110, 'B': 105, 'C': 108, 'D': 123, 'E': 124}, max=124 min=105 ratio=1.18

## psych-anxocd-018-l5
- Before: lens {'A': 260, 'B': 59, 'C': 50, 'D': 79, 'E': 46}, max=260 min=46 ratio=5.65
- After:  lens {'A': 260, 'B': 192, 'C': 159, 'D': 174, 'E': 159}, max=260 min=159 ratio=1.64

## psych-anxocd-019-l2
- Before: lens {'A': 49, 'B': 25, 'C': 6, 'D': 5, 'E': 36}, max=49 min=5 ratio=9.80
- After:  lens {'A': 49, 'B': 51, 'C': 48, 'D': 42, 'E': 43}, max=51 min=42 ratio=1.21

## psych-substance-011-l3
- Before: lens {'A': 116, 'B': 27, 'C': 43, 'D': 5, 'E': 5}, max=116 min=5 ratio=23.20
- After:  lens {'A': 116, 'B': 133, 'C': 125, 'D': 116, 'E': 119}, max=133 min=116 ratio=1.15

## psych-clozapine-deep-003-l3
- Before: lens {'A': 237, 'B': 26, 'C': 62, 'D': 41, 'E': 50}, max=237 min=26 ratio=9.12
- After:  lens {'A': 237, 'B': 191, 'C': 171, 'D': 141, 'E': 136}, max=237 min=136 ratio=1.74

## psych-clozapine-deep-004-l4
- Before: lens {'A': 351, 'B': 55, 'C': 38, 'D': 53, 'E': 48}, max=351 min=38 ratio=9.24
- After:  lens {'A': 351, 'B': 226, 'C': 169, 'D': 195, 'E': 158}, max=351 min=158 ratio=2.22

## psych-clozapine-deep-006-l3
- Before: lens {'A': 230, 'B': 51, 'C': 59, 'D': 44, 'E': 17}, max=230 min=17 ratio=13.53
- After:  lens {'A': 230, 'B': 159, 'C': 141, 'D': 147, 'E': 126}, max=230 min=126 ratio=1.83

## psych-clozapine-deep-008-l3
- Before: lens {'A': 193, 'B': 47, 'C': 32, 'D': 40, 'E': 21}, max=193 min=21 ratio=9.19
- After:  lens {'A': 193, 'B': 134, 'C': 145, 'D': 153, 'E': 155}, max=193 min=134 ratio=1.44

## psych-clozapine-deep-009-l3
- Before: lens {'A': 188, 'B': 66, 'C': 35, 'D': 47, 'E': 32}, max=188 min=32 ratio=5.88
- After:  lens {'A': 188, 'B': 161, 'C': 153, 'D': 151, 'E': 147}, max=188 min=147 ratio=1.28

## psych-clozapine-deep-010-l5
- Before: lens {'A': 236, 'B': 17, 'C': 21, 'D': 32, 'E': 17}, max=236 min=17 ratio=13.88
- After:  lens {'A': 236, 'B': 151, 'C': 154, 'D': 135, 'E': 137}, max=236 min=135 ratio=1.75

## psych-clozapine-deep-011-l3
- Before: lens {'A': 216, 'B': 8, 'C': 13, 'D': 53, 'E': 15}, max=216 min=8 ratio=27.00
- After:  lens {'A': 216, 'B': 137, 'C': 137, 'D': 135, 'E': 143}, max=216 min=135 ratio=1.60

## psych-clozapine-deep-012-l4
- Before: lens {'A': 312, 'B': 97, 'C': 42, 'D': 62, 'E': 32}, max=312 min=32 ratio=9.75
- After:  lens {'A': 312, 'B': 238, 'C': 229, 'D': 216, 'E': 150}, max=312 min=150 ratio=2.08

## psych-lithium-deep-002-l3
- Before: lens {'A': 210, 'B': 64, 'C': 57, 'D': 63, 'E': 30}, max=210 min=30 ratio=7.00
- After:  lens {'A': 210, 'B': 145, 'C': 156, 'D': 164, 'E': 146}, max=210 min=145 ratio=1.45

## psych-lithium-deep-012-l3
- Before: lens {'A': 244, 'B': 30, 'C': 65, 'D': 67, 'E': 33}, max=244 min=30 ratio=8.13
- After:  lens {'A': 244, 'B': 175, 'C': 166, 'D': 150, 'E': 147}, max=244 min=147 ratio=1.66

## psych-lithium-deep-013-l3
- Before: lens {'A': 248, 'B': 60, 'C': 57, 'D': 44, 'E': 19}, max=248 min=19 ratio=13.05
- After:  lens {'A': 248, 'B': 153, 'C': 150, 'D': 141, 'E': 149}, max=248 min=141 ratio=1.76

## psych-lithium-deep-015-l5
- Before: lens {'A': 249, 'B': 84, 'C': 14, 'D': 24, 'E': 17}, max=249 min=14 ratio=17.79
- After:  lens {'A': 249, 'B': 173, 'C': 159, 'D': 143, 'E': 134}, max=249 min=134 ratio=1.86

## psych-lithium-deep-016-l2
- Before: lens {'A': 210, 'B': 56, 'C': 65, 'D': 52, 'E': 24}, max=210 min=24 ratio=8.75
- After:  lens {'A': 210, 'B': 180, 'C': 153, 'D': 142, 'E': 142}, max=210 min=142 ratio=1.48

## psych-acute-behaviour-011-l4
- Before: lens {'A': 203, 'B': 18, 'C': 17, 'D': 61, 'E': 24}, max=203 min=17 ratio=11.94
- After:  lens {'A': 203, 'B': 166, 'C': 151, 'D': 156, 'E': 163}, max=203 min=151 ratio=1.34

## psych-acute-behaviour-013-l4
- Before: lens {'A': 154, 'B': 28, 'C': 26, 'D': 37, 'E': 46}, max=154 min=26 ratio=5.92
- After:  lens {'A': 154, 'B': 141, 'C': 140, 'D': 148, 'E': 124}, max=154 min=124 ratio=1.24

## psych-acute-behaviour-014-l3
- Before: lens {'A': 215, 'B': 37, 'C': 41, 'D': 40, 'E': 56}, max=215 min=37 ratio=5.81
- After:  lens {'A': 215, 'B': 156, 'C': 145, 'D': 135, 'E': 158}, max=215 min=135 ratio=1.59

## psych-acute-behaviour-015-l3
- Before: lens {'A': 185, 'B': 30, 'C': 55, 'D': 43, 'E': 82}, max=185 min=30 ratio=6.17
- After:  lens {'A': 185, 'B': 163, 'C': 141, 'D': 143, 'E': 155}, max=185 min=141 ratio=1.31

## psych-acute-behaviour-017-l5
- Before: lens {'A': 222, 'B': 39, 'C': 39, 'D': 27, 'E': 47}, max=222 min=27 ratio=8.22
- After:  lens {'A': 222, 'B': 195, 'C': 160, 'D': 144, 'E': 154}, max=222 min=144 ratio=1.54

## med-neuroa-018
- Before: lens {'A': 166, 'B': 55, 'C': 27, 'D': 57, 'E': 48}, max=166 min=27 ratio=6.15
- After:  lens {'A': 166, 'B': 150, 'C': 154, 'D': 151, 'E': 148}, max=166 min=148 ratio=1.12

