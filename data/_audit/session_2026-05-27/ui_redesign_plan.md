# A to E UI redesign plan (2026-05-27)

Concrete change list per surface. Numbered against the audit. "Before" is
what ships today; "after" is the target. Constraint: no removed JS-referenced
IDs, no new fonts beyond IBM Plex (already loaded), no copy-explanation
patches - if copy is needed, redesign instead.

---

## Foundation (applies everywhere)

### F1. Wire IBM Plex into the type stack
- Before: `--sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", Roboto, "Helvetica Neue", sans-serif;` - never reaches Plex.
- After: `--sans: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;` and `--display: "IBM Plex Serif", "IBM Plex Sans", Georgia, serif;` plus `--serif: "IBM Plex Serif", Georgia, serif;` aliased properly. Plex Serif at display sizes gives the site editorial personality the screenshot bank does not have, and pairs well with the existing italic "(+ glucose)" gag.
- Adds a 500 weight token to `--w-med` so we can use four weights (400 / 500 / 600 / 700) deliberately.

### F2. Three-radius system (replace radius soup)
- Tokens: `--r-chip: 999px`, `--r-tight: 4px`, `--r-soft: 10px`. Map: pills/profile-chip/badge -> chip; options/inputs/strike/tag -> tight; cards/modals/score-figure/patient-table/admin-pane -> soft. Drop ad-hoc 6/7/8/12/14 values.

### F3. Two-tier secondary ink
- Add `--ink-3` between `--ink-2` and `--ink-mute` so headings, body, label-secondary, helper-tiny each have a deliberate level rather than collapsing into the same grey.

### F4. Accent split
- Keep `--accent` cyan for selection + correct affordance only.
- Add `--accent-warm` (a desaturated coral/amber) for CTAs and brand mark gradient stop, so "Begin" / "Submit" / "Next" do not share the same hue as a correct-answer tint.
- Eyebrow / label-secondary moves to `--ink-mute`, not `--accent`.

### F5. Eyebrow demotion
- Replace the 12 `text-transform: uppercase; letter-spacing: 0.12em-0.16em` instances with sentence-case headings in Plex Serif 600 or Plex Sans 500. Reserve UPPER+tracked for ONE place: the post-reveal commentary "subject" pill (where the content earns the chip).
- Add a `.eyebrow` class kept only for the reserved use; remove eyebrow styling from `.section-eyebrow`, `.gate-field span`, `.setup-label`, `.comm-label`, `.ref-title`, `.range-cat h3`, `.score-cap`, `.stats-num-label`, `.stats-section h3`, `.admin-pane-section h3`.

---

## Sign-in / sign-up gate

