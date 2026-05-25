# A to E

A free, open practice MCQ bank for Australian medical students in their clinical years. Single-best-answer clinical reasoning across paediatrics, obstetrics & gynaecology, psychiatry, and adult medicine, with Australian units and Australian guideline sources throughout.

**Live: <https://mord58562.github.io/a-to-e/>** — guest mode, no signup required.

## What's new in 2.0.0

- **Cloud accounts.** Email + password sign-in syncs progress across devices. Guest mode still keeps everything local. Admin accounts get the unified Admin dashboard (Overview, Add & Audit, Quality, Users, Account).
- **Difficulty scale overhauled.** Bank now uses L2 as the floor (was L3-minimum). L3 and L4 dominate (~95% of the bank); L5 is a new extreme tier (~5% target) that requires complex reasoning *and* may require niche sub-specialty knowledge.
- **Social stats panel.** Signed-in users see what proportion of other users picked each option after they submit.
- **Difficulty toggles on the home screen.** Each level individually toggleable.
- **Scheduled generation.** A cloud routine fires regularly producing fresh single-best-answer batches, each self-audited against the binding rule pack before commit.
- **Unified Add & Audit pane** for admins: paste flow, inbox of pending submissions, user-submitted reports, and live-content audit all on one scrollable surface.

## What it is

- An ever-increasing library of single-best-answer clinical vignettes calibrated to the upper end of Australian undergraduate clinical-years standard.
- Four disciplines: Paediatrics, Obstetrics & Gynaecology, Psychiatry, adult Medicine.
- Every option carries a per-option rationale ending with an explicit source citation. Every claim verifiable in a free-tier reference (RCH CPG, RANZCOG, KEMH, Therapeutic Guidelines, AMH, ASHM, COPE, NHFA/CSANZ, RACGP, NHMRC, NICE, BMJ Best Practice, StatPearls, Cochrane).
- Australian SI units throughout (mmol/L, micromol/L, g/L, x10^9/L, mmHg, °C, kg).
- Built-in **Reference values** panel: an ever-growing set of categories of Australian normal ranges (paediatric age bands, pregnancy-trimester ranges, ADIPS OGTT, urinalysis dipstick + quantitative, and more) toggleable with the **L** key. Sticky category headers, quick-jump pills, row-level search, and inline rendering of question-relevant ranges after you reveal the answer.

## How to use

1. Pick a **mode**: *Study* (continuous, instant explanation after each question, end whenever) or *Test* (no answers until the end, optional countdown timer).
2. Pick a **discipline** (any combination of Paediatrics, O&G, Psychiatry, Medicine) and optionally narrow by **learning area**, **difficulty** (L2 / L3 / L4 / L5), or **filter** (All / Unseen / Previously incorrect / Flagged).
3. **Begin** and work through.

### Keyboard

- `1`–`5` choose option
- `↑`/`↓` move selection up / down within options
- `↵` submit / next
- `F` mark for review
- `X` strike out the selected option
- `L` toggle reference values
- `←`/`→` previous / next question

## Privacy

You can use A to E without an account. In **guest mode** the site is fully client-side: question history, flags, theme preference, and locally-pasted questions live only in your browser's `localStorage` and nothing is sent to any server.

If you **create a cloud account** to sync progress across devices and see what proportion of other users picked each option after you submit:

- Email, a PBKDF2-hashed password, an opaque session token, and a per-question record of which option-letter you chose and whether it was first-time correct are stored in a Cloudflare D1 database behind a Cloudflare Worker at `a-to-e-inbox.mord58562.workers.dev`.
- Aggregate counts are returned to render the social-stats panel; no personally-identifying option-choice data is shown to other users - only totals.
- You can permanently delete your account and all associated rows from inside the Admin modal's Account tab (or via `POST /api/account/delete`).
- The reference-ranges panel, the questions themselves, and the per-batch JSON are static assets served from GitHub Pages.

Question content submitted via the paste flow is committed to the public `mord58562/a-to-e` GitHub repo through the worker (so other users see it on their next reload).

## Project structure

```
a-to-e/
├── index.html
├── assets/
│   ├── styles.css
│   ├── app.js
│   └── favicon.svg
├── data/
│   ├── questions_{paeds,obgyn,psych,medicine}.json
│   ├── reference_ranges.json
│   ├── meta.json
│   ├── batches_manifest.json
│   ├── inbox_manifest.json
│   ├── reports.json
│   └── batches/*.json
├── cloudflare-worker/
│   ├── src/worker.js
│   ├── schema.sql
│   ├── DEPLOY.md
│   └── wrangler.toml
└── scripts/
    ├── start.sh
    ├── server.py
    ├── add-questions.sh
    ├── merge_batches.sh
    └── merge_inbox.sh
```

## Run locally

```
git clone https://github.com/mord58562/a-to-e.git
cd a-to-e
./scripts/start.sh
```

Opens `http://127.0.0.1:8765/`. Any modern browser. No dependencies beyond `python3`.

The worker is optional locally. With the worker off, cloud features (signup, social stats, paste-to-bank) degrade to in-browser fallbacks; everything else works.

## License

MIT. Question content is original, written against the cited public sources. Reference range values are paraphrased from Royal College of Pathologists of Australasia and Royal Children's Hospital published ranges (cite your local lab for clinical decisions).

## Caveat

This is an exam-prep practice bank, not clinical advice. Clinical decisions belong with the patient in front of you, their treating team, and current local guidelines.
