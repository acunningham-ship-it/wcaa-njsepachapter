/* POST /api/rsvp — PUBLIC. Anyone on the internet can reach this.
   Body (JSON or form-encoded): { event_id, name, email, phone?, business?,
                                  guests?, notes?, "cf-turnstile-response" }

   ⛔ THIS ENDPOINT MAKES ZERO GITHUB CALLS, AND THAT IS A REQUIREMENT, NOT AN
   IMPLEMENTATION DETAIL. Every other write path on this site commits to a PUBLIC
   repo. The body of this request is a stranger's name, email and phone number.
   Committing that would publish it permanently — and irreversibly, because it
   stays in the git history after any later deletion. It goes to D1 and nowhere
   else. tools/test-rsvp.mjs asserts it by recording every outbound fetch and
   failing if api.github.com appears.

   Turnstile runs BEFORE validation, so an unverified request never reaches the
   database at all, and before any error message that could be used to probe which
   event ids exist.

   The form needs JavaScript, because the Turnstile widget does. That is the one
   place on this site that is true; the six content pages ship none. */
import { json } from './_lib.js';
import { readBody, validate, text, multiline, email as emailField, phone as phoneField, count } from './_input.js';
import { verifyTurnstile } from './_turnstile.js';

const GENERIC = 'Something went wrong sending your RSVP. Please try again, or contact the chapter directly.';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  if (!env.DB) return json({ ok: false, error: GENERIC }, 500);

  const body = await readBody(request);
  if (!body) return json({ ok: false, error: 'We couldn’t read that form. Please try again.' }, 400);

  const gate = await verifyTurnstile(env, body['cf-turnstile-response'], request);
  if (!gate.ok) return json({ ok: false, error: gate.error }, gate.status);

  const v = validate(body, {
    event_id: (x) => text(x, { label: 'Event', max: 64, required: true }),
    name: (x) => text(x, { label: 'Name', max: 120, required: true }),
    email: (x) => emailField(x, { required: true }),
    phone: (x) => phoneField(x),
    business: (x) => text(x, { label: 'Business name', max: 160 }),
    guests: (x) => count(x, { label: 'Additional guests', max: 10 }),
    notes: (x) => multiline(x, { label: 'Notes', max: 2000 }),
  });
  if (!v.ok) return json({ ok: false, error: v.error }, 400);
  const f = v.values;

  /* Read the event first, only so the refusal can say WHICH thing is wrong. The
     authoritative check is in the INSERT below — see the note there. */
  let event;
  try {
    event = await env.DB.prepare('SELECT id, title, capacity, closed FROM events WHERE id = ?')
      .bind(f.event_id).first();
  } catch {
    return json({ ok: false, error: GENERIC }, 500);
  }
  if (!event) return json({ ok: false, error: 'Registration for that event isn’t open.' }, 404);
  if (event.closed) return json({ ok: false, error: 'Registration for this event is closed.' }, 409);

  /* One statement, so the capacity check and the insert cannot be separated by
     another request. A SELECT-then-INSERT would let two people racing for the last
     seat both read "one left" and both get it. The WHERE clause re-checks open and
     capacity at write time; the row simply does not appear if it would oversell.

     `email_key <> ?` excludes this person's OWN existing row from the seat count,
     so someone editing their RSVP is not counted twice and cannot be locked out of
     an event they are already registered for. */
  const sql = `
    INSERT INTO rsvps (event_id, name, email, email_key, phone, business, guests, notes)
    SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8
    WHERE EXISTS (SELECT 1 FROM events WHERE id = ?1 AND closed = 0)
      AND ((SELECT capacity FROM events WHERE id = ?1) IS NULL
           OR (SELECT COALESCE(SUM(1 + guests), 0) FROM rsvps WHERE event_id = ?1 AND email_key <> ?4)
              + 1 + ?7 <= (SELECT capacity FROM events WHERE id = ?1))
    ON CONFLICT (event_id, email_key) DO UPDATE SET
      name = excluded.name, email = excluded.email, phone = excluded.phone,
      business = excluded.business, guests = excluded.guests, notes = excluded.notes,
      updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`;

  let result;
  try {
    result = await env.DB.prepare(sql)
      .bind(f.event_id, f.name, f.email, f.email_key, f.phone || null, f.business || null, f.guests, f.notes || null)
      .run();
  } catch {
    return json({ ok: false, error: GENERIC }, 500);
  }

  const changes = result && result.meta ? result.meta.changes : 0;
  if (!changes) {
    // The event was open a moment ago, so the only way the WHERE fails is capacity.
    return json({
      ok: false,
      error: 'This event is full. Please contact the chapter — we’ll add you to the waiting list.',
      full: true,
    }, 409);
  }

  return json({ ok: true, event: event.title, guests: f.guests });
}
