/* GET /api/session — is this browser signed in?

   The session cookie is HttpOnly, so the admin page cannot read it and has no
   way to know whether it is signed in without asking. Without this, the page has
   to probe some other endpoint and read a 401 out of it — which works, and is
   the kind of cleverness that breaks the day that endpoint's error codes change.
   One honest endpoint is cheaper than a trick. */
import { json, requireSession } from './_lib.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'GET' });
  }
  const session = await requireSession(context);
  if (!session) return json({ ok: false }, 401);
  return json({ ok: true, user: typeof session.sub === 'string' ? session.sub : null });
}
