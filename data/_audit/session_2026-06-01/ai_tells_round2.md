# AI design tells - round 2 addendum

Companion to the standing 75-item catalogue at `~/.claude/projects/-Users-robrussell/memory/feedback_ai_design_tells.md`. Round 1 captured the obvious surface tells; round 2 goes after the unifying meta-patterns, the residual tells that survived round 1, and the specific moves A to E needs to make.

Research base for this round:
- Impeccable's 46-pattern AI-slop catalogue (https://impeccable.style/slop/)
- Anthony Hobday, Safe rules (https://anthonyhobday.com/sideprojects/saferules/)
- Refactoring UI (Adam Wathan + Steve Schoger): elevation, surface hierarchy
- Brad Frost on AI + design systems (https://bradfrost.com/blog/post/design-systems-in-the-time-of-ai/)
- Why Every AI-Built Website Looks the Same (https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p)
- The Linear effect (https://rectangle.substack.com/p/the-linear-effect) - on monoculture and how Linear themselves escaped it
- NN/g State of UX 2026 (https://www.nngroup.com/articles/state-of-ux-2026/)
- iOS 26 ConcentricRectangle / .containerShape: Apple's formal codification of the inner-radius rule
- Pantone Cloud Dancer 11-4201 (#F0EEE9) - the 2026 "tasteful AI surface" trap
- eMedici visual reference (https://emedici.com) - clean white scaffolding, restrained teal/blue accent, sans-serif body, circular team crops, institutional trust signals

The current A to E light theme (#f6f4ef ground, #d8d2c5 lines, brown/sepia derived from Pantone-cream-defaults) is squarely inside the 2026 AI-slop default surface. That has to change.

---

## A. New tells observed in 2026 (beyond the 75-item list)

These are tells either not in the round 1 list, or that survived it in subtler form. Each is named, described, illustrated, and given a fix.

### A1. Concentric-radius mismatch on nested containers

**Description.** A card has `border-radius: 12px`; an inner panel uses the same `12px`. The eye reads the inner curve as too tight because the outer is offset by padding. Apple shipped ConcentricRectangle in iOS 26 precisely because this is the most common amateur mistake. Hobday's safe-rule states it explicitly: inner radius = outer radius - padding distance.

**Example.** Outer `.qcard { border-radius: 12px; padding: 18px; }` with inner `.opt { border-radius: 12px; }` looks "AI". Inner should be 12 - 18 = clamp to 4 or remove radius entirely (an interior box that touches the inner padding edge should usually have no curve at all).

**Fix.** Either (a) drop interior radii to zero when the gap exceeds the parent radius, or (b) compute `--r-inner = max(0, var(--r-outer) - var(--pad))` and apply.

### A2. Inner element with matching radius AND its own border

**Description.** A card-in-a-card with two visible borders is the platonic AI tell. Impeccable rule 26 calls it out directly. The inner border duplicates the outer enclosure and adds no information - it just signals "container".

**Fix.** One container per logical group. If you need to subdivide, use a 1px divider line (top/bottom border on the row, not a full box), not a nested bordered card.

### A3. Stacked rounded boxes with hover-fill backgrounds

**Description.** Rob's specific gripe. The pattern: a list of choices, each rendered as its own rounded card with a 1px border and a `background` token, and on hover the background swaps to a second token (`surface-2` to `surface`). When five or eight of these stack vertically, the page looks like a settings panel from a generated SaaS skeleton.

Why it's an AI tell: every shadcn `<Card>` example, every v0 "list of options" generation, every Lovable settings screen does exactly this. The combination of (visible border + own background + hover background swap) makes each item a heavyweight standalone unit, which is wrong for items that are meant to be compared.

**Fix - three options in increasing departure from the current look:**

1. **Same surface, divider lines.** Drop the per-item border and the per-item background entirely. The container holds them; each option is separated by a 1px hairline divider. Hover changes only the text colour (not the background). This is how Notion, Linear (post-redesign), and Stripe render option lists.
2. **Hover as a 2px left rule.** Keep no border and no background; on hover, draw a 2px accent rule on the left edge only, with `padding-left` reserved so layout does not shift. Reads as a list-with-pointer, not a deck of cards.
3. **No hover state at all.** Reserve hover for actually-clickable controls. If the rows are radio options, the keyboard focus ring carries that load; the mouse does not also need a background swap.

For the A to E MCQ options list specifically, option 2 fits best - it preserves the implicit "you are pointing at this answer" affordance without turning each option into a card.

### A4. Symmetric square-top/rounded-bottom (or any mixed-corner) container

**Description.** Setting `border-radius: 0 0 12px 12px` (or any non-uniform combination) on a single standalone container is an AI move - it mimics the result of a "card-attached-to-tab" pattern without the tab actually being there. The current quiz card does this deliberately to join the reading card above it, which is a legitimate use - but anywhere else, asymmetric corners look unmotivated.

**Fix.** Either the container is actually attached to something (then asymmetric corners are correct), or it is not (then all four corners use the same radius). Audit every asymmetric-corner usage on the site; remove every one that is not load-bearing.

### A5. Drop shadow plus hairline border plus rounded corner on every container

**Description.** Impeccable rule 4: hairline border + diffuse shadow is a signature combo. The current `.gate-card`, `.modal-card`, and `.house-toast` all do this. Pick one elevation cue.

**Fix.** For surfaces sitting flat on the page: 1px border, no shadow. For surfaces that need to read as elevated (modal, toast): drop the border, use shadow only, and make the shadow asymmetric (vertical offset, low blur) per Refactoring UI: `0 8px 24px -8px rgba(0,0,0,0.18)`, not `0 10px 40px rgba(0,0,0,0.25)` which is the "ChatGPT generated CSS" tell.

### A6. Soft cream/sepia "tasteful neutral" surface

**Description.** Pantone Cloud Dancer (#F0EEE9) is the 2026 color of the year, and AI tools have absorbed it as the new "tasteful" default surface, replacing pure white. Impeccable rule 22 flags it explicitly. The A to E light theme `--bg: #f6f4ef` and `--surface: #fdfcf8` with `--line: #d8d2c5` are textbook this trap, just warmer than Cloud Dancer. The brown CTA (`#b25a18`) compounds it.

**Fix.** Move to a cooler, cleaner neutral that reads "clinical" not "tasteful". See section C.

### A7. Monospace for non-code labels

**Description.** The current site uses IBM Plex Mono for `dt` labels in `.patient-table` and `.patient-subtable`, for `.qt-counter`, `.qtl-status`, `.qtl-num`, `.rv-status`, `.rv-id`, `.range-cat td.value`, `#sessionTime`, `#questionTime`, and the masthead `.session-meta`. That is monospace as a "data" signal applied to fields that are not code.

The AI tell is using mono as a typographic shorthand for "this is data". It reads as Linear-clone aesthetic and v0 default styling. Mono is correct for: actual code, log lines, file paths, command output. Mono is wrong for: vital signs (those are numbers in a clinical chart, not code), question IDs (those are short identifiers, not commands), elapsed time (a wall-clock number).

**Fix.** Use the body sans with `font-feature-settings: "tnum" 1, "lnum" 1` for tabular lining numerals. Identical alignment, no mono baggage. Drop mono entirely for `dt`/`dd` pairs - those are body type, just smaller and dimmer. See section C for the specific recommendation.

### A8. Brown/orange/amber CTA on cream background

**Description.** The current light theme uses `--cta: #b25a18` on `--bg: #f6f4ef`. That is the classic "warm brand" AI default, paired with the warm cream surface. Together they say "shadcn + DM Sans + Lovable starter project". Even removing one would help; both together is unambiguous.

**Fix.** Pick a single chromatic accent that is not warm - a desaturated teal (current dark theme already does this with `#0fcad4`, light theme switches inexplicably to brown), a near-black ink CTA with no chroma at all (Stripe's move), or a deep navy (`#1d3557`-ish). See section C.

### A9. Italic serif on toast/quote popups

**Description.** The House quote toast uses `font-family: var(--serif)` (IBM Plex Serif) with `.hq-quote { font-style: italic; }`. Italic serif as the editorial-voice marker is the single most-imitated AI move in generative-product toasts (Linear's pre-redesign quote bubbles, every v0 testimonial component, every Lovable hero block). Impeccable rule 10 flags oversized italic serif as a hero hallmark; the toast variant inherits the same energy.

**Fix.** Use the body sans for the quote at body size, in a slightly-tighter colour (`--ink-2`), with the attribution in `--ink-mute`. The quote feels like a note, not a sermon. Optionally use a serif only for the opening quotation mark glyph and the body in sans - that is a tasteful editorial move that AI does not reach for.

### A10. Left-accent-border on toast/notification

**Description.** Impeccable rule 3 names this as the single most recognizable tell of AI-generated UIs: "thick coloured border on one side of a card". The house-toast has `border-left: 3px solid var(--accent)`. That has to go.

**Fix.** Remove the accent stripe. If the toast needs a colour cue (success/error/info), use the type colour itself, not a strip on the edge. For an editorial-voice toast (the House quote), no colour cue is needed - the content carries the tone.

### A11. Faux-telegram / Wix-default display serif

**Description.** Rob flagged this. The site's `--display: "IBM Plex Serif"` does the heavy lifting for `.brand-title`, `.modal-head h2`, `.stats-num-value`, `.range-cat h3`, and pretty much every heading. IBM Plex Serif is not Wix's exact default (those tend to be Inknut Antiqua, Playfair Display, Cormorant Garamond, EB Garamond), but the family resemblance is real: a transitional/modern serif used as the default sans-alternative for headings. AI models do this constantly because Plex Serif is on Google Fonts and "free + Microsoft-adjacent + readable" matches the inoffensive defaults heuristic.

**Fix.** Drop serif entirely from display use, or use a serif with a clearly editorial pedigree (not a "default" serif). See section C.

### A12. Generic letter-spacing on small uppercase labels

**Description.** Impeccable rules 11 and 12 cover the "tiny uppercase tracked label" pattern. The site uses small-caps and letter-spacing on `.stats-letter` and various tertiary labels. Not flagrant yet, but watch the line: `letter-spacing: 0.02em` on a 12px uppercase label is the universal AI eyebrow.

**Fix.** Audit every uppercase label. If it's a label, write it sentence-case at the same size. Reserve uppercase + tracking for one place site-wide (probably nowhere).

### A13. Triple-pattern shadow stack

**Description.** Multi-layer shadows (e.g. `0 1px 2px, 0 4px 8px, 0 16px 32px`) became a Tailwind shadcn signature. The site mostly avoids this (the shadows are single-layer), but new code generated against shadcn will reach for it. Lock the convention now.

**Fix.** One shadow per elevation level. Token them: `--shadow-flat: 0; --shadow-card: 0 1px 0 var(--line); --shadow-modal: 0 8px 24px -8px rgba(0,0,0,0.18);`. No stacking.

### A14. Cubic-bezier with four custom values that nobody can read

**Description.** The site uses `cubic-bezier(0.2, 0, 0, 1)` on `.options li` hover. The custom-cubic-bezier-on-everything tell is documented in the explainx.ai high-end-visual-design notes. It says "I asked the model for a fancy transition". `ease`, `ease-out`, and `cubic-bezier(0.2, 0, 0, 1)` (Material's standard easing) used everywhere is fine; six different custom curves on six different components is a tell.

**Fix.** Pick one easing token site-wide: `--ease: cubic-bezier(0.2, 0, 0, 1);` and reference it everywhere. Single duration token (`--dur: 120ms;`) for everything except modal enter/exit (`200ms`).

### A15. Pointer cursor on non-clickable rows

**Description.** Tells that an LLM wrote it: every `.options li` has `cursor: pointer`. That is fine for actually-clickable items - but extending pointer-cursor to entire list rows that have only a single small button inside reads as "I added cursor:pointer because hover looks clickable now". Audit every `cursor: pointer` against actual click behaviour.

**Fix.** Pointer only on elements that perform an action when the entire surface is clicked.

### A16. Same-shape icon-tile above heading on every feature card

**Description.** Impeccable rule 9. The "small rounded-square icon container above a heading" is the universal AI feature-card template. The site does not appear to use this on content cards, but the brand mark `.brand-mark` is exactly this shape rendered larger. Make sure it does not propagate into per-question cards or stats cards.

**Fix.** Icon never gets a coloured tile background unless the icon's meaning depends on the colour.

### A17. "Streamline / unlock / supercharge" in marketing prose

**Description.** Impeccable rule 35. The README and gate tagline appear safe ("MCQs designed by JMP students for JMP students" - good). Audit any future copy.

### A18. Hover scale transforms on images and cards

**Description.** Impeccable rule 33 / rule 32 cover both layout-property animation and image hover transforms. The brand mark in the masthead does not scale, the question card does not scale - good. Lock the convention: nothing on this site scales on hover. The interaction language is colour change only.

### A19. Dark-mode glow shadows

**Description.** Impeccable rule 19. The dark theme uses `box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5)` on `.gate-card`, which is dark-on-dark (legitimate). Avoid any `box-shadow: 0 0 24px var(--accent)` glow-around-element pattern - that is the v0-default neon move.

**Fix.** Dark-theme shadows always use black with negative blur, never the accent colour.

### A20. Section eyebrow + oversized heading + supporting paragraph cascade

**Description.** Impeccable rules 11 and 13 combined. Section structure: tiny eyebrow label, huge heading, supporting paragraph. This is the marketing-page AI rhythm. The product surface (quiz, stats, review) does not do this - good - but watch any future explainer/landing-page additions.

### A21. "Et al." dot-leader citation rendering

**Description.** AI loves to render citations as dot-leader tables with mono numbers. If sources get a UI surface, render them inline in body type, not as a fake-academic table.

### A22. Skeleton placeholders that pulse

**Description.** The animated grey skeleton block (with `@keyframes shimmer`) was a 2022-2024 trick that shadcn cemented. By 2026 it reads as "I asked v0 for loading states". The current site does not seem to use shimmer skeletons (it has `.pre-authed` to avoid the gate flash, which is the correct move). Lock this convention: no shimmer placeholders.

**Fix.** Either content loads fast enough that no placeholder is needed, or a single static dim message ("Loading...") sits where the content will appear.

### A23. Grid of 3 even-width feature blocks below the hero

**Description.** Impeccable rule 24. Does not currently apply to A to E but a likely future temptation when describing what the bank offers. If it has to be three blocks, vary widths or sequence so the eye does not parse them as a rule.

### A24. Numbered section markers ("01", "02", "03")

**Description.** Impeccable rule 27. Avoid.

### A25. The "subtle teal" hover ring around inputs

**Description.** Current `.gate-field input:focus { border-color: var(--accent); }` is fine. The AI version is `box-shadow: 0 0 0 3px var(--accent-bg);` which is shadcn's exact default. The site uses this on `#copyPromptBtn.copied` already. Limit it to one or two places; never use it on default form inputs.

**Fix.** Default focus = thicker border colour change. Reserve `box-shadow` focus rings for the primary-CTA pulse animation only.

### A26. Tabular numerals everywhere they don't belong

**Description.** `font-variant-numeric: tabular-nums` is correct for columns of numbers that need to align. It is wrong for body prose with inline numbers (e.g. "in 24 hours"), where it produces ugly wide digits. Audit usage.

### A27. Identical chip/pill shape used for every status

**Description.** The current site uses `--r-chip: 999px` for pills. If pills carry semantic colour (good/bad/warn) the shape can stay - but if every status uses the same 999px pill regardless of meaning, the visual variety collapses. Pill for inert tags; rectangle for binary status (correct/incorrect); no chrome at all for ambient state.

### A28. Long aphoristic copy in empty states

**Description.** "Looks like there's nothing here. Why not give it a try?" - the warm-conversational-empty-state copy is an AI tell. Empty states are usually just one short imperative.

**Fix.** "No questions yet." or "Choose a module to start." End of copy.

### A29. The everything-is-a-card detail page

**Description.** Stats page, review page, etc, with three or four floating cards instead of one cohesive page. The current site mostly resists this (`.stats-modal-card` and `.review-list` are tight) - keep it that way.

### A30. Validation-message language that's too friendly

**Description.** "Oops! Looks like that didn't work. Try again?" is AI tone. "Incorrect password." (the current gate copy) is correct.

---

## B. The AI tell mega-meta-patterns

Five deeper structures unify the surface tells. If a designer internalises these five, individual rule violations stop happening.

### B1. Default-stacking

AI builds layouts by stacking the safest defaults of every micro-decision. Each individual default is fine; the combination produces convergence. Cream surface + Inter + indigo accent + rounded card + soft shadow + hairline border each defensible alone; together they are "AI built this".

The corrective is to refuse the default on at least one axis per surface. If the surface is cream, the type cannot be Inter. If the type is Inter, the accent cannot be indigo. If the accent is indigo, the cards cannot have shadows. Pick one axis, break it intentionally, and the surface stops reading as generated.

Source: Why Every AI-Built Website Looks the Same (DEV / Alan West, 2025), Brad Frost on AI defaults.

### B2. Container-thinking instead of content-thinking

AI-generated UI organises information by drawing boxes around it. Professional UI organises information by typography hierarchy, whitespace, and dividers - boxes are reserved for genuinely-distinct surfaces.

The corrective is: when reaching for a card, ask "would this work as a section heading + a paragraph?" Usually yes. The card was unnecessary.

Source: Anthony Hobday Safe Rules ("limit nested blocks"), Setproduct on list-vs-card patterns.

### B3. Treating every signal as deserving the same emphasis

AI-generated UI applies hover states, borders, shadows, and animations to everything equally. Professional UI is quiet about most surfaces and loud about a few. Hover is reserved for actually-interactive things. Shadows are reserved for actually-floating things. Borders are reserved for actually-separating things.

The corrective is the inverse pyramid: 90% of the page should have zero affordances; 9% should have one (text colour change on hover, or a hairline divider, or a single border); 1% should be loud (the primary CTA, the active question, the live timer when it's close to expiring).

Source: Refactoring UI on elevation hierarchy; NN/g State of UX 2026 on differentiation.

### B4. Importing the marketing-page rhythm into the product surface

AI is trained on far more marketing pages than product pages. The default rhythm is hero / three-feature-grid / testimonial / CTA-band - and that rhythm leaks into product UI as eyebrows-on-section-headings, oversized panel titles, and italic serif quotes. Product UI has its own rhythm (dense, repeatable, scannable) that AI under-represents.

The corrective is to think of the product surface as a clinical chart, a spreadsheet, or a reference page, not a landing page. Strip the marketing furniture out: no eyebrows above headings, no testimonial-voice toasts, no hero-anything inside the app.

Source: The Linear effect (Rectangle Substack) on the landing-page aesthetic leaking into product UI.

### B5. The "tasteful neutral" trap

Cream surface (#F0EEE9 family), warm brand accent (terra cotta, burnt orange, deep ochre), serif headings, sans body. In 2026 this reads as "tasteful AI-generated wellness brand". The combo is so common that even individually-good choices collapse into a recognised template.

The corrective is to pick a cool, clinical, non-warm surface (off-white tinted blue-grey or pure white) and use chroma only in the accent. The cream-and-terracotta combo is over.

Source: Pantone Cloud Dancer announcement and the design-discourse response; Impeccable rule 22.

---

## C. Specific decisions for A to E

### C1. Body sans-serif candidates

The constraints: must render clinical prose at 14-15px on screen with high legibility; must be free / self-hostable; must not be Inter, Roboto, or system-default (the AI defaults); must have tabular-numeral support; must not be Plex Sans (the current choice - it is fine but reads as IBM-default, which is AI-adjacent).

**Recommendation 1 (best fit): Public Sans.** Designed by the US government's Web Design System team; built specifically for institutional / clinical / reference contexts. Free (SIL OFL). Has tabular-numeral support. Slightly more "official" feel than DM Sans, no warmth tic, low ego. Reads as "this is a reference work" rather than "this is a SaaS landing page". Available at https://public-sans.digital.gov/ and on Google Fonts.

**Recommendation 2: Manrope.** Open-source humanist sans with large x-height and open apertures. Reads warmer than Public Sans, useful if you want the site to feel slightly less institutional. AI does reach for Manrope sometimes - so this is the riskier-but-warmer pick. Free, on Google Fonts.

**Recommendation 3 (premium): Söhne, by Klim Type Foundry.** Paid, ~$300-700. The reference neo-grotesque of 2020-2025. Used by The New York Times, Riot Games, MoMA. Pairs with the eMedici clinical aesthetic. If A to E ever has revenue to spend, this is the upgrade.

**Recommendation 4: Atkinson Hyperlegible.** Braille Institute typeface, free. Designed for low-vision users with exaggerated character differentiation. Adds an accessibility signal to the bank. Good fit if Rob wants to lead on accessibility. The cost is that it looks a little chunky at small sizes for tables.

**Recommendation 5: Source Sans 3.** Adobe-Google, free. Humanist sans, originated as an open-source companion to Adobe's Source family. Designed by Paul Hunt with editorial use in mind. Reads as "newspaper-of-record" rather than "tech-startup". Strong tabular numeral set. Lower AI-default risk than Inter or DM Sans.

**Pick:** Use **Public Sans** for body, with `font-feature-settings: "tnum" 1, "lnum" 1` enabled site-wide on `<html>`. Self-host the woff2 files (don't depend on Google Fonts for the production build - Google Fonts itself is now an AI-default tell in some quarters).

### C2. Display / heading face

The constraint: must contrast against body without looking like a Wix template. The corrective from section A11 is to not reach for serif at all.

**Recommendation:** Use **the same Public Sans family at heavier weights** (700 for h2-h3, 800 for h1 or for the wordmark only). Tighten heading letter-spacing by `-0.01em` to `-0.015em` - just enough to read editorial without being crushed (Impeccable rule 14).

This is the single most distinctive move available: one family, weight does the work. Plex Serif used for display is the current AI tell; Public Sans single-family is the corrective. Inspiration: GOV.UK, the NHS Digital design system, NYT product pages, Stripe Docs.

If a serif is genuinely wanted somewhere (a single small editorial-voice slot, like the colophon or an about-page byline), use **Source Serif 4** - it's the matching companion to Source Sans and has the same Adobe editorial pedigree. Never Plex Serif.

### C3. Mono replacement for data-table keys and identifiers

The constraint: numerals in `.patient-table`, `.range-cat`, `#sessionTime`, `#questionTime`, `.session-meta`, `.qt-counter`, `.qtl-num`, `.rv-id` need to align in columns and read as data. Mono delivers alignment for free but ships AI-tell baggage.

**Recommendation:** Drop `var(--mono)` from all these. Use the body sans (Public Sans) at one size smaller (12-12.5px against the surrounding 14.5px body), in `--ink-mute`, with `font-feature-settings: "tnum" 1, "lnum" 1` for tabular lining numerals. Add `font-variant-numeric: tabular-nums` as a belt-and-braces fallback.

Result: the dt/dd pair reads as "small label / value" instead of "code snippet / number". Columns still align (tnum). The mono tell disappears.

Keep mono in exactly one place: the in-modal `<code>` element (the paste-box copy-prompt content, where users are looking at literal JSON). Use **JetBrains Mono** or **IBM Plex Mono** there - mono is correct because the content is code.

### C4. Colour palette move from brown/sepia to eMedici-like clean clinical

The constraint: the light theme must read as "clinical reference work" not "tasteful AI wellness brand". Cool surface, dark ink, one chromatic accent, no warmth.

**Recommended palette (light theme):**

```
--bg:          #fafbfc   (cool near-white, blue-grey hint; not Cloud Dancer cream)
--bg-2:        #ffffff   (pure white for inset surfaces)
--surface:     #ffffff
--surface-2:   #f3f5f7   (cool light grey for hover and subtle differentiation)
--line:        #dde2e8   (cool neutral border, no warmth)
--line-strong: #b6bec8

--ink:         #0e1a26   (near-black with blue-grey hint, not pure black)
--ink-2:       #2b3947
--ink-mute:    #5b6a7b
--ink-faint:   #8a96a4

--accent:      #1a6e8e   (teal-navy; close to eMedici's clinical blue; cooler and more institutional than the current --accent #0a8a92)
--accent-2:    #135872
--accent-bg:   rgba(26, 110, 142, 0.06)
--accent-bd:   rgba(26, 110, 142, 0.30)

--good:        #1f6d3b   (kept - deep green reads clinical)
--good-bg:     rgba(31, 109, 59, 0.06)
--good-bd:     rgba(31, 109, 59, 0.32)

--bad:         #9b2a32   (kept - deep red)
--bad-bg:      rgba(155, 42, 50, 0.06)
--bad-bd:      rgba(155, 42, 50, 0.32)

--warn:        #8a6608   (mustard, not orange - cooler than the current #7a5318)
--warn-bg:     rgba(138, 102, 8, 0.08)

--cta:         #0e1a26   (ink-as-CTA; primary button is near-black, not brown - Stripe's move)
--cta-2:       #2b3947
--cta-bg:      rgba(14, 26, 38, 0.06)
--cta-bd:      rgba(14, 26, 38, 0.30)
--cta-ink:     #ffffff
```

Rationale:
- `#fafbfc` replaces the cream `#f6f4ef`. Cool, professional, not the Cloud Dancer trap.
- Lines lose warmth. `#dde2e8` instead of `#d8d2c5`.
- Accent shifts from teal-green `#0a8a92` to a deeper, more institutional teal-navy `#1a6e8e`. Pulls the palette toward eMedici's restrained blue.
- CTA is no longer brown. The primary CTA is near-black ink (`#0e1a26`) with white text - the Stripe / Linear / Notion move. Removes the cream-plus-terracotta AI signature in one stroke.
- Warn shifts from `#7a5318` (brown) to `#8a6608` (mustard-yellow). Cooler but still readable as caution.

Dark theme stays largely the same - the dark theme is already fine and cool. Optional: bring the accent in dark theme into closer alignment with the new light accent (shift from `#0fcad4` to something like `#3aafc9` - same family but cooler, less neon).

### C5. Multi-layer box fix - concrete pattern

The fix is the "one container, internal dividers, no nested cards" rule.

**Patient table / data display (`.patient-table`, `.patient-subtable`):** drop the visible card chrome around the table entirely. Render as a two-column dl with dt in `--ink-mute` at 12.5px and dd in `--ink` at 13.5px. Optional hairline rule between groups (`border-bottom: 1px solid var(--line)` on the dl, not on each row).

**Options list (`.options li`):** drop the per-item border and per-item background. Render as a vertical list of rows with `padding: 14px 0` and a hairline between rows. On hover, change text colour (`color: var(--ink)`) and add a 2px accent rule on the left edge with `padding-left: 14px` reserved so layout does not shift. Reveal state uses background (it's a finished state, the card-ness is then correct).

**Quiz card containing options:** the quiz card itself is the only container. Inside it, options are rows, not cards. One radius (`--r-soft: 10px`), one border, one container.

**Stats modal:** single card; sections inside separated by `border-top: 1px solid var(--line)` on the section heading, not by nesting another card.

**Review list (`.review-list li`):** same as options - drop the per-item card, use rows with dividers.

The mental model: one card per task surface. Subdivide with hairlines and typography, never with more cards.

### C6. Corner radius unification

Pick one radius system, apply it everywhere, audit the rest.

**Recommended system:**

```
--r-tight:  4px    (inputs, small chips, status badges)
--r-soft:   8px    (cards, modal cards, the quiz card)
--r-chip:   999px  (pill chips only - tag-row, pill-style chips)
```

(The current system has `--r-tight: 4px` and `--r-soft: 10px`. Move `--r-soft` to 8px - it pairs better with Apple's macOS Tahoe / iOS 26 radii which are now the cultural reference, and is less "shadcn 12px" than the current value. 10 is the shadcn default; 8 is one step away from the default and reads as deliberate.)

Audit and remove every other border-radius in the codebase. Specifically:
- `.modal-card { border-radius: 12px }` -> `var(--r-soft)`
- `.paste-box { border-radius: 6px }` -> `var(--r-tight)`
- `.modal-body code { border-radius: 3px }` -> `var(--r-tight)`
- `.stats-num-block { border-radius: 0 }` (keep - the divider pattern is intentional)
- `.stats-bar { border-radius: 4px / 3px }` -> harmonise on `var(--r-tight)`
- `.house-toast { border-radius: 8px }` -> `var(--r-soft)`

Mixed-corner radius (`0 0 12px 12px` etc) is allowed only where the container is genuinely attached to something. Audit every occurrence (the quiz-topbar joining the reading card above is legitimate; any standalone case is a tell).

### C7. Modal / popup pattern

For the **House quote toast** specifically, redesign:

```
.house-toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  max-width: 320px;
  background: var(--surface);
  border: 1px solid var(--line);
  /* remove: border-left accent stripe */
  padding: 12px 14px;
  border-radius: var(--r-soft);
  box-shadow: 0 8px 24px -8px rgba(0,0,0,0.18);
  font-family: var(--sans);      /* not var(--serif) */
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-2);            /* not --ink */
}
.house-toast .hq-quote { font-style: normal; }  /* not italic */
.house-toast .hq-quote::before {
  content: "\201C";               /* opening curly double quote */
  margin-right: 2px;
  color: var(--ink-faint);
  font-family: var(--serif);      /* serif for the glyph only */
  font-size: 16px;
  line-height: 0;
  vertical-align: -0.05em;
}
.house-toast .hq-quote::after {
  content: "\201D";
  margin-left: 1px;
  color: var(--ink-faint);
  font-family: var(--serif);
  font-size: 16px;
  line-height: 0;
  vertical-align: -0.05em;
}
.house-toast .hq-attrib {
  font-size: 11.5px;
  color: var(--ink-mute);
  text-align: right;
  margin-top: 6px;
  font-style: normal;
}
.house-toast .hq-attrib::before { content: "\2014\00a0"; }  /* em-rule + nbsp before name */
```

Wait - em-rule is banned per Rob's standing instruction. Use ` - ` (space-hyphen-space) before the attribution:
```
.house-toast .hq-attrib::before { content: "- "; }
```

Result: a small, calm, sans-serif note in the corner. Quotation marks carry the editorial flag (a serif glyph for the punctuation only). No left stripe. No italic. No heavy shadow. Reads as a tasteful in-product note, not a generated testimonial card.

For **general modals** (`.modal-card`):

```
.modal-card {
  background: var(--surface);
  border: 1px solid var(--line);     /* keep border, drop shadow for non-elevated */
  /* OR */
  /* border: none; box-shadow: 0 8px 24px -8px rgba(0,0,0,0.18); */
  border-radius: var(--r-soft);
}
```

Pick one elevation mode per modal type. The how-to modal is informational and sits on a dark overlay - border + no shadow. The stats modal is presented over content - shadow + no border.

Modal headers should be quiet: 16-17px font-weight 600, not 18px font-weight 700 with serif. Drop `font-family: var(--display)` on `.modal-head h2` - use sans at a normal-bold weight.

### C8. Type scale and rhythm

Define one type scale, use only its steps:

```
--fs-xs:   11.5px   (micro labels - rare)
--fs-sm:   12.5px   (data-table dt, status chips)
--fs-base: 14.5px   (body, options, prose)
--fs-md:   16px     (modal body, stem text on small screens)
--fs-lg:   18px     (modal head h2, panel titles)
--fs-xl:   22px     (wordmark - rare)
--fs-num:  28px     (stats numeric value)

--lh-tight:  1.25   (display)
--lh-snug:   1.45   (toast)
--lh-body:   1.55   (default body)
--lh-loose:  1.65   (long-form explanations, reference paragraphs)
```

Eliminate every off-scale value in the current stylesheet. Round 14.5 to 14.5 (stays), round 13 -> 12.5, round 11.5 stays, round 12 -> 12.5. Audit every `font-size:` declaration and conform.

### C9. Hover and focus state convention

Single canonical interaction:

- **Hover (mouse):** change text colour by one ink step (e.g. `--ink-mute` -> `--ink`) OR draw a 2px accent rule on left edge. Never both. Never background change unless the row is a literal button.
- **Focus (keyboard):** 2px solid `--accent` outline with 2px offset (`outline: 2px solid var(--accent); outline-offset: 2px;`). Always visible. `:focus-visible` only - mouse focus does not show the outline.
- **Active / pressed:** drop opacity to 0.85 or shift colour one step darker. Never scale-down (that's an Aceternity / shadcn tell).
- **Selected / current:** persistent left accent rule (`border-left: 2px solid var(--accent); padding-left: calc(14px - 2px);` so layout does not shift). Reserved for current question, current letter, current tab.

### C10. Easing and motion

```
--ease:        cubic-bezier(0.2, 0, 0, 1);   /* Material standard easing - use everywhere */
--dur-fast:    120ms;
--dur-medium:  200ms;
```

Replace every `transition:` declaration in the stylesheet with combinations of these two tokens. No bounce, no elastic, no custom curves per component.

Motion is reserved for:
- Modal enter/exit (`--dur-medium`, opacity + transform Y)
- Toast enter/exit (`--dur-medium`, opacity + transform Y - already correct)
- Hover state transitions (`--dur-fast`, colour only)

No image scale, no card scale, no layout-property animation, no shimmer skeletons.

---

## D. AI tells in microcopy and labelling

The site's current copy is mostly clean (Rob has been auditing). These are the residual risks.

### D1. The gate

Current: "Sign in" / "Create account" / "Admin login" / "Skip - try without saving" / "Unlock admin" - all clean. Keep.

The gate tagline "Practice for Australian medical students in their clinical years." is good - functional, no marketing voice.

The gate-foot "Skip - try without saving" is good but consider just "Continue without saving" - "Skip" implies skipping something required, and Rob's IA treats guest as a primary path.

### D2. Error and validation messages

Current: "Incorrect password." - good, terse, no apology.

Watch for AI-cadence additions: "Oops!", "Looks like", "Try again?", "Something went wrong" -> replace each with the specific blunt statement of what is wrong. "Email already registered." not "Looks like that email is taken!".

### D3. Empty states

Audit screens that can be empty:
- "No questions matching these filters." (not "Hmm, nothing here yet.")
- "No saved answers." (not "Start your journey!")
- "Loading." (not "Just a moment...")

One imperative or one statement. No exclamation marks anywhere on the site except possibly the House quotes themselves (and House does not actually use exclamation marks in his clinical-bitter mode - audit those quote strings too; if any have AI-added exclamation, strip).

### D4. Button labels

Verbs, not phrases. "Save", "Submit", "Next question", "Sign in", "Create account". Avoid "Let's go", "Get started", "Continue your journey", "Take me there".

The current "Copy prompt", "Paste here", "Skip - try without saving" are all clean.

### D5. Toast / confirmation copy

When a save happens: "Saved." Not "Your changes have been saved successfully!"

When a copy succeeds: "Copied." Not "Copied to clipboard!"

### D6. Section headings inside the app

"Stats", "Review", "Settings", "Filters", "Modules" - not "Your stats", "Review your answers", "Filter your questions", "Choose your modules". The implied possessive is AI-warm.

### D7. Question stem language

The stem itself follows Rob's binding question-craft rules (no meta-commentary, no "follow local guidelines", no diagnosis-leak, etc). This is already audited; the only round 2 risk is the rationale and "Why the others are not" sections - check for em-rules (banned) and for AI-cadence phrases:

- "It's important to note that..." -> delete the phrase, keep the substance
- "In this case..." -> usually deletable
- "Crucially," / "Notably," / "Importantly," -> delete; if it's important, the sentence carries that on its own
- "Let's break this down" -> never
- "First and foremost" -> delete, keep what follows

### D8. The colophon

The colophon block (`#sessionTime`, `#questionTime`, sep dots) reads as data. Make sure no AI-cadence labels creep in next to it ("Time elapsed since session began" is wrong; bare number is right).

### D9. Tooltip text

Audit every `title=""` attribute on the site. AI generates long tooltips; humans use short tooltips. "Hide" not "Click to hide this section". "Strike out" not "Mark this option as struck through".

### D10. Aria-labels

Same. Aria-label should say what the control does, in the shortest possible form. "Close" not "Click to close this modal".

### D11. Comments in code

The current CSS has comments like "Stops the radius-soup of 6/7/8/12/14" - good, terse, written by a human. Watch for AI-style comments in any future code: "This is the main container for the user interface", "TODO: Improve this section" - replace with the actual decision or remove.

### D12. The wordmark accessory ("+ glucose")

The "(+ glucose)" parenthetical med-student joke on the masthead is the right kind of voice - specific, in-group, unexplained. AI does not write that joke. Keep.

### D13. README and public-facing description

The README appears to be in Rob's tone (functional, no marketing). Watch for the next-edit drift: avoid "Built with [stack]", "Designed for [audience]" if the audience can be implied by the content. "MCQs designed by JMP students for JMP students." is the right voice; "Empowering medical students with AI-powered question banks" would be the AI failure mode.

### D14. The What's New block

Per Rob's standing rule, public releases get a What's-new entry. Make sure those entries follow the project's terse voice: "Fixed the colophon overlapping the question card on iOS Safari" not "We're excited to announce that we've fixed several issues to bring you a better experience!"

### D15. Confirmation-of-destructive-action microcopy

When (if) any destructive action gets a confirmation modal: "Delete this question?" / [Delete] [Cancel]. Not "Are you sure you want to delete this question? This action cannot be undone." with an exclamation point and a warning icon.

---

## E. Implementation checklist

Twenty-six concrete checks to run against the live site. Each is binary (pass/fail) so the audit produces a numeric score.

1. **Cream surface removed.** `--bg` in light theme is cool near-white, not cream. Grep for `#f6f4ef`, `#fdfcf8`, `#fbfaf6` and replace.

2. **Warm CTA removed.** `--cta` is not brown/terracotta/orange. The primary button colour is either near-black ink or a single cool chromatic accent.

3. **Plex Serif removed from display use.** Grep for `var(--display)` and replace each with the body sans at a heavier weight. Verify zero font-family declarations point to `IBM Plex Serif` outside of explicit editorial-pull-quote contexts.

4. **Plex Mono removed from non-code use.** Grep for `var(--mono)` - acceptable uses: `<code>` elements only. All `dt`/`dd`, status, ID, timer, counter, and table-value usages move to body sans with tabular numerals.

5. **Inter / system-default not introduced.** Confirm the new body sans is not Inter, Roboto, San Francisco, or Segoe UI. (Recommendation: Public Sans, self-hosted.)

6. **Tabular numerals enabled site-wide.** `html { font-feature-settings: "tnum" 1, "lnum" 1; }` set once at the root; remove per-rule duplicates.

7. **No left-accent-border on toasts or cards.** Grep `border-left: 3px`, `border-left: 4px`, `border-left: 2px solid var(--accent)`. Remove from house-toast, audit elsewhere.

8. **No nested bordered cards.** Walk the DOM: no card-with-border inside another card-with-border. Specifically check `.modal-card` does not contain another `.card` with its own border; `.qcard` does not contain bordered `.options li`.

9. **Concentric radius rule applied.** For every nested container pair, inner radius = max(0, outer radius - padding). Document each in a comment.

10. **Single border-radius scale enforced.** Only `--r-tight`, `--r-soft`, `--r-chip` are referenced. Grep `border-radius:` for any raw px value and replace.

11. **One shadow per elevation level.** Grep `box-shadow:` - confirm only three distinct values exist (flat = 0, card = subtle 1-line, modal = soft drop).

12. **Hover changes only colour (or 2px left rule), never background.** Audit every `:hover` rule. Exception: explicit button surfaces (`.primary:hover`, `.secondary:hover`) can change background since they are buttons.

13. **One easing token.** Grep `cubic-bezier` and `transition-timing-function`. Replace all with `var(--ease)`.

14. **One duration scale.** `var(--dur-fast)` and `var(--dur-medium)` only.

15. **No image or card scale on hover.** Grep `transform: scale`. Remove unless on the primary CTA pulse-on-click.

16. **No shimmer skeletons.** Grep `@keyframes shimmer`, `animation: shimmer`. None should exist.

17. **No icon-tile-above-heading pattern.** Visual scan of every feature card or info block.

18. **No section numbers (01, 02, 03).** Grep page content for these markers.

19. **Hover and focus state visually consistent.** Tab through every interactive element with the keyboard and confirm the focus indicator is at least as visible as the hover state.

20. **Focus indicator is :focus-visible, not :focus.** Grep CSS - replace `:focus {` with `:focus-visible {` for outline styles.

21. **House toast redesigned.** Sans-serif, no italic, no left stripe, quotation marks via serif pseudo-element glyphs only.

22. **Modal head not in serif.** `.modal-head h2`, `.gate-head h1`, etc - all use body sans at weight 600-700, not display serif.

23. **No em-rules anywhere.** Codepoint grep (search for U+2014): `python3 -c "import sys; [print(p, open(p).read().count(chr(0x2014))) for p in sys.argv[1:]]" index.html assets/styles.css assets/app.js` returns 0 for every file. Replace any found with space-hyphen-space.

24. **Microcopy audit pass.** "Oops", "Looks like", "Just a moment", "Let's", "Get started", "Your journey" - grep for and remove from the codebase.

25. **No tooltip longer than 4 words.** Audit every `title=""` and `aria-label=""`.

26. **No `cursor: pointer` on non-interactive rows.** Audit every `cursor: pointer`. If the entire surface is not click-handled, remove.

---

## Sources cited inline (consolidated)

- Anthony Hobday, Safe rules: https://anthonyhobday.com/sideprojects/saferules/
- Impeccable, AI-slop catalogue (46 patterns): https://impeccable.style/slop/
- Refactoring UI (Wathan + Schoger): https://refactoringui.com/
- Brad Frost, Design systems in the time of AI: https://bradfrost.com/blog/post/design-systems-in-the-time-of-ai/
- The Linear effect: https://rectangle.substack.com/p/the-linear-effect
- Why Every AI-Built Website Looks the Same (Alan West, DEV): https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p
- AXE-WEB on AI-website sameness: https://axe-web.com/insights/ai-website-design-sameness/
- NN/g State of UX 2026: https://www.nngroup.com/articles/state-of-ux-2026/
- Hyperlegible Sans (Inter-derived accessibility evolution): https://github.com/matthewlarn/hyperlegible-sans
- Atkinson Hyperlegible: https://pimpmytype.com/font/atkinson-hyperlegible/
- Pantone Cloud Dancer (#F0EEE9): https://www.pantone.com/color-finder/11-4201-TCX
- iOS 26 ConcentricRectangle (Apple's codification of the concentric-radius rule): https://nilcoalescing.com/blog/ConcentricRectangleInSwiftUI/
- Border radius rules complete guide (2026): https://blog.92learns.com/border-radius-rules/
- Setproduct, list-vs-card patterns: https://www.setproduct.com/blog/empty-state-ui-design
- UX patterns dev, modal vs popover guide: https://uxpatterns.dev/pattern-guide/modal-vs-popover-guide
- Public Sans (US Web Design System): https://public-sans.digital.gov/
- eMedici (visual reference for the clean-clinical aesthetic): https://emedici.com
