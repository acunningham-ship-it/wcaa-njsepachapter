-- WCAA NJ/SEPA chapter — event RSVPs and contact messages.
--
-- Apply with:  npx wrangler d1 execute wcaa --remote --file=migrations/0001_rsvps.sql
--
-- ⛔ WHY A DATABASE AND NOT THE REPO. Everything else on this site is content: it
-- lives in content/*.json, /api/save commits it, and it is world-readable the
-- moment it deploys. The rows below are NOT content. They are a stranger's name,
-- email and phone number, typed into a form on a chapter website. Committing
-- those to a public GitHub repo would publish them permanently and irreversibly,
-- including in the git history after any later "deletion". So the two public
-- endpoints (/api/rsvp, /api/contact) write to D1 and make ZERO GitHub calls —
-- tools/test-rsvp.mjs asserts that by recording every outbound fetch.

CREATE TABLE IF NOT EXISTS events (
  id         TEXT PRIMARY KEY,          -- matches the event id used by the RSVP form
  title      TEXT    NOT NULL,
  capacity   INTEGER,                   -- NULL = unlimited
  closed     INTEGER NOT NULL DEFAULT 0,-- 1 = registration closed, regardless of capacity
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- An RSVP for an event that is not in `events` is REJECTED. Fail-closed on
-- purpose: registration opens when an officer opens it, so a typo'd or guessed
-- event id collects nothing rather than quietly filling a table nobody reads.
CREATE TABLE IF NOT EXISTS rsvps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id   TEXT    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  -- email lowercased+trimmed. A separate stored column rather than a UNIQUE
  -- index on lower(email), so ON CONFLICT can name the constraint directly and
  -- a second RSVP from the same person updates their details instead of erroring.
  email_key  TEXT    NOT NULL,
  phone      TEXT,
  business   TEXT,
  guests     INTEGER NOT NULL DEFAULT 0 CHECK (guests >= 0 AND guests <= 10),
  notes      TEXT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS rsvps_event_email ON rsvps (event_id, email_key);
CREATE INDEX IF NOT EXISTS rsvps_event_created ON rsvps (event_id, created_at);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT,
  business   TEXT,
  email      TEXT NOT NULL,
  phone      TEXT,
  message    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  handled    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS contact_created ON contact_messages (created_at);
