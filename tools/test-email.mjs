/* Tests "Email all registrants" (functions/api/email.js) and server-side logout (logout.js + requireSession).
   Run: node tools/test-email.mjs

   Real SQL on real SQLite with the real migrations, like test-rsvp.mjs. The outbound Resend request is
   RECORDED exactly as the Worker sends it, so "everyone is in BCC and nobody is in To/CC" is asserted on
   the actual payload, not on a comment. What this cannot show is the headers a mail server finally
   writes — that needs a real key; it is the first live-send check (see README).

   Negative controls come first and carry the weight: an admin endpoint tested only with a valid session
   passes just as well with the guard deleted, and "nothing was sent" is only meaningful if the happy path
   in the same file shows a send being recorded. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { signToken, makeSessionCookie, sha256Hex } from '../functions/api/_lib.js';
import { onRequest as email } from '../functions/api/email.js';
import { onRequest as logout } from '../functions/api/logout.js';
import { onRequest as session } from '../functions/api/session.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 300))); }
};

class Stmt {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...a) { this.args = a; return this; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { success: true, meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; }
  async first() { const r = this.db.prepare(this.sql).get(...this.args); return r === undefined ? null : r; }
}
const makeDB = (files = ['0001_rsvps', '0002_links_and_limits', '0003_attendee_list', '0004_admin_2fa', '0005_email_and_logout']) => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const f of files) db.exec(readFileSync(join(ROOT, 'migrations', f + '.sql'), 'utf8'));
  return { raw: db, prepare: (sql) => new Stmt(db, sql) };
};
const seed = (DB, eventId, emails) => {
  DB.raw.prepare("INSERT OR IGNORE INTO events (id, title) VALUES (?, 'Test event')").run(eventId);
  emails.forEach((e, i) => DB.raw.prepare('INSERT INTO rsvps (event_id, name, email, email_key) VALUES (?, ?, ?, ?)').run(eventId, 'Person ' + i, e, e.toLowerCase() + '#' + i));
};

/* ---------- the provider: records every request, answers as told ---------- */
let sent = [];
let provider = () => new Response(JSON.stringify({ id: 'resend-msg-1' }), { status: 200 });
globalThis.fetch = async (url, init) => {
  sent.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
  return provider();
};

const SECRET = 'test-session-secret';
const KEY = 're_test_KEY_must_never_leak';
const newToken = async (sub = 'Denise', exp = Date.now() + 3600e3, extra = 0) =>
  signToken({ exp: exp + extra, sub }, SECRET);
const cookieOf = (t) => `wcaa_session=${t}`;
const T1 = await newToken('Denise', Date.now() + 3600e3, 0);
const T2 = await newToken('Denise', Date.now() + 3600e3, 1000);   // a second, different valid session
const envOf = (DB, extra = {}) => ({ DB, SESSION_SECRET: SECRET, RESEND_API_KEY: KEY, ...extra });
const post = (fn, path, body, token, env) => fn({
  request: new Request('https://wcaa.test' + path, {
    method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, token ? { cookie: cookieOf(token) } : {}),
    body: body === undefined ? undefined : JSON.stringify(body) }),
  env,
}).then(async (res) => ({ status: res.status, json: await res.clone().json().catch(() => null), cookie: res.headers.get('Set-Cookie') }));
const send = (env, body, token = T1) => post(email, '/api/email', body, token, env);
const whoami = (env, token) => session({ request: new Request('https://wcaa.test/api/session', { headers: token ? { cookie: cookieOf(token) } : {} }), env }).then((r) => r.status);

const EMAILS = ['a@x.org', 'b@x.org', 'C@x.org', 'c@X.org', 'd@x.org', 'e@x.org', 'f@x.org', 'g@x.org', 'h@x.org', 'i@x.org', 'j@x.org', 'not-an-address'];
const GOOD = { event_id: 'zoom-night', subject: 'Zoom link for Thursday', message: 'Hi all,\nJoin here: https://zoom.us/j/123' };
const FOOTER = 'For any inquiries, email dcanney@verizon.net';

