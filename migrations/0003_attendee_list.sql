-- WCAA NJ/SEPA chapter — who agreed to be listed on the events page (2026-10-08).
--
-- Apply with POST /api/migrate (admin), which runs every migrations/*.sql file in order.
-- Everything here is CREATE ... IF NOT EXISTS, so re-running any file is a no-op. (That is also
-- why this is its own table and not an ALTER TABLE rsvps ADD COLUMN: SQLite has no
-- "ADD COLUMN IF NOT EXISTS", so a second run of the migration would fail.)

-- A row here means that person TICKED "list my name" when they signed up. No row = not listed,
-- so the default is OFF by construction, and every sign-up made before this table existed stays
-- hidden. Only a first name + last initial built from rsvps.name is ever shown publicly
-- (functions/api/attendees.js); email, phone, business, guests and notes never leave the admin.
-- Removing the sign-up removes this row with it.
CREATE TABLE IF NOT EXISTS rsvp_listed (
  event_id  TEXT NOT NULL,
  email_key TEXT NOT NULL,
  PRIMARY KEY (event_id, email_key),
  FOREIGN KEY (event_id, email_key) REFERENCES rsvps (event_id, email_key) ON DELETE CASCADE
);
