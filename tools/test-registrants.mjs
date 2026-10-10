/* Tests the "List of registrants" backend (functions/api/registrants.js).
 * Run: node tools/test-registrants.mjs
 *
 * Same discipline as tools/test-rsvp.mjs: the REAL SQL runs against REAL SQLite
 * (node:sqlite) with the REAL migration files applied, and every outbound fetch is
 * recorded so "this endpoint commits nothing" is asserted, not asserted-in-a-comment.
 *
 * The two things this file exists to prove, both from the failing side:
 *
 *   1. THE GATE. In the default "gated" mode a NON-REGISTERED email gets NOTHING —
 *      no names, no meeting link, status 403. This is the negative control, and to
 *      show it has teeth the SAME request is run against a gate that has been broken
 *      (the email check short-circuited to always-match): the broken gate leaks,
 *      which is exactly what the control would catch. The gate is also shown to be
 *      load-bearing by config: flip REGISTRANT_VIEW to "public" and the identical
 *      non-registrant request is answered.
 *
 *   2. NO EMAIL EVER LEAVES. No viewer-facing response — gated success, public,
 *      error, GET or POST — contains a registrant's email, phone, business, note or
 *      surname. Asserted against the serialised JSON with the seeded addresses.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 240))); }
};

/* ---------- a D1-shaped adapter over node:sqlite (same as test-rsvp.mjs) ---------- */
class Stmt {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { success: true, meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; }
  async first() { const r = this.db.prepare(this.sql).get(...this.args); return r === undefined ? null : r; }
}
const makeDB = (opts = {}) => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(readFileSync(join(ROOT, 'migrations/0001_rsvps.sql'), 'utf8'));
  if (!opts.only0001) db.exec(readFileSync(join(ROOT, 'migrations/0002_links_and_limits.sql'), 'utf8'));
  if (!opts.only0001 && !opts.no0003) db.exec(readFileSync(join(ROOT, 'migrations/0003_attendee_list.sql'), 'utf8'));
  return { raw: db, prepare: (sql) => new Stmt(db, sql) };
};

/* ---------- outbound-fetch recorder: this endpoint must call nothing ---------- */
let calls = [];
globalThis.fetch = async (url) => { calls.push(String(url)); throw new Error('unexpected outbound fetch to ' + url); };

const mod = { path: '/api/registrants', onRequest: (await import('../functions/api/registrants.js')).onRequest };

const baseEnv = (DB, extra = {}) => Object.assign({ DB, SESSION_SECRET: 'test-session-secret' }, extra);
const publicEnv = (DB) => baseEnv(DB, { REGISTRANT_VIEW: 'public' });

const get = async (env, query = '', { ip } = {}) => {
  const headers = {};
  if (ip) headers['CF-Connecting-IP'] = ip;
  const request = new Request('https://wcaa.test' + mod.path + query, { method: 'GET', headers });
  const res = await mod.onRequest({ request, env });
  let json = null; try { json = await res.clone().json(); } catch {}
  return { status: res.status, json };
};
const post = async (env, body, { ip } = {}) => {
  const headers = { 'content-type': 'application/json' };
  if (ip) headers['CF-Connecting-IP'] = ip;
  const request = new Request('https://wcaa.test' + mod.path, { method: 'POST', headers, body: JSON.stringify(body) });
  const res = await mod.onRequest({ request, env });
  let json = null; try { json = await res.clone().json(); } catch {}
  return { status: res.status, json };
};

/* ---------- seed one event with a handful of registrants + a Zoom link ---------- */
const EVENT = 'oct-15-somfy';
const SEEDED = [
  ['Marie Weaverling', 'marie@example.com', '(610) 331-5474', 'Weaverling Interiors'],
  ['Sarah Miller',     'sarah@example.com', '(215) 555-0144', 'Miller Blinds'],
  ['José Álvarez',     'jose@example.com',  null,             null],
  ['x@contact.com 555-0199', 'oddname@example.com', null,      null],   // name not plainly a name -> dropped from the list
];
const ZOOM = 'https://us02web.zoom.us/j/555123';
const EMAILS = SEEDED.map((r) => r[1]);

