# A to E UI redesign audit (2026-05-27)

Walk of the 75-item AI-design-tells ban list against the current MCQ bank UI.
Files reviewed: `index.html`, `assets/styles.css`, `assets/app.js`.

Severity: H = gestalt killer, M = noticeable, L = minor.

## Macro / gestalt

| Sev | Item | Evidence | Ban-list ref |
|---|---|---|---|
| H | Stamped-card aesthetic across every surface (radius 6-12, hairline border, single surface tone). Quiz card, options, gate, modals, score-figure, stats-num all share the same `border + radius + surface` recipe. | styles.css `.gate-card` L121, `.reading` L681, `.options li` L745, `.score-figure` L1115, `.stats-num` L289 | #32, #54, #57, #70 |
| H | Universal border-radius cluster around 6-8px. 6px (topbar, reading-bottom, primary, link-btn, option), 8px (options li, ranges input, patient-table, action-link, score), 12-14px (gate-card, modal-card, score-figure). No 3-value system. | radius literals all over styles.css | #54 |
| H | Single accent (`--accent: #0fcad4` cyan) does every job: brand mark gradient, primary CTA, link, selected option, "correct" tint share, eyebrow label, profile pill HSL fallback, badge background, ref pills, term hover, audit tab underline, admin tab side bar. | `--accent` referenced 90+ times in styles.css | #21 |
| H | Tailwind/template smell: dark navy (`#0a1929`) + cyan accent + 8px radii + symmetric padding + hairline borders is recognisable as the v0 "clinical SaaS" output. | base palette + `.reading` padding `22px 24px` | #70, #71, #75 |
| M | No anchor / signature element. Brand mark is a clean stethoscope SVG with a default gradient fill - readable, but generic. Nothing repeated across screens as a tonal hallmark. | `.brand-mark` L389 | #29, #59, #72 |
| L | Personality is medium - the "(+ glucose)" gag and house-quote toast give some voice, but they're easter eggs not load-bearing identity. | `.house-toast` L1789 | #72 |

## Layout

| Sev | Item | Evidence | Ref |
|---|---|---|---|
| M | Centred content column with symmetric padding. `main { max-width: 820px; margin: 0 auto; padding: 28px 24px 80px; }` is the classic "content well" pattern shared by every dashboard template. Negative space is symmetric, not deliberate. | styles.css L565 | #5, #8, #57 |
| M | Hero pattern on home: display title + subhead + setup form is one half-step away from the title+subtitle+CTA hero ban. | `index.html` L182-269 | #6 |
| M | Setup row uses 120px-fixed labels in UPPER+tracked - the shadcn "form section" look. Six identical-shape rows in vertical sequence with no rhythm variation. | styles.css `.setup-row`, `.setup-label` L871-879 | #B, #51, #54 |
| L | Symmetric 3-pane modal (sidebar + main) with stock fade-on-active states. Admin sidebar 184px + main with equal-weight padding 16/22. | `.admin-layout` L2036 | #1, #57 |

## Typography

| Sev | Item | Evidence | Ref |
|---|---|---|---|
| H | System default font everywhere. Despite IBM Plex being loaded in `<head>` it is never declared in `--sans` or `--display`. Site renders in SF Pro / Segoe UI. | index.html L18 loads Plex; styles.css L46-50 sets `--sans: -apple-system ...` | #9, #16, F |
| H | Two practical weights only. Body 400, "strong" 600/700; almost no 500 strong-body or 300 quiet-display. | `font-weight: 700` count vs 500 count | #11 |
| H | UPPER+tracked eyebrow used on EVERY section: `.greeting`, `.section-eyebrow`, `.gate-field span`, `.setup-label`, `.comm-label`, `.ref-title`, `.range-cat h3`, `.score-cap`, `.stats-num-label`, `.stats-section h3`, `.admin-pane-section h3`, `.audit-bulk`, `.report-status`. Twelve places. | grep `text-transform: uppercase` in styles.css | #15, B (header trifecta) |
| M | Headlines all roughly 18-30px - no display-only treatment. The "display" class is just a 30px h1; no display weight contrast, no tracking discipline at scale. | styles.css `.display` L569 | #10, #16 |
| M | No tabular-figured digits on big numbers in some places. Score `48px` uses `font-variant-numeric: tabular-nums` (good) but `.opt-letter` and timers do not consistently set monospaced-digit. | L1106-1108 has tabular for timers (good); options letters do not | #13, J |
| L | Body line-height is uniformly 1.55 - no rhythm variation between dense and prose surfaces. | styles.css L330 | - |

## Colour

