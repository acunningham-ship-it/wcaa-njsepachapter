-- WCAA NJ/SEPA chapter: the editor's sign-in code (2FA), 2026-10-12.
--
-- Apply with POST /api/migrate (admin), like the others. CREATE ... IF NOT EXISTS, so re-running is a no-op.
--
-- One row (id = 1): the chapter has ONE shared editor login, so it has one authenticator secret, and each
-- officer scans the same QR code. No row, or no `secret`, means 2FA is OFF and sign-in is the password
-- alone. Setting it up ARMS it: `pending` holds a new secret until an officer types a code from it, and
-- only then does it move to `secret`. So nobody can be locked out by a half-finished setup.
--   secret     base32 TOTP secret (RFC 6238: SHA-1, 30 s, 6 digits), or NULL when 2FA is off
--   pending    a secret shown during setup and not yet confirmed with a code
--   last_step  the newest 30-second step a code was accepted for; an older or equal one is refused, so a
--              code that was seen once (over a shoulder, in a phishing page) can't be used again
--   recovery   JSON array of SHA-256 hashes of the unused one-time recovery codes
CREATE TABLE IF NOT EXISTS admin_2fa (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  secret     TEXT,
  pending    TEXT,
  last_step  INTEGER NOT NULL DEFAULT 0,
  recovery   TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT
);
