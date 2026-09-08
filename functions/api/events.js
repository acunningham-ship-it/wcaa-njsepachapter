/* GET  /api/events                      — ADMIN. Events with their seat counts.
   POST /api/events { id, title, capacity?, closed? } — ADMIN. Open or update one.

   An event has to exist here before anyone can RSVP to it (see migrations/
   0001_rsvps.sql — /api/rsvp fail-closes on a missing row). This is the endpoint
   that opens registration, sets the seat limit, and closes it again.

   ⛔ It is deliberately NOT the same thing as the event LIST on events.html. That
   list is content: it lives in content/pages.json, it is edited with the rest of
   the site, and it is public. This table is registration STATE for the subset of
   events that take RSVPs. Merging them would mean either publishing the seat
   count to the repo on every signup, or teaching the content file about a
   database — and content/pages.json is committed on save, so a row that changes
   with every RSVP does not belong in it. */
import { json, requireSession } from './_lib.js';
import { readBody, validate, text, count } from './_input.js';

export async function onRequest(context) {
  const { request, env } = context;
  const session = await requireSession(context);
  if (!session) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (!env.DB) return json({ ok: false, error: 'The database isn’t configured.' }, 500);

  if (request.method === 'GET') {
    try {
      const r = await env.DB.prepare(
        `SELECT e.id, e.title, e.capacity, e.closed, e.created_at,
                COALESCE((SELECT SUM(1 + guests) FROM rsvps WHERE event_id = e.id), 0) AS seats
           FROM events e ORDER BY e.created_at DESC LIMIT 200`
      ).all();
      return json({ ok: true, events: r.results || [] });
    } catch {
      return json({ ok: false, error: 'Couldn’t read the events.' }, 500);
    }
  }

  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'GET, POST' });
  }

  const body = await readBody(request);
  if (!body) return json({ ok: false, error: 'We couldn’t read that.' }, 400);

  const v = validate(body, {
    id: (x) => text(x, { label: 'Event id', max: 64, required: true }),
    title: (x) => text(x, { label: 'Event title', max: 200, required: true }),
  });
  if (!v.ok) return json({ ok: false, error: v.error }, 400);

  /* The id is a join key, not prose: the public sign-up form (js/blocks.js) and
     the delete endpoint both accept only ^[A-Za-z0-9_-]{1,64}$ and reject anything
     else. Enforce that SAME shape here so we can't mint an id (a space, an accent)
     that no form can reference and no admin can remove — a zombie row. */
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(v.values.id)) {
    return json({ ok: false, error: 'Event id can use only letters, numbers, hyphens and underscores (no spaces).' }, 400);
  }

  /* Capacity is optional and NULL means unlimited, so an absent field and a zero
     are different things and must not collapse into each other. */
  let capacity = null;
  if (body.capacity !== undefined && body.capacity !== null && String(body.capacity).trim() !== '') {
    const c = count(body.capacity, { label: 'Capacity', max: 100000 });
    if (!c.ok) return json({ ok: false, error: c.error }, 400);
    capacity = c.value;
  }
  const closed = body.closed === true || body.closed === 1 || body.closed === '1' || body.closed === 'on' ? 1 : 0;

  try {
    await env.DB.prepare(
      `INSERT INTO events (id, title, capacity, closed) VALUES (?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET title = excluded.title,
                                        capacity = excluded.capacity,
                                        closed = excluded.closed`
    ).bind(v.values.id, v.values.title, capacity, closed).run();
  } catch {
    return json({ ok: false, error: 'Couldn’t save that event.' }, 500);
  }
  return json({ ok: true, id: v.values.id, capacity, closed: !!closed });
}
