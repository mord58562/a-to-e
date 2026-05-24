# Security migration - 2026-05-25

Goal: every piece of PII the worker stores (emails, passwords, session
tokens) is encrypted or hashed with a high-cost modern primitive, and
the necessary keys come from `wrangler secret put` rather than source
control.

This migration is **backward-compatible**: existing accounts keep
working with their legacy PBKDF2 hashes + plaintext emails until each
account next logs in, at which point the worker silently re-hashes and
re-encrypts the row.

## What changed

| Asset           | Before                              | After                                                    |
|-----------------|-------------------------------------|----------------------------------------------------------|
| Password hash   | PBKDF2-SHA256, 100k iter            | Argon2id, m=19456 KB, t=2, p=1 (RFC 9106 SECOND profile) |
| Email at rest   | plaintext in `users.email`          | AES-256-GCM in `users.email_enc`, HMAC-SHA256 in `users.email_lookup` |
| Session token   | plaintext in `sessions.token`       | SHA-256(token \|\| SESSION_PEPPER) in `sessions.token_hash` |
| Login brute-force | none                              | 8 failed attempts in 15 min -> 15 min lockout (per email) |
| Response headers  | CORS only                         | + HSTS, X-Content-Type-Options, Referrer-Policy, Cache-Control: no-store |

## Deploy steps (run in this order)

```sh
cd cloudflare-worker

# 1. Install the new runtime dep (@noble/hashes is bundled by wrangler).
npm install

# 2. Generate the three new encryption secrets.
node -e 'for (const k of ["EMAIL_HMAC_KEY","EMAIL_ENC_KEY","SESSION_PEPPER"]) console.log(k+"=", require("crypto").randomBytes(32).toString("base64"))'
# Copy the three values somewhere safe (1Password, etc.). Losing
# EMAIL_HMAC_KEY locks every account out of password reset by email.
# Losing EMAIL_ENC_KEY makes every encrypted email permanently
# unreadable. They are NOT recoverable.

# 3. Push the three secrets to the worker (one prompt each).
wrangler secret put EMAIL_HMAC_KEY
wrangler secret put EMAIL_ENC_KEY
wrangler secret put SESSION_PEPPER

# 4. Apply the additive schema migration.
wrangler d1 execute a-to-e --file=schema_002_encrypt.sql --remote

# 5. Deploy the new worker code.
wrangler deploy
```

That's it. No downtime, no user-visible change.

## What happens on each next login

For every existing account, the FIRST `/api/login` after deploy:

1. Verifies the password using the legacy PBKDF2 hash.
2. If valid, re-hashes the password with Argon2id and writes the new
   hash + new salt + `pw_algo = 'argon2id-v19-m19456-t2-p1'`.
3. Encrypts the email with AES-256-GCM and writes `email_enc`,
   populates `email_lookup` with the HMAC, and replaces the legacy
   plaintext `email` column with a `"enc:<truncated lookup>"`
   placeholder (kept only so the historical UNIQUE constraint stays
   satisfied).

Subsequent logins skip the migration block.

## Verifying migration progress

```sh
# How many accounts still on the legacy hash?
wrangler d1 execute a-to-e --remote --command \
  "SELECT pw_algo, COUNT(*) FROM users GROUP BY pw_algo;"

# How many emails still plaintext?
wrangler d1 execute a-to-e --remote --command \
  "SELECT COUNT(*) AS legacy_plaintext FROM users WHERE email_enc IS NULL;"
```

Once both queries report 0 stragglers, you can drop the legacy `email`
column entirely (write `schema_003_drop_legacy_email.sql` when you're
ready - SQLite needs the table-rebuild pattern).

## Rollback

The schema migration is additive; the new columns coexist with the old
ones. To roll back the WORKER code only, redeploy the prior commit.
Accounts that already migrated will keep working (login_attempts uses
email_lookup which exists; the prior worker just doesn't read it).

## What this migration does NOT do

- **HttpOnly cookies**: the SPA uses Bearer tokens in localStorage. A
  proper cookie-based auth flow would require same-origin (currently
  the SPA is on github.io and the API is on workers.dev) or a custom
  domain. Documented as a known trade-off; revisit if/when we move to
  a single origin.
- **Email enumeration via timing**: best-effort only. Even though we
  run a full Argon2id pass on the miss path, an attacker with statistical
  patience could still tell. Mitigated by the rate-limiter.
- **Stop a determined Cloudflare insider with DB + secrets access**.
  Encryption-at-rest in a custodial system protects against most leak
  vectors (DB dump, backup snapshot, third-party D1 outage) but not
  against a fully compromised worker.
