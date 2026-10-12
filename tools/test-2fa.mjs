/* The editor's sign-in code (2FA): functions/api/_totp.js, /api/2fa and its part of /api/login.
   Run: node tools/test-2fa.mjs

   Against a real SQLite with the real migrations (same D1 adapter as test-registrants.mjs), and a clock
   this test moves, so "the same code twice" and "the next 30 seconds" are tested, not assumed. The
   refusals matter most: a 2FA that accepts everything passes every happy-path test. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { signToken, makeSessionCookie } from '../functions/api/_lib.js';
import { base32Encode, base32Decode, codeAt, matchStep, newRecoveryCodes, newSecret, otpauthUri } from '../functions/api/_totp.js';
import { onRequest as login } from '../functions/api/login.js';
import { onRequest as twofa } from '../functions/api/2fa.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 240))); }
};

/* ---------- the TOTP maths ---------- */
// RFC 6238 appendix B, SHA-1 (secret "12345678901234567890"): the 6-digit code is the last 6 of each 8-digit value.
const RFC = base32Encode(new TextEncoder().encode('12345678901234567890'));
ok('base32 of the RFC secret', RFC === 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', RFC);
for (const [t, want] of [[59, '287082'], [1111111109, '081804'], [1111111111, '050471'], [1234567890, '005924'], [2000000000, '279037'], [20000000000, '353130']]) {
  const got = await codeAt(RFC, Math.floor(t / 30));
  ok(`RFC 6238 vector T=${t} -> ${want}`, got === want, got);
}
ok('base32 "foobar" = MZXW6YTBOI (RFC 4648)', base32Encode(new TextEncoder().encode('foobar')) === 'MZXW6YTBOI');
let roundTrip = true;
for (let n = 0; n < 40; n++) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  if (base32Decode(base32Encode(b)).join() !== b.join()) roundTrip = false;
}
ok('base32 round-trips 0..39 random bytes', roundTrip);
ok('a new secret is 160 bits (32 base32 chars)', /^[A-Z2-7]{32}$/.test(newSecret()));
ok('setup link is an otpauth TOTP link naming the site', /^otpauth:\/\/totp\/WCAA%20website%3ADenise\?secret=[A-Z2-7]{32}&issuer=WCAA%20website&/.test(otpauthUri(newSecret(), 'Denise')));

const T0 = 1_760_000_000_000;   // a fixed instant, mid-step
const stepOf = (ms) => Math.floor(ms / 30000);
const S = newSecret();
const at = (ms) => codeAt(S, stepOf(ms));
ok('the current code matches its step', (await matchStep(S, await at(T0), T0)) === stepOf(T0));
ok('the code from 30 s ago still matches (clock drift)', (await matchStep(S, await at(T0 - 30000), T0)) === stepOf(T0) - 1);
ok('the code for 30 s ahead still matches', (await matchStep(S, await at(T0 + 30000), T0)) === stepOf(T0) + 1);
ok('a code 60 s old is refused', (await matchStep(S, await at(T0 - 60000), T0)) === null);
ok('a code 60 s ahead is refused', (await matchStep(S, await at(T0 + 60000), T0)) === null);
ok('another secret\'s code is refused', (await matchStep(newSecret(), await at(T0), T0)) === null);
ok('not 6 digits is refused', (await matchStep(S, '12345', T0)) === null && (await matchStep(S, 'abcdef', T0)) === null);

const codes = newRecoveryCodes();
ok('10 recovery codes, all different', codes.length === 10 && new Set(codes).size === 10);
ok('recovery codes are XXXXX-XXXXX with no look-alike characters', codes.every((c) => /^[ACDEFGHJKMNPQRTUVWXYZ2345679]{5}-[ACDEFGHJKMNPQRTUVWXYZ2345679]{5}$/.test(c)), codes);

/* ---------- the flow, against the real schema ---------- */
class Stmt {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { success: true, meta: { changes: r.changes } }; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; }
  async first() { const r = this.db.prepare(this.sql).get(...this.args); return r === undefined ? null : r; }
}
const makeDB = (files = ['0001_rsvps', '0002_links_and_limits', '0003_attendee_list', '0004_admin_2fa']) => {
  const db = new DatabaseSync(':memory:');
  for (const f of files) db.exec(readFileSync(join(ROOT, 'migrations', f + '.sql'), 'utf8'));
  return { raw: db, prepare: (sql) => new Stmt(db, sql) };
};

const realNow = Date.now;
let clock = realNow();
Date.now = () => clock;   // matchStep and the session cookie both read it
const hashHex = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const PASSWORD = 'Chapter!$26';
const SECRET = 'test-session-secret';
const PASSWORD_HASH = await hashHex(PASSWORD);
const envOf = (DB) => ({ DB, SESSION_SECRET: SECRET, ADMIN_PASSWORD_HASH: PASSWORD_HASH });
const COOKIE = makeSessionCookie(await signToken({ exp: clock + 24 * 3600e3, sub: 'Denise' }, SECRET), 3600);

