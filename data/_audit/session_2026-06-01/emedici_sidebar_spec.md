# emedici progress sidebar spec (round 2)

One-page reference for redesigning the A to E "x/YYY" dropdown. All observations are from emedici screenshots dated 2026-05-28, viewed in place at `~/Desktop/a to e prompt/emedici images/`. No images copied into the repo.

## 1. Anatomy from top to bottom

| Region | Element | Notes |
|---|---|---|
| 1 | Page title bar above sidebar: "Question Bank" in plain dark-blue title text, left-aligned at the top of the entire page (not inside the sidebar) | Sidebar starts BELOW the page-title row, so it visually attaches to the question-list, not the global nav |
| 2 | Progress ring (donut) | Diameter ~ 56-64 px. Stroke ~ 6-7 px. Two-arc render: filled arc in saturated green (HSL roughly 145/55/45) for percent-correct; remainder arc in pale neutral grey (very low saturation, ~88-92% lightness). Background of the ring centre is white. |
| 3 | Numeric label inside ring | Bold dark text, e.g. "67%" / "100%" / "0%" / "60%". Font weight 700, size ~ 14-15 px, centred. No decimals. When 0% the ring shows a thin pale grey complete circle with the text "0%" inside in dark grey. |
| 4 | Small caption to right of ring | Two short lines, all-caps small, very low contrast grey: "N QUESTIONS / ANSWERED". Letter-spacing slightly increased. Font size ~ 9-10 px. Sits to the right of the ring, baseline aligned with the ring centre. |
| 5 | Divider (subtle, ~1 px hairline near-white) between ring block and Summary chip | Soft separation, not a hard rule |
| 6 | "Summary" chip / pseudo-tab | Pale aqua background (very desaturated cyan-mint, ~ 88% lightness, hint of teal), small rounded corners (radius ~ 6 px), single-line text "Summary" in dark text, leading icon (small chart bars), modest horizontal padding. Acts as the always-visible "back to list" affordance |
| 7 | Question chip grid | 5 chips per row (sometimes 4 in narrower viewport). Each chip is a circle of fixed diameter (~ 28-30 px) containing the integer question number centred (font ~ 13 px, weight 600). Vertical and horizontal gap ~ 8 px. Background of grid container is white |
| 8 | Footer of sidebar | None; the chip grid ends without a footer when fewer than ~ 60 questions. With many questions the grid scrolls inside a fixed-height sidebar (vertical scroll, no horizontal) |

## 2. Chip state vocabulary

Each circle is one of:

