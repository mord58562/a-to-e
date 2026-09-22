-- schema_004: close open registration, and give sessions a real lifetime.
--
-- Registration has been open to the entire internet since 2026-05-20 with
-- no code, no verification and no rate limit. From here, /api/register
-- requires an unused invite code that an admin generated.
--
-- Apply with:
--   wrangler d1 execute a-to-e --remote --file=./schema_004_invites.sql

-- One row per invite code. `code_hash` is SHA-256(code || SESSION_PEPPER),
-- so a database dump does not hand over working codes. `label` is the
-- admin's own note about who the code is for.
CREATE TABLE IF NOT EXISTS invite_codes (
  code_hash   TEXT PRIMARY KEY,
  code_hint   TEXT NOT NULL,          -- first 4 chars, so the admin can tell rows apart
  label       TEXT NOT NULL DEFAULT '',
  created_by  TEXT,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER,                -- NULL means no expiry
  used_by     TEXT,                   -- users.id, once redeemed
  used_at     INTEGER,
  revoked_at  INTEGER,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (used_by)    REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invites_created ON invite_codes(created_at);

-- Which invite each account came in on, for the admin user list. Existing
-- accounts predate invites and stay NULL.
ALTER TABLE users ADD COLUMN invited_via TEXT;

-- Last successful authentication, so the admin panel can show "last seen"
-- without storing IP addresses or user agents.
ALTER TABLE users ADD COLUMN last_seen_at INTEGER;

-- login_attempts is reused as the generic rate-limit ledger. Its
-- `email_lookup` column already holds synthetic keys ("report:<iphash>");
-- registration and per-IP login budgets add "reg:<iphash>" and
-- "ip:<iphash>". Indexing ts makes the sweeper cheap.
CREATE INDEX IF NOT EXISTS idx_attempts_ts ON login_attempts(ts);

-- Sessions have never been swept and never really expired. The worker now
-- issues 30-day sliding sessions capped at 90 days absolute; this clears
-- whatever is already stale.
DELETE FROM sessions WHERE expires_at < unixepoch();
