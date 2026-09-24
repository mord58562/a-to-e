# A to E worker

The Cloudflare Worker behind the live site. It holds accounts and synced progress in a D1 database, takes issue reports, and gives admins a way to write to the repo through the GitHub Contents API, so GitHub Pages republishes the bank without a local checkout. The study pages themselves are static and do not need it: with `WORKER_URL` empty in `assets/app.js` the bank still runs, nothing syncs, and progress stays in the browser.

## Endpoints

Open to anyone:

- `POST /api/register` - needs an unused, unexpired invite code. 5 attempts per hour per address.
- `POST /api/login` - 8 failures per 15 minutes per account locks it for 15 minutes; 30 attempts per 15 minutes per address.
- `POST /report` - appends an issue report to `data/reports.json`. 10 per hour per address and 100 a day in total, at most 4,000 characters, and refused once 200 reports are open or the file would pass 800 KB.

Signed-in account (Bearer session token):

- `GET /api/me`, `POST /api/logout`
- `GET /api/state` (answers, flags and settings in one read), `GET /api/history`
- `POST /api/answer`, `POST /api/flag`, `POST /api/settings`
- `POST /api/password`, `POST /api/account/sessions/revoke`, `POST /api/account/delete`

Admin session only:

- `GET /api/admin/users`, `POST /api/admin/users/<id>/promote`, `.../demote`, `.../delete`. Promote and delete take the admin's current password (`{ "password": ... }`). The last admin cannot be demoted or deleted.
- `GET /api/admin/invites`, `POST /api/admin/invites` (codes expire after 30 days unless another expiry of 1 to 365 days is given), `POST /api/admin/invites/revoke`
- `GET /api/admin/quality` - lowest correct rates and most-answered questions across all users.
- `POST /paste` - writes `data/inbox/pasted-<stamp>-<id>.json` and adds it to `data/inbox_manifest.json`.
- `POST /apply-audit` - promotes an inbox batch's kept questions into the main discipline files, clears the batch, and appends to `data/audit_log.md`.
- `POST /apply-live-audit` - rewrites a file under `data/batches/`, or one of the four main files, with its kept questions.
- `POST /apply-report` - resolves reports in `data/reports.json` and, for a fix or drop, edits the question in the file that holds it.

Every response carries HSTS, `nosniff`, `no-referrer` and `Cache-Control: no-store`. CORS allows only `ALLOW_ORIGIN` from `wrangler.toml`. POST bodies over 1 MB are refused. A cron trigger (15:17 UTC daily) deletes expired sessions, rate-limit rows older than a day, and unused, unrevoked invite codes more than 30 days past expiry.

## One-time setup

Needs Node.js 22 or later. Wrangler is pinned in `package.json`; run it with `npx wrangler` so every machine uses the same version (a global wrangler of another version can corrupt the local D1 state).

```sh
# macOS
brew install node

# Debian / Ubuntu (the distribution nodejs package is older than 22)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

```sh
cd cloudflare-worker
npm install            # @noble/hashes for Argon2id, and wrangler
npx wrangler login

# Create the database, then put the printed database_id in wrangler.toml.
npx wrangler d1 create a-to-e

# Apply the schema files once each, in order (schema.sql, then schema_002 up).
for f in schema.sql schema_0*.sql; do
  npx wrangler d1 execute a-to-e --remote --file="$f"
done

# Three keys, 32 random bytes each, base64. Keep a copy somewhere safe.
node -e 'for (const k of ["EMAIL_HMAC_KEY","EMAIL_ENC_KEY","SESSION_PEPPER"]) console.log(k, require("crypto").randomBytes(32).toString("base64"))'
npx wrangler secret put EMAIL_HMAC_KEY
npx wrangler secret put EMAIL_ENC_KEY
npx wrangler secret put SESSION_PEPPER

# Fine-grained GitHub token: repository mord58562/a-to-e only, Contents read and write.
npx wrangler secret put GITHUB_TOKEN

