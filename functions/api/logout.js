/* POST /api/logout — ends the editor session: clears this browser's cookie AND kills the token server-side.

   Officers share one login and may sign in on a shared or public computer, so they need a
   way to leave it signed out (asked for by an officer, 2026-10-07). The session is a signed,
   12-hour cookie (see login.js). Clearing the cookie alone only makes THIS browser forget it; a copy of
   the token (a shared computer's history, a captured request) would still work until it expired. So the
   token's SHA-256 is also written to revoked_sessions (migration 0005) and requireSession refuses it
   from then on (2026-10-13).

   Only THIS token is revoked. Deliberately NOT "log out everywhere": with one shared login that would
   sign out every other officer mid-edit.

   No session needed: logging out must work even after the session has already expired, and
   clearing your own cookie gives nothing away. Before migration 0005 is applied there is no table to
   write to, so it behaves as before (cookie only, `revoked: false`); any other database failure answers
   503 — the cookie is still cleared, but the page is told the server-side part didn't happen. */
import { json, clearSessionCookie, getCookie, verifyToken, sha256Hex, COOKIE_NAME } from './_lib.js';

export async function onRequest({ request, env = {} }) {
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  const headers = { 'Set-Cookie': clearSessionCookie(), 'Cache-Control': 'no-store' };

  const token = getCookie(request, COOKIE_NAME);
  const payload = token && env.SESSION_SECRET ? await verifyToken(token, env.SESSION_SECRET) : null;
  if (!payload || !env.DB) return json({ ok: true, revoked: false }, 200, headers);   // nothing live to kill

  try {
    await env.DB.prepare('DELETE FROM revoked_sessions WHERE expires_at < ?').bind(Date.now()).run();
    await env.DB.prepare('INSERT OR IGNORE INTO revoked_sessions (token_hash, expires_at) VALUES (?, ?)')
      .bind(await sha256Hex(token), payload.exp).run();
  } catch (e) {
    if (/no such table/i.test(String(e && e.message))) return json({ ok: true, revoked: false }, 200, headers);
    return json({ ok: false, error: 'You were signed out here, but the website couldn’t end the session on its side. Please close this browser window.' }, 503, headers);
  }
  return json({ ok: true, revoked: true }, 200, headers);
}