Before: A 380px-wide rounded card with brand mark + wordmark + tagline + tabs + uppercase-tracked field labels + "Continue" button + footer with "Continue as guest · Admin login".
Issues: text-book v0 sign-in card (#32, #40, #42, #6). "Continue" is generic.

After:
- Replace the card with a left-anchored composition: brand mark + "A to E" in Plex Serif 600 at 38px aligned to a 56px gutter, tagline directly underneath in sentence case at 15px, two tabs flush left (no bottom-border indicator - the inactive tab is just ink-mute, the active tab is ink + Plex Serif 600).
- Field labels become sentence-case at body size (Email / Password / First name / Confirm password), letter-spacing 0. No uppercase.
- Replace "Continue" with the specific verb: `Sign in` / `Create account`. Admin password form: `Unlock admin`. Guest button: `Skip - try without saving`.
- Drop tagline `.gate-tagline` if tabs make purpose obvious; keep one sentence anchored under the wordmark if needed.

## Masthead

Before: brand-mark + wordmark + practice-MCQ-bank sub + session-meta + tools row (Reference values / Stats / Account / Admin / Theme / profile-chip).
Issues: stock chrome, eyebrow session-meta, all tools have the same `.link-btn` shape (#30, #32, #56).

After:
- Keep brand block as-is (it is already a positive).
- `.session-meta` becomes sentence-case Plex Mono 12px (no tracking, no uppercase).
- Tools row: separate "navigation" from "user". Group Reference values + Stats as left-of-divider plain text buttons (Plex Sans 500). Account / Admin become icon-only square buttons (we keep them text but tighten to 11.5px). Theme becomes a single glyph (sun/moon) at the right edge.
- Drop the redundant `.brand-sub` "A practice MCQ bank" - it is already hidden by CSS, keep hidden.

## Home (mode picker)

Before: "Hi, $name." greeting + display title + subhead + 6 setup rows + collapsible Learning areas + Begin button + pool size sentence.
Issues: greeting template (#40), hero pattern (#6), repetitive UPPER labels (#B), 6 identical-shape rows (#54).

After:
- Drop the `.greeting` block entirely. Replace with a single editorial sentence in Plex Serif italic underneath the display: "Tonight's session" / "Pick up where you left off" - chosen by whether `state.history` is empty. (Even simpler: just remove and let the display title carry.)
- Display title moves to Plex Serif 700 at 36px; subhead at 16px Plex Sans, max-width 56ch.
- Setup rows: replace the 120px-fixed label column with inline sentence-shaped composition. Mode -> two big text chips at 48px height side-by-side (Study | Test) that read as the actual decision; Questions / Timer collapse under Test as a single inline line that says "10 / 20 / 40 / 60 / 100 / All  ·  Timer 0 / 15 / 30 / 45 / 60 / 90 / 120". Discipline / Difficulty / Filter retain chip shape but lose the 10.5px uppercase label - they become small sentence-case labels in body weight at body size, aligned with the chips.
- Reuse `.setup-label` selector but flip the style (sentence case, body weight, ink-3). All chip groups keep their existing `data-name` attrs so JS readMulti / single-select handlers continue working.
- Begin button copy stays "Begin →" - one of the few specific verbs the site has. Pool-size line moves to inline-right of the button (was below).

## Quiz screen

Before: topbar (Prev / counter / Next) flush against `.reading` card; folio (hidden) + subject pill (post-reveal); stem 16.5px; data_table grid; lead-in 15.5px 600; ol of options with letter / text / strike; action row with Submit + Flag + Report.

After:
- Topbar: keep the prev/counter/next pattern but drop the rounded top corners on `.quiz-topbar` and make the underline a 1px hairline only; the seam should disappear into the card so it reads as a single canvas.
- Question counter button: replace `Q 1 / 50` with `1 / 50` (lose the letter prefix - hierarchy carries it).
- Stem typography: switch to Plex Serif 400 at 17px, line-height 1.7. Reading rhythm is the work the quiz screen does; serif is what other reading-first apps (Reeder, Things subtitles) reach for.
- Lead-in: Plex Sans 600 at 15px - matches body density. Lose the slight size jump that breaks rhythm.
- Patient-table: keep the dt/dd grid; switch dt from `font-weight: 500` ink-mute to Plex Mono 12px ink-mute with no transformation, so it visually echoes lab-printout convention.
- Options: replace the 3-column grid (letter / text / strike) with a 2-column layout where the letter is a 28px glyph in Plex Serif 500, the strike button collapses to a tiny ghost-x revealed on hover (so the row is not constantly chrome). Selection state uses a left-edge accent stripe (3px) instead of background-tint, freeing the surface tone for the correct/wrong reveal.
- Action row: drop the bordered "action-link" style on Flag / Report; make them plain ghost-links right-aligned, the same weight as the session-meta. Submit / Next become Plex Sans 600 primary; keep "Show answer" copy on Submit (specific) and "Next →" on Next.
- Commentary block: relabel "Commentary" -> sentence-case "Why" heading, drop the `section-eyebrow` uppercase. Each comm-block label ("Why this is correct" / "Why the others are not" / "In context" / "Sources" / "What other users chose") becomes sentence-case Plex Sans 600 14px in `--ink-2`, no UPPER, no tracking, no accent-coloured. "Pearl" block keeps the warm-bg left-border but loses the bold "Pearl." prefix - the colour treatment is the signal.

## Summary / report

Before: display "Session report" + subhead score-line + score-strip (figure 170px + breakdown bars) + review filters + review-list ol + retry / new-session.

After:
- Reframe as a one-paragraph editorial summary: large Plex Serif percent followed inline by a sentence "32 of 40 correct in 28 minutes. Two flagged. One ran out of time." No upper-case "CORRECT" caption.
- Topic breakdown stays but ditches the 3-column track-bar-pct layout in favour of a Sparkline-style horizontal row per topic: `Paediatrics ················· 8 / 10` where the dots reflect proportion-wrong. (Implementation can keep current bar-track grid; just thin the bar to 2px and let the n/total carry.)
- Review filters keep `data-review` IDs (JS dependency). Visual: lose the chip background, use a sentence-case toggle with ink-mute / ink contrast.

## Reference panel

Before: right slide-in, search input, jump-pills, body, footer.
Issues: jump-pills are `border-radius: 999px` chips, accent on hover - generic.

After:
- Keep slide-in (it is already a positive Things-style move).
- Replace search input style: borderless, with a hairline underline only; placeholder "tests, conditions, units" (drop "search").
- Jump pills lose pill shape; become sentence-case Plex Sans 500 underline-on-hover links, separated by 12px - reads as a typographic index, not chip-soup.
- Range table dt/dd switches to two columns of Plex Mono 12px on the right side; left side Plex Sans 13px ink-mute. Dotted rule rows preserved.

## Stats modal

Before: 3 stat tiles + per-topic table.
Issues: classic v0 dashboard 3-up (#H).

After:
- Replace stat tiles with an inline sentence: "You've answered 247 questions over 12 sessions. 71% first-time correct." Big number gets Plex Serif treatment in line.
- Topic table thinned: drop the bar-wrap chrome; show topic name | small bar | n correct / n total, all in sentence case body.

## Admin modal

Before: 5-tab sidebar (Overview / Add & Audit / Quality / Users / Account) with icon glyphs + label. Overview = 5 stat tiles + 2 bar-row sections. Add & Audit pane = 5 numbered sections each with header + helper sentence + content. Quality / Users / Account each render their own native pane.

After:
- Sidebar: drop the icon glyphs (the labels do the work; icons are not custom-drawn and they are not adding info). Keep the active-tab left stripe in `--accent` as the one place colour means selection.
- Overview: replace 5 stat tiles with a single dense editorial line: "247 questions, 18 inbox pending, 3 open reports. Last batch added 2026-05-27." Then keep the By-discipline / By-difficulty bar rows as the visual.
- Add & Audit: drop the per-section helper sentences ("Self-contained prompt - works in any free LLM", "Site validates the schema...", "Pending batches awaiting an audit pass.", "User-submitted issues against specific questions.", "Every batch + main per-topic file in the bank."). Section titles become sentence case: "1. Generation prompt" -> "Generate", "2. Paste the JSON" -> "Paste", "3. Inbox" -> "Inbox", "4. Reports" -> "Reports", "5. Live content audit" -> "Live audit". Numbering retained to signal flow.
- Quality / Users headings switch to sentence case ("Lowest first-time correct (audit candidates)" -> "Lowest first-time correct").

## Quiz topbar + colophon + pause/timer

Before: topbar above card; colophon at bottom sticky with exit / session-time / question-time / pause / end.
After:
- Colophon stays sticky, but `#sessionTime` / `#questionTime` adopt Plex Mono 12px (already mono-ish via `--mono`, but reinforces). Drop the `font-variant-numeric` redundancy.
- Replace the bullet `·` separator between session-time and question-time with a 12px vertical hairline.
- Pause button (⏸) replaced with a square button containing two vertical bars drawn via flex+border (no emoji glyph).

---

## Beyond AI-tells - opportunistic improvements

These are not on the 75-list but Rob asked for any-way-to-improve mining.

### O1. Stem reading rhythm
Stems are dense prose with vitals embedded. Add a subtle `<p>` paragraph break after the demographics sentence when the stem is >150 chars, by a CSS-only `text-indent` on the first line. (Or by inserting a `.stem-break` rule between sentences via app.js renderStemWithClues - lightweight, optional.) Reduces wall-of-text feel without changing content.

### O2. Reveal motion
Currently options just snap to their revealed colour. A 180ms cross-fade between selected-bg and correct-bg gives the moment some weight without slowing it. Use M3 emphasized curve `cubic-bezier(0.2, 0, 0, 1)`.

### O3. House quote toast positioning
Currently bottom-right fixed. On phones it moves to bottom inset; consider letting it dock to the colophon area so it does not cover the option list during reveal.

### O4. Submit/Next button keystroke affordance
Both already bind Enter, but no visible kbd hint. Add a `<kbd>↵</kbd>` glyph inside the Submit/Next button at >= tablet widths so the keyboard affordance is discoverable without copy.

### O5. Inline reference-range chips
When `q.reference_ranges` populates, render them as a tiny line under the patient-table (not below the rationale) so the reader sees the range while reading the labs, not after answering. (This is the source-bank pattern from batches 1-4.)

### O6. Profile chip clarity
Per-user HSL hue is good but the contrast varies by hue (180 looks washed in dark mode). Add a min-saturation floor and lock the lightness per-theme.

### O7. Section anchor (the signature element)
Pick the stethoscope mark from the brand. Reuse it scaled small (10px) as a section divider between the lead-in and the option list, in `--ink-faint`. Once you start seeing it, it becomes the visual hallmark.

### O8. Tabular numbers everywhere they update
Apply `font-variant-numeric: tabular-nums` to `.opt-letter`, `.qt-counter`, all stat values, score-num, score-cap counts. Already done for some; make it universal so digits stop jittering.

### O9. House quote toast - add a serif treatment
Already serif via `--serif, var(--display)`. Once Plex Serif is wired into `--display`, this gets its hallmark face for free.

### O10. Phone setup row compaction
On `max-width: 480px`, the setup rows currently stack with each label above each chip group. Tighten by hiding the label entirely when the chip text is self-evident (Mode / Discipline) and only keep labels where the group is ambiguous (Filter / Difficulty).

---

## What we are NOT changing

- Brand mark stethoscope SVG (it is a positive).
- "(+ glucose)" suffix, glucose body class, O'Toole easter egg, house-quote toast.
- Reference panel slide-in behaviour (right-anchored, no scrim).
- Per-option strike-out button (real UX, not template).
- IDs / class names referenced from `app.js` (renames would break event wiring).
- Cloud worker, auth gate behaviour, admin permission gates, pre-auth flash hint.
- Question / stem / option content (data layer).
- The "(+ glucose)" baseline alignment from earlier this session.