const seed = (DB, { link = ZOOM, event = EVENT } = {}) => {
  DB.raw.prepare('INSERT INTO events (id,title,capacity,closed) VALUES (?,?,?,0)').run(event, 'SOMFY Zigbee Motorization', null);
  for (const [name, email, phone, business] of SEEDED) {
    DB.raw.prepare('INSERT INTO rsvps (event_id,name,email,email_key,phone,business,guests) VALUES (?,?,?,?,?,?,0)')
      .run(event, name, email, email.toLowerCase(), phone, business);
  }
  if (link) DB.raw.prepare('INSERT INTO event_links (event_id,url) VALUES (?,?)').run(event, link);
};

/* The two predicates the security assertions turn on. Kept as named functions so the
   "does the detector fire?" controls below can exercise them on known inputs. */
const dataPresent = (json) =>
  !!json && ((Array.isArray(json.names) && json.names.length > 0) ||
             (typeof json.meeting === 'string' && json.meeting.length > 0));
const leaksPII = (json) => {
  const s = JSON.stringify(json || null);
  if (/@/.test(s)) return true;                                   // any email address
  if (EMAILS.some((e) => s.toLowerCase().includes(e.toLowerCase()))) return true;
  if (/Weaverling|Miller|Álvarez|Alvarez/.test(s)) return true;   // surnames
  if (/\d{3}\D{0,2}\d{4}/.test(s)) return true;                   // phone shapes
  return false;
};

/* ================= gated mode (the DEFAULT: no REGISTRANT_VIEW set) ================= */
{
  calls = [];
  const DB = makeDB(); seed(DB);
  const env = baseEnv(DB);   // REGISTRANT_VIEW unset -> gated

  // A GET reveals only that the view is gated — never a name or a link.
  let r = await get(env, '?event_id=' + EVENT);
  ok('gated GET says mode=gated', r.status === 200 && r.json?.ok === true && r.json?.mode === 'gated', r.json);
  ok('  ...and reveals NO names and NO meeting link', !dataPresent(r.json) && !('names' in r.json) && !('meeting' in r.json), r.json);
  ok('  ...and leaks no PII', !leaksPII(r.json), r.json);

  /* ⛔ NEGATIVE CONTROL: a non-registered email gets nothing. */
  r = await post(env, { event_id: EVENT, email: 'stranger@nowhere.com' });
  ok('a NON-REGISTERED email is REJECTED (403)', r.status === 403 && r.json?.ok !== true, r.json);
  ok('  ...with no names and no meeting link', !dataPresent(r.json), r.json);
  ok('  ...and the rejection echoes no email / PII', !leaksPII(r.json), r.json);

  // POSITIVE: a real registrant gets the list + link.
  r = await post(env, { event_id: EVENT, email: 'marie@example.com' });
  ok('a REGISTERED email gets the list (200)', r.status === 200 && r.json?.ok === true && r.json?.mode === 'gated', r.json);
  ok('  ...with the meeting link', r.json?.meeting === ZOOM, r.json);
  ok('  ...with names as first name + last initial', JSON.stringify(r.json?.names) === JSON.stringify(['Marie W.', 'Sarah M.', 'José Á.']), r.json);
  ok('  ...and a name that is not plainly a name is dropped (not "oddname")', !JSON.stringify(r.json?.names).includes('x@contact') && r.json.names.length === 3, r.json);
  // THE central PII assertion: the successful list carries no email, phone, business or surname.
  ok('  ⛔ the registrant list contains NO email, phone, business or surname', !leaksPII(r.json), r.json);

  // The email is a verifier, not a selector: matches case-insensitively, like rsvp.js.
  r = await post(env, { event_id: EVENT, email: '  MARIE@Example.com  ' });
  ok('the email check is case- and whitespace-insensitive', r.status === 200 && r.json?.ok === true && dataPresent(r.json), r.json);

  // A registrant for ANOTHER event cannot use that to see THIS one.
  DB.raw.prepare('INSERT INTO events (id,title,capacity,closed) VALUES (?,?,?,0)').run('other-event', 'Other', null);
  DB.raw.prepare('INSERT INTO rsvps (event_id,name,email,email_key,guests) VALUES (?,?,?,?,0)').run('other-event', 'Nina Other', 'nina@example.com', 'nina@example.com');
  r = await post(env, { event_id: EVENT, email: 'nina@example.com' });
  ok('a registrant for a DIFFERENT event is rejected for this one (403)', r.status === 403 && !dataPresent(r.json), r.json);

  // Bad / missing inputs.
  ok('a malformed email is a 400', (await post(env, { event_id: EVENT, email: 'not-an-email' })).status === 400);
  ok('a missing email is a 400 in gated mode', (await post(env, { event_id: EVENT })).status === 400);
  ok('an unknown event is a 404 (POST)', (await post(env, { event_id: 'ghost', email: 'marie@example.com' })).status === 404);
  ok('an unknown event is a 404 (GET)', (await get(env, '?event_id=ghost')).status === 404);
  ok('a GET with no event_id is a 400', (await get(env, '')).status === 400);

  ok('the endpoint made ZERO outbound calls (commits nothing, like /api/rsvp)', calls.length === 0, calls);
}

