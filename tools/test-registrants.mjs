/* Tests the "List of registrants" backend (functions/api/registrants.js).
 * Run: node tools/test-registrants.mjs
 *
 * Same discipline as tools/test-rsvp.mjs: the REAL SQL runs against REAL SQLite
 * (node:sqlite) with the REAL migration files applied, and every outbound fetch is
 * recorded (the only one this endpoint may make is Turnstile, never GitHub).
 *
 * The things this file exists to prove, each from the failing side and each with a
 * control so a green result can't be instrument failure:
 *
 *   1. OPT-IN ONLY. The public/registrant-facing roster shows ONLY people who ticked
 *      "show my name" (register.html's written promise). An opted-OUT registrant is
 *      NOT in it — but IS visible to the officer through the authenticated admin
 *      (/api/rsvps). Teeth: the pre-opt-in query (plain SELECT name FROM rsvps) DOES
 *      return the opted-out name, so the JOIN is what excludes it — not an empty event.
 *
 *   2. THE EMAIL GATE. In "gated" mode a non-registered email gets nothing (403, no
 *      names, no link). Teeth: the SAME request against a gate short-circuited to
 *      always-match leaks — exactly what the control would catch.
 *
 *   3. THE BOT CHECK. The gated POST (the one that could be an email-exists oracle)
 *      requires a valid Turnstile token, BEFORE the database is touched. Tested from
 *      the failing side: no secret -> 500; failed/absent token -> 400; and a real
 *      registrant with a BAD token is refused, so the token is load-bearing.
 *
 *   4. NO EMAIL EVER LEAVES. No viewer-facing response carries a registrant's email,
 *      phone, business, note or surname — asserted against the serialised JSON.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { signToken, makeSessionCookie } from '../functions/api/_lib.js';

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

/* ---------- outbound-fetch recorder: Turnstile only, never GitHub ---------- */
let calls = [];
let turnstileVerdict = true;
globalThis.fetch = async (url) => {
  calls.push(String(url));
  if (String(url).includes('challenges.cloudflare.com')) {
    return new Response(JSON.stringify({ success: turnstileVerdict }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  throw new Error('unexpected outbound fetch to ' + url);
};

const SECRET = 'test-session-secret';
const mod = { path: '/api/registrants', onRequest: (await import('../functions/api/registrants.js')).onRequest };
const rsvps = { path: '/api/rsvps', onRequest: (await import('../functions/api/rsvps.js')).onRequest };   // the officer's admin list
const COOKIE = makeSessionCookie(await signToken({ exp: Date.now() + 3600e3, sub: 'Denise' }, SECRET), 3600);

const baseEnv = (DB, extra = {}) => Object.assign({ DB, SESSION_SECRET: SECRET, TURNSTILE_SECRET: 'test-turnstile-secret' }, extra);
const publicEnv = (DB) => baseEnv(DB, { REGISTRANT_VIEW: 'public' });

const get = async (env, query = '', { ip, cookie, m = mod } = {}) => {
  const headers = {};
  if (ip) headers['CF-Connecting-IP'] = ip;
  if (cookie) headers.cookie = cookie;
  const request = new Request('https://wcaa.test' + m.path + query, { method: 'GET', headers });
  const res = await m.onRequest({ request, env });
  let json = null; try { json = await res.clone().json(); } catch {}
  return { status: res.status, json, res };
};
const post = async (env, body, { ip } = {}) => {
  const headers = { 'content-type': 'application/json' };
  if (ip) headers['CF-Connecting-IP'] = ip;
  const request = new Request('https://wcaa.test' + mod.path, { method: 'POST', headers, body: JSON.stringify(body) });
  const res = await mod.onRequest({ request, env });
  let json = null; try { json = await res.clone().json(); } catch {}
  return { status: res.status, json };
};
/* A gated POST carries the email AND a Turnstile token (the default-valid 'tok' unless overridden). */
const gated = (email, over = {}) => Object.assign({ event_id: EVENT, email, 'cf-turnstile-response': 'tok' }, over);

/* ---------- seed: an event, some registrants, a Zoom link, and who opted in ---------- */
const EVENT = 'oct-15-somfy';
//            name,                      email,                 phone,            business,               LISTED (ticked "show my name")?
const SEEDED = [
  ['Marie Weaverling',       'marie@example.com',   '(610) 331-5474', 'Weaverling Interiors', true],
  ['Sarah Miller',           'sarah@example.com',   '(215) 555-0144', 'Miller Blinds',        true],
  ['José Álvarez',           'jose@example.com',    null,             null,                   false],  // OPTED OUT — a registrant, not on the list
  ['x@contact.com 555-0199', 'oddname@example.com', null,             null,                   true],   // listed, but the "name" isn't a name -> dropped
];
const ZOOM = 'https://us02web.zoom.us/j/555123';
const EMAILS = SEEDED.map((r) => r[1]);
const EXPECTED_ROSTER = ['Marie W.', 'Sarah M.'];   // opted-in AND a real name

const seed = (DB, { link = ZOOM, event = EVENT } = {}) => {
  DB.raw.prepare('INSERT INTO events (id,title,capacity,closed) VALUES (?,?,?,0)').run(event, 'SOMFY Zigbee Motorization', null);
  for (const [name, email, phone, business, listed] of SEEDED) {
    const key = email.toLowerCase();
    DB.raw.prepare('INSERT INTO rsvps (event_id,name,email,email_key,phone,business,guests) VALUES (?,?,?,?,?,?,0)').run(event, name, email, key, phone, business);
    if (listed) { try { DB.raw.prepare('INSERT INTO rsvp_listed (event_id,email_key) VALUES (?,?)').run(event, key); } catch {} }
  }
  if (link) DB.raw.prepare('INSERT INTO event_links (event_id,url) VALUES (?,?)').run(event, link);
};

/* The predicates the security assertions turn on — exercised on known inputs below so a clean
   result can never be the detector failing to see. */
const dataPresent = (json) =>
  !!json && ((Array.isArray(json.names) && json.names.length > 0) || (typeof json.meeting === 'string' && json.meeting.length > 0));
const leaksPII = (json) => {
  const s = JSON.stringify(json || null);
  if (/@/.test(s)) return true;
  if (EMAILS.some((e) => s.toLowerCase().includes(e.toLowerCase()))) return true;
  if (/Weaverling|Miller|Álvarez|Alvarez/.test(s)) return true;
  if (/\d{3}\D{0,2}\d{4}/.test(s)) return true;
  return false;
};

/* ================= 1. OPT-IN ONLY (the consent fix) ================= */
{
  const DB = makeDB(); seed(DB);

  // A registrant passes the gate and gets the roster — of OPTED-IN people only.
  let r = await post(baseEnv(DB), gated('marie@example.com'));
  ok('a registrant gets the roster (200)', r.status === 200 && r.json?.ok === true, r.json);
  ok('  ...and it is OPTED-IN names only (Marie + Sarah), first name + last initial',
     JSON.stringify(r.json?.names) === JSON.stringify(EXPECTED_ROSTER), r.json);
  ok('  ...so the OPTED-OUT registrant (José) is NOT on the public roster', !JSON.stringify(r.json?.names).includes('José'), r.json);
  ok('  ...and the ticked-but-not-a-name sign-up is dropped (no "oddname", no "x@contact")', !JSON.stringify(r.json).includes('x@contact') && r.json.names.length === 2, r.json);
  ok('  ...with the meeting link', r.json?.meeting === ZOOM, r.json);
  ok('  ⛔ and NO email / phone / business / surname anywhere in the response', !leaksPII(r.json), r.json);

  // The OPTED-OUT person is still a real registrant: HE can open the view (his email passes the gate)...
  r = await post(baseEnv(DB), gated('jose@example.com'));
  ok('the opted-out registrant can still SEE the list (he registered) ...', r.status === 200 && r.json?.ok === true && dataPresent(r.json), r.json);
  ok('  ...but is not ON it, and it still leaks no PII', !JSON.stringify(r.json?.names).includes('José') && !leaksPII(r.json), r.json);

  // ...and the OFFICER sees everyone, José included, through the authenticated admin — unchanged.
  const admin = await get(baseEnv(DB), '?event_id=' + EVENT, { cookie: COOKIE, m: rsvps });
  ok('the officer, authenticated, sees ALL registrants including the opted-out one',
     admin.status === 200 && JSON.stringify(admin.json).includes('José Álvarez') && admin.json?.count === 4, admin.json);
  const adminUnauth = await get(baseEnv(DB), '?event_id=' + EVENT, { m: rsvps });
  ok('  ...and the admin list is 401 without a session (control: it is genuinely gated)', adminUnauth.status === 401);

  /* ⛔ TEETH: the exclusion is the opt-in JOIN, not an empty event. The pre-fix query returns José;
     the endpoint does not. If someone dropped the JOIN, the roster WOULD contain him. */
  const preFix = DB.raw.prepare('SELECT name FROM rsvps WHERE event_id = ? ORDER BY created_at, id').all(EVENT).map((x) => x.name);
  ok('control: the plain (pre-opt-in) query DOES include the opted-out registrant — so the JOIN is doing the work',
     preFix.includes('José Álvarez') && !JSON.stringify(EXPECTED_ROSTER).includes('José'), preFix);
}

/* ================= 2 + 3. the EMAIL gate and the BOT check (gated mode) ================= */
{
  const DB = makeDB(); seed(DB);
  const env = baseEnv(DB);

  // --- the bot check, from the failing side first (these are the oracle defence) ---
  turnstileVerdict = true;
  let r = await post(baseEnv(DB, { TURNSTILE_SECRET: undefined }), gated('marie@example.com'));
  ok('gated POST with NO Turnstile secret fails CLOSED (500), no data', r.status === 500 && !dataPresent(r.json), r.json);

  r = await post(env, gated('marie@example.com', { 'cf-turnstile-response': '' }));
  ok('gated POST with an ABSENT token is rejected (400), even for a real registrant', r.status === 400 && !dataPresent(r.json), r.json);

  turnstileVerdict = false;
  r = await post(env, gated('marie@example.com'));
  ok('gated POST with a FAILED challenge is rejected (400), even for a real registrant', r.status === 400 && !dataPresent(r.json), r.json);
  turnstileVerdict = true;

  // --- the email gate: NON-registrant with a VALID token still gets nothing ---
  r = await post(env, gated('stranger@nowhere.com'));
  ok('a verified request from a NON-registrant is REJECTED (403), no data', r.status === 403 && !dataPresent(r.json), r.json);
  ok('  ...and echoes no email / PII', !leaksPII(r.json), r.json);

  // --- happy path LAST, so a pass means both gates are real ---
  r = await post(env, gated('marie@example.com'));
  ok('a verified request from a REGISTRANT gets the list (200)', r.status === 200 && r.json?.ok === true && dataPresent(r.json), r.json);

  /* ⛔ TEETH on the bot check: the registrant who SUCCEEDS with a good token is REFUSED with a bad
     one — so the token is load-bearing, i.e. the oracle is closed to tokenless/scripted callers. */
  turnstileVerdict = false;
  const sameButBadToken = await post(env, gated('marie@example.com'));
  turnstileVerdict = true;
  ok('control: the SAME registrant is refused when the token is bad — the bot check is load-bearing',
     sameButBadToken.status === 400 && !dataPresent(sameButBadToken.json) && r.status === 200, { good: r.status, bad: sameButBadToken.status });

  // Email is a verifier, not a selector: case/space-insensitive, like rsvp.js.
  r = await post(env, gated('  MARIE@Example.com  '));
  ok('the email check is case- and whitespace-insensitive', r.status === 200 && dataPresent(r.json), r.json);

  // A registrant for a DIFFERENT event can't use that to open this one.
  DB.raw.prepare('INSERT INTO events (id,title,capacity,closed) VALUES (?,?,?,0)').run('other-event', 'Other', null);
  DB.raw.prepare('INSERT INTO rsvps (event_id,name,email,email_key,guests) VALUES (?,?,?,?,0)').run('other-event', 'Nina Other', 'nina@example.com', 'nina@example.com');
  r = await post(env, gated('nina@example.com'));
  ok('a registrant for a DIFFERENT event is rejected for this one (403)', r.status === 403 && !dataPresent(r.json), r.json);

  ok('a malformed email is a 400', (await post(env, gated('not-an-email'))).status === 400);
  ok('a missing email is a 400 in gated mode', (await post(env, { event_id: EVENT, 'cf-turnstile-response': 'tok' })).status === 400);
  ok('an unknown event is a 404 (POST)', (await post(env, gated('marie@example.com', { event_id: 'ghost' }))).status === 404);

  // GET reveals only the mode.
  r = await get(env, '?event_id=' + EVENT);
  ok('gated GET says mode=gated and reveals no names/link/PII',
     r.status === 200 && r.json?.mode === 'gated' && !dataPresent(r.json) && !('names' in r.json) && !leaksPII(r.json), r.json);
  ok('an unknown event is a 404 (GET)', (await get(env, '?event_id=ghost')).status === 404);
  ok('a GET with no event_id is a 400', (await get(env, '')).status === 400);
}

/* ========== TEETH on the email gate: break it (match-everyone) and watch it leak ========== */
{
  const DB = makeDB(); seed(DB);
  const brokenGate = {
    raw: DB.raw,
    prepare: (sql) => /FROM rsvps WHERE event_id = \? AND email_key = \?/.test(sql)
      ? { bind: () => ({ first: async () => ({ ok: 1 }) }) }
      : DB.prepare(sql),
  };
  const stranger = gated('stranger@nowhere.com');
  const real = await post(baseEnv(DB), stranger);
  const broken = await post(baseEnv(brokenGate), stranger);
  ok('with the REAL gate the stranger gets 403 and no data', real.status === 403 && !dataPresent(real.json), real.json);
  ok('with the gate BROKEN (match-everyone) the SAME stranger gets 200 WITH data — the control would go red',
     broken.status === 200 && dataPresent(broken.json), broken.json);

  // the detector predicates themselves fire / don't fire on known inputs.
  ok('control: dataPresent() fires on a leaked list', dataPresent({ ok: true, names: ['Sarah M.'], meeting: ZOOM }) === true);
  ok('control: dataPresent() is false on an empty rejection', dataPresent({ ok: false, error: 'no' }) === false);
  ok('control: leaksPII() fires on a response carrying an email', leaksPII({ ok: true, names: ['marie@example.com'] }) === true);
  ok('control: leaksPII() fires on a response carrying a surname', leaksPII({ ok: true, names: ['Marie Weaverling'] }) === true);
}

/* ================= public mode (REGISTRANT_VIEW = "public") ================= */
{
  const DB = makeDB(); seed(DB);
  const env = publicEnv(DB);
  calls = [];

  let r = await get(env, '?event_id=' + EVENT);
  ok('public GET returns the list to anyone (200, mode=public)', r.status === 200 && r.json?.mode === 'public' && dataPresent(r.json), r.json);
  ok('  ...OPTED-IN names only, still, and the meeting link', JSON.stringify(r.json?.names) === JSON.stringify(EXPECTED_ROSTER) && r.json?.meeting === ZOOM, r.json);
  ok('  ⛔ and STILL no email / phone / surname in public mode', !leaksPII(r.json), r.json);

  r = await post(env, { event_id: EVENT });   // no email AND no token required in public mode
  ok('public POST needs neither email nor Turnstile token and returns the list', r.status === 200 && dataPresent(r.json), r.json);
  ok('  ...and public mode made NO outbound calls (no Turnstile in public)', calls.length === 0, calls);

  // The gate is load-bearing by config: the stranger rejected under the gate is served here.
  r = await post(env, { event_id: EVENT, email: 'stranger@nowhere.com' });
  ok('the stranger rejected under the gate IS served when REGISTRANT_VIEW=public', r.status === 200 && dataPresent(r.json), r.json);
}

/* ================= the default is "gated" for every value that isn't exactly "public" ================= */
{
  const DB = makeDB(); seed(DB);
  for (const v of [undefined, '', 'Public', 'PUBLIC', 'gated', 'yes', '1', 'true', ' public ']) {
    const env = baseEnv(DB, v === undefined ? {} : { REGISTRANT_VIEW: v });
    const g = await get(env, '?event_id=' + EVENT);
    const stranger = await post(env, gated('stranger@nowhere.com'));
    ok(`REGISTRANT_VIEW=${JSON.stringify(v)} is GATED (GET mode=gated, stranger 403)`,
       g.json?.mode === 'gated' && !dataPresent(g.json) && stranger.status === 403 && !dataPresent(stranger.json), { get: g.json, stranger: stranger.json });
  }
  ok('only the exact string "public" opens the view', (await get(publicEnv(DB), '?event_id=' + EVENT)).json?.mode === 'public');
}

/* ================= graceful degradation + guards ================= */
{
  const DB = makeDB(); seed(DB);

  const put = await mod.onRequest({ request: new Request('https://wcaa.test/api/registrants', { method: 'PUT' }), env: baseEnv(DB) });
  ok('PUT is 405 with Allow: GET, POST', put.status === 405 && put.headers.get('Allow') === 'GET, POST');

  let r = await post({ SESSION_SECRET: 's', TURNSTILE_SECRET: 't' }, gated('marie@example.com'));
  ok('no DB bound fails closed (503), no data', r.status === 503 && !dataPresent(r.json), r.json);
  r = await get({ SESSION_SECRET: 's' }, '?event_id=' + EVENT);
  ok('  ...and a GET with no DB also fails closed (503)', r.status === 503 && !dataPresent(r.json), r.json);

  // No rsvp_listed table yet (migration 0003 not applied): a registrant still passes the gate and
  // gets the link, but the roster is EMPTY (nobody has opted in) — never an error.
  const no3 = makeDB({ no0003: true }); seed(no3);   // seed's rsvp_listed inserts silently no-op here
  r = await post(baseEnv(no3), gated('marie@example.com'));
  ok('with no rsvp_listed table the gate still works, roster empty (nobody opted in yet)',
     r.status === 200 && r.json?.ok === true && Array.isArray(r.json.names) && r.json.names.length === 0 && r.json.meeting === ZOOM, r.json);

  // No event_links table (0002): roster still lists opted-in people, link null.
  const only1 = makeDB({ only0001: true }); seed(only1, { link: null });   // no 0002 AND no 0003 -> no listed, no link
  r = await post(baseEnv(only1), gated('marie@example.com'));
  ok('with only migration 0001, the gate works and meeting = null (and roster empty, no rsvp_listed)',
     r.status === 200 && r.json?.meeting === null && r.json.names.length === 0, r.json);

  // A stored value that isn't a usable meeting link is never handed out.
  const badlink = makeDB(); seed(badlink, { link: 'javascript:alert(1)' });
  r = await post(baseEnv(badlink), gated('marie@example.com'));
  ok('a stored value that is not a Zoom/Meet/Teams link is returned as meeting = null', r.status === 200 && r.json?.meeting === null, r.json);

  // Zero opted-in registrants: empty list, not an error (and no link leak in gated success).
  const noneListed = makeDB();
  noneListed.raw.prepare('INSERT INTO events (id,title,capacity,closed) VALUES (?,?,?,0)').run('evt2', 'E', null);
  noneListed.raw.prepare('INSERT INTO rsvps (event_id,name,email,email_key,guests) VALUES (?,?,?,?,0)').run('evt2', 'Private Person', 'p@example.com', 'p@example.com');
  noneListed.raw.prepare('INSERT INTO event_links (event_id,url) VALUES (?,?)').run('evt2', ZOOM);
  r = await post(baseEnv(noneListed), gated('p@example.com', { event_id: 'evt2' }));
  ok('an event where nobody opted in returns an empty roster to a registrant (+ the link)',
     r.status === 200 && r.json.names.length === 0 && r.json.meeting === ZOOM, r.json);
}

/* ================= brute-force limiter behind the bot check ================= */
{
  const DB = makeDB(); seed(DB);
  const env = baseEnv(DB);
  const ip = '203.0.113.9';
  let last;
  for (let i = 0; i < 8; i++) last = await post(env, gated(`guess${i}@nowhere.com`), { ip });
  ok('8 verified guesses from one address are allowed (all correctly 403, none leak)', last.status === 403 && !dataPresent(last.json), last.json);
  const ninth = await post(env, gated('guess9@nowhere.com'), { ip });
  ok('the 9th from the same address is rate-limited (429), still no data', ninth.status === 429 && !dataPresent(ninth.json), ninth.json);
  const other = await post(env, gated('marie@example.com'), { ip: '198.51.100.7' });
  ok('a different address is unaffected and a real registrant still gets the list', other.status === 200 && dataPresent(other.json), other.json);
}

/* ================= the no-GitHub rule ================= */
{
  calls = [];
  const DB = makeDB(); seed(DB);
  await post(baseEnv(DB), gated('marie@example.com'));          // gated POST -> one Turnstile call
  await get(baseEnv(DB), '?event_id=' + EVENT);                 // GET -> no call
  ok('the gated check calls Turnstile (control: the recorder works)', calls.length >= 1, calls);
  ok('NO call went to GitHub', !calls.some((u) => u.includes('api.github.com')), calls);
  ok('the only outbound host is Turnstile', calls.every((u) => u.startsWith('https://challenges.cloudflare.com/')), calls);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
