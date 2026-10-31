-- WCAA NJ/SEPA chapter — the chapter's own email list, 2026-10-31.
--
-- Apply with POST /api/migrate (admin), like the others. CREATE ... IF NOT EXISTS, so re-running is a no-op.
--
-- ⛔ WHY THIS IS SEPARATE FROM `rsvps`. An RSVP is a fact about ONE event: attending Thursday's
-- Zoom, with a seat count and a phone number. The chapter's email list is a different thing that
-- outlives every event — the people you send an announcement to. Mixing them would mean deleting
-- an event (or its sign-up list) silently removed people from the chapter list, and would make
-- "everyone we can email" a deduplicated query over N event tables instead of one row per person.
--
-- So a row here is one address, named by `email_key` (lowercased, trimmed), and there is exactly
-- ONE per person no matter how many events they sign up for, how many times a spreadsheet is
-- uploaded, or whether the officer also typed them in by hand. UNIQUE on email_key is the
-- deduplication — not a check in the browser, which would lose every race and every upload.
--
-- Addresses on this list are still private data: they live in D1 and are never committed to the
-- public repo (see migrations/0001_rsvps.sql for why that is a hard rule on this site).

CREATE TABLE IF NOT EXISTS mailing_list (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT,                       -- optional, and blank is normal (an imported address-only list)
  email      TEXT NOT NULL,              -- as last entered/imported, for display
  email_key  TEXT NOT NULL,              -- lowercased+trimmed: the identity, and the dedupe key
  source     TEXT NOT NULL DEFAULT 'manual',  -- rsvp | manual | csv — where this person FIRST came from
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- The dedupe. ON CONFLICT (email_key) in functions/api/_mailing.js names this index directly.
CREATE UNIQUE INDEX IF NOT EXISTS mailing_list_email ON mailing_list (email_key);
-- The panel lists people by name, so this is the order it reads them in.
CREATE INDEX IF NOT EXISTS mailing_list_name ON mailing_list (name COLLATE NOCASE);

-- One row per press of "Send to everyone" (functions/api/mailing-list/send.js). Written BEFORE
-- anything goes out ('pending') and settled afterwards, exactly like email_sends (migration 0005):
-- a send can never happen without a record of it.
--
-- `delivered` exists because a chapter list goes out in batches (Resend takes 100 messages per
-- call), so "how many people actually got it" is not the same number as `recipients` when a later
-- batch fails. status is sent | partial | failed.
CREATE TABLE IF NOT EXISTS list_sends (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sent_by     TEXT,
  subject     TEXT NOT NULL,
  recipients  INTEGER NOT NULL,
  delivered   INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL,
  provider_id TEXT,
  error       TEXT,
  created_at  TEXT NOT NULL
);
