-- WCAA NJ/SEPA chapter — meeting links and the public forms' rate limit.
--
-- Apply with POST /api/migrate (admin), which runs every migrations/*.sql file in order.
-- Everything here is CREATE ... IF NOT EXISTS, so re-running any file is a no-op.

-- An event's meeting link (Zoom / Meet / Teams). Lives HERE, not in content/pages.json:
-- the repo is public and so is /content/pages.json, and a private link is meant only for
-- the people who registered. functions/api/save.js strips it from the content before the
-- commit and writes it here; /api/rsvp hands it back on a successful registration.
-- A link the officer chose to "show to everyone" is ALSO kept in the content, for the card.
CREATE TABLE IF NOT EXISTS event_links (
  event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  url      TEXT NOT NULL
);

-- One row per public form submission: a SALTED HASH of the sender's IP (never the address
-- itself) and a unix time. functions/api/_guard.js counts recent rows per key and deletes
-- rows older than an hour on every request, so nothing here outlives its purpose.
CREATE TABLE IF NOT EXISTS rate_hits (
  k  TEXT    NOT NULL,
  at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_hits_k_at ON rate_hits (k, at);
CREATE INDEX IF NOT EXISTS rate_hits_at ON rate_hits (at);
