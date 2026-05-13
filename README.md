# Y4 Pocket Companion

A free, open practice MCQ bank for end-of-medical-school clinical reasoning - paediatrics and obstetrics & gynaecology, Australian units and Australian guideline sources throughout.

**Live: <https://mord58562.github.io/y4-pocket-companion/>**

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

Fully client-side. Question history, marks, and theme preference live only in your browser's `localStorage`. Nothing is sent to any server.

## Adding your own questions

The question bank is a static JSON file. To add more questions:

1. Click **how to add** on the welcome banner (or just click the link in the index) to open the full copy-paste prompt.
2. Paste it into any capable LLM (Claude, ChatGPT, Gemini) with your topic and count.
3. The output JSON appends to `data/questions_paeds.json` or `data/questions_obgyn.json`.

The in-app prompt embeds every quality rule the bundled questions follow: stem-length floors per difficulty, distractor hooks, length-balanced options, Australian source citation, randomised correct-letter placement, self-audit pass.

## Project structure

```
y4-pocket-companion/
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
git clone https://github.com/mord58562/y4-pocket-companion.git
cd y4-pocket-companion
./scripts/start.sh
```

Opens `http://127.0.0.1:8765/`. Any modern browser. No dependencies beyond `python3`.

## License

MIT. Question content is original, written against the cited public sources. Reference range values are paraphrased from Royal College of Pathologists of Australasia and Royal Children's Hospital published ranges (cite your local lab for clinical decisions).

## Caveat

This is an exam-prep practice bank, not clinical advice. Clinical decisions belong with the patient in front of you, their treating team, and current local guidelines.