| State | Fill | Text colour | Border |
|---|---|---|---|
| Unanswered | soft pale aqua / mint (matches the Summary chip) | mid-dark blue text | none |
| Answered correct | saturated green fill | white text, weight 700 | none |
| Answered incorrect | saturated coral / red-orange fill | white text, weight 700 | none |
| Flagged / marked | unanswered fill BUT a small dot overlay top-right (not visible across all screenshots; treat as optional) | as base | as base |
| Current question | unanswered fill + a 2-3 px solid blue ring around the perimeter | base text colour | 2-3 px solid stroke in mid-saturation blue (~ #2C7CB0 visually) |

Only the current chip has a perimeter ring. The current chip ALSO has a faint drop-shadow ~ 0/2/4 px low-opacity grey, lifting it 1-2 pt off the grid.

No tooltips visible in screenshots. No hover-state captures available (cursor was off-chip in every screenshot), but the consistent flat-fill aesthetic suggests at most a subtle darken-by-~5% hover.

## 3. Colour palette (round-2 observed)

| Use | Approximate value |
|---|---|
| Sidebar background | white |
| Unanswered chip + Summary chip + ring "remaining" arc | very pale aqua-mint, near #DBEEEA visually |
| Correct chip + ring "progress" arc | saturated green, near #2FA363 visually |
| Incorrect chip | warm coral, near #E26B57 visually |
| Current-chip stroke | mid blue, near #2C7CB0 |
| Text inside coloured chips | white |
| Text inside pale chips | dark slate, near #1F2A37 |
| "QUESTIONS ANSWERED" caption | mid grey, near #6F7884, all caps, increased letter-spacing |
| Numeric percent inside ring | dark slate, same as default body text |

Saturation is deliberately restrained on the pale fills and the percent ring's "remaining" arc, so the saturated green and coral really do read as the only attention demands. The eye is led: ring percent first, then current chip, then anything coral.

## 4. Typography

Single typeface across the sidebar (looks like Inter or a similar humanist sans). Three sizes only:

- ~ 9-10 px all-caps, increased tracking (the QUESTIONS ANSWERED caption)
- ~ 13 px medium (chip numerals)
- ~ 14-15 px bold (the percent inside the ring)

No italics. No serif. No ornaments. The restraint is the design.

## 5. Layout grid

- Sidebar fixed width ~ 220-240 px.
- Outer padding ~ 16-20 px on all sides.
- Vertical rhythm: ring block (~ 80 px tall) > 16 px gap > Summary chip (~ 36 px tall) > 16 px gap > chip grid.
- Chip grid uses CSS grid 5 columns equal width with gap ~ 8 px.
- When the question count exceeds what fits, the sidebar's chip grid region itself scrolls; the ring block and Summary chip stay pinned at the top of the sidebar.

## 6. What makes this feel professional rather than AI-generated

| Choice | Effect |
|---|---|
| One colour family for "in-progress" status (pale aqua-mint) used for both Summary chip and unanswered chips and the ring "remaining" arc | Avoids the AI default of one bright colour per element; ties the surface together |
| Saturated colours appear ONLY where they carry meaning (correct, incorrect, current-question stroke, percent ring fill) | No decorative colour. Removes the AI-design tell of "everything has a brand colour". |
| Percent ring is a TWO-arc donut, not a multi-segment stacked progress bar | The single most distinctive choice; communicates one metric, not three |
| Caption uses tracked all-caps small grey at the SAME baseline as the ring | Looks like Stripe / Linear product UI, not a Tailwind demo |
| Question numbers are the only label on the chips - no icons, no badges | Density without clutter |
| Current-question indication is a perimeter stroke on the existing chip, not a separate "you are here" badge | Removes a UI element rather than adding one |
| Summary chip uses the same shape language as the question chips (pill-ish rounded, pale aqua, dark text) | Reads as part of the same family; not a button trying to be a button |
| No "X / 999" counter anywhere in the sidebar - the ring + the visible chip grid IS the counter | The status is the visualisation; there is no redundant numeric copy |
| No emoji, no gradient, no glassmorphism, no animated shimmer | Restraint as confidence |

## 7. What to adapt for A to E

The A to E "x/YYY" dropdown is conceptually the same problem: tell the user where they are inside a bank of N items, what they have done with each, and let them jump.

Direct adaptations:

1. Replace the numeric `x / 999` summary text with a single donut ring showing `% answered` (out of all attempted-or-not). Percentage label inside the ring; "N ANSWERED" small caption to the right.
2. Replace the dropdown list with a chip grid. One chip per question. Three or four chips per row in a narrower sidebar or six-seven in a wider one.
3. Chip states: unanswered (pale fill), correct (green fill), incorrect (coral fill), current (perimeter ring, no fill change). Use ONLY these four; do not multiply states (no separate flagged, no separate skipped, no separate confidence). If we need flagging, add a small corner dot to the existing chip, do not introduce a fifth fill.
4. The chip number IS the affordance. No tooltip, no hover state beyond a subtle darken.
5. Adopt the "saturated colour only where it carries meaning" rule. The current A to E palette uses brand colour too widely; the sidebar should be near-monochrome with three coloured states only.
6. The sidebar's chip grid scrolls; the ring + summary pinned at top. This means at high N (Y4 bank ~ 1000 items) the sidebar is still usable.
7. Allow the chip grid to filter by module (Paeds / O and G / Psych / Medicine) via the existing module selector; the ring then reflects the filtered subset only.
8. Drop any "x / YYY" textual counter from the rest of the page. The sidebar replaces it.

## 8. Anti-patterns observed elsewhere on emedici that we should NOT carry into the A to E sidebar

- The page-level header has heavy chrome (multiple top bars, tab strip, sub-toolbar). The sidebar succeeds DESPITE this chrome, not because of it. A to E can keep its lean header and the sidebar will land even cleaner.
- emedici's right-hand pane (notes / Leave feedback / Previous contributors) is a separate visual problem and should not influence the sidebar redesign.
- emedici does not show "session position" (e.g. "Question 14 of 79 in this session"). For A to E we may need that context because users select subsets, but it belongs in the page body, not in the sidebar.
