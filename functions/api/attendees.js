/* GET /api/attendees — PUBLIC. For each event, the people who TICKED "list my name" when they
   signed up, as first name + last initial ("Sarah M."), so members can see who's going and
   carpool. Response: { ok: true, events: { "<event id>": ["Sarah M.", ...] } }

   ⛔ This is the only public read of the sign-up table, so it returns the least it can: a
   display name built HERE from rsvps.name, for opted-in sign-ups only (a row in rsvp_listed,
   migration 0003). Never the email, phone, business, guests or notes, never the full name; the
   query does not even select them. A name that isn't plainly a name (digits, "@", brackets,
   anything but letters) is left off rather than shown, because people type phone numbers,
   emails and businesses into name fields.

   The events page fills its cards in from this when it is viewed (js/going.js). Names are never
   written into the content or the generated pages: those are committed to a PUBLIC repo, and
   git keeps whatever it is given forever. */
import { json } from './_lib.js';

const WORD = /^\p{L}[\p{L}\p{M}'’.-]*$/u;
const TITLE = /^(mr|mrs|ms|miss|mx|dr|prof)\.?$/i;
const SUFFIX = /^(jr|sr|ii|iii|iv|phd|md|esq)\.?$/i;

/* "Sarah Miller" -> "Sarah M.", "Sarah" -> "Sarah", "Dr. Sarah Miller Jr." -> "Sarah M.".
   null (= not shown) for anything that isn't made only of letter words. */
export function displayName(full) {
  const words = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 6 || !words.every((w) => w.length <= 40 && WORD.test(w))) return null;
  const core = words.filter((w, i) => !(i === 0 && TITLE.test(w)) && !SUFFIX.test(w));
  if (!core.length) return null;
  return core.length > 1 ? core[0] + ' ' + Array.from(core[core.length - 1])[0].toUpperCase() + '.' : core[0];
}

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'GET' });
  const events = Object.create(null);   // event ids are officer-typed; "__proto__" must stay a plain key
  if (env.DB) {
    try {
      const r = await env.DB.prepare(
        `SELECT r.event_id, r.name FROM rsvps r
           JOIN rsvp_listed l ON l.event_id = r.event_id AND l.email_key = r.email_key
          ORDER BY r.event_id, r.created_at, r.id LIMIT 2000`).all();
      for (const row of r.results || []) {
        const name = displayName(row.name);
        if (name) (events[row.event_id] = events[row.event_id] || []).push(name);
      }
    } catch { /* migration 0003 not applied yet, or the database is down: nobody is listed */ }
  }
  return json({ ok: true, events }, 200, { 'Cache-Control': 'no-store' });
}
