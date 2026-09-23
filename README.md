# A to E

A free, open practice MCQ bank for Australian medical students in their clinical years. Single-best-answer clinical reasoning across paediatrics, obstetrics & gynaecology, psychiatry, and adult medicine, with Australian units and Australian guideline sources throughout.

7,053 questions, the four disciplines held at parity: Paediatrics 1,765, Obstetrics & Gynaecology 1,766, Psychiatry 1,760, Medicine 1,762.

**Live at <https://mord58562.github.io/a-to-e/>.** No account is needed: continue as a guest and your progress stays in that browser.

## What's new in 1.7.3

- A finished test reaches the server whole, even if the tab closes straight away. A test left unfinished for a day is recorded when it expires, not dropped.
- The test clock and the masthead stay on screen as you scroll.
- In a test you can skip a question and come back, or finish from one you haven't answered.
- Retry incorrect shuffles the options again, and getting a missed question right on the retry doesn't take it off your "Previously incorrect" list.
- After a wrong answer the page shows your pick and the correct option together. Your pick is marked "Your answer."; the other rationales speak for themselves.
- The question card is one reading width, with every line ending at the same edge.
- Learning areas are grouped by discipline, with near-duplicate names merged and a box to find one.
- Stats, Report and Admin are proper dialogs: Tab stays inside them and focus returns where it was.
- On a slow connection the whole bank loads before you start, or the app says which discipline is still coming and keeps fetching it.
- Two tabs open at once no longer double-count answers or undo each other's settings.
- An invite link works when pasted into a tab that already has the site open.
- Deleting your account asks for your password.

Earlier releases are in [CHANGELOG.md](CHANGELOG.md).

## What it is

Questions are pitched at the upper end of the Australian clinical years. Every option has its own rationale, and most rationales cite a source. The sources are Australian references where one exists, most available through a university subscription: RCH Melbourne CPG, Therapeutic Guidelines and eTG, Australian Medicines Handbook, RANZCOG, RANZCP clinical practice guidelines, DSM-5-TR, KEMH, SOMANZ, Queensland Clinical Guidelines, Australian Immunisation Handbook, Australian Asthma Handbook, ASCIA, ASHM, Cancer Council Australia, KHA-CARI, ANZICS, GESA, TSANZ, Family Planning Australia, Phoenix Australia, NSW Poisons Information Centre, NSW Mental Health Act 2007, RACGP, NHMRC, NHFA/CSANZ, COPE, Surviving Sepsis Campaign, NICE, BMJ Best Practice, StatPearls, and Cochrane. Units are Australian SI throughout (mmol/L, micromol/L, g/L, x10^9/L, mmHg, °C, kg).

Difficulty is set by how many reasoning steps the answer takes, not by how rare the topic is, so a common presentation can sit at 5/5.

| Level | What it asks | Questions | Share |
| --- | --- | ---: | ---: |
| 1/5 | Recall one fact | 70 | 1.0% |
| 2/5 | Put two or three findings together | 1,702 | 24.1% |
| 3/5 | Several steps, or an Australian cut-off | 2,745 | 38.9% |
| 4/5 | An atypical presentation, or a finding that points the wrong way | 2,217 | 31.4% |
| 5/5 | A calculation, a finding that argues against the obvious answer, or guidelines that disagree | 319 | 4.5% |

## Using it

The home screen sets up a session. Study mode shows the explanation after each answer and runs until you end it. Test mode holds every answer until you finish and can run against a timer. Pick any of the four disciplines, then narrow by learning area, difficulty, or a filter: unseen, previously incorrect or flagged. A session is saved as you go, so a closed tab or an evicted phone page can be resumed from the home screen for up to a day.

Options are shuffled per question with a seed taken from its id, so the order survives a reload and is the same for every user. Each option keeps its original letter, and that is the letter stored with your answer. You can rule out an option you have discounted, and flag a question to come back to; flags also work as a session filter. Pausing a timed session stops the countdown, the session clock and the question clock together.