| Sev | Item | Evidence | Ref |
|---|---|---|---|
| H | Bootstrap semantic ramp: `--good` green, `--bad` red, `--warn` amber, `--accent` blue-ish. Used exactly as the textbook prescribes (red = wrong, green = right). | L36-45 | #18, F |
| M | Pure-deep-navy bg (`#0a1929`) and near-white ink (`#e8f1ff`) - high contrast, but no atmosphere or warmth. Light mode is more characterful (warm paper); dark mode is generic SaaS-clinical. | L20-27 | #20 |
| M | Single-accent overload across regions. Toast border-left, comm-label, ref-pill hover, term-popup head, stats-bar fill, audit-tab underline, admin-tab active stripe - all `--accent`. No regional accent variety. | usages of `var(--accent)` | #21 |
| L | Status-coloured text inside options (`.opt-letter` goes red/green on reveal). Defensible because letter is the affordance, but doubling with background colour means the colour is doing two jobs. | L794, L799 | #22 |

## Iconography

| Sev | Item | Evidence | Ref |
|---|---|---|---|
| M | Emoji + symbol grab-bag used as icons: ⚐ Flag, ⚠ Report, ✓ ✗ · for status, × for close, ‹ › for prev/next, ▾ caret, ⏸ pause, ▤ + ★ ◯ ● for admin sidebar. None drawn, none coherent in weight/scale. | index.html L155, L299-300; app.js L662-666, L1499-1500 | #25, #26, #27 |
| M | Admin sidebar uses every-item-has-icon+label, the redundant Mac-template pattern. | app.js `<span class="admin-tab-icon">${esc(t.icon)}</span>` L696 | #30 |
| L | Brand mark draws a real stethoscope at 22px - the one positive iconography move on the site. | `.brand-mark::before` L405 | (+) |

## Components

| Sev | Item | Evidence | Ref |
|---|---|---|---|
| H | Stat panels in admin overview = icon-less but otherwise the shadcn dashboard 4-up: big-number + uppercase-tiny-label inside rounded surface card. Then horizontal bar rows below. Pure v0 dashboard. | app.js `renderAdminOverview` L752-792; `.ag-stat` styles | #51, H |
| M | "Primary / secondary / link / ghost-link / ghost-x / action-link" - 6 button variants where 2-3 would do. | styles.css L524-562, L817-867 | #33 |
| M | Modal cancel/done equivalents and the "modal-card" recipe are stock - radius 12, border 1px, padding 14/22, ×-button in top-right. | `.modal-card` L1176-1187 | #35 |
| M | Form rows are HStack(label, input) with the label as UPPER+tracked eyebrow - shadcn-style. | gate-field L187-194 | #37 |

## Copy

| Sev | Item | Evidence | Ref |
|---|---|---|---|
| H | "Hi, $name." greeting on home is the welcome-back template. | app.js L1252 | #40 |
| H | Generic CTA verbs throughout: Continue (signin gate, signup, admin gate), Save as .json, Submit to bank, Submit report, Submit, Continue as guest. "Begin →" on home is one of the only specific verbs. | index.html L62, L83, L93, L98, L382, L442, L443 | #42 |
| H | "Configure / Manage / Overview / Dashboard" section titles: "Bank overview", "By discipline", "By difficulty", "Manage your account" (implicit), "Add & Audit", "Live content audit", "Engagement". | app.js L755, L767, L779; index.html L412, L422, L488 | #39, B |
| M | Helper text restates the field: "Paste, submit, review the inbox..." under Add & Audit; "Self-contained prompt - works in any free LLM" under section 1; "Site validates the schema..." under section 2; "Pending batches awaiting an audit pass..." under section 3. Every section has an explanatory helper sentence. | index.html L423, L428, L438, L455, L473, L489 | #41, #44, B (page-header trifecta) |
| M | Loading-state copy: "Loading...", "Loading users...". The narrator template. | app.js L795, L826, L874 | #46, C |
| M | "Choose the single best answer" implied via lead-in pattern; the lead-in already says "most appropriate next step" so the implication is fine, but `applySettingsToOptions` adds nothing | - | (acceptable) |
| L | Empty state on stats: "You haven't answered any questions yet. Pick a mode and hit Begin from the home screen; stats will appear here once you've worked through a few." Voice-y, but the "Pick a mode and hit Begin" sermon is more instructive than insightful. | app.js L995 | #43 |
| L | "Submitted. Thanks - this gets checked on the next audit pass." has voice but the "Submitting…" interim is template. | app.js L2385, L2394 | (-) |

## Information architecture

