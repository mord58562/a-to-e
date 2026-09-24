# A to E

A free, open practice MCQ bank for Australian medical students in their clinical years. Single-best-answer clinical reasoning across paediatrics, obstetrics & gynaecology, psychiatry, and adult medicine, with Australian units and Australian guideline sources throughout.

7,052 questions, the four disciplines held at parity: Paediatrics 1,765, Obstetrics & Gynaecology 1,766, Psychiatry 1,759, Medicine 1,762.

**Live at <https://mord58562.github.io/a-to-e/>.** No account is needed: continue as a guest and your progress stays in that browser.

## What's new in 1.7.5

- After you reveal an answer, Next sits in the bar at the bottom of the screen, so it is always one tap away on a phone.
- Results and the home screen open at the top.
- Getting a missed question right on a retry keeps it on your "Previously incorrect" list on every device, not just this one.
- Two tabs open at once no longer double-count a test or delete each other's saved session, and a guest's answers from both tabs are kept.
- A study session resumed the next day counts only the time you spent, and a session that expires tells you so.
- Switching a discipline back on brings its learning areas with it, and finding an area also searches what each question covers.
- Single-key shortcuts can be turned off from the Keyboard list.
- Selections stay visible in Windows High Contrast mode, and the setup rows name their groups for screen readers.
- Reports are published without your name or account. Making someone an admin or deleting an account asks for your password.

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
| 5/5 | A calculation, a finding that argues against the obvious answer, or guidelines that disagree | 318 | 4.5% |

## Using it

The home screen sets up a session. Study mode shows the explanation after each answer and runs until you end it. Test mode holds every answer until you finish and can run against a timer. Pick any of the four disciplines, then narrow by learning area, difficulty, or a filter: unseen, previously incorrect or flagged. A session is saved as you go, so a closed tab or an evicted phone page can be resumed from the home screen for up to a day.

Options are shuffled per question with a seed taken from its id, so the order survives a reload and is the same for every user. Each option keeps its original letter, and that is the letter stored with your answer. You can rule out an option you have discounted, and flag a question to come back to; flags also work as a session filter. Pausing a timed session stops the countdown, the session clock and the question clock together.

A study answer counts once it is revealed; a pick you change or leave unrevealed is not recorded. A test's answers reach your history once, when the test is finished or left.

After the reveal, the phrases in the stem that decided the answer are highlighted and about 60 abbreviations (DKA, PPH, HELLP, CTPA and so on) show a definition on hover or tap. Each option has its own rationale, followed by the sources. When a question depends on a reference panel, a line under the explanation names it and opens the panel there.

The navigator sits beside the question on a wide screen and opens from the question counter on a phone. In a test it shows every question, numbered, marked only as answered until the end, with paging and a box to jump to a number. In study mode it shows the questions you have reached, marked right or wrong.

Results give the score and a line per discipline, then a list you can filter to incorrect or flagged. A row opens its question with the answer showing; Previous and Next step through the list, and Back to results returns to it. Retry incorrect starts an untimed session from the ones you got wrong. Stats, in the top bar, shows your accuracy by discipline and by difficulty. Report, under each question, sends a note to the maintainer; reports are public (see Privacy).

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

An issue report is published with its resolution in `data/reports.json`, in this public repository. It holds the question id, your text and whether you were signed in, never which account, so leave your name and email out of it.

The reference-ranges panel, the questions themselves, and the per-batch JSON are static assets served from GitHub Pages. The fonts come from Google Fonts, which sees your IP address and browser; nothing else loads from a third party. There are no cookies, no analytics and no trackers.

Only an admin can add questions or change files in the repo, and the worker checks for an admin session on each of those requests, not just the page.

## Project structure

