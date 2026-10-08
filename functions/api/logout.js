/* POST /api/logout — ends the editor session in THIS browser by clearing its cookie.

   Officers share one login and may sign in on a shared or public computer, so they need a
   way to leave it signed out (asked for by an officer, 2026-10-07). The session is a signed,
   12-hour cookie (see login.js); with the cookie gone this browser sends nothing, and every
   admin endpoint answers 401.

   No session needed: logging out must work even after the session has already expired, and
   clearing your own cookie gives nothing away. Deliberately NOT "log out everywhere": that
   would need server-side session state, and with one shared login it would also sign out
   every other officer mid-edit. */
import { json, clearSessionCookie } from './_lib.js';

export async function onRequest({ request }) {
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(), 'Cache-Control': 'no-store' });
}