/* ================= email: guards (negative controls first) ================= */
{
  const DB = makeDB(); seed(DB, 'zoom-night', EMAILS);
  let env = envOf(DB);
  let r = await send(env, GOOD, null);
  ok('no session → 401, nothing sent', r.status === 401 && sent.length === 0, r);
  r = await send(env, GOOD, 'garbage.token');
  ok('a forged token → 401, nothing sent', r.status === 401 && sent.length === 0, r);
  r = await post(email, '/api/email', undefined, T1, env).catch((e) => e);
  ok('a body that is not JSON → 400, nothing sent', r.status === 400 && sent.length === 0, r);
  r = await email({ request: new Request('https://wcaa.test/api/email', { method: 'GET', headers: { cookie: cookieOf(T1) } }), env });
  ok('GET → 405', r.status === 405 && sent.length === 0);
  r = await send({ ...env, RESEND_API_KEY: undefined }, GOOD);
  ok('no RESEND_API_KEY → 503 says so, nothing sent, no audit row', r.status === 503 && /isn’t set up/.test(r.json.error) && sent.length === 0
     && DB.raw.prepare('SELECT COUNT(*) n FROM email_sends').get().n === 0, r);
  for (const [label, patch] of [['empty subject', { subject: '   ' }], ['missing subject', { subject: undefined }], ['subject over 150', { subject: 'x'.repeat(151) }],
    ['empty message', { message: ' ' }], ['message over 10000', { message: 'x'.repeat(10001) }], ['no event', { event_id: '' }], ['non-string subject', { subject: ['a'] }]]) {
    r = await send(env, { ...GOOD, ...patch });
    ok(`${label} → 400, nothing sent`, r.status === 400 && sent.length === 0, r);
  }
  r = await send(env, { ...GOOD, event_id: 'nope' });
  ok('unknown event → 404, nothing sent', r.status === 404 && sent.length === 0, r);
}

/* ================= email: zero registrants ================= */
{
  const DB = makeDB(); seed(DB, 'zoom-night', []);
  const r = await send(envOf(DB), GOOD);
  ok('an event with 0 registrants: handled (409 + plain message), no provider call, no crash', r.status === 409 && /Nobody/.test(r.json.error) && sent.length === 0, r);
  ok('  ...and no audit row for a send that did not happen', DB.raw.prepare('SELECT COUNT(*) n FROM email_sends').get().n === 0);
}

