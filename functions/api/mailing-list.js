/* GET  /api/mailing-list            — ADMIN. Everyone on the chapter email list.
   GET  /api/mailing-list?format=csv — ADMIN. The same list as a spreadsheet.
   POST /api/mailing-list            — ADMIN. { name?, email } add one person.

   This is the chapter's OWN list (migration 0006), not an event's sign-ups: one row per address,
   surviving events, and separate from /api/email, which writes to everyone registered for one
   event. In practice this list fills itself — every event sign-up is added, in
   functions/api/rsvp.js — so most of what an officer does here is read it, add someone who asked
   by phone, or import a spreadsheet.

   Officers only. Every row is somebody's name and email address, so the session check is the
   first thing that happens and no code path reaches a database read without it
   (tools/test-mailing-list.mjs asserts the 401 as a negative control). */
import { json, requireSession } from './_lib.js';
import { csvRows, csvResponse } from './_csv.js';
import { text, email as emailField } from './_input.js';
import { addSubscriber, MAX_NAME } from './_mailing.js';

const MAX_ROWS = 2000;

export async function onRequest(context) {
  const { request, env } = context;

  const session = await requireSession(context);
  if (!session) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (!env.DB) return json({ ok: false, error: 'The database isn’t configured.' }, 500);

  if (request.method === 'GET') {
    const wantCsv = new URL(request.url).searchParams.get('format') === 'csv';
    let rows, total, pending = 0;
    try {
      const r = await env.DB.prepare(
        `SELECT id, name, email, source, created_at, updated_at
           FROM mailing_list
          ORDER BY lower(COALESCE(NULLIF(name, ''), email)) ASC, id ASC
          LIMIT ?`
      ).bind(MAX_ROWS).all();
      rows = r.results || [];
      const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM mailing_list').first();
      total = c ? Number(c.n) : rows.length;

      /* How many event registrants are not on this list yet. The list only started filling itself
         when 0006 went live, so everyone who registered before then is in `rsvps` alone; the panel
         uses this number to offer the one-time catch-up (mailing-list/backfill.js). A failure here
         must not stop the list loading, so an old database without `rsvps` just reads 0. */
      try {
        const p = await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM (
             SELECT DISTINCT r.email_key
               FROM rsvps r
              WHERE r.email_key IS NOT NULL AND TRIM(r.email_key) <> ''
                AND NOT EXISTS (SELECT 1 FROM mailing_list m WHERE m.email_key = r.email_key))`
        ).first();
        pending = p ? Number(p.n) : 0;
      } catch { /* no rsvps table: nothing to catch up */ }
    } catch {
      /* Not a 500: the officer needs to know WHICH thing is missing, and the answer is a
         one-time schema update they can apply from this panel (/api/migrate). `needsSchema`
         is what lets the panel show that as a "Set it up" button instead of a dead end. */
      return json({ ok: false, needsSchema: true,
        error: 'The email list isn’t set up in the database yet. Please ask your web person.' }, 409);
    }

    if (wantCsv) {
      /* Name and Email are the only columns on purpose: this file is what an officer opens in
         Excel, AND what she might import again elsewhere. Extra columns (source, date added)
         would come back as part of the name on a re-import — see peopleFromCsv in _mailing.js. */
      return csvResponse('wcaa-email-list', csvRows(['Name', 'Email'], rows.map((r) => [r.name, r.email])));
    }

    return json({
      ok: true,
      count: total,
      pending,
      truncated: total > rows.length,
      subscribers: rows.map((r) => ({
        id: r.id, name: r.name || '', email: r.email, source: r.source, added: r.created_at,
      })),
    });
  }

  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'GET, POST' });

  let body;
  try { body = await request.json(); } catch { body = null; }
  if (!body || typeof body !== 'object') return json({ ok: false, error: 'We couldn’t read that. Please try again.' }, 400);

  /* Same validators the public forms use, so "looks like an address" cannot mean one thing here
     and another thing on the Join page. */
  const email = emailField(body.email);
  if (!email.ok) return json({ ok: false, error: email.error }, 400);
  const name = text(body.name, { label: 'Name', max: MAX_NAME });
  if (!name.ok) return json({ ok: false, error: name.error }, 400);

  try {
    const already = await env.DB.prepare('SELECT id FROM mailing_list WHERE email_key = ?').bind(email.key).first();
    await addSubscriber(env, { name: name.value, email: email.value, key: email.key, source: 'manual' });
    return json({ ok: true, added: !already });
  } catch {
    return json({ ok: false, error: 'That couldn’t be saved. Please try again.' }, 500);
  }
}
