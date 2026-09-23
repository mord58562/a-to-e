-- schema_005: let an admin read back an invite code they already issued.
--
-- Codes were stored only as SHA-256(code || SESSION_PEPPER). That is the
-- right thing for redemption and the wrong thing for the admin panel: the
-- code was shown once at creation, the panel refresh wiped that reveal a
-- moment later, and from then on the only record was a four-character
-- hint. There was no way to send the code to the person it was made for.
--
-- The hash stays, and redemption still matches on it, so a database dump
-- alone still redeems nothing. Alongside it, an AES-256-GCM copy under
-- EMAIL_ENC_KEY - the same key and scheme already used for addresses -
-- which the admin list decrypts for live codes only. Redeeming or
-- revoking a code clears the column.
--
-- Apply with:
--   wrangler d1 execute a-to-e --remote --file=./schema_005_invite_reveal.sql

ALTER TABLE invite_codes ADD COLUMN code_enc TEXT;
