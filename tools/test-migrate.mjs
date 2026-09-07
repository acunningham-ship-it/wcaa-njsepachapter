/* Tests the migration endpoint. Run: node tools/test-migrate.mjs
 *
 * The one thing that actually needs proving here is the semicolon split. The
 * endpoint cannot use D1's exec() (one statement per line, and a readable
 * migration is not written that way), so it splits the file on ';'. That is a
 * fragile technique in general — a semicolon inside a string literal or a quoted
 * identifier would break it silently, producing a PARTIAL schema that then fails
 * much later and somewhere else.
 *
 * So this does not eyeball the split. It applies the file BOTH ways to two real
 * SQLite databases — whole, and statement-by-statement through the endpoint's own
 * splitter — and compares the resulting schema. If the split ever mangles
 * anything, the two schemas stop matching.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { splitStatements, onRequest as migrate } from '../functions/api/migrate.js';
import { signToken, makeSessionCookie } from '../functions/api/_lib.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SQL = readFileSync(join(ROOT, 'migrations/0001_rsvps.sql'), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 300))); }
};

/* Compare the EFFECTIVE schema, not the stored DDL text.
   ⛔ The first version of this compared sqlite_master.sql directly and failed —
   correctly reporting a difference, but the wrong difference: the splitter strips
   comments, so the text SQLite stores for a table differs cosmetically while the
   tables, columns, types, constraints and indexes are identical. Comparing the
   text tests the formatting of my comments. Pragmas test the thing that matters,
   and they are stricter about it — a changed column type or a dropped UNIQUE
   would slip past a whitespace-normalised text compare but cannot slip past this. */
const schemaOf = (db) => {
  const objects = db.prepare(
    "SELECT type, name, tbl_name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name"
  ).all();
  const out = [];
  for (const o of objects) {
    if (o.type === 'table') {
      const cols = db.prepare(`PRAGMA table_info(${o.name})`).all()
        .map((c) => `${c.cid}:${c.name}:${c.type}:notnull=${c.notnull}:default=${c.dflt_value}:pk=${c.pk}`);
      const fks = db.prepare(`PRAGMA foreign_key_list(${o.name})`).all()
        .map((f) => `${f.from}->${f.table}.${f.to}:${f.on_delete}`);
      out.push(`table ${o.name}\n  cols ${cols.join(' | ')}\n  fks ${fks.join(' | ')}`);
    } else if (o.type === 'index') {
      const info = db.prepare(`PRAGMA index_info(${o.name})`).all().map((i) => i.name).join(',');
      const list = db.prepare(`PRAGMA index_list(${o.tbl_name})`).all().find((i) => i.name === o.name);
      out.push(`index ${o.name} on ${o.tbl_name}(${info}) unique=${list ? list.unique : '?'}`);
    }
  }
  return out.join('\n---\n');
};

/* ---------- the split is lossless ---------- */
{
  const whole = new DatabaseSync(':memory:');
  whole.exec(SQL);

  const split = new DatabaseSync(':memory:');
  const statements = splitStatements(SQL);
  for (const s of statements) split.exec(s);

  ok('the splitter produced statements at all', statements.length >= 6, statements.length);
  ok('every statement is a CREATE',
     statements.every((s) => /^CREATE /i.test(s)), statements.filter((s) => !/^CREATE /i.test(s)).slice(0, 2));
  ok('statement-by-statement produces the IDENTICAL schema to applying the file whole',
     schemaOf(split) === schemaOf(whole),
     { whole: schemaOf(whole), split: schemaOf(split) });
  /* And the objects themselves match by name and type, so the pragma comparison
     is not passing because it looked at an empty set. */
  const names = (db) => db.prepare("SELECT type || ':' || name AS k FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY k").all().map((r) => r.k);
  ok('both databases contain the same six objects',
     JSON.stringify(names(split)) === JSON.stringify(names(whole)) && names(whole).length === 6, names(whole));
  ok('no statement still contains a semicolon', statements.every((s) => !s.includes(';')));
  ok('comments were stripped', statements.every((s) => !/^\s*--/m.test(s)));

  // Negative control: the comparison can actually fail.
  const partial = new DatabaseSync(':memory:');
  for (const s of statements.slice(0, 2)) partial.exec(s);
  ok('the schema comparison is sensitive (a partial apply does NOT match)',
     schemaOf(partial) !== schemaOf(whole));
}

