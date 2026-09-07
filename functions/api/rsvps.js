/* GET /api/rsvps?event_id=…            — ADMIN. The registration list.
   GET /api/rsvps?event_id=…&format=csv — ADMIN. The same list as a download.

   Officers only. Every row here is somebody's contact details, so the session
   check is the first thing that happens and there is no code path that reaches a
   database read without it. tools/test-rsvp.mjs asserts the 401 as a negative
   control — an admin endpoint tested only with a valid session passes just as well
   when the guard is missing entirely. */
import { json, requireSession } from './_lib.js';
import { csvRows, csvResponse } from './_csv.js';

const MAX_ROWS = 1000;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'GET') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'GET' });

  const session = await requireSession(context);
  if (!session) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (!env.DB) return json({ ok: false, error: 'The database isn’t configured.' }, 500);

  const url = new URL(request.url);
  const eventId = (url.searchParams.get('event_id') || '').trim();
  const wantCsv = url.searchParams.get('format') === 'csv';

  let rows, event = null;
  try {
    if (eventId) {
      event = await env.DB.prepare('SELECT id, title, capacity, closed FROM events WHERE id = ?').bind(eventId).first();
      if (!event) return json({ ok: false, error: 'No such event.' }, 404);
      const r = await env.DB.prepare(
        `SELECT id, event_id, name, email, phone, business, guests, notes, created_at, updated_at
           FROM rsvps WHERE event_id = ? ORDER BY created_at ASC, id ASC LIMIT ?`
      ).bind(eventId, MAX_ROWS).all();
      rows = r.results || [];
    } else {
      const r = await env.DB.prepare(
        `SELECT id, event_id, name, email, phone, business, guests, notes, created_at, updated_at
           FROM rsvps ORDER BY event_id ASC, created_at ASC, id ASC LIMIT ?`
      ).bind(MAX_ROWS).all();
      rows = r.results || [];
    }
  } catch {
    return json({ ok: false, error: 'Couldn’t read the registrations.' }, 500);
  }

  if (wantCsv) {
    const body = csvRows(
      ['Name', 'Email', 'Phone', 'Business', 'Guests', 'Seats', 'Notes', 'Registered', 'Updated'],
      rows.map((r) => [r.name, r.email, r.phone, r.business, r.guests, 1 + (r.guests || 0), r.notes, r.created_at, r.updated_at])
    );
    return csvResponse(`rsvps-${eventId || 'all'}`, body);
  }

  // Seats, not people: an RSVP is the member plus their guests.
  const seats = rows.reduce((n, r) => n + 1 + (r.guests || 0), 0);
  return json({
    ok: true,
    event,
    seats,
    remaining: event && event.capacity != null ? Math.max(0, event.capacity - seats) : null,
    count: rows.length,
    truncated: rows.length === MAX_ROWS,
    rsvps: rows,
  });
}