A study answer counts once it is revealed; a pick you change or leave unrevealed is not recorded. A test's answers reach your history once, when the test is finished or left.

After the reveal, the phrases in the stem that decided the answer are highlighted and about 60 abbreviations (DKA, PPH, HELLP, CTPA and so on) show a definition on hover or tap. Each option has its own rationale, followed by the sources. When a question depends on a reference panel, a line under the explanation names it and opens the panel there.

The navigator sits beside the question on a wide screen and opens from the question counter on a phone. In a test it shows every question, numbered, marked only as answered until the end, with paging and a box to jump to a number. In study mode it shows the questions you have reached, marked right or wrong.

Results give the score and a line per discipline, then a list you can filter to incorrect or flagged. A row opens its question with the answer showing; Previous and Next step through the list, and Back to results returns to it. Retry incorrect starts an untimed session from the ones you got wrong. Stats, in the top bar, shows your accuracy by discipline and by difficulty. Report, under each question, sends a note to the maintainer.

Reference values (the button in the top bar, or L) holds 34 categories and 396 rows of Australian normal ranges, including paediatric age bands, pregnancy trimester ranges, the ADIPS OGTT and urinalysis, with a jump to each category and a search.

## Keyboard

- `1`-`5` or `A`-`E` select an option; the same key again clears it. Selecting never submits.
- `Enter` submits, then goes to the next question. `Space` on a focused option selects it, and on the selected option submits.
- `↑` / `↓` move the selection through the options, skipping ruled-out ones.
- `←` / `→` previous and next question. `→` never submits.
- `Shift` + `1`-`5` or `A`-`E` rules an option out, and back in.
- `X` rules out the selected option.
- `F` flags the question.
- `L` opens or closes reference values.
- `Esc` closes the topmost panel or dialog, or with nothing open clears an unsubmitted selection.
- `Cmd`/`Ctrl` + `Enter` sends a report from the report box.

## Privacy

You can use A to E without an account. As a guest, question history, flags and settings live only in your browser's `localStorage`, and nothing is sent to any server unless you file an issue report.

Signing up or in on a browser used as a guest moves that guest progress into the account. Guest flags sync; guest answers stay in that browser, because they were recorded without the option letter the server stores.

An account keeps your progress in step across devices. For that, the following is stored in a Cloudflare D1 database behind a Cloudflare Worker at `a-to-e-inbox.mord58562.workers.dev`:

- Your email, encrypted at rest with AES-256-GCM. Lookups run against a separate HMAC-SHA256 column, so sign-in never needs to decrypt the address.
- Your password, hashed with Argon2id (RFC 9106, m=19456 KiB, t=2, p=1). Accounts created before the 2026-05-25 migration are verified against their old PBKDF2 hash once and rehashed to Argon2id on that login.
- An opaque session token, stored only as a peppered SHA-256 hash. The token itself never touches the database.
- Per question: which source option-letter you chose, whether it was correct, how many times you have attempted it, and when it last changed.
- Your flagged questions, and your session settings blob (mode, question count, timer, selected disciplines, difficulties, learning areas and seen-filter).

An answer, flag or settings change is queued in `localStorage` before it is sent and leaves the queue only when the worker accepts it, so a write made offline or on a dropped connection is retried (after a minute, when the connection returns, and on the next load) rather than lost. Removing a flag on one device removes it on the others.

Registration is invite only. Sign-ins are rate limited to 8 failures per
15 minutes per account and 30 attempts per 15 minutes per address, sign-ups
to 5 per hour per address, and the client IP is recorded only as a truncated
salted hash. Sessions last 30 days, slide on use, and expire absolutely at
90 days. You can change your password or sign out every other device from
Account in the top bar.

Nothing you do is shown to any other user. Per-question timing stays in your browser and is never sent.

You can permanently delete your account and every associated row from Account in the top bar, or with `POST /api/account/delete`. Deletion removes the session, answer, flag, settings and user rows outright; there is no soft delete.

