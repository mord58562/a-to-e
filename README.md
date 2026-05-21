# A to E

A free, open practice MCQ bank for end-of-medical-school clinical reasoning - paediatrics and obstetrics & gynaecology, Australian units and Australian guideline sources throughout.

**Live: <https://mord58562.github.io/a-to-e/>**

## What's new in 1.3.0

- Renamed from *Y4 Pocket Companion* to **A to E** (the resus letters; doubled with the MCQ option letters).
- **Paste new questions** straight into the bank from the "how to add" modal - no JSON file editing. Run `./scripts/start.sh` and pasted batches auto-write to `data/inbox/` for the next audit pass; otherwise they live in your browser and can be exported on demand.
- **Profiles**: each password maps to a named profile with its own progress, flags, settings, and pasted questions. Existing data migrates automatically the first time you sign in.
- Visible confirmation when the LLM prompt is copied. Quiz chrome no longer bleeds onto the home screen.

## What it is

- Single-best-answer clinical vignettes calibrated to the upper end of Year 4 Australian medical school standard.
- Bell-curve difficulty distribution (1/5 recall through 5/5 multi-step reasoning).
- Every option carries a per-option rationale ending with an explicit source citation. Every claim is verifiable in a free-tier reference (Royal Children's Hospital CPG, RANZCOG, KEMH, Therapeutic Guidelines, AMH, NICE, BMJ Best Practice, StatPearls, Cochrane, etc.).
- Australian SI units throughout (mmol/L, μmol/L, g/L, ×10⁹/L, °C, kg).
- A built-in Reference Values panel with 30 categories of Australian normal ranges (paediatric age bands, pregnancy-trimester ranges, ADIPS OGTT, etc.) toggleable at any time with the **L** key.

## How to use

1. Pick a **mode**: *Study* (continuous, instant explanation after each question, end whenever) or *Test* (no answers until the end, optional countdown timer).
2. Pick a **discipline** (Paediatrics, Obs & Gynae, or both) and optionally narrow to specific *learning points*.
3. **Begin** and work through.

### Keyboard

- `1`–`5` choose option
- `↵` submit / next
- `F` mark for review
- `X` strike out the selected option
- `L` toggle reference values
- `← →` previous / next question

## Privacy

You can use A to E without an account. In **guest mode** the site is fully client-side: question history, flags, theme preference, and locally-pasted questions live only in your browser's `localStorage` and nothing is sent to any server.

If you **create a cloud account** (email + password) to sync progress across devices and see what proportion of other users picked each option after you submit, then:

- Email, a PBKDF2-hashed password, an opaque session token, and a per-question record of which option-letter you chose and whether it was first-time correct are stored in a Cloudflare D1 database behind a Cloudflare Worker at `a-to-e-inbox.mord58562.workers.dev`.
- Aggregate counts are returned to the client to render the social-stats panel. No personally-identifying option-choice data is shown to other users - only totals.
- You can permanently delete your account and all associated rows from inside the Admin modal's Account tab (or via `POST /api/account/delete`).
- The reference-ranges panel, the questions themselves, and the per-batch JSON are static assets served from GitHub Pages.

Question-content submitted via the paste flow is committed to the public `mord58562/a-to-e` GitHub repo through the worker (so other users see it on their next reload).

## Adding your own questions

No JSON file editing required:

1. Open **how to add** (welcome banner or index link).
2. Click **Copy prompt to clipboard**, paste into any capable LLM (Claude, ChatGPT, Gemini), and tell it your topic and count.
3. Paste the JSON it returns into the **Paste new questions** box and click **Add to my bank**. The site validates, merges, and serves the questions immediately - they live in `localStorage` and survive page reloads on the same browser.

The in-app prompt embeds every quality rule the bundled questions follow: stem-length floors per difficulty, distractor hooks, length-balanced options, Australian source citation, randomised correct-letter placement, self-audit pass.

If you want a pasted batch to ship in the public repo (rather than just live in your browser), use **Export for audit** on the same modal - it downloads a JSON file you can drop into `data/inbox/` and add to `data/inbox_manifest.json`.

## Project structure

```
abcde/
├── index.html
├── assets/
│   ├── styles.css
│   ├── app.js
│   └── favicon.svg
├── data/
│   ├── questions_paeds.json
│   ├── questions_obgyn.json
│   ├── reference_ranges.json
│   ├── meta.json
│   ├── batches_manifest.json
│   └── batches/*.json
└── scripts/
    ├── start.sh
    ├── add-questions.sh
    └── merge_batches.sh
```

## Run locally

```
git clone https://github.com/mord58562/a-to-e.git
cd a-to-e
./scripts/start.sh
```

Opens `http://127.0.0.1:8765/`. Any modern browser. No dependencies beyond `python3`.

## License

MIT. Question content is original, written against the cited public sources. Reference range values are paraphrased from Royal College of Pathologists of Australasia and Royal Children's Hospital published ranges (cite your local lab for clinical decisions).

## Caveat

This is an exam-prep practice bank, not clinical advice. Clinical decisions belong with the patient in front of you, their treating team, and current local guidelines.