/* ========== PROVE THE NEGATIVE CONTROL HAS TEETH: break the gate, watch it leak ========== */
{
  const DB = makeDB(); seed(DB);
  const env = baseEnv(DB);

  /* A DB whose registrant-existence check ALWAYS matches = the gate can never reject.
     Everything else passes through untouched. This is the one line of the gate broken. */
  const brokenGate = {
    raw: DB.raw,
    prepare: (sql) => /FROM rsvps WHERE event_id = \? AND email_key = \?/.test(sql)
      ? { bind: () => ({ first: async () => ({ ok: 1 }) }) }
      : DB.prepare(sql),
  };

  const stranger = { event_id: EVENT, email: 'stranger@nowhere.com' };
  const real = await post(env, stranger);
  const broken = await post(baseEnv(brokenGate), stranger);

  ok('with the REAL gate, the stranger gets 403 and no data', real.status === 403 && !dataPresent(real.json), real.json);
  ok('with the gate BROKEN (match-everyone), the SAME stranger gets 200 WITH data — i.e. the control above would go red',
     broken.status === 200 && dataPresent(broken.json), broken.json);
  ok('  ...so the 403 in the negative control is the gate doing its job, not an empty event or a dead route',
     real.status !== broken.status && !dataPresent(real.json) && dataPresent(broken.json));

  // And the detector predicates themselves fire on known inputs (so a "clean" result can't be instrument failure).
  ok('control: dataPresent() fires on a leaked list', dataPresent({ ok: true, names: ['Sarah M.'], meeting: ZOOM }) === true);
  ok('control: dataPresent() is false on an empty rejection', dataPresent({ ok: false, error: 'no' }) === false);
  ok('control: leaksPII() fires on a response carrying an email', leaksPII({ ok: true, names: ['marie@example.com'] }) === true);
}

/* ================= public mode (REGISTRANT_VIEW = "public") ================= */
{
  const DB = makeDB(); seed(DB);
  const env = publicEnv(DB);

  let r = await get(env, '?event_id=' + EVENT);
  ok('public GET returns the list to anyone (200, mode=public)', r.status === 200 && r.json?.mode === 'public' && dataPresent(r.json), r.json);
  ok('  ...with the meeting link and names', r.json?.meeting === ZOOM && JSON.stringify(r.json?.names) === JSON.stringify(['Marie W.', 'Sarah M.', 'José Á.']), r.json);
  ok('  ⛔ and STILL no email / phone / surname in public mode', !leaksPII(r.json), r.json);

  r = await post(env, { event_id: EVENT });   // email not required in public mode
  ok('public POST needs no email and returns the list', r.status === 200 && dataPresent(r.json), r.json);

  /* The gate is load-bearing by config: the SAME stranger rejected in gated mode is answered here. */
  r = await post(env, { event_id: EVENT, email: 'stranger@nowhere.com' });
  ok('the stranger rejected under the gate IS served when REGISTRANT_VIEW=public (so the gate is the thing deciding)',
     r.status === 200 && dataPresent(r.json), r.json);
}

