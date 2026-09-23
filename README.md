# A to E

A free, open practice MCQ bank for Australian medical students in their clinical years. Single-best-answer clinical reasoning across paediatrics, obstetrics & gynaecology, psychiatry, and adult medicine, with Australian units and Australian guideline sources throughout.

7,053 questions, the four disciplines held at parity: Paediatrics 1,765, Obstetrics & Gynaecology 1,766, Psychiatry 1,760, Medicine 1,762.

**Live: <https://mord58562.github.io/a-to-e/>** - guest mode, no signup required.

## What's new in 1.6.16

- Reference values now appear on perinatal questions in psychiatry and medicine, and on paediatric questions that were pointing at the adult panel. Where the library genuinely has no paediatric values for a panel, the question says so instead of showing an empty space.
- A failure while the gate is on screen no longer leaves the page stuck behind it.

## What's new in 1.6.12

- Pressing the number of the option you already picked takes it back off, so the key that chose it undoes it.
- Choosing an option with the keyboard looks the same as clicking it: one tinted row with a filled marker, and nothing left behind when you take the choice back off.

## What's new in 1.6.11

- A revoked invite code disappears from the admin panel instead of sitting there as a row that cannot do anything.
- The name pill and the Admin button are painted with the rest of the masthead instead of arriving a few hundred milliseconds later and shoving the row sideways.

## What's new in 1.6.10

- The reference panel no longer drags the masthead sideways when it opens, and the reading column can no longer be pushed off the left edge of the window on a laptop. The navigator moves with the column instead of being left behind under the panel.
- The admin panel's section tabs, the question-list dropdown, the admin count pills and the "Copy prompt" button all work again.
- Signing up as a guest no longer loses the answers you gave as a guest.
- Seventeen questions were rendering no explanation at all.
- A new session starts the navigator at question 1 rather than wherever the last session left it.
- Every question card starts at the stem; an empty header band above it has gone.
- Ending or leaving a session asks in the app's own dialog, and says how many questions are still unanswered.
- Reference values: five rows that shared a label with a different threshold now say which is which.

## What's new in 1.6.9

- Navigator chips are sized to the highest question number in the session, so a four-digit number sits inside its cell instead of spilling out of it.

## What's new in 1.6.8

- The admin overlay no longer flashes for a frame when the page loads. The rule that revealed the app for a signed-in user forced a display value onto every top-level element, including the ones meant to stay hidden.
- The navigator scrolls with the page instead of hanging in the same spot, and pages a round hundred at a time.
- Readings in a data block are laid out as a two-column chart, so names line up, values line up, and a long reading wraps inside its own cell instead of breaking a pair in half. A panel of laboratory results renders the same way as a set of vital signs rather than falling back to a paragraph.

## What's new in 1.6.7

- The question navigator draws as many chips as fit the rail, so it no longer has a scrollbar of its own. The page has one scroll.
- The keyboard number on an option row lines up with the rule-out control beside it.
- Invite codes can be read back. A live code is shown in full in the admin panel with a copy control, and the code shown when you create one stays on screen until you dismiss it instead of being wiped by the refresh a moment later. Needs the worker deployed with `schema_005_invite_reveal.sql`; codes issued before that can only be replaced, which the panel offers as Reissue.

## What's new in 1.6.6

- The admin panel's section tabs switch panes again. The Content pane was pinned open by a stylesheet rule that outranked the `hidden` attribute, so selecting another section rendered it underneath. Seven other elements carried the same latent bug.
- The question navigator is anchored to the reading column instead of the window edge, so it no longer drifts into the margin as the window widens, and it starts level with the topbar.
- The topbar is the width of the card it seams into, rather than the width of the window.
- Readings in a data block sit on a grid and all split into name and value, including ones whose value is a word rather than a number.

## What it is

- A growing library of single-best-answer clinical vignettes calibrated to the upper end of Australian undergraduate clinical-years standard.
- Four disciplines: Paediatrics, Obstetrics & Gynaecology, Psychiatry, adult Medicine.
- Five difficulty tiers, each individually selectable on the home screen:

  | Level | Questions | Share |
  | --- | ---: | ---: |
  | 1/5 | 70 | 1.0% |
  | 2/5 | 1,702 | 24.1% |
  | 3/5 | 2,745 | 38.9% |
  | 4/5 | 2,217 | 31.4% |
  | 5/5 | 319 | 4.5% |

  Difficulty tracks the amount of clinical reasoning a question demands, not the rarity of the topic. A common presentation reaches 5/5 when the answer turns on a disconfirming finding, a calculation under uncertainty, or a cut-off choice between competing guidelines.
