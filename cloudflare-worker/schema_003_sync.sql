-- A to E MCQ Bank - D1 schema migration 003 (2026-05-25)
-- Cross-device sync: full per-user state (answers + flags + settings).
-- Apply with: wrangler d1 execute a-to-e --file=schema_003_sync.sql --remote
--
-- This migration is additive and idempotent. Existing rows keep their
-- columns; new columns default sensibly so legacy code paths still work.

-- ─── answers: per-row updated_at for newest-wins conflict resolution ──────
-- Existing rows get updated_at = ts so the migration is lossless. Going
-- forward, every UPSERT bumps updated_at so cross-device merges always
-- have a deterministic ordering.
ALTER TABLE answers ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE answers ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 1;

-- Backfill updated_at for pre-migration rows.
UPDATE answers SET updated_at = ts WHERE updated_at = 0;

-- ─── flags: per-user starred questions ────────────────────────────────────
-- One row per (user, question) when the flag is on. Toggling off deletes
-- the row. Reads are SELECT question_id WHERE user_id = ?.
CREATE TABLE IF NOT EXISTS flags (
  user_id     TEXT NOT NULL,
  question_id TEXT NOT NULL,
  updated_at  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_flags_user ON flags(user_id);

-- ─── settings: per-user session preferences ───────────────────────────────
-- One row per user holding the serialized settings blob (JSON). Settings
-- are small and read together; one BLOB column is simpler than a per-key
-- table and easier to evolve as the settings shape changes.
CREATE TABLE IF NOT EXISTS user_settings (
  user_id    TEXT PRIMARY KEY,
  settings   TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
