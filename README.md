# A to E

A free, open practice MCQ bank for Australian medical students in their clinical years. Single-best-answer clinical reasoning across paediatrics, obstetrics & gynaecology, psychiatry, and adult medicine, with Australian units and Australian guideline sources throughout.

5,509 questions, the four disciplines held at parity: Paediatrics 1,398, Psychiatry 1,371, Obstetrics & Gynaecology 1,370, Medicine 1,370.

**Live: <https://mord58562.github.io/a-to-e/>** - guest mode, no signup required.

## What's new in 2.1.2

- Bug fixes and minor polish. Escape now closes whichever overlay is on top (report, how-to, stats, admin, reference panel). Ctrl or Cmd + Enter submits a bug report from inside the textarea. Sign-in errors give specific copy instead of a generic "failed" message. The empty-filter state now explains how to loosen your selection instead of just greying out the Begin button. Countdown announces to screen readers.
- Under the hood: tighter Content Security Policy, one fewer font weight downloaded, faster subsequent-visit loads via data-cache-busting keyed to bank freshness rather than release tag.

## What's new in 2.1.1

- Bug fixes and minor polish. Question rows are now keyboard-focusable with a visible outline, motion respects `prefers-reduced-motion`, and the reference panel on phones stops short of full-bleed so the question column stays visible behind it.

## What's new in 2.1.0

- **Difficulty scale rebuilt as full 1-5/5.** Every question shifted down one level on 2026-06-01 to make room for a new top tier. 436 questions were then promoted from new-L3 to new-L4 to hit the 15-20% target. Common presentations earn the higher tiers when reasoning is non-trivial.
- **RCH Melbourne CPG audit.** All paediatric questions across UTI, bronchiolitis, croup, asthma, anaphylaxis, fever-under-3-months, gastroenteritis, and paediatric sepsis audited against current RCH guidance. 61 divergences flagged; high-severity ones fixed (UTI imaging cascade no longer assumes DMSA; bronchiolitis switches to low-flow first with SpO2 target 90%; croup uses RCH banded dexamethasone and 3-hour post-adrenaline observation; anaphylaxis uses ASCIA banded adrenaline doses). Generation rule pack updated so future questions stay aligned.
- **Cleaner visual language.** Dropped IBM Plex for Public Sans throughout - one institutional sans, weight does the work. Mono dropped from data-table keys, counters, and IDs (tabular numerals come from the body sans). Cream/sepia light theme replaced with a cool clinical near-white + teal-navy palette. Option list now reads as rows with hairline dividers, not nested cards.
- **Cluster of content fixes.** RCH Melbourne CPG is now the source-of-truth for paediatrics; the UTI imaging question rewritten to align with it. The incomplete-miscarriage "offer all options and let her choose" non-question rewritten to "what would you first recommend". Twin-2 transverse and instrumental-delivery stems lose the give-away "consented antenatally to X" last sentence. Two garbled stems (urticaria, chronic-HTN superimposed pre-eclampsia) repaired. The bhCG threshold for required surgical management of tubal ectopic is now flagged as >=5000 IU/L per RANZCOG in the generation rule pack.
- **Timer simplified.** Per-question stopwatch hidden in study mode (was noise without value). Test mode preserves the countdown and elapsed-time displays.
- Bug fixes and minor polish.

## What's new in 2.0.0

- **Cloud accounts.** Email + password sign-in syncs progress across devices. Guest mode still keeps everything local. Admin accounts get the unified Admin dashboard (Overview, Add & Audit, Quality, Users, Account).
- **Social stats panel.** Signed-in users see what proportion of other users picked each option after they submit.
- **Difficulty toggles on the home screen.** Each level individually toggleable.
- **Scheduled generation.** A cloud routine fires regularly producing fresh single-best-answer batches, each self-audited against the binding rule pack before commit.
- **Unified Add & Audit pane** for admins: paste flow, inbox of pending submissions, user-submitted reports, and live-content audit all on one scrollable surface.

## What it is

- A growing library of single-best-answer clinical vignettes calibrated to the upper end of Australian undergraduate clinical-years standard.
- Four disciplines: Paediatrics, Obstetrics & Gynaecology, Psychiatry, adult Medicine.
- Five difficulty tiers, each individually selectable on the home screen:

  | Level | Questions | Share |
  | --- | ---: | ---: |
  | 1/5 | 58 | 1.1% |
  | 2/5 | 1,512 | 27.5% |
  | 3/5 | 1,948 | 35.4% |
  | 4/5 | 1,748 | 31.7% |
  | 5/5 | 243 | 4.4% |

  Difficulty tracks the amount of clinical reasoning a question demands, not the rarity of the topic. A common presentation reaches 5/5 when the answer turns on a disconfirming finding, a calculation under uncertainty, or a cut-off choice between competing guidelines.
