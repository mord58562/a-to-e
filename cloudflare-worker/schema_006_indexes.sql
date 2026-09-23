-- schema_006: an index for the history read, and three that duplicated one.
--
-- Apply with:
--   wrangler d1 execute a-to-e --remote --file=./schema_006_indexes.sql
--
-- readHistory (GET /api/state, GET /api/history) runs
--   SELECT ... FROM answers WHERE user_id = ? ORDER BY ts DESC LIMIT ?
-- With only a user_id index, SQLite read every row for the user and sorted
-- them in a temporary B-tree on each call. (user_id, ts) serves the filter
-- and the order, so the LIMIT stops the scan early.
CREATE INDEX IF NOT EXISTS idx_answers_user_ts ON answers(user_id, ts);

-- Each index below has its column as the leftmost prefix of a constraint
-- index that already exists, so it answered no query the other could not,
-- and every insert paid for an extra index row.
--
-- idx_answers_user(user_id): UNIQUE (user_id, question_id) in schema.sql,
-- and idx_answers_user_ts above.
DROP INDEX IF EXISTS idx_answers_user;
-- idx_flags_user(user_id): PRIMARY KEY (user_id, question_id) in
-- schema_003_sync.sql.
DROP INDEX IF EXISTS idx_flags_user;
-- idx_users_email(email): email TEXT UNIQUE in schema.sql.
DROP INDEX IF EXISTS idx_users_email;
