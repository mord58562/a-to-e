# Uni MCQ Design Recon — 2026-05-25

Source: 17 screenshots from the uni's MEDI3101A practice paper (Paeds + O&G), provided by Rob for **design-language extraction only**. Clinical correctness ignored. No question text is reproduced below — only structural patterns.

These bullets are written so a generation prompt can enforce them directly. Where the uni style is **deliberately easier** than what Rob's bank should ship, the bullet flags the divergence.

---

## 1. Stem structure

- **Hard ceiling on stem length: typically 1-3 sentences (~25-60 words).** Most uni stems fit in a single paragraph of well under 100 words. Rob's bank should not pad past this without genuine reasoning need; multi-paragraph stems are the exception not the norm, and only one or two of the 25 used them.
- **Demographic opener is the dominant template:** "A [age]-year-old [descriptor] [verb-phrase] with [presenting complaint]". Roughly 90% of uni stems open this way. Use age + qualifier (G3P2, unimmunised, Aboriginal, multiparous, etc.) + arrival context, then the chief complaint.
- **Gravidity/parity uses bare "G2P1" form, not "gravida 2 para 1".** Weeks of gestation written "39+5" or "26 weeks gestation". Match this exactly — verbose forms read non-clinical.
- **Demographic descriptors are sparse and load-bearing.** When uni adds "Aboriginal", "Ethiopian", "Vietnamese", "unimmunised", "G2P1 at 32 weeks", it's because the descriptor changes the answer. Never add demographics for flavour — every descriptor in the stem should be a discriminator or a deliberate distractor.
- **Single-clause final sentence carries the lead-in setup** ("She is now…", "On examination…", "Today she presents with…"). Avoid "Today she returns with a constellation of…" type pomp.
- **No author meta-commentary, no "compounding risk" telegraphing, no pertinent-negative pile-ups.** Uni stems frequently include zero pertinent negatives. Rob's bank should rate-limit pertinent negatives to those that actively rule out a real distractor.
- **Investigations are inline prose, not always a separate block.** Many uni stems drop one or two key labs directly into the sentence ("Hb 90", "β-hCG 2100 rising to 2850 at 48 h"). Use a separate data block only when there are 3+ values that genuinely need scanning.
- **Tense:** simple past for history, simple present for current status. No future-conditional ("which would suggest"), no nested subjunctives.

## 2. Vital signs and data presentation

- **When vitals get their own block, format is one-per-line label/value pairs**, not a table, not a CSV. Example shape:
  - BP   145/95
  - HR   80
  - RR   18
  - SpO2 99% room air
  - Temp 37.9 °C
  - Fundal height 27 cm
  - Foetal heart 130 bpm
