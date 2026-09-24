-- schema_007: replay detection by attempt id, and a record of the
-- sessions of deleted accounts.
--
-- Apply with:
--   wrangler d1 execute a-to-e --remote --file=./schema_007_attempt_id.sql
--
-- The worker runs without this migration: each query that needs it falls
-- back to the older behaviour when the table or column is missing.
--
-- Safe to run more than once. The CREATE is IF NOT EXISTS; SQLite has no
-- ADD COLUMN IF NOT EXISTS, so on a second run the ALTER, which comes
-- last, stops with "duplicate column name: last_attempt_id" and changes
-- nothing.

-- A token whose account was deleted: /api/* answers 401 account_deleted
-- instead of session_expired, so the student's other devices clear their
-- copy of the account and say why. Holds the session hash only, no user
-- id. The cron sweep removes rows after 30 days.
CREATE TABLE IF NOT EXISTS deleted_sessions (
  token_hash TEXT PRIMARY KEY,
  deleted_at INTEGER NOT NULL
);

-- The newest client attempt id applied to this row. An outbox entry
-- whose POST landed but whose response was lost is sent again with the
-- same ids and adds nothing; `ts` compares client clocks, which a
-- replay from a skewed or corrected clock does not match.
ALTER TABLE answers ADD COLUMN last_attempt_id TEXT;