- `index.html`, `assets/` - the app: one page, one script, one stylesheet. `assets/preauth.js` runs before first paint, so a returning user sees neither the sign-in gate nor the wrong theme for a frame.
- `data/questions_*.json` - the four main discipline files. `questions_paeds.json` and `questions_obgyn.json` hold 23 and 21 questions; the Psychiatry and Medicine files are empty.
- `data/batches/*.json` listed in `data/batches_manifest.json` - the rest of the bank, and the files to edit. An unlisted file is not served.
- `data/split/` - generated from each listed batch by `scripts/manifest_hashes.py`: `<name>.q.json` holds what is needed before answering, `<name>.c.json` the explanations, rationales and sources. Never edit these.
- `data/inbox/` - staging for new questions; see its README.
- `data/reference_ranges.json` - the reference values panel. `data/reports.json` holds issue reports.
- `data/framework_*_topics.md` - the curriculum topic list each discipline is written against.
- `data/_audited_main/`, `data/_archived_dupes/`, `data/batches/_*/` - history: promoted post-audit copies of the main files, batches withdrawn from the manifest, and the originals of the consolidated batches. Not served.
- `assets/prompt-template.txt` - the generation prompt. The admin Content tab fetches it.
- `scripts/` - `start.sh` and `server.py` serve the site locally. `check_tokens.py` is the banned-token gate and the list of record for what the prompt bans; `dupe_gate.py` compares a new batch with the published bank and with itself; `manifest_hashes.py` writes the manifest hashes and rebuilds `data/split/` (`split_bank.py` does the splitting); `rebuild_bank.sh` runs both and the gates; `merge_inbox.sh` promotes inbox files; `dupe_triage.py` and `content_pass.py` retire and rewrite questions across the bank; `sync_routine_counts.py` refreshes `meta.json` counts.
- `.github/workflows/rebuild-bank.yml` - on every push to main that touches the bank, rebuilds the hashes and `data/split/` and commits the result.
- `cloudflare-worker/` - accounts, sync, reports and the admin write endpoints. See its README.
- `tests/` - jsdom tests of the real page against a fake worker (`harness.js`): `smoke.js` drives 25 questions as a guest, `admin.js` the admin panel, and the rest one behaviour each. `run.sh` runs the data gates and all of them.

Internal working notes, audit records and the scheduled routine's brief are kept out of this repo: GitHub Pages serves the root, so anything committed here can be fetched by anyone.

## Adding or editing questions

New questions: follow `data/inbox/README.md` (generate, `check_tokens.py`, `dupe_gate.py --new` from the repo root, `merge_inbox.sh`).

Editing a question: change it in its file under `data/batches/`, then run `./scripts/rebuild_bank.sh` and commit the batch, `data/batches_manifest.json` and `data/split/` together. The site serves a batch's split pair only while the manifest says the pair was built from the batch as it stands, so a batch committed without its rebuilt split keeps serving the old question. The rebuild workflow repairs that on main after any push, but a local commit that includes the split is right from the start.

A question whose stem, options or answer change materially gets a new id (`-v2`, or `-v3` if that exists), so earlier answers to it don't count against the new version.

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

The worker is optional locally. With it unreachable, sign-in and sync are unavailable, so use guest mode; issue reports go to the local `scripts/server.py` instead. The live worker accepts only the github.io origin, so the admin panel needs a local worker. To run or deploy one you need Node.js 22+:

```sh
# macOS
brew install node

# Debian / Ubuntu (the distribution nodejs package is older than 22)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

```sh
cd cloudflare-worker && npm install && npm run dev
```

`npm run dev` uses the wrangler version pinned in `package.json`. The worker also needs its secrets, `ALLOW_ORIGIN=http://127.0.0.1:8765` and a local database, and the page needs `WORKER_URL` and its CSP pointed at it; `cloudflare-worker/README.md` (Local development) covers each, and the one-time Cloudflare setup.

### Tests

Requires Node.js and `curl`. With the local server running on port 8765:

```sh
npm install --no-save jsdom
tests/run.sh
```

It runs the data gates (`manifest_hashes.py --check`, `split_bank.py --verify`, `check_tokens.py`), then every test, and exits non-zero if any fails. `ORIGIN=http://127.0.0.1:<port>/ tests/run.sh` tests a server on another port. One test runs on its own with `node tests/<name>.js`.

### How data loads

`data/meta.json` is fetched first with a `?t=<timestamp>` query, so it is never served from cache, and `batches_manifest.json` alongside it with `cache: "no-cache"`, so it is revalidated on every load. Meta's `updated` and `last_added` fields become the `?v=` token on the main files, `inbox_manifest.json`, `reference_ranges.json` and `reports.json`. A content push therefore invalidates those on its own, with no code release.

The four main discipline files load concurrently with `reference_ranges.json`, the inbox manifest and `reports.json`. Each listed batch loads as its question file, `data/split/<name>.q.json`, and its commentary file, `<name>.c.json`, follows in the background, so a question can be shown before its explanation arrives. Both are requested with `?h=` set to their content hash from the manifest's `split` map, so a release re-downloads only what changed. The pair is used only while its recorded `from` hash equals the batch's hash in `hashes`; otherwise, or if either file is missing, the whole batch loads with `?h=` set to its own hash (or the `?v=` token when it has none). With 36 batches a cold load is about 81 requests. A failed file is counted and non-fatal rather than blocking the bank.

Everything is then deduplicated by question `id`, with the main-file entry winning over any batch that republishes the same id.

## License

MIT. Question content is original, written against the cited public sources. Reference range values are paraphrased from Royal College of Pathologists of Australasia and Royal Children's Hospital published ranges (cite your local lab for clinical decisions).

## Caveat

Exam practice, not clinical advice. Before acting on anything here, check the current local guideline.
