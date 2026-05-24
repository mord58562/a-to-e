-- A to E MCQ Bank - D1 schema migration 002 (2026-05-25)
-- Adds encryption-at-rest columns + login rate-limit table.
-- Apply with: wrangler d1 execute a-to-e --file=schema_002_encrypt.sql --remote
--
-- This migration is additive and idempotent. Existing rows keep their old
-- columns until next login; handleLogin re-hashes the password with Argon2id
-- and populates email_lookup / email_enc lazily. Once every account has
-- logged in once, the legacy `email` plaintext column can be dropped (see
-- schema_003_drop_legacy_email.sql).

-- ─── users: lazy migration columns ─────────────────────────────────────────
-- email_lookup      HMAC-SHA256(email_lower, EMAIL_HMAC_KEY) as hex.
--                   This is the searchable index - lookups by email still
--                   work without ever decrypting anything.
-- email_enc         AES-256-GCM(email_lower, EMAIL_ENC_KEY) packed as
--                   base64( iv(12 bytes) || ciphertext || tag(16 bytes) ).
--                   This is what's actually shown to the user / admin UI;
--                   the worker decrypts on read.
-- pw_algo           "pbkdf2-sha256-100k" (legacy) or "argon2id-v19-m19456-t2-p1".
--                   handleLogin migrates legacy rows to argon2id on
--                   successful auth.
ALTER TABLE users ADD COLUMN email_lookup TEXT;
ALTER TABLE users ADD COLUMN email_enc    TEXT;
ALTER TABLE users ADD COLUMN pw_algo      TEXT NOT NULL DEFAULT 'pbkdf2-sha256-100k';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lookup ON users(email_lookup);

-- ─── sessions: store SHA-256 of token, not token plaintext ─────────────────
-- A DB dump no longer hands an attacker live session cookies; the worker
-- hashes incoming Bearer tokens before lookup.
ALTER TABLE sessions ADD COLUMN token_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

-- ─── login_attempts: per-email exponential backoff ────────────────────────
-- We key on email_lookup (not raw email) so the table itself reveals
-- nothing about who's being attacked. Rolling window: any attempt older
-- than ATTEMPT_WINDOW_SEC is purged opportunistically on next failure.
CREATE TABLE IF NOT EXISTS login_attempts (
  email_lookup TEXT NOT NULL,
  ts           INTEGER NOT NULL,
  ok           INTEGER NOT NULL DEFAULT 0,
  ip_hash      TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_ts
  ON login_attempts(email_lookup, ts);