/* ================= the default is "gated" for every value that isn't exactly "public" ================= */
{
  const DB = makeDB(); seed(DB);
  for (const v of [undefined, '', 'Public', 'PUBLIC', 'gated', 'yes', '1', 'true', ' public ']) {
    const env = baseEnv(DB, v === undefined ? {} : { REGISTRANT_VIEW: v });
    const g = await get(env, '?event_id=' + EVENT);
    const stranger = await post(env, { event_id: EVENT, email: 'stranger@nowhere.com' });
    ok(`REGISTRANT_VIEW=${JSON.stringify(v)} is treated as GATED (GET mode=gated, stranger 403)`,
       g.json?.mode === 'gated' && !dataPresent(g.json) && stranger.status === 403 && !dataPresent(stranger.json),
       { get: g.json, stranger: stranger.json });
  }
  // ...and ONLY the exact string opens it.
  ok('only the exact string "public" opens the view', (await get(publicEnv(DB), '?event_id=' + EVENT)).json?.mode === 'public');
}

/* ================= graceful degradation + guards ================= */
{
  const DB = makeDB(); seed(DB);

  // Method guard.
  const put = await mod.onRequest({ request: new Request('https://wcaa.test/api/registrants', { method: 'PUT' }), env: baseEnv(DB) });
  ok('PUT is 405 with Allow: GET, POST', put.status === 405 && put.headers.get('Allow') === 'GET, POST');

  // No DB bound: cannot verify the gate, so fail closed with no data.
  let r = await post({ SESSION_SECRET: 's' }, { event_id: EVENT, email: 'marie@example.com' });
  ok('no DB bound fails closed (503) with no data', r.status === 503 && !dataPresent(r.json), r.json);
  r = await get({ SESSION_SECRET: 's' }, '?event_id=' + EVENT);
  ok('  ...and a GET with no DB also fails closed (503)', r.status === 503 && !dataPresent(r.json), r.json);

  // No event_links table yet (migration 0002 not applied): a registrant still gets the roster, link null.
  const legacy = makeDB({ only0001: true }); seed(legacy, { link: null });
  r = await post(baseEnv(legacy), { event_id: EVENT, email: 'marie@example.com' });
  ok('with no event_links table the roster still returns, meeting = null', r.status === 200 && r.json?.ok === true && r.json?.meeting === null && r.json.names.length === 3, r.json);

  // A stored value that isn't a usable meeting link is never handed out.
  const bad = makeDB(); seed(bad, { link: 'javascript:alert(1)' });
  r = await post(baseEnv(bad), { event_id: EVENT, email: 'marie@example.com' });
  ok('a stored value that is not a Zoom/Meet/Teams link is returned as meeting = null', r.status === 200 && r.json?.meeting === null, r.json);

  // An event with no registrants: empty list, not an error (and no link leak).
  const empty = makeDB();
  empty.raw.prepare('INSERT INTO events (id,title,capacity,closed) VALUES (?,?,?,0)').run('empty-evt', 'Empty', null);
  empty.raw.prepare('INSERT INTO event_links (event_id,url) VALUES (?,?)').run('empty-evt', ZOOM);
  r = await post(publicEnv(empty), { event_id: 'empty-evt' });
  ok('an event with zero registrants returns an empty list (public)', r.status === 200 && Array.isArray(r.json?.names) && r.json.names.length === 0, r.json);
}

/* ================= brute-force limiter on the gated email check ================= */
{
  const DB = makeDB(); seed(DB);
  const env = baseEnv(DB);
  const ip = '203.0.113.9';
  let last;
  for (let i = 0; i < 8; i++) last = await post(env, { event_id: EVENT, email: `guess${i}@nowhere.com` }, { ip });
  ok('8 email guesses from one address are allowed (all correctly 403, none leak)', last.status === 403 && !dataPresent(last.json), last.json);
  const ninth = await post(env, { event_id: EVENT, email: 'guess9@nowhere.com' }, { ip });
  ok('the 9th guess from the same address is rate-limited (429), still no data', ninth.status === 429 && !dataPresent(ninth.json), ninth.json);
  // A different address is unaffected, and a real registrant there still gets in.
  const other = await post(env, { event_id: EVENT, email: 'marie@example.com' }, { ip: '198.51.100.7' });
  ok('a different address is not affected and a real registrant still gets the list', other.status === 200 && dataPresent(other.json), other.json);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