- Every option carries a per-option rationale, most of them carrying a source citation. The sources are published, citable Australian references, most of them accessible through a university subscription: RCH Melbourne CPG, Therapeutic Guidelines and eTG, Australian Medicines Handbook, RANZCOG, RANZCP clinical practice guidelines, DSM-5-TR, KEMH, SOMANZ, Queensland Clinical Guidelines, Australian Immunisation Handbook, Australian Asthma Handbook, ASCIA, ASHM, Cancer Council Australia, KHA-CARI, ANZICS, GESA, TSANZ, Family Planning Australia, Phoenix Australia, NSW Poisons Information Centre, NSW Mental Health Act 2007, RACGP, NHMRC, NHFA/CSANZ, COPE, Surviving Sepsis Campaign, NICE, BMJ Best Practice, StatPearls, and Cochrane.
- Australian SI units throughout (mmol/L, micromol/L, g/L, x10^9/L, mmHg, °C, kg).
- Built-in **Reference values** panel: 24 categories and 232 rows of Australian normal ranges (paediatric age bands, pregnancy-trimester ranges, ADIPS OGTT, urinalysis dipstick + quantitative, and more) toggleable with the **L** key. Sticky category headers, quick-jump pills, row-level search, and inline rendering of question-relevant ranges after you reveal the answer.

## Features

- **Question-list navigator.** Click the question counter for a progress ring and a numbered chip grid. Each chip shows unanswered, correct, incorrect, current, or flagged, and jumps straight to that question. In test mode, chips read only as answered until the session ends.
- **Deterministic option re-lettering.** Source batches frequently place the correct answer at A. Each question's options are shuffled by a seeded Fisher-Yates keyed on the question id, so the order is stable for you across reloads and identical for every user. Each option keeps its `sourceLetter`, which is what the answer aggregates are recorded against, so cross-user statistics still compare like for like.
- **Stem-clue highlighting.** After you reveal the answer, the discriminating phrases in the stem are marked, so you can see which words were doing the work.
- **Hover glossary.** Around 40 clinical abbreviations in the revealed stem carry a hover definition (DKA, PPH, ACS, SSRI, HELLP, CTPA and the rest).
- **Inline reference ranges.** When a question is keyed to a pathology panel, the relevant normal ranges render under the explanation without opening the full panel.
- **Strike-out and flag.** Cross off options you have ruled out, and flag questions for review; flags persist and can be used as a session filter.
- **Answer distribution.** After you submit, signed-in users see the proportion of all users who picked each option.
- **Pause and resume.** Timed sessions pause; the countdown, session clock and per-question clock all resume where they left off rather than running on in the background.
- **Retry incorrect.** The summary screen rebuilds a fresh untimed session from everything you got wrong or never answered.
- **Session report.** Score, unanswered count, a per-subtopic breakdown, and a reviewable list filterable to all, incorrect, or flagged, with each row jumping back into the question with the answer shown.
- **Stats modal.** Questions answered and what proportion of the bank that is, correctness, total time studying and average seconds per question, plus tables by discipline and by difficulty.
- **Report an issue.** A per-question report box that reaches the maintainer.
- **Light and dark themes.**

## How to use

1. Pick a **mode**: *Study* (continuous, instant explanation after each question, end whenever) or *Test* (no answers until the end, optional countdown timer).
2. Pick a **discipline** (any combination of Paediatrics, O&G, Psychiatry, Medicine) and optionally narrow by **learning area**, **difficulty** (L1 / L2 / L3 / L4 / L5), or **filter** (All / Unseen / Previously incorrect / Flagged).
3. **Begin** and work through.

### Keyboard

- `1`-`5` select option A-E. Selecting does not submit.
- `↑`/`↓` or `W`/`S` move the selection through the options, wrapping at either end
- `←` or `A` previous question, without submitting
- `→` or `D` submit, then advance once the answer is showing
- `↵` or `Space` submit, then next
- `Esc` clear an unsubmitted selection; with an overlay open, close the topmost one
- `F` flag for review
- `X` strike out the selected option
- `L` toggle reference values
- `Cmd`/`Ctrl` + `↵` submit a bug report from inside the report box

## Privacy

You can use A to E without an account. In **guest mode** the site is fully client-side: question history, flags, theme preference, and locally-pasted questions live only in your browser's `localStorage` and nothing is sent to any server.

If you **create a cloud account** to sync progress across devices and see what proportion of other users picked each option after you submit, the following is stored in a Cloudflare D1 database behind a Cloudflare Worker at `a-to-e-inbox.mord58562.workers.dev`:

- Your email, encrypted at rest with AES-256-GCM. Lookups run against a separate HMAC-SHA256 column, so sign-in never needs to decrypt the address.
- Your password, hashed with Argon2id (RFC 9106, m=19456 KiB, t=2, p=1). Accounts created before the 2026-05-25 migration are verified against their old PBKDF2 hash once and rehashed to Argon2id on that login.
- An opaque session token, stored only as a peppered SHA-256 hash. The token itself never touches the database.
- Per question: which source option-letter you chose, whether it was correct, how many times you have attempted it, and when it last changed.
- Your flagged questions, and your session settings blob (mode, question count, timer, selected disciplines, difficulties, learning areas and seen-filter).

Failed sign-ins are rate limited to 8 per 15 minutes per account, and the client IP is recorded only as a truncated salted hash.

Aggregate counts are returned to render the answer-distribution panel; no personally-identifying option-choice data is shown to other users, only totals. Per-question timing stays in your browser and is never sent.

You can permanently delete your account and every associated row from the Account tab, or via `POST /api/account/delete`. Deletion removes the session, answer, flag, settings and user rows outright; there is no soft delete.

The reference-ranges panel, the questions themselves, and the per-batch JSON are static assets served from GitHub Pages. There are no cookies, no analytics and no third-party trackers.

The paste flow is admin-gated server-side. Questions pasted by anyone else stay in that browser's `localStorage` and are merged into their own bank on load; they are never committed to the public repo.

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
│   ├── framework_{paeds,obgyn,psych,medicine}_topics.md
│   ├── batches/*.json
│   ├── inbox/
│   ├── _audit/
│   ├── _audited_main/
│   └── _archived_dupes/
├── cloudflare-worker/
│   ├── src/worker.js
│   ├── schema.sql
│   ├── DEPLOY.md
│   └── wrangler.toml
├── scripts/
│   ├── start.sh
│   ├── server.py
│   ├── add-questions.sh
│   ├── merge_batches.sh
│   ├── merge_inbox.sh
│   └── sync_routine_counts.py
├── .remote-agent-context.md
└── RESEARCH_mcq_design.md
```

`questions_psych.json` and `questions_medicine.json` are empty arrays: all Psychiatry and Medicine content is manifest-driven and lives in `data/batches/`. `questions_paeds.json` and `questions_obgyn.json` hold 24 and 21 questions respectively, with the rest of both disciplines also in batches.

`data/framework_*_topics.md` are the per-discipline curriculum topic lists that generation draws against. `data/_audit/` holds the audit records behind past content passes, `data/_audited_main/` the promoted post-audit copies of the main files, and `data/_archived_dupes/` batches withdrawn from the manifest. `.remote-agent-context.md` is the standing brief for the scheduled generation routine, kept in sync with the live counts by `scripts/sync_routine_counts.py`. `RESEARCH_mcq_design.md` is the design research the question craft rules are built on.

## Run locally

Requires `git` and `python3`.

```sh
# macOS
brew install git python

# Debian / Ubuntu
sudo apt install -y git python3
```

```sh
git clone https://github.com/mord58562/a-to-e.git
cd a-to-e
./scripts/start.sh
```

Opens `http://127.0.0.1:8765/`. Any modern browser.

The worker is optional locally. With the worker off, cloud features (signup, answer distribution, paste-to-bank) degrade to in-browser fallbacks; everything else works. To run or deploy the worker you need Node.js 18+ and wrangler:

```sh
brew install node                 # or: sudo apt install -y nodejs npm
npm install -g wrangler
cd cloudflare-worker && npm install && wrangler dev
```

See `cloudflare-worker/DEPLOY.md` for the one-time D1 setup.

### How data loads

`data/meta.json` is fetched first with a `?t=<timestamp>` query, so it is never served from cache. Its `updated` field becomes the `?v=` token on every other JSON request. A content push therefore invalidates every cached data file on its own, with no code release.

The four main discipline files then load concurrently with `reference_ranges.json`, both manifests, and `reports.json`, followed by every path listed in `batches_manifest.json` and `inbox_manifest.json`. That is currently 555 batch files, so a cold load is about 564 requests. They are all cached hard after the first visit, and an individual failure is counted and non-fatal rather than blocking the bank, but the request count is the sharpest edge in the project and the obvious thing to fix next.

Everything is then deduplicated by question `id`, with the main-file entry winning over any batch that republishes the same id.

## License

MIT. Question content is original, written against the cited public sources. Reference range values are paraphrased from Royal College of Pathologists of Australasia and Royal Children's Hospital published ranges (cite your local lab for clinical decisions).

## Caveat

This is an exam-prep practice bank, not clinical advice. Clinical decisions belong with the patient in front of you, their treating team, and current local guidelines.