The reference-ranges panel, the questions themselves, and the per-batch JSON are static assets served from GitHub Pages. There are no cookies, no analytics and no third-party trackers.

Only an admin can add questions or change files in the repo, and the worker checks for an admin session on each of those requests, not just the page.

## Project structure

- `index.html`, `assets/` - the app: one page, one script, one stylesheet. `assets/preauth.js` runs before first paint, so a returning user sees neither the sign-in gate nor the wrong theme for a frame.
- `data/questions_*.json` - the four main discipline files. `questions_paeds.json` and `questions_obgyn.json` hold 23 and 21 questions; the Psychiatry and Medicine files are empty.
- `data/batches/` - everything else, listed in `data/batches_manifest.json` with a content hash per file.
- `data/reference_ranges.json` - the reference values panel. `data/reports.json` holds issue reports.
- `data/framework_*_topics.md` - the curriculum topic list each discipline is written against.
- `data/_audited_main/`, `data/_archived_dupes/` - promoted post-audit copies of the main files, and batches withdrawn from the manifest.
- `assets/prompt-template.txt` - the generation prompt. The admin Content tab fetches it.
- `scripts/` - `start.sh` and `server.py` serve the site locally. `check_tokens.py` is the banned-token gate and the list of record for what the prompt bans; `dupe_gate.py` compares a new batch with the published bank and with itself; `manifest_hashes.py` writes the manifest hashes.
- `cloudflare-worker/` - accounts, sync, reports and the admin write endpoints. See its README.
- `tests/` - `smoke.js` drives 25 questions as a guest; `admin.js` drives the admin panel against a fake worker.

Internal working notes, audit records and the scheduled routine's brief are kept out of this repo: GitHub Pages serves the root, so anything committed here can be fetched by anyone.

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

Serves the site at `http://127.0.0.1:8765/` and, on macOS, opens it; elsewhere, open the address by hand. Any modern browser.

The worker is optional locally. With it unreachable, sign-in and sync are unavailable, so use guest mode; issue reports go to the local `scripts/server.py` instead. To run or deploy the worker you need Node.js 22+ and wrangler:

```sh
# macOS
brew install node

# Debian / Ubuntu (the distribution nodejs package is older than 22)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

```sh
npm install -g wrangler
cd cloudflare-worker && npm install && wrangler dev
```

`wrangler dev` also needs the worker's secrets and a local database; `cloudflare-worker/README.md` covers both, and the one-time Cloudflare setup.

### Tests

With the local server running on port 8765:

```sh
npm install --no-save jsdom
REPO=$PWD node tests/smoke.js
REPO=$PWD node tests/admin.js
```

Each exits 0 when clean.

### How data loads

`data/meta.json` is fetched first with a `?t=<timestamp>` query, so it is never served from cache. Its `updated` and `last_added` fields become the `?v=` token on the main files, the manifests, `reference_ranges.json` and `reports.json`. A content push therefore invalidates those on its own, with no code release.

The four main discipline files then load concurrently with `reference_ranges.json`, both manifests, and `reports.json`, followed by every path listed in `batches_manifest.json` and `inbox_manifest.json`. That is currently 36 batch files, so a cold load is about 45 requests. Each batch is requested with `?h=` set to its content hash from the manifest's `hashes` map (written by `scripts/manifest_hashes.py`), so a release re-downloads only the batches that changed; a batch with no hash falls back to the `?v=` token. A failed file is counted and non-fatal rather than blocking the bank.

Everything is then deduplicated by question `id`, with the main-file entry winning over any batch that republishes the same id.

## License

MIT. Question content is original, written against the cited public sources. Reference range values are paraphrased from Royal College of Pathologists of Australasia and Royal Children's Hospital published ranges (cite your local lab for clinical decisions).

## Caveat

Exam practice, not clinical advice. Before acting on anything here, check the current local guideline.