- Every option carries a per-option rationale, most of them carrying a source citation. The sources are published, citable Australian references, most of them accessible through a university subscription: RCH Melbourne CPG, Therapeutic Guidelines and eTG, Australian Medicines Handbook, RANZCOG, RANZCP clinical practice guidelines, DSM-5-TR, KEMH, SOMANZ, Queensland Clinical Guidelines, Australian Immunisation Handbook, Australian Asthma Handbook, ASCIA, ASHM, Cancer Council Australia, KHA-CARI, ANZICS, GESA, TSANZ, Family Planning Australia, Phoenix Australia, NSW Poisons Information Centre, NSW Mental Health Act 2007, RACGP, NHMRC, NHFA/CSANZ, COPE, Surviving Sepsis Campaign, NICE, BMJ Best Practice, StatPearls, and Cochrane.
- Australian SI units throughout (mmol/L, micromol/L, g/L, x10^9/L, mmHg, °C, kg).
- Built-in **Reference values** panel: 24 categories and 232 rows of Australian normal ranges (paediatric age bands, pregnancy-trimester ranges, ADIPS OGTT, urinalysis dipstick + quantitative, and more) toggleable with the **L** key. Sticky category headers, quick-jump pills, row-level search, and inline rendering of question-relevant ranges after you reveal the answer.

## Features

- **Question navigator.** A persistent side rail on a wide screen, and a panel behind the question counter on a narrow one. Numbered chips show unanswered, correct, incorrect, current or flagged, and jump straight to that question. A session can be the whole bank, so the grid is a window with paging and a jump-to-number box. In test mode chips read only as answered until the session ends.
- **Deterministic option re-lettering.** Source batches frequently place the correct answer at A. Each question's options are shuffled by a seeded Fisher-Yates keyed on the question id, so the order is stable for you across reloads and identical for every user. Each option keeps its `sourceLetter`, which is what the answer aggregates are recorded against, so cross-user statistics still compare like for like.
- **Stem-clue highlighting.** After you reveal the answer, the discriminating phrases in the stem are marked, so you can see which words were doing the work.
- **Hover glossary.** Around 40 clinical abbreviations in the revealed stem carry a hover definition (DKA, PPH, ACS, SSRI, HELLP, CTPA and the rest).
- **Inline reference ranges.** When a question is keyed to a pathology panel, the relevant normal ranges render under the explanation without opening the full panel.
- **Rule out and flag.** Rule out options you have discounted, with shift and the option number or the control on the row; the control becomes a restore arrow so a second press puts the option back. Flag questions for review; flags persist and can be used as a session filter.
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
- `Shift` + `1`-`5` rule an option out, and press again to put it back
- `X` rule out the selected option
- `L` toggle reference values
- `Cmd`/`Ctrl` + `↵` submit a bug report from inside the report box

## Privacy

You can use A to E without an account. In **guest mode** the site is fully client-side: question history, flags, theme preference, and locally-pasted questions live only in your browser's `localStorage` and nothing is sent to any server.

If you **create a cloud account** to sync progress across devices across devices, the following is stored in a Cloudflare D1 database behind a Cloudflare Worker at `a-to-e-inbox.mord58562.workers.dev`:

- Your email, encrypted at rest with AES-256-GCM. Lookups run against a separate HMAC-SHA256 column, so sign-in never needs to decrypt the address.
- Your password, hashed with Argon2id (RFC 9106, m=19456 KiB, t=2, p=1). Accounts created before the 2026-05-25 migration are verified against their old PBKDF2 hash once and rehashed to Argon2id on that login.
- An opaque session token, stored only as a peppered SHA-256 hash. The token itself never touches the database.
- Per question: which source option-letter you chose, whether it was correct, how many times you have attempted it, and when it last changed.
- Your flagged questions, and your session settings blob (mode, question count, timer, selected disciplines, difficulties, learning areas and seen-filter).

Registration is invite only. Sign-ins are rate limited to 8 failures per
15 minutes per account and 30 attempts per 15 minutes per address, sign-ups
to 5 per hour per address, and the client IP is recorded only as a truncated
salted hash. Sessions last 30 days, slide on use, and expire absolutely at
90 days. You can change your password or sign out every other device from
the Account tab.

Nothing you do is shown to any other user. Per-question timing stays in your browser and is never sent.

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
│   ├── check_tokens.py
│   ├── dupe_gate.py
│   └── sync_routine_counts.py
└── assets/prompt-template.txt
```

`questions_psych.json` and `questions_medicine.json` are empty arrays: all Psychiatry and Medicine content is manifest-driven and lives in `data/batches/`. `questions_paeds.json` and `questions_obgyn.json` hold 24 and 21 questions respectively, with the rest of both disciplines also in batches.

`data/framework_*_topics.md` are the per-discipline curriculum topic lists that generation draws against. `data/_audited_main/` holds the promoted post-audit copies of the main files, and `data/_archived_dupes/` batches withdrawn from the manifest.

`assets/prompt-template.txt` is the generation prompt, fetched only when the admin Content tab is open. `scripts/check_tokens.py` is the banned-token gate and the list of record for what the prompt bans; `scripts/dupe_gate.py` compares a new batch against the published bank and against itself. Internal working notes, audit records and the scheduled routine's brief are deliberately not in this repo: GitHub Pages serves the root, so anything committed here is publicly fetchable.

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