npx wrangler deploy
```

`wrangler deploy` prints the worker's URL. Put it in three places, or the page's Content-Security-Policy blocks every call to it:

- `WORKER_URL` near the top of `assets/app.js`
- the `connect-src` list in the CSP `<meta>` in `index.html`
- the `dns-prefetch` link in `index.html`

Set `ALLOW_ORIGIN` in `wrangler.toml` to the site's origin.

The account routes refuse to run without all three keys. Losing `EMAIL_ENC_KEY` makes every stored email and readable invite code permanently unreadable. Losing `EMAIL_HMAC_KEY` breaks the email lookup, so no one can sign in. Losing `SESSION_PEPPER` signs everyone out and voids every unused invite code. None of them can be rotated without a script that rewrites every affected row.

## The first admin

Registration needs an invite, and only an admin can make one, so the first account goes in by hand:

```sh
python3 scripts/seed_dummy_user.py you@example.com 'a-long-password' YourName admin | sh
```

Run it from `cloudflare-worker/`; add `--local` to seed the `wrangler dev` database instead. The script prints an `npx wrangler d1 execute` command that inserts a PBKDF2 account with a plaintext email. The first sign-in rehashes the password with Argon2id and encrypts the email. After that, invites and further admins are managed from the Admin panel on the site.

## Local development

`npm run dev` (`wrangler dev`) runs the worker on `http://127.0.0.1:8787` against a local D1 copy. Apply the schema files with `--local` in place of `--remote`, and seed an admin with `seed_dummy_user.py --local`.

`cloudflare-worker/.dev.vars` (gitignored) holds the local settings as `NAME=value` lines:

```sh
EMAIL_HMAC_KEY=...
EMAIL_ENC_KEY=...
SESSION_PEPPER=...
ALLOW_ORIGIN=http://127.0.0.1:8765
# Only for the repo-writing endpoints. They write to the real repo unless
# these name a fork.
GITHUB_TOKEN=...
GITHUB_OWNER=your-account
GITHUB_REPO=your-fork
```

To use the local worker from a local checkout of the site, point `WORKER_URL` in `assets/app.js` and the CSP `connect-src` in `index.html` at `http://127.0.0.1:8787`. Leave both uncommitted.

## Migrations

`schema.sql` (2026-05-20) is the starting point. Each later file is applied once; the `ALTER TABLE` statements fail if run twice.

- `schema_002_encrypt.sql` (2026-05-25): email encrypted with AES-256-GCM plus an HMAC-SHA256 lookup column, session tokens stored as a peppered SHA-256 hash, Argon2id passwords (m=19456 KiB, t=2, p=1), and the `login_attempts` table used for every rate limit. Older accounts keep their PBKDF2 hash and plaintext email until their next sign-in, which converts them. To see who is left:
  ```sh
  npx wrangler d1 execute a-to-e --remote --command "SELECT pw_algo, COUNT(*) FROM users GROUP BY pw_algo;"
  ```
- `schema_003_sync.sql` (2026-05-25): `answers.updated_at` and `attempt_count`, the `flags` and `user_settings` tables. Cross-device sync.
- `schema_004_invites.sql` (2026-09-22): the `invite_codes` table, `users.invited_via` and `last_seen_at`. Registration closes to anyone without a code; stale sessions are cleared.
- `schema_005_invite_reveal.sql` (2026-09-23): `invite_codes.code_enc`, an encrypted copy of each live code so the admin panel can show it again. Cleared when the code is used or revoked. Codes issued before this have no copy and can only be reissued.
- `schema_006_indexes.sql` (2026-09-23): an `(user_id, ts)` index on `answers` for the history read, and three redundant indexes dropped.
- `schema_007_attempt_id.sql` (2026-09-24): `answers.last_attempt_id`, so a replayed answer is recognised by its attempt id rather than its clock, and the `deleted_sessions` table, so a deleted account's other devices get `account_deleted`. The worker runs without it. A second run stops at the `ALTER` with "duplicate column name" and changes nothing.

## Not covered

- Session tokens are Bearer tokens kept in `localStorage`, not HttpOnly cookies. Cookies would need the site and the worker on one origin; they are on github.io and workers.dev.
- Sign-in runs a full Argon2id pass for an unknown address, but a patient attacker could still time the difference. The rate limits are the real defence.
- Anyone holding both the database and the worker secrets can read every email.
