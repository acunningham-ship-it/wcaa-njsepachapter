/* POST /api/mailing-list/import — ADMIN. { csv } add everyone in a spreadsheet.

   The browser reads the file and posts its text; nothing is uploaded as a file. That keeps this
   endpoint a single JSON call (a Worker has no filesystem for an upload to land in) and means a
   .csv exported from Excel, Numbers, Google Sheets or the chapter's own export all work the same.

   ⛔ COUNTING "NEW" BY DIFFERENCE, NOT ONE ROW AT A TIME. The upsert deliberately does not tell
   you whether it inserted or updated (D1 reports one changed row either way), and asking per row
   would be thousands of round trips. Counting the list before and after gives the same number
   exactly — the difference IS the number of people who were not on it, because a duplicate
   changes no count. That number is what the officer is told, so it has to be true.

   Re-importing the same file is therefore safe and honest: "0 new, 84 already on the list". */
import { json, requireSession } from '../_lib.js';
import { parseCsv, peopleFromCsv, addSubscribers, MAX_IMPORT_ROWS, MAX_IMPORT_CHARS } from '../_mailing.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  const session = await requireSession(context);
  if (!session) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (!env.DB) return json({ ok: false, error: 'The database isn’t configured.' }, 500);

  let body;
  try { body = await request.json(); } catch { body = null; }
  const csv = body && typeof body.csv === 'string' ? body.csv : '';
  if (!csv.trim()) return json({ ok: false, error: 'That file was empty.' }, 400);
  if (csv.length > MAX_IMPORT_CHARS) {
    return json({ ok: false, error: 'That file is too big. Please split it into smaller files.' }, 413);
  }

  const { people, skipped } = peopleFromCsv(parseCsv(csv));
  if (!people.length) {
    return json({ ok: false, error: 'We couldn’t find any email addresses in that file. It should be a .csv with names and email addresses in it.' }, 400);
  }
  if (people.length > MAX_IMPORT_ROWS) {
    return json({ ok: false, error: `That’s ${people.length} addresses in one file; the most that can be added at once is ${MAX_IMPORT_ROWS}. Please split it.` }, 413);
  }

  let before, after;
  try {
    const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM mailing_list').first();
    before = c ? Number(c.n) : 0;
    await addSubscribers(env, people.map((p) => ({ ...p, source: 'csv' })));
    const d = await env.DB.prepare('SELECT COUNT(*) AS n FROM mailing_list').first();
    after = d ? Number(d.n) : before;
  } catch {
    return json({ ok: false, error: 'The email list isn’t set up in the database yet. Please ask your web person.' }, 409);
  }

  const added = Math.max(0, after - before);
  return json({
    ok: true,
    found: people.length,          // distinct, valid addresses in the file
    added,                         // of those, the ones that were not already on the list
    already: people.length - added,
    skipped,                       // rows with no readable address (blank lines, labels, junk)
    count: after,
  });
}
