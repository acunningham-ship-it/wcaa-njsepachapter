/* POST /api/rsvps/delete  { id }  — ADMIN. Removes one registration.

   POST, not DELETE-on-a-path, so it works from a plain form in the admin without
   JavaScript, and so the id never appears in a URL, a referrer or an access log.

   Deletion is real and immediate — there is no soft-delete flag. That is the
   right default for a table of other people's contact details: when someone asks
   the chapter to remove their information, "we marked a column" is not removal. */
import { json, requireSession } from '../_lib.js';
import { readBody } from '../_input.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });

  const session = await requireSession(context);
  if (!session) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (!env.DB) return json({ ok: false, error: 'The database isn’t configured.' }, 500);

  const body = await readBody(request);
  const raw = body ? body.id : undefined;
  const id = /^\d{1,12}$/.test(String(raw ?? '').trim()) ? Number(String(raw).trim()) : NaN;
  if (!Number.isInteger(id)) return json({ ok: false, error: 'Which registration?' }, 400);

  let result;
  try {
    result = await env.DB.prepare('DELETE FROM rsvps WHERE id = ?').bind(id).run();
  } catch {
    return json({ ok: false, error: 'Couldn’t remove that registration.' }, 500);
  }

  const changes = result && result.meta ? result.meta.changes : 0;
  // A 404 on an already-deleted row, rather than a cheerful ok. Two officers on
  // the same list should find out they both pressed delete, not both see success.
  if (!changes) return json({ ok: false, error: 'That registration is already gone.' }, 404);
  return json({ ok: true });
}
