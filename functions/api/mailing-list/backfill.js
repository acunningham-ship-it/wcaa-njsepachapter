/* POST /api/mailing-list/backfill — ADMIN. Puts everyone who has signed up for an event onto the
   chapter email list (migration 0006).

   WHY THIS EXISTS. The list fills itself only from the moment 0006 is live, because
   functions/api/rsvp.js adds each person in passing. Every RSVP taken before that is in `rsvps`
   and nowhere else, so an officer who has run events for months would open this tab, see a short
   list (or an empty one), and conclude the feature had lost her people. This is the catch-up.

   ⛔ SAFE TO PRESS AGAIN. The UNIQUE index on email_key and ON CONFLICT make this an upsert, not
   an append, so a second press adds nobody and rewrites nobody's name. An existing hand-typed
   name is never replaced (the same rule as _mailing.js); a blank one IS filled, because blank is
   the normal state of an address-only import and filling it is strictly more useful.

   ⛔ ONE ROW PER ADDRESS, AND THE BEST NAME. Someone who registered for three events has three
   rows in `rsvps`. The window function picks exactly one per email_key — the most recent row that
   has a name, falling back to the most recent row — instead of letting whichever row SQLite read
   last decide the name. `added` is the change in the list's size, exactly like the CSV import, so
   "0 added" on a re-run is the truth rather than a rows-processed count. */
import { json, requireSession } from '../_lib.js';

/* Same upsert semantics as UPSERT_SQL in _mailing.js, fed from a deduplicated view of rsvps. */
export const BACKFILL_SQL = `
  INSERT INTO mailing_list (name, email, email_key, source)
  SELECT name, email, email_key, 'rsvp'
    FROM (
      SELECT name, email, email_key,
             ROW_NUMBER() OVER (
               PARTITION BY email_key
               ORDER BY (COALESCE(TRIM(name), '') <> '') DESC, created_at DESC, id DESC
             ) AS rn
        FROM rsvps
       WHERE email_key IS NOT NULL AND TRIM(email_key) <> ''
    )
   WHERE rn = 1
  ON CONFLICT (email_key) DO UPDATE SET
    name = CASE WHEN mailing_list.name IS NULL OR mailing_list.name = ''
                THEN excluded.name ELSE mailing_list.name END,
    email = excluded.email,
    updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });

  const session = await requireSession(context);
  if (!session) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (!env.DB) return json({ ok: false, error: 'The database isn’t configured.' }, 500);

  let before, after, distinct;
  try {
    const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM mailing_list').first();
    before = c ? Number(c.n) : 0;
    await env.DB.prepare(BACKFILL_SQL).run();
    const d = await env.DB.prepare('SELECT COUNT(*) AS n FROM mailing_list').first();
    after = d ? Number(d.n) : before;
    const e = await env.DB.prepare(
      "SELECT COUNT(DISTINCT email_key) AS n FROM rsvps WHERE email_key IS NOT NULL AND TRIM(email_key) <> ''"
    ).first();
    distinct = e ? Number(e.n) : 0;
  } catch {
    /* The same one-time state /api/mailing-list reports: 0006 isn't applied yet. Saying WHICH
       thing is missing is what lets the panel offer the "Set up" button instead of a dead end. */
    return json({ ok: false, needsSchema: true,
      error: 'The email list isn’t set up in the database yet. Please ask your web person.' }, 409);
  }

  const added = Math.max(0, after - before);
  return json({
    ok: true,
    added,                          // list growth: people who were not on it before
    already: Math.max(0, distinct - added),   // event registrants who were already there
    count: after,                   // the list's new size
  });
}
