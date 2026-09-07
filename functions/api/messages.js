/* GET  /api/messages                    — ADMIN. Contact-form messages.
   GET  /api/messages?format=csv         — ADMIN. The same as a download.
   POST /api/messages { id, handled? } | { id, delete: true } — ADMIN.

   Nothing is emailed when a message arrives (see contact.js), so this list is the
   only place they surface. That makes it load-bearing rather than a nicety: a
   contact form whose messages nobody can read is worse than no contact form, and
   it is the reason this file exists in the same step as the endpoint that writes
   the rows. */
import { json, requireSession } from './_lib.js';
import { readBody } from './_input.js';
import { csvRows, csvResponse } from './_csv.js';

const MAX_ROWS = 500;

export async function onRequest(context) {
  const { request, env } = context;
  const session = await requireSession(context);
  if (!session) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (!env.DB) return json({ ok: false, error: 'The database isn’t configured.' }, 500);

  if (request.method === 'GET') {
    let rows;
    try {
      const r = await env.DB.prepare(
        `SELECT id, name, business, email, phone, message, created_at, handled
           FROM contact_messages ORDER BY created_at DESC, id DESC LIMIT ?`
      ).bind(MAX_ROWS).all();
      rows = r.results || [];
    } catch {
      return json({ ok: false, error: 'Couldn’t read the messages.' }, 500);
    }

    if (new URL(request.url).searchParams.get('format') === 'csv') {
      return csvResponse('contact-messages', csvRows(
        ['Received', 'Name', 'Business', 'Email', 'Phone', 'Message', 'Handled'],
        rows.map((m) => [m.created_at, m.name, m.business, m.email, m.phone, m.message, m.handled ? 'yes' : 'no'])
      ));
    }
    return json({ ok: true, count: rows.length, truncated: rows.length === MAX_ROWS, messages: rows });
  }

  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'GET, POST' });
  }

  const body = await readBody(request);
  const raw = body ? body.id : undefined;
  const id = /^\d{1,12}$/.test(String(raw ?? '').trim()) ? Number(String(raw).trim()) : NaN;
  if (!Number.isInteger(id)) return json({ ok: false, error: 'Which message?' }, 400);

  const remove = body.delete === true || body.delete === 1 || body.delete === '1' || body.delete === 'on';
  let result;
  try {
    result = remove
      ? await env.DB.prepare('DELETE FROM contact_messages WHERE id = ?').bind(id).run()
      : await env.DB.prepare('UPDATE contact_messages SET handled = ? WHERE id = ?')
          .bind(body.handled === false || body.handled === 0 || body.handled === '0' ? 0 : 1, id).run();
  } catch {
    return json({ ok: false, error: 'Couldn’t update that message.' }, 500);
  }

  const changes = result && result.meta ? result.meta.changes : 0;
  if (!changes) return json({ ok: false, error: 'That message is already gone.' }, 404);
  return json({ ok: true, deleted: remove });
}
