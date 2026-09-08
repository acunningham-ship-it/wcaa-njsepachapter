/* POST /api/events/delete  { id }  — ADMIN. Removes one event.

   POST (not DELETE-on-a-path) to match /api/rsvps/delete: it works from a plain
   form, and the id never lands in a URL, a referrer or an access log.

   ⛔ rsvps.event_id is declared ON DELETE CASCADE (migrations/0001_rsvps.sql), so
   deleting an event silently takes every registration on it — other people's
   names, emails and phone numbers — with it. So this REFUSES to delete an event
   that still has sign-ups: close it and clear (or export) the list first. Only an
   empty event deletes here, which is the one that is safe to lose. */
import { json, requireSession } from '../_lib.js';
import { readBody } from '../_input.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });

  const session = await requireSession(context);
  if (!session) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (!env.DB) return json({ ok: false, error: 'The database isn’t configured.' }, 500);

  const body = await readBody(request);
  const id = String((body && body.id) ?? '').trim();
  // Same id shape the RSVP form and renderer validate against.
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return json({ ok: false, error: 'Which event?' }, 400);

  // Guard the CASCADE: never let a delete-event silently wipe attendees' details.
  let attendees;
  try {
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM rsvps WHERE event_id = ?').bind(id).first();
    attendees = row ? Number(row.n) : 0;
  } catch {
    return json({ ok: false, error: 'Couldn’t check that event.' }, 500);
  }
  if (attendees > 0) {
    return json({ ok: false, error: `That event has ${attendees} sign-up${attendees === 1 ? '' : 's'}. Remove them first, then delete the event.` }, 409);
  }

  /* The COUNT above is for the friendly 409; the delete itself re-checks emptiness
     in ONE atomic statement, so an RSVP that lands in the gap between the two can
     never be cascade-deleted — the DELETE simply doesn't fire. */
  let result;
  try {
    result = await env.DB.prepare(
      'DELETE FROM events WHERE id = ? AND NOT EXISTS (SELECT 1 FROM rsvps WHERE event_id = ?)'
    ).bind(id, id).run();
  } catch {
    return json({ ok: false, error: 'Couldn’t delete that event.' }, 500);
  }

  const changes = result && result.meta ? result.meta.changes : 0;
  // 0 changes = already gone, or a sign-up raced in after the count. Safe either way.
  if (!changes) return json({ ok: false, error: 'That event is already gone.' }, 404);
  return json({ ok: true });
}