/* ================= email: the happy path — BCC only, From, Reply-To, footer ================= */
{
  sent = [];
  const DB = makeDB(); seed(DB, 'zoom-night', EMAILS); seed(DB, 'other-event', ['stranger@x.org']);
  const env = envOf(DB);
  const r = await send(env, { ...GOOD, subject: 'Zoom link\r\nBcc: attacker@evil.test' });
  ok('send → 200 ok with the recipient count', r.status === 200 && r.json.ok === true && r.json.recipients === 10, r);
  ok('exactly ONE provider call, to the Resend API', sent.length === 1 && sent[0].url === 'https://api.resend.com/emails', sent.map((s) => s.url));
  const m = sent[0]?.body || {};
  ok('Authorization is the Worker secret as a Bearer token', sent[0]?.headers.Authorization === 'Bearer ' + KEY);
  ok('an Idempotency-Key is sent (a double-click or retry cannot send twice)', /^wcaa-send-\d+$/.test(sent[0]?.headers['Idempotency-Key'] || ''));
  const bcc = m.bcc || [];
  ok('BCC holds the 10 distinct, valid registrants (the case-duplicate and the non-address are not)', bcc.length === 10
     && ['a@x.org', 'b@x.org', 'C@x.org', 'd@x.org', 'j@x.org'].every((e) => bcc.includes(e)) && !bcc.includes('not-an-address') && !bcc.includes('c@X.org'), bcc);
  ok('no registrant of another event is included', !bcc.includes('stranger@x.org'));
  const visible = [].concat(m.to || [], m.cc || []);
  ok('To is only the reply-to officer; there is NO cc; NO registrant appears in To/CC', JSON.stringify(m.to) === '["dcanney@verizon.net"]' && !('cc' in m)
     && !bcc.some((e) => visible.map((v) => v.toLowerCase()).includes(e.toLowerCase())), { to: m.to, cc: m.cc });
  ok('From is notifications@wcaa-njsepachapter.com', /<notifications@wcaa-njsepachapter\.com>$/.test(m.from || ''), m.from);
  ok('Reply-To is the officer', m.reply_to === 'dcanney@verizon.net', m.reply_to);
  ok('the footer is appended server-side, after the message', m.text === GOOD.message + '\n\n--\n' + FOOTER, m.text);
  ok('plain text only: no html part', !('html' in m));
  ok('a CR/LF in the subject cannot add a header line (no newline survives)', !/[\r\n]/.test(m.subject) && !JSON.stringify(m).includes('\r'), m.subject);
  const row = DB.raw.prepare('SELECT * FROM email_sends').get();
  ok('audit row: who, when, subject, count, sent, provider id', row.sent_by === 'Denise' && row.event_id === 'zoom-night' && row.recipients === 10
     && row.status === 'sent' && row.provider_id === 'resend-msg-1' && !Number.isNaN(Date.parse(row.created_at)) && /^Zoom link/.test(row.subject), row);
  ok('no address and no secret in the audit row or the response', !JSON.stringify(row).includes('@x.org') && !JSON.stringify(row).includes(KEY) && !JSON.stringify(r.json).includes(KEY) && !JSON.stringify(r.json).includes('@'), r.json);

  // Configurable from / reply-to still get the footer for the address actually used.
  sent = [];
  await send(envOf(DB, { EMAIL_REPLY_TO: 'helene@example.org', EMAIL_FROM: 'WCAA <x@wcaa-njsepachapter.com>' }), GOOD);
  ok('EMAIL_REPLY_TO / EMAIL_FROM override, and the footer follows the reply-to', sent[0].body.reply_to === 'helene@example.org' && sent[0].body.from === 'WCAA <x@wcaa-njsepachapter.com>'
     && sent[0].body.text.endsWith('email helene@example.org'), sent[0].body);

  // HTML typed into the message is just text.
  sent = [];
  await send(env, { ...GOOD, message: '<script>alert(1)</script> https://zoom.us/j/1' });
  ok('markup in the message goes out as plain text, never as html', sent[0].body.text.startsWith('<script>') && !('html' in sent[0].body));
}

/* ================= email: provider failure is surfaced, never dropped ================= */
{
  const DB = makeDB(); seed(DB, 'zoom-night', EMAILS);
  const env = envOf(DB);
  sent = [];
  provider = () => new Response(JSON.stringify({ message: 'The domain is not verified' }), { status: 403 });
  let r = await send(env, GOOD);
  ok('provider says 403 → we say 502 with a plain message and ok:false', r.status === 502 && r.json.ok === false && /nothing was sent/.test(r.json.error), r);
  let row = DB.raw.prepare('SELECT * FROM email_sends ORDER BY id DESC').get();
  ok('  ...the audit row is "failed" with the reason, not "sent"', row.status === 'failed' && /403/.test(row.error) && row.provider_id === null, row);
  provider = () => { throw new Error('network down'); };
  r = await send(env, GOOD);
  row = DB.raw.prepare('SELECT * FROM email_sends ORDER BY id DESC').get();
  ok('provider unreachable → 502, audit "failed"', r.status === 502 && row.status === 'failed' && /network/.test(row.error), { r, row });
  provider = () => new Response('not json', { status: 200 });
  r = await send(env, GOOD);
  ok('a 200 whose body is not JSON still counts as sent (the provider accepted it)', r.status === 200 && DB.raw.prepare('SELECT status FROM email_sends ORDER BY id DESC').get().status === 'sent');
  provider = () => new Response(JSON.stringify({ id: 'resend-msg-1' }), { status: 200 });
}

/* ================= email: no audit table → no send ================= */
{
  const DB = makeDB(['0001_rsvps', '0002_links_and_limits', '0003_attendee_list', '0004_admin_2fa']); seed(DB, 'zoom-night', EMAILS);
  sent = [];
  const r = await send(envOf(DB), GOOD);
  ok('migration 0005 not applied → 409 "needs a one-time update", and NOTHING is sent', r.status === 409 && /one-time update/.test(r.json.error) && sent.length === 0, r);
}