- **Units are bare and conventional**: mmHg implicit on BP, bpm on HR/FHR, °C on temp, cm on fundal height, g/L on Hb (Australian convention — never g/dL), µmol/L on creatinine, mmol/L on glucose/lactate/bicarb, IU/L on β-hCG. Match Australian SI units throughout — this is the single biggest "feels-legitimate" signal.
- **Blood-count mini-tables use a 3-column layout: parameter / patient value / reference range** (Q15-style: "White cell count 9x10⁹/L | Reference range 4-11x10⁹/L"). Reference ranges only appear when the value is being compared to one for reasoning; never include a ref range for a normal value that isn't discriminating.
- **Empty investigation blocks should not be rendered.** If "Investigations: not indicated" or "Investigations: nil", omit the heading entirely. (This matches Rob's existing fix-list.)
- **No structured-data doubling.** Uni never repeats a value in both prose and data block. If BP is in the data block, the stem says "she is normotensive" or omits BP entirely; if BP is in prose, no data block.

## 3. Reference range conventions

- **Inline ranges in parentheses, only when discriminating**: "ferritin 9 ng/mL (low)", "AMH 6 pmol/L (low)". The (low)/(high)/(elevated)/(normal) tag is the uni's preferred shorthand over numeric ranges in-stem.
- **Numeric ranges appear in a reference column only when scanning multiple lab values** (FBE-style). Never inline a full numeric range for a single value.
- **Australian reference values throughout** — Hb in g/L (110-150 F, 130-170 M), creatinine in µmol/L (50-100), β-hCG in IU/L, lipids in mmol/L. Any US-style unit is a tell.

## 4. Lead-in (question stem) phrasing

- **Heavy use of "most" superlatives**: "the most appropriate", "the most likely diagnosis", "the next most appropriate step", "the most appropriate initial diagnostic investigation". This is the single most common lead-in pattern across all 25 uni questions.
- **"Which of the following…" framing is standard for closed lead-ins** ("Which of the following statements is correct?", "Which of the following is most appropriate?"). Plain "What is…" is the alternative; both are fine, neither is dominant.
- **One sentence, ends with a question mark.** Never two-sentence lead-ins, never lead-ins that restate the scenario.
- **No diagnosis-leak in the lead-in.** Uni avoids "Given her likely diagnosis of [X], what is…". The lead-in stays neutral; the diagnosis must be inferred.
- **Capitalisation:** uni uses uppercase for negation only ("UNSUITABLE", "EXCEPT", "NOT", "LEAST") and only when the lead-in itself is negative. Otherwise sentence case.
- **Australian/British spelling throughout** in lead-ins and stems ("paediatric", "haemorrhage", "oedema", "foetal", "anaemia", "diarrhoea"). Inconsistency is an AI tell.

## 5. Negative lead-ins ("EXCEPT" / "UNSUITABLE" / "LEAST")

- **Used sparingly — roughly 1 in 8 uni questions.** Not every batch should have one; the bank should average ~10-15% negative lead-ins, not more.
- **The capitalised negation word always appears in the lead-in itself**, not in the options. Standard forms seen: "...EXCEPT", "...UNSUITABLE for...", "...would NOT be...", "Which is the LEAST appropriate...".
- **When negative, options are still parallel** — all five describe the same category of thing (e.g., all five are risk factors, four real + one fake; or all five are management steps, four indicated + one wrong).

## 6. Option phrasing patterns

- **Length: short. Most options are 2-7 words.** Single-noun options ("Eczema", "Pinworm", "Hirschsprung disease", "Bacterial vaginosis") are common when the lead-in asks for diagnosis. Multi-word options appear only when the question is about action/dose/next-step.
- **Parallel grammatical structure** within an option set is non-negotiable. All five options share part-of-speech, voice, and approximate length. Uni never mixes "Reassure and discharge" with "Aspirin" in the same set.
- **The correct answer is NOT routinely the longest.** Rob's flagged this as a tell — the uni examples confirm: correct options visually match the distractors. Audit on line-count, not word-count, after typesetting.
- **Distractors are plausible look-alikes, not absurd fillers.** For a diagnosis question, distractors are conditions on the same differential. For a management question, distractors are real management options that are wrong for this specific scenario.
- **Eponyms and abbreviations match clinical convention**: "Henoch-Schönlein purpura", "Hirschsprung disease" (no apostrophe-s), "von Willebrand", "β-hCG" (β not "beta-" in option text), "MMR", "NHIG", "PPH", "AUB-L". Spell out on first use in the stem; abbreviate in options.
- **Dose-format parity:** when options contain doses, all five use the same unit structure ("0.15 mg/kg PO", "5 mL nebulised 1:1000", "10 IU IM"). Mixed dose formats are an AI tell.
- **No "follow local guidelines" / "consult a specialist" / "all of the above" / "none of the above" options.** Uni never uses these.

## 7. Distractor types observed

- **Same-category wrong** (Q for measles PEP: all five options are real PEP candidates, only one is correct for this contact).
- **Right action, wrong threshold** (β-hCG 2850 with suboptimal rise vs cardiac activity — both real MTX criteria, only one excludes treatment).
- **Right answer, wrong dose/timing** (repeat dexamethasone at 0.6 mg/kg vs observe 3h post-adrenaline).
- **Common look-alike diagnoses on the same differential** (PALM-COEIN: AUB-C, AUB-O, AUB-P, AUB-L, AUB-A as the full set).
- **Anchored to a single stem detail** — the discriminating cue in the stem maps to exactly one option. Other options are correct in different stem variants.

## 8. Rationale / explanation format

- **Uni's practice paper does NOT show rationales** (just "Correct answer" / "Wrong answer" + tick/cross). So Rob's bank rationales are a value-add, not a copy-target.
- **However**: keep the bank's existing rationale format (one-line "why correct", "why others are not" with discriminating cue + source citation). This is more rigorous than the uni's and is fine.
- **Source citations should be Australian-first**: RCH CPG, RANZCOG, eTG, Australian Immunisation Handbook, NSW Health PD, RACGP, ANZCA, CDNA SoNGs, Therapeutic Guidelines. Avoid UpToDate / AAFP / NICE as the primary cite where an Australian equivalent exists.

## 9. Layout conventions

- **Stem order (when blocks are used):** prose stem → Examination → Vital signs → Investigations → lead-in question → options. Some uni questions use only the prose stem.
- **Block headings are bold short nouns** ("Examination", "Vital signs", "Investigations", "Maternal", "Neonate", "Medications", "Risk factors for PPH"). No verbose headings like "Findings on physical examination".
- **Question numbering format**: "Question 1", "Question 2", etc. No "Q1" or "Question #1".
- **Marks shown as "1 / 1 pts"** in the corner — Rob's bank already does this.
- **Tick/cross indicators next to selected/correct options.** Visual feedback only after submission.
- **No bullet points, no numbered sub-lists, no markdown asterisks anywhere in stem or options.** Plain prose only.

## 10. Use of images / nomograms / waveforms

- **One uni question (Q3, paeds) shows clinical photographs** (lower-limb purpura for an HSP question). Rare but present. If Rob's bank ever needs an image, this is the format — image embedded between stem and lead-in, no caption other than what's needed.
- **Where a nomogram or graph would be referenced, the uni provides it inline.** Per Rob's prior note, if the question asks the candidate to plot on/read from a nomogram, the blank nomogram must be in the stem.

## 11. Citation / attribution style

- **Uni does not cite sources in the visible question/answer view.** No "Source: …" tags appear.
- **For Rob's bank**, keep sources in the rationale only (never in stem or options). Format: "(Source: RCH CPG: Croup; eTG Paediatrics)". Multiple sources separated by semicolons. Always include at least one Australian guideline reference per rationale.

## 12. The uni's difficulty register — what to deliberately exceed

The uni questions sit at roughly L2-L3 on Rob's 1-5 scale. Rob wants the bank harder. The legitimate-feeling design language above should be preserved while the **reasoning load** is increased by:

- **More layered investigations that require interpretation, not recognition.** Uni: "Hb 90, ferritin 9" → iron-deficiency anaemia. Rob's harder version: a values set where the discriminator is whether to act on the ferritin given a concurrent CRP elevation.
- **Australian-specific cut-offs and protocols.** Uni leans general; Rob's bank leans NSW Health PD / RANZCOG-specific thresholds.
- **More plausible look-alike distractors** — five options where three are genuinely on the differential and the discriminator is a single stem detail.
- **Calculations where indicated** (paracetamol mg/kg, paediatric fluid resus mL/kg, GA dating with discrepancies).
- **No telegraph phrases.** Uni occasionally telegraphs ("Koplik spots were identified" → measles is now stated, the Q is then about PEP, which is fine — diagnosis was the prior step). Rob's harder version withholds the diagnostic giveaway and forces the candidate to recognise the syndrome from constellation alone.

## 13. "Feels legitimate, not AI-generated" checklist

Every question should pass all of these before commit:

- [ ] Australian/British spelling consistent throughout
- [ ] SI units, Australian reference ranges
- [ ] Demographic opener pattern (age + qualifier + presentation)
- [ ] Stem length proportional to reasoning need, not padded
- [ ] No pertinent-negative pile-up beyond what discriminates
- [ ] No "compounding risk" telegraphing
- [ ] No structured-data doubling (prose vs block)
- [ ] No "follow local guidelines" / "all of the above" / "none of the above" options
- [ ] No diagnosis-leak in options when stem withholds the diagnosis
- [ ] Options parallel in grammar, length, and dose format
- [ ] Correct option not the longest by line count
- [ ] Lead-in is single-sentence, ends with "?"
- [ ] Negative lead-ins capitalised on the negation word only
- [ ] Empty Investigations block is hidden, not shown
- [ ] Rationale cites at least one Australian guideline
- [ ] No em-dashes anywhere
- [ ] No markdown asterisks, no bullets in question text
- [ ] No author meta-commentary in stems
- [ ] User is always positioned as the treating doctor