/* ---------- idempotent ---------- */
{
  const db = new DatabaseSync(':memory:');
  db.exec(SQL);
  const before = schemaOf(db);
  let threw = null;
  try { db.exec(SQL); } catch (e) { threw = String(e.message); }
  ok('re-applying the migration does not throw', threw === null, threw);
  ok('  ...and does not change the schema', schemaOf(db) === before);
}

/* ---------- the endpoint ---------- */
{
  class Stmt {
    constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
    bind(...a) { this.args = a; return this; }
    async run() { const r = this.db.prepare(this.sql).run(...this.args); return { success: true, meta: { changes: r.changes } }; }
    async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; }
    async first() { const r = this.db.prepare(this.sql).get(...this.args); return r === undefined ? null : r; }
  }
  const makeDB = () => {
    const db = new DatabaseSync(':memory:');
    return {
      raw: db,
      prepare: (sql) => new Stmt(db, sql),
      batch: async (stmts) => { for (const s of stmts) db.exec(s.sql); return stmts.map(() => ({ success: true })); },
    };
  };

  let served = SQL;
  globalThis.fetch = async (url) => {
    if (!String(url).includes('migrations/0001_rsvps.sql')) throw new Error('unexpected fetch ' + url);
    if (served === null) return new Response('nope', { status: 404 });
    return new Response(served, { status: 200 });
  };

  const SECRET = 'test-secret';
  const COOKIE = makeSessionCookie(await signToken({ exp: Date.now() + 3600e3, sub: 'Denise' }, SECRET), 3600);
  const call = async (method, { cookie = COOKIE, DB } = {}) => {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    const request = new Request('https://wcaa.test/api/migrate', { method, headers });
    const res = await migrate({ request, env: { DB, SESSION_SECRET: SECRET } });
    return { status: res.status, json: await res.clone().json() };
  };

  let DB = makeDB();
  let r = await call('POST', { cookie: null, DB });
  ok('migrate is 401 with no session', r.status === 401, r.json);
  ok('  ...and created nothing', DB.raw.prepare("SELECT COUNT(*) n FROM sqlite_master").get().n === 0);

  r = await call('POST', { DB: undefined });
  ok('migrate fails clearly when no database is bound', r.status === 500 && /env\.DB/.test(r.json.error), r.json);

  DB = makeDB();
  r = await call('GET', { DB });
  ok('GET reports the schema is not applied yet', r.status === 200 && r.json.applied === false, r.json);
  ok('  ...and names what is missing',
     JSON.stringify(r.json.missing) === JSON.stringify(['events', 'rsvps', 'contact_messages']), r.json);

  r = await call('POST', { DB });
  ok('POST applies the migration', r.status === 200 && r.json.ok === true, r.json);
  ok('  ...and reports the tables that now exist',
     ['events', 'rsvps', 'contact_messages'].every((t) => r.json.tables.includes(t)), r.json);

  r = await call('GET', { DB });
  ok('GET now reports it applied', r.json.applied === true && r.json.missing.length === 0, r.json);

  r = await call('POST', { DB });
  ok('running it a second time is fine', r.status === 200 && r.json.ok === true, r.json);

  /* The endpoint must verify the RESULT, not that the batch returned. A migration
     file that runs cleanly and creates the wrong things has to be caught. */
  served = 'CREATE TABLE IF NOT EXISTS something_else (id INTEGER PRIMARY KEY);';
  DB = makeDB();
  r = await call('POST', { DB });
  ok('a migration that runs but creates the WRONG tables is reported as a failure',
     r.status === 500 && /missing/i.test(r.json.error), r.json);

  served = '';
  DB = makeDB();
  r = await call('POST', { DB });
  ok('an empty migration file is refused rather than reported as success',
     r.status === 500 && /empty/i.test(r.json.error), r.json);

  served = null;
  DB = makeDB();
  r = await call('POST', { DB });
  ok('an unreachable migration file is a clear error', r.status === 500 && /Couldn’t read/.test(r.json.error), r.json);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
