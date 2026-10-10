/* GET  /api/registrants?event_id=…          — PUBLIC. The roster + meeting link for ONE event.
   POST /api/registrants { event_id, email } — PUBLIC. The gated form of the same read.

   What this endpoint is for: the "List of registrants" button on an event card
   (js/registrants.js). It lets members see who is registered for an event, and
   the event's meeting (Zoom) link — the link that otherwise only appears on the
   confirmation screen right after someone registers (functions/api/rsvp.js).

   ⛔ TWO HARD PRIVACY RULES, both STRUCTURAL rather than trusted-to-a-comment:

     1. NO EMAIL (or phone, business, notes) EVER LEAVES. The roster query selects
        `name` and nothing else; the gate query selects a constant. No branch of
        this file puts a stored address into a response. The viewer-facing shape is
        exactly { ok, mode, names, meeting } — there is no field an address could
        ride out in, and the email the viewer types is used only to VERIFY, never
        echoed back. tools/test-registrants.mjs asserts it against the JSON.

     2. THE MEETING LINK IS NEVER PUBLIC BY DEFAULT. It lives in D1 (migration
        0002), is stripped out of the committed content (functions/api/save.js
        splitPrivateLinks), and is handed back HERE only AFTER the visibility gate
        passes. Nothing about it is baked into the static page.

   THE GATE — one switch, env.REGISTRANT_VIEW, default "gated":

     "gated"  (the default, and the default on a missing / empty / typo'd value —
              this fails to the MORE private behaviour on purpose, same shape as
              _turnstile.js failing closed): the viewer must POST the email they
              registered with; we confirm a row in `rsvps` for that event + email,
              and ONLY then return the names + link. A GET in this mode reports that
              the view is gated and nothing else, so the button knows to ask for the
              email first.

     "public": a GET (or POST) returns the names + link to anyone. Still names only;
              the link is still read server-side on view, never put in the page.

   Everything except the gate is identical between the two modes — the button, the
   roster, the link — so flipping REGISTRANT_VIEW is a one-value config change.

   NAMES shown = first name + last initial ("Sarah M."), built HERE from rsvps.name
   by the SAME displayName() the public who's-going list uses (attendees.js) — one
   formatter, so the two cannot drift. A value that isn't plainly a name is left off
   rather than shown, exactly as there. This lists EVERYONE registered, not only the
   people who opted into the public who's-going card: here the gate (a proven fellow
   registrant, or "public" mode) is the audience limit, not the opt-in tick. */
import { json } from './_lib.js';
import { safeMeetingUrl } from '../../js/render.js';
import { displayName } from './attendees.js';
import { readBody, validate, text, email as emailField } from './_input.js';
import { rateLimited, RATE_LIMIT_MESSAGE } from './_guard.js';

const GENERIC = 'The registrant list isn’t available right now. Please try again in a moment.';
const NOT_REGISTERED =
  'We couldn’t find a registration for that email. Please register for the event first, or enter the email you registered with.';

/* Default is "gated". Anything that isn't exactly the string "public" — unset,
   empty, a typo, the wrong case — resolves to "gated", so a misconfiguration can
   only ever make the view MORE private, never accidentally expose a link. */
function viewMode(env) {
  return env && env.REGISTRANT_VIEW === 'public' ? 'public' : 'gated';
}

/* The roster + link for one event. Selects `name` ONLY from rsvps — never email,
   phone, business or notes — and runs each through displayName (first name + last
   initial, or dropped). The link is validated by safeMeetingUrl, same as rsvp.js;
   a missing event_links table (migration 0002 not applied) just means no link. */
async function rosterFor(env, eventId) {
  const names = [];
  const r = await env.DB.prepare(
    'SELECT name FROM rsvps WHERE event_id = ? ORDER BY created_at ASC, id ASC LIMIT 2000'
  ).bind(eventId).all();
  for (const row of r.results || []) {
    const n = displayName(row.name);
    if (n) names.push(n);
  }
  let meeting = null;
  try {
    const link = await env.DB.prepare('SELECT url FROM event_links WHERE event_id = ?').bind(eventId).first();
    meeting = link && safeMeetingUrl(link.url) ? safeMeetingUrl(link.url) : null;
  } catch { /* migration 0002 not applied yet: no link, still a valid roster */ }
  return { names, meeting };
}

