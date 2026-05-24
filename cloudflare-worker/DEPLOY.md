# A to E Worker - deploy notes

The worker carries two surface areas now:

1. **GitHub-write endpoints** (`/paste`, `/report`, `/apply-audit`, `/apply-live-audit`, `/apply-report`) - committed in 2026-Q1 to back the paste-box and audit dashboard.
2. **Account + social-stats API** (`/api/register`, `/api/login`, `/api/me`, `/api/answer`, `/api/stats/:qid`) - committed 2026-05-20 to let other people sign up and see option-choice aggregates.

The new account API needs **Cloudflare D1** (the worker's edge SQLite). Setup once, then deploys are normal.

## One-time setup

```sh
cd cloudflare-worker

# 1. Install wrangler if you haven't.
npm i -g wrangler

# 2. Log in.
wrangler login

# 3. Create the D1 database.
wrangler d1 create a-to-e
# It prints a database_id. Paste it into wrangler.toml under [[d1_databases]] -> database_id.

# 4. Apply the schema.
wrangler d1 execute a-to-e --file=schema.sql --remote

# 5. Set the GitHub PAT secret (only if not already done in a prior deploy).
wrangler secret put GITHUB_TOKEN
# Paste a fine-grained PAT scoped to mord58562/a-to-e with Contents: read+write.

# 6. Deploy.
wrangler deploy
# Note the printed URL, e.g. https://a-to-e-inbox.<subdomain>.workers.dev
```

## Wire the frontend

Open `assets/app.js` near the top and replace:

```js
const WORKER_URL = "";
```

with the URL printed by `wrangler deploy`. Commit and push. GitHub Pages picks up the change within ~30 s.

The site degrades gracefully if `WORKER_URL` is empty (gate falls back to legacy local-profile only and no stats appear).

## Make yourself admin

After signing up via the site, mark your account as admin so the add / audit UI appears:

```sh
wrangler d1 execute a-to-e --remote --command \
  "UPDATE users SET is_admin = 1 WHERE email = 'your-email@example.com';"
```

You'll see the **Audit** button in the masthead and the "how to add" banner appear on the next page refresh.

## What other accounts can / cannot do

- **Anyone signed in**: study questions, see "% of users chose each option" after answering, flag for review, see their own progress.
- **Admins only**: paste new questions, open the audit dashboard, promote inbox content, modify live files.
- **The /paste, /apply-audit, /apply-live-audit, /apply-report endpoints are NOT yet authenticated at the worker level.** Frontend hides them from non-admins, but a determined caller could hit them directly. If you ship publicly, add `await authUser()` checks to those handlers and reject non-admins. (TODO; the current public-release surface is the read-side study experience.)

## Schema migration policy

`schema.sql` uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, so re-running the file is idempotent. For destructive changes, use a new file (`schema_002.sql` etc.) and apply manually.

## Active migrations

- 2026-05-25: PII encryption hardening - see `MIGRATION_2026-05-25.md`.
  Adds Argon2id passwords, AES-256-GCM email encryption, hashed session
  tokens, login rate-limiting. Three new wrangler secrets required
  (`EMAIL_HMAC_KEY`, `EMAIL_ENC_KEY`, `SESSION_PEPPER`) plus
  `schema_002_encrypt.sql` applied to D1.