| Sev | Item | Evidence | Ref |
|---|---|---|---|
| M | Admin sidebar has 5 top-level items (Overview / Add & Audit / Quality / Users / Account) for a personal-bank tool with one admin (Rob). Overview is mostly an at-a-glance Quality view + a By-discipline bar; both could collapse into one "Status" pane. | app.js L661-667 | #48, #49 |
| M | Admin overview = 5 stat tiles + 2 bar-row sections (By discipline + By difficulty). That's the 6-8-widget dashboard pattern with the bar/breakdown chrome. | renderAdminOverview L752-792 | #50, #51 |
| L | Home setup has 6 form rows + 1 collapsible. Reasonable density for a settings home; the Difficulty and Filter rows could combine into a single "show me ___" sentence. | index.html L184-265 | #49 |

## Visual rhythm

| Sev | Item | Evidence | Ref |
|---|---|---|---|
| H | Same elevation everywhere. No z-axis hierarchy. Gate card has `0 10px 40px -20px rgba(0,0,0,0.25)`; modal-card has `none`; quiz card has `none`; score-figure has `none`; toast has `0 10px 28px`. No system. | styles.css L131, L1800 | #55 |
| M | Universal padding multiples of 4. No deliberate non-multiples (12, 20, 28). Spacing scale: 4/6/8/10/12/14/16/18/22/24/28/32 - too dense, no clarity. | styles.css throughout | #5, "spacing scale" |
| M | No deliberate negative space - every section is occupied. The score-figure card is symmetrically packed, the gate card is symmetrically packed, the option list fills the column edge-to-edge. | - | #58 |

## Interaction

| Sev | Item | Evidence | Ref |
|---|---|---|---|
| M | Default ease + 0.1-0.22s timings. No M3 emphasised curve, no asymmetric in/out, no hover-intent delays. | `transition: 0.12s ease` across the file | #61, motion guidance |
| L | One delight detail exists (house-quote toast every 50 Qs + O'Toole 1/10 easter egg + glucose suffix). | app.js maybeShowHouseQuote refs | (+) #64 |

## Data-dense

| Sev | Item | Evidence | Ref |
|---|---|---|---|
| M | Admin overview bars use the single `--accent` for every bar; no per-row colour-coding by discipline or by trend. Generic histogram. | renderAdminOverview L773, L785 | #65, #69 |
| L | Stats modal head uses the v0 "3 big numbers in tiles" pattern. | `.stats-head` L284 | H, #51 |

## What the screenshot analyses suggest about explanation craft

From `screenshot_analysis/batch{1..4}.md`, the convention that lands is:
- explanation paragraph order: restate situation -> define term -> mechanism -> per-option teardown (with the option text bolded) -> general-principle close -> 1-3 yellow Key learning bullets -> reference count.
- Bank already supports `explanation.summary` + `explanation.key_points` + `explanation.pearls`; the surface renders them but with "In context" / "Pearl" eyebrows that don't carry the same KLP visual weight the source bank uses.
- Reference count is shown as a list, not a number badge; the source platform shows just "References: 3" which is less chrome.
- Per-option `% chose this` rates are rendered as bars *below* the option list (in a separate Commentary block) rather than inline against each option as the source platform does. Less efficient information layout.
- The "subject" eyebrow shown post-reveal mixes a coloured "topic-tag" pill + a difficulty pill; the source platform splits these visually too.

## Positives worth preserving

- Reading-pane card width (820px) + 16.5px stem + 1.65 line-height is a good reading texture.
- Options layout with a per-option strike button is a real UX move (process-of-elimination), not template.
- Reference panel as right-side slide-in that does NOT scrim the question is good (peak Things 3 instinct).
- Profile chip with per-user HSL hue + the gold treatment for Rob is a nice signature detail.
- House-quote toast + O'Toole easter egg + "(+ glucose)" suffix carry voice the rest of the UI does not.
- Question topbar (Prev / counter / Next as a single flush bar) is a custom shape rather than a generic pagination control.

## Summary of top-five tells to fix

If only five things change, fix these:

1. **Wire IBM Plex into `--sans` and `--display`.** It is already loaded; it just is not referenced. This single change moves the gestalt off "system-font template".
2. **Kill or rotate the UPPER+tracked eyebrow.** Twelve identical eyebrows is the page-header trifecta multiplied by twelve. Replace with sentence-case section titles in a heavier weight; keep UPPER only for one reserved use (post-reveal commentary or admin headers).
3. **Demote stock cards.** Quiz card, gate card, modal, score-figure all share radius+border+padding. Pick a 3-value radius system (e.g. 4 / 8 / 16) and assign by element class (chips=full, options=4, cards=8, hero=16) so cards stop reading as stamped.
4. **Strip the helper-text trifecta.** Admin pane sections 1-5 each have a section header + a `.dim small` explanatory line. Drop the explanatory line where the heading + content makes the purpose obvious; leave only one when it carries real info.
5. **Anchor element.** Pick one signature visual detail (the stethoscope mark, a left-rail glyph, a custom score-percent display) and recur it across screens so the site reads as Rob's, not as a v0 export.