const req = (path, { body, cookie, ip, method } = {}) => {
  const headers = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  if (ip) headers['CF-Connecting-IP'] = ip;
  return new Request('https://wcaa.test' + path, { method: method || (body ? 'POST' : 'GET'), headers, body: body ? JSON.stringify(body) : undefined });
};
const call = async (fn, request, env) => {
  const res = await fn({ request, env });
  let json = null; try { json = await res.clone().json(); } catch {}
  return { status: res.status, json, cookie: res.headers.get('Set-Cookie') };
};
const signIn = (env, extra = {}, ip) => call(login, req('/api/login', { body: { username: 'Denise', password: PASSWORD, ...extra }, ip }), env);
const api = (env, body, cookie = COOKIE) => call(twofa, req('/api/2fa', { body, cookie }), env);

/* Before migration 0004: nothing changes. */
let env = envOf(makeDB(['0001_rsvps', '0002_links_and_limits', '0003_attendee_list']));
let r = await signIn(env);
ok('without the 2FA table, the password alone signs in (as before)', r.status === 200 && /wcaa_session=/.test(r.cookie || ''), r);
r = await api(env);
ok('GET /api/2fa without the table: ready false', r.status === 200 && r.json.ready === false && r.json.on === false, r.json);
r = await api(env, { action: 'start', password: PASSWORD });
ok('setup refused until the database update runs', r.status === 409, r);

/* Table there, nothing set up. */
const DB = makeDB();
env = envOf(DB);
ok('no session -> 401', (await call(twofa, req('/api/2fa'), env)).status === 401);
r = await api(env);
ok('GET: ready, off', r.json?.ready === true && r.json.on === false && r.json.setting_up === false, r.json);
ok('the password alone signs in while 2FA is off', (await signIn(env)).status === 200);
r = await api(env, { action: 'start', password: 'wrong' });
ok('setup with the wrong password is refused (403, so the page does not think the session ended)', r.status === 403, r);
r = await api(env, { action: 'start', password: PASSWORD });
ok('setup with the password returns a secret + otpauth link', r.status === 200 && /^[A-Z2-7]{32}$/.test(r.json.secret) && r.json.uri.includes(r.json.secret), r.json);
const first = r.json.secret;

/* Started but not confirmed: NOT armed. */
ok('GET: setting up, still off', (await api(env)).json.setting_up === true);
ok('a half-finished setup locks nobody out: the password alone still signs in', (await signIn(env)).status === 200);
r = await api(env, { action: 'start', password: PASSWORD });
const second = r.json.secret;
ok('starting again replaces the waiting secret', second !== first);
r = await api(env, { action: 'confirm', code: await codeAt(first, stepOf(clock)) });
ok('a code from the REPLACED square does not switch it on', r.status === 403 && (await api(env)).json.on === false, r);
const right = await codeAt(second, stepOf(clock));
r = await api(env, { action: 'confirm', code: right === '000000' ? '111111' : '000000' });
ok('a wrong code does not switch it on', r.status === 403, r);

const confirmStep = stepOf(clock);
const confirmCode = await codeAt(second, confirmStep);
r = await api(env, { action: 'confirm', code: confirmCode });
ok('the right code switches it on and returns 10 recovery codes', r.status === 200 && r.json.on === true && r.json.recovery_codes?.length === 10, r.json);
const recovery = r.json.recovery_codes;
r = await api(env);
ok('GET: on, 10 recovery codes left', r.json.on === true && r.json.recovery_left === 10, r.json);
const row = DB.raw.prepare('SELECT * FROM admin_2fa').get();
ok('the recovery codes are stored hashed, never as typed', !recovery.some((c) => row.recovery.includes(c.replace('-', ''))) && !row.recovery.includes(recovery[0]), row.recovery.slice(0, 80));

/* Signing in, now that it's on. */
r = await signIn(env);
ok('the password alone now asks for the code (401 need2fa, no cookie)', r.status === 401 && r.json.need2fa === true && !r.cookie, r);
r = await call(login, req('/api/login', { body: { username: 'Denise', password: 'wrong', code: await codeAt(second, stepOf(clock)) } }), env);
ok('a wrong password with a good code: plain 401, need2fa NOT said (no oracle)', r.status === 401 && !r.json.need2fa && !r.cookie, r);
r = await signIn(env, { code: confirmCode });
ok('the code typed to confirm the setup cannot then sign in (same 30 s)', r.status === 401 && !r.cookie, r);
clock += 30000;
const c1 = await codeAt(second, stepOf(clock));
r = await signIn(env, { code: c1 });
ok('password + the current code signs in', r.status === 200 && /wcaa_session=/.test(r.cookie || ''), r);
r = await signIn(env, { code: c1 });
ok('the same code a second time is refused (replay)', r.status === 401 && !r.cookie, r);
r = await signIn(env, { code: await codeAt(second, stepOf(clock) - 1) });
ok('an older code still inside the window is refused once a newer one was used', r.status === 401, r);
clock += 30000;
r = await signIn(env, { code: ' ' + (await codeAt(second, stepOf(clock))).replace(/^(\d{3})/, '$1 ') });
ok('spaces in a typed code are ignored ("123 456")', r.status === 200, r);
clock += 30000;
r = await signIn(env, { code: await codeAt(first, stepOf(clock)) });
ok('a code from the abandoned first square is refused', r.status === 401, r);