async function eventExists(env, eventId) {
  const e = await env.DB.prepare('SELECT id FROM events WHERE id = ?').bind(eventId).first();
  return !!e;
}

/* { ok, mode, names, meeting } — the one viewer-facing success shape. Built in one
   place so no path can return a different (richer) object by accident. */
function roster(mode, names, meeting) {
  return json({ ok: true, mode, names, meeting }, 200, { 'Cache-Control': 'no-store' });
}

export async function onRequest(context) {
  const { request, env } = context;
  const mode = viewMode(env);

  const isGet = request.method === 'GET';
  const isPost = request.method === 'POST';
  if (!isGet && !isPost) return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'GET, POST' });

  /* No database bound: we cannot verify the gate, so we cannot hand out a link.
     Fail closed with a generic message rather than guessing. */
  if (!env.DB) return json({ ok: false, error: GENERIC }, 503);

  /* Resolve the event id and (for POST) the email. GET reads the query string;
     POST reads + validates a JSON or form body the same way /api/rsvp does. */
  let eventId, emailKey = null;
  if (isGet) {
    eventId = (new URL(request.url).searchParams.get('event_id') || '').trim();
    if (!eventId) return json({ ok: false, error: 'Which event?' }, 400);
    if (eventId.length > 64) return json({ ok: false, error: 'No such event.' }, 404);
  } else {
    const body = await readBody(request);
    if (!body) return json({ ok: false, error: 'We couldn’t read that. Please try again.' }, 400);
    const v = validate(body, {
      event_id: (x) => text(x, { label: 'Event', max: 64, required: true }),
      // Email is required only in gated mode; validated here so public mode still rejects garbage.
      email: (x) => emailField(x, { required: mode === 'gated' }),
    });
    if (!v.ok) return json({ ok: false, error: v.error }, 400);
    eventId = v.values.event_id;
    emailKey = v.values.email_key || '';   // lowercased, trimmed — or '' when not supplied in public mode
  }

  let exists;
  try { exists = await eventExists(env, eventId); } catch { return json({ ok: false, error: GENERIC }, 503); }
  if (!exists) return json({ ok: false, error: 'No such event.' }, 404);

  /* "public": the roster and link go to anyone, by GET or POST. Still names only. */
  if (mode === 'public') {
    try { const r = await rosterFor(env, eventId); return roster('public', r.names, r.meeting); }
    catch { return json({ ok: false, error: GENERIC }, 503); }
  }

  /* "gated" (default). A GET only confirms the view is gated — it reveals no names
     and no link, so the button knows to ask for the email before anything is shown. */
  if (isGet) return json({ ok: true, mode: 'gated' }, 200, { 'Cache-Control': 'no-store' });

  /* A gated POST is the email check. Rate-limit it first so the endpoint can't be
     turned into an "is this address registered?" oracle by brute force (same cheap
     per-IP limiter the public forms use; its own bucket, and it fails open if the
     table isn't there yet). */
  if (await rateLimited(env, request, 'registrants')) return json({ ok: false, error: RATE_LIMIT_MESSAGE }, 429);

  let registered;
  try {
    const row = await env.DB.prepare('SELECT 1 AS ok FROM rsvps WHERE event_id = ? AND email_key = ? LIMIT 1')
      .bind(eventId, emailKey).first();
    registered = !!row;
  } catch { return json({ ok: false, error: GENERIC }, 503); }

  /* Not a registrant: no names, no link. The email is not echoed, and the message
     is the same whether the address is unknown or simply not signed up for THIS
     event, so it never confirms one address over another beyond the event itself. */
  if (!registered) return json({ ok: false, error: NOT_REGISTERED }, 403);

  try { const r = await rosterFor(env, eventId); return roster('gated', r.names, r.meeting); }
  catch { return json({ ok: false, error: GENERIC }, 503); }
}
