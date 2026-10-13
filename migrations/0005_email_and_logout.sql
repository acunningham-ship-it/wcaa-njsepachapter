-- WCAA NJ/SEPA chapter: "Email all registrants" audit log + server-side logout, 2026-10-13.
--
-- Apply with POST /api/migrate (admin), like the others. CREATE ... IF NOT EXISTS, so re-running is a no-op.

-- A signed-out session. The session cookie is a stateless signed token, so "log out" used to mean only
-- "this browser forgets it". A row here makes the SERVER refuse that exact token for the rest of its
-- life (functions/api/_lib.js requireSession). Only the SHA-256 of the token is kept, never the token,
-- and expires_at lets old rows be swept (a token past its expiry is dead anyway).
CREATE TABLE IF NOT EXISTS revoked_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

-- One row per press of "Send" in functions/api/email.js: who, when, which subject, how many people.
-- The row is written BEFORE anything is sent (status 'pending') and settled afterwards ('sent' or
-- 'failed'), so a send can never happen without a record of it. No addresses and no message body
-- are stored here; the recipient list is the event's registration list.
CREATE TABLE IF NOT EXISTS email_sends (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    TEXT NOT NULL,
  sent_by     TEXT,
  subject     TEXT NOT NULL,
  recipients  INTEGER NOT NULL,
  status      TEXT NOT NULL,
  provider_id TEXT,
  error       TEXT,
  created_at  TEXT NOT NULL
);