/* ================= email: the 49-address ceiling ================= */
{
  const DB = makeDB(); seed(DB, 'big', Array.from({ length: 50 }, (_, i) => `p${i}@x.org`));
  sent = [];
  let r = await send(envOf(DB), { ...GOOD, event_id: 'big' });
  ok('50 registrants → refused with a clear message, nothing sent (Resend allows 50 addresses in total)', r.status === 409 && /50/.test(r.json.error) && sent.length === 0, r);
  const DB2 = makeDB(); seed(DB2, 'edge', Array.from({ length: 49 }, (_, i) => `p${i}@x.org`));
  r = await send(envOf(DB2), { ...GOOD, event_id: 'edge' });
  ok('49 registrants → sent (the ceiling is inclusive)', r.status === 200 && sent[0].body.bcc.length === 49, r);
}

/* ================= logout: the old token is dead on the server ================= */
{
  const DB = makeDB(); seed(DB, 'zoom-night', EMAILS);
  const env = envOf(DB);
  ok('before logout the token works (control)', (await whoami(env, T1)) === 200 && (await whoami(env, T2)) === 200);
  const r = await post(logout, '/api/logout', undefined, T1, env);
  ok('logout → 200 revoked:true and the cookie is cleared', r.status === 200 && r.json.revoked === true && /Max-Age=0/.test(r.cookie || ''), r);
  ok('REPLAYING the old token: /api/session now 401 (the server refuses it, not just the browser)', (await whoami(env, T1)) === 401);
  sent = [];
  const replay = await send(env, GOOD, T1);
  ok('  ...and an admin endpoint refuses it too (email → 401, nothing sent)', replay.status === 401 && sent.length === 0, replay);
  ok('another officer’s session is NOT signed out (this is not "log out everywhere")', (await whoami(env, T2)) === 200);
  const row = DB.raw.prepare('SELECT * FROM revoked_sessions').get();
  ok('only the hash of the token is stored, never the token', row.token_hash === await sha256Hex(T1) && !JSON.stringify(row).includes(T1.split('.')[0]), row);
  const again = await post(logout, '/api/logout', undefined, T1, env);
  ok('logging out twice is fine', again.status === 200 && DB.raw.prepare('SELECT COUNT(*) n FROM revoked_sessions').get().n === 1, again);
  DB.raw.prepare('INSERT INTO revoked_sessions (token_hash, expires_at) VALUES (?, ?)').run('old', Date.now() - 1000);
  await post(logout, '/api/logout', undefined, T2, env);
  ok('expired revocations are swept on the next logout', DB.raw.prepare("SELECT COUNT(*) n FROM revoked_sessions WHERE token_hash = 'old'").get().n === 0);
}

/* ================= logout: edge cases ================= */
{
  const env = envOf(makeDB());
  let r = await post(logout, '/api/logout', undefined, null, env);
  ok('logout with no cookie: ok, cookie cleared, nothing to revoke', r.status === 200 && r.json.revoked === false && /Max-Age=0/.test(r.cookie || ''), r);
  r = await post(logout, '/api/logout', undefined, 'garbage.token', env);
  ok('logout with a forged token: ok, and nothing is written', r.status === 200 && env.DB.raw.prepare('SELECT COUNT(*) n FROM revoked_sessions').get().n === 0, r);
  const old = makeDB(['0001_rsvps', '0002_links_and_limits', '0003_attendee_list', '0004_admin_2fa']);
  r = await post(logout, '/api/logout', undefined, T1, envOf(old));
  ok('before migration 0005: logout works as it always did (cookie cleared, revoked:false)', r.status === 200 && r.json.revoked === false && /Max-Age=0/.test(r.cookie || ''), r);
  ok('  ...and sign-in is unaffected without the table', (await whoami(envOf(old), T1)) === 200);
  const down = { prepare: () => { throw new Error('D1 is down'); } };
  r = await post(logout, '/api/logout', undefined, T1, envOf(down));
  ok('D1 failing at logout: 503 that says the server side did not happen, cookie STILL cleared', r.status === 503 && r.json.ok === false && /close this browser/.test(r.json.error) && /Max-Age=0/.test(r.cookie || ''), r);
  ok('D1 down at sign-in check: the editor stays usable (fails open, like the rest of the editor)', (await whoami(envOf(down), T1)) === 200);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
