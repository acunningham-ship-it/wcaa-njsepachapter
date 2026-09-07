/* POST /api/migrate — ADMIN. Applies migrations/*.sql to the bound D1 database.
   GET  /api/migrate — ADMIN. Reports which tables exist, without changing anything.

   ⛔ WHY THIS IS NOT SELF-INIT ON FIRST CALL. The obvious shortcut is to run
   CREATE TABLE IF NOT EXISTS at the top of /api/rsvp and delete the whole idea of
   a migration step. Three reasons not to:

     1. The first request to arrive is a PUBLIC one. Self-init means an
        unauthenticated stranger's RSVP is what triggers DDL on the database.
        Creating tables is the largest-blast-radius thing this code can do, and it
        would sit on the least-trusted path.
     2. It runs forever. Every request pays the check, and it never stops being
        dead weight, long after the tables exist.
     3. It erases the record. With no migration step there is no answer to "what
        schema is actually live?" — the answer becomes "whatever the code happened
        to say the last time someone deployed."

   So the schema is applied deliberately, by an officer or an operator, through
   this authenticated endpoint. It exists because applying SQL by hand through the
   D1 web console is genuinely awkward; the fix for that is a button, not moving
   DDL onto a public route.

   Idempotent: the migration is all CREATE TABLE/INDEX IF NOT EXISTS, so running
   it twice is a no-op rather than an error. */
import { json, requireSession } from './_lib.js';

const MIGRATIONS = ['migrations/0001_rsvps.sql'];
const EXPECTED_TABLES = ['events', 'rsvps', 'contact_messages'];

/* D1's exec() only handles one statement per line, and a readable migration is
   not written that way. Strip line comments, then split on semicolons — safe for
   these files specifically because they contain no semicolon inside a string or
   an identifier, which is asserted in tools/test-migrate.mjs by comparing the
   resulting schema against the file applied whole. */
export function splitStatements(sql) {
  return String(sql)
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function tablesIn(env) {
  const r = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all();
  return (r.results || []).map((row) => row.name);
}

export async function onRequest(context) {
  const { request, env } = context;
  const session = await requireSession(context);
  if (!session) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (!env.DB) return json({ ok: false, error: 'No database is bound to this site yet (env.DB).' }, 500);

  if (request.method === 'GET') {
    try {
      const tables = await tablesIn(env);
      return json({
        ok: true,
        tables,
        missing: EXPECTED_TABLES.filter((t) => !tables.includes(t)),
        applied: EXPECTED_TABLES.every((t) => tables.includes(t)),
      });
    } catch (e) {
      return json({ ok: false, error: 'Couldn’t read the database.' }, 500);
    }
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'GET, POST' });

  const statements = [];
  for (const file of MIGRATIONS) {
    /* The .sql files ship as static assets, so the migration the endpoint runs is
       literally the file in the repo — there is no second copy inlined here to
       drift out of step with it. */
    let sql;
    try {
      const res = await fetch(new URL('/' + file, request.url).toString());
      if (!res.ok) throw new Error(String(res.status));
      sql = await res.text();
    } catch {
      return json({ ok: false, error: `Couldn’t read ${file}.` }, 500);
    }
    for (const statement of splitStatements(sql)) statements.push(statement);
  }
  if (!statements.length) return json({ ok: false, error: 'The migration was empty — refusing to run it.' }, 500);

  try {
    await env.DB.batch(statements.map((s) => env.DB.prepare(s)));
  } catch (e) {
    return json({ ok: false, error: 'The migration failed: ' + String(e && e.message || e).slice(0, 300) }, 500);
  }

  const tables = await tablesIn(env);
  const missing = EXPECTED_TABLES.filter((t) => !tables.includes(t));
  /* Report what the database now CONTAINS, not that the statements were sent.
     "The batch returned without throwing" is not the same claim as "the schema
     is there", and only the second one is worth anything. */
  if (missing.length) return json({ ok: false, error: 'Migration ran but these are missing: ' + missing.join(', '), tables }, 500);

  return json({ ok: true, statements: statements.length, tables });
}
