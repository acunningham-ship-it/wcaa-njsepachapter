/* POST /api/mailing-list/delete  { id } — ADMIN. Takes one person off the chapter's email list.

   POST for the same reasons as /api/rsvps/delete: the id stays out of URLs and access logs.

   Real deletion, not an "unsubscribed" flag. Someone who asks the chapter to stop emailing them is
   asking for exactly this, and the chapter already has no way to email an id that does not exist.
   It removes them from the LIST only — their event sign-ups stay, because those are a different
   fact (who is coming on Thursday) and an officer tidying the mailing list must not quietly cancel
   somebody's seat. Deleting an event's sign-up also does NOT put them back on the list later; the
   list has no memory of them at all. */
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
  if (!Number.isInteger(id)) return json({ ok: false, error: 'Which person?' }, 400);

  let result;
  try {
    result = await env.DB.prepare('DELETE FROM mailing_list WHERE id = ?').bind(id).run();
  } catch {
    return json({ ok: false, error: 'Couldn’t remove that person.' }, 500);
  }

  const changes = result && result.meta ? result.meta.changes : 0;
  if (!changes) return json({ ok: false, error: 'That person is already off the list.' }, 404);
  return json({ ok: true });
}