/* Recovery codes. */
r = await signIn(env, { code: recovery[0].toLowerCase().replace('-', ' ') });
ok('a recovery code signs in (case and dash/space forgiven)', r.status === 200, r);
r = await signIn(env, { code: recovery[0] });
ok('the same recovery code a second time is refused', r.status === 401, r);
ok('GET: 9 recovery codes left', (await api(env)).json.recovery_left === 9);
r = await signIn(env, { code: 'AAAAA-AAAAA' });
ok('a made-up recovery code is refused', r.status === 401, r);

/* Adding a phone and switching off take the password AND a code. */
r = await api(env, { action: 'start', password: PASSWORD });
ok('adding a phone without a code is refused', r.status === 403 && r.json.need_code === true, r);
clock += 30000;
r = await api(env, { action: 'start', password: PASSWORD, code: await codeAt(second, stepOf(clock)) });
ok('adding a phone with password + code shows the SAME secret (it stays on)', r.status === 200 && r.json.secret === second && (await api(env)).json.on === true, r.json);
r = await api(env, { action: 'off', password: PASSWORD });
ok('switching off without a code is refused', r.status === 403 && (await api(env)).json.on === true, r);
clock += 30000;
r = await api(env, { action: 'off', password: 'wrong', code: await codeAt(second, stepOf(clock)) });
ok('switching off with the wrong password is refused', r.status === 403 && (await api(env)).json.on === true, r);
r = await api(env, { action: 'confirm', code: await codeAt(second, stepOf(clock)) });
ok('confirm while on is refused', r.status === 409, r);
r = await api(env, { action: 'off', password: PASSWORD, code: recovery[1] });
ok('switching off with password + a recovery code works', r.status === 200 && (await api(env)).json.on === false, r);
ok('after switching off, the password alone signs in again', (await signIn(env)).status === 200);
r = await signIn(env, { code: recovery[2] });
ok('...and an old recovery code is ignored rather than required', r.status === 200, r);

/* Setup restarted by another officer between reading the waiting secret and switching it on: the code
   belongs to a square nobody should use any more, so nothing switches on. */
const raceDB = makeDB();
const raced = envOf(raceDB);
const stale = (await api(raced, { action: 'start', password: PASSWORD })).json.secret;
const racing = { prepare: (sql) => {
  const st = raceDB.prepare(sql);
  if (/^UPDATE admin_2fa SET secret = pending/.test(sql)) raceDB.raw.prepare("UPDATE admin_2fa SET pending = ? WHERE id = 1").run(newSecret());
  return st;
} };
r = await api({ ...raced, DB: racing }, { action: 'confirm', code: await codeAt(stale, stepOf(clock)) });
ok('a setup restarted mid-confirm: 409, still off', r.status === 409 && (await api(raced)).json.on === false, r);

/* Fails CLOSED: if the database can't be read, a right password doesn't get past a 2FA that might be on. */
const broken = { prepare: () => ({ bind() { return this; }, first: async () => { throw new Error('D1_ERROR: network connection lost'); }, run: async () => ({ meta: { changes: 0 } }) }) };
r = await signIn(envOf(broken));
ok('a database error during sign-in -> 503, no cookie', r.status === 503 && !r.cookie, r);

/* Sign-in attempts are rate-limited per address (rate_hits from 0002). */
const lim = envOf(makeDB());
let codes429 = [];
for (let i = 0; i < 10; i++) codes429.push((await call(login, req('/api/login', { body: { username: 'Denise', password: 'guess' + i }, ip: '203.0.113.9' }), lim)).status);
ok('9th+ attempt from one address in 10 minutes -> 429', codes429.slice(0, 8).every((s) => s === 401) && codes429[8] === 429 && codes429[9] === 429, codes429);
r = await signIn(lim, {}, '203.0.113.9');
ok('...and the right password is refused too while limited', r.status === 429 && !r.cookie, r);
ok('another address is unaffected', (await signIn(lim, {}, '198.51.100.7')).status === 200);

Date.now = realNow;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
