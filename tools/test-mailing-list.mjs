/* Tests the chapter email list. Run: node tools/test-mailing-list.mjs

   Real SQL on real SQLite with the real migrations, like test-rsvp.mjs and test-email.mjs. The
   outbound Resend requests are RECORDED exactly as the Worker sends them, so "each person gets
   their own message and nobody sees anyone else" is asserted on the actual payload rather than on
   a comment.

   The claims that carry the weight here are the ones a careless version would still pass:
     - DEDUPLICATION. "The same person twice leaves one row" is tested from three directions —
       a second event sign-up, a repeated hand-typed add, and the same spreadsheet uploaded twice —
       because each one is a different code path into the same table.
     - COUNTING. The import reports how many were ADDED by subtracting two counts; a bug that
       reported rows-processed instead would look right on a first import and be wrong on the second.
     - PARTIAL SENDS. A batch that fails must not be reported as sent. The failure and the happy
       path are tested together so "delivered === recipients" is a fact about the code, not the test.

   Negative controls come first: an admin endpoint tested only with a valid session passes just as
   well with the guard deleted. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { signToken } from '../functions/api/_lib.js';
import { onRequest as listApi } from '../functions/api/mailing-list.js';
import { onRequest as importCsv } from '../functions/api/mailing-list/import.js';
import { onRequest as remove } from '../functions/api/mailing-list/delete.js';
import { onRequest as sendAll } from '../functions/api/mailing-list/send.js';
import { onRequest as backfillList } from '../functions/api/mailing-list/backfill.js';
import { onRequest as rsvp } from '../functions/api/rsvp.js';
import { parseCsv, peopleFromCsv } from '../functions/api/_mailing.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 300))); }
};

const ALL = ['0001_rsvps', '0002_links_and_limits', '0003_attendee_list', '0004_admin_2fa', '0005_email_and_logout', '0006_mailing_list'];

class Stmt {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...a) { this.args = a; return this; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { success: true, meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; }
  async first() { const r = this.db.prepare(this.sql).get(...this.args); return r === undefined ? null : r; }
}
const makeDB = (files = ALL) => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const f of files) db.exec(readFileSync(join(ROOT, 'migrations', f + '.sql'), 'utf8'));
  return {
    raw: db,
    prepare: (sql) => new Stmt(db, sql),
    batch: async (stmts) => { const out = []; for (const s of stmts) out.push(await s.run()); return out; },
  };
};
const rows = (DB) => DB.raw.prepare('SELECT * FROM mailing_list ORDER BY id').all();
const emails = (DB) => rows(DB).map((r) => r.email_key);

/* ---------- the network: records everything, answers as told ---------- */
let requests = [];
let resendReply = () => new Response(JSON.stringify({ data: [{ id: 'msg-1' }] }), { status: 200 });
globalThis.fetch = async (url, init) => {
  const u = String(url);
  /* Resend gets a JSON string (parsed, so the payload can be asserted); Turnstile gets a FormData,
     which must be left alone. Parsing everything as JSON is how this mock first reported a
     perfectly good sign-up as a captcha outage. */
  const entry = { url: u, headers: init && init.headers,
    body: init && typeof init.body === 'string' ? JSON.parse(init.body) : (init ? init.body : null) };
  requests.push(entry);
  if (u.includes('challenges.cloudflare.com')) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }
  if (u === 'https://api.resend.com/emails/batch') {
    return resendReply(requests.filter((r) => r.url === u).length - 1, entry);
  }
  throw new Error('unexpected outbound fetch to ' + u);
};

const SECRET = 'test-session-secret';
const KEY = 're_test_KEY_must_never_leak';
const envOf = (DB, extra = {}) => ({ DB, SESSION_SECRET: SECRET, RESEND_API_KEY: KEY, ...extra });
const token = await signToken({ exp: Date.now() + 3600e3, sub: 'Denise' }, SECRET);
const cookie = `wcaa_session=${token}`;

const call = async (mod, method, { env, body, query = '', auth = true, path = '/api/mailing-list' }) => {
  const headers = {};
  if (auth) headers.cookie = cookie;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const request = new Request('https://wcaa.test' + path + query, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await mod({ request, env });
  const type = res.headers.get('content-type') || '';
  const payload = type.includes('json') ? await res.clone().json().catch(() => null) : await res.clone().text();
  return { status: res.status, json: type.includes('json') ? payload : null, text: payload };
};
const get = (env, query = '', opts = {}) => call(listApi, 'GET', { env, query, ...opts });
const add = (env, body, opts = {}) => call(listApi, 'POST', { env, body, ...opts });
const importFile = (env, csv, opts = {}) => call(importCsv, 'POST', { env, body: { csv }, path: '/api/mailing-list/import', ...opts });
const del = (env, body, opts = {}) => call(remove, 'POST', { env, body, path: '/api/mailing-list/delete', ...opts });
const blast = (env, body, opts = {}) => call(sendAll, 'POST', { env, body, path: '/api/mailing-list/send', ...opts });
const backfill = (env, opts = {}) => call(backfillList, 'POST', { env, path: '/api/mailing-list/backfill', ...opts });

const GOOD = { subject: 'Chapter news for November', message: 'Hi all,\nMeeting is on the 12th.' };
const seedList = (DB, people) => {
  for (const [name, email] of people) {
    DB.raw.prepare("INSERT INTO mailing_list (name, email, email_key, source) VALUES (?, ?, ?, 'manual')").run(name, email, email.toLowerCase());
  }
};

/* ================= guards: no session, nothing happens ================= */
{
  const DB = makeDB();
  const env = envOf(DB);
  let r = await get(env, '', { auth: false });
  ok('listing the email list with no session → 401', r.status === 401 && r.json.ok === false, r.json);
  r = await add(env, { email: 'a@x.org' }, { auth: false });
  ok('adding with no session → 401, and nothing written', r.status === 401 && rows(DB).length === 0);
  r = await importFile(env, 'Name,Email\nA,a@x.org', { auth: false });
  ok('importing with no session → 401, and nothing written', r.status === 401 && rows(DB).length === 0);
  r = await del(env, { id: 1 }, { auth: false });
  ok('removing with no session → 401', r.status === 401);
  r = await blast(env, GOOD, { auth: false });
  ok('sending with no session → 401, and NO provider call', r.status === 401 && requests.length === 0, requests.length);

  const forged = await call(listApi, 'GET', { env, path: '/api/mailing-list', auth: false });
  /* A cookie whose signature does not match is as useless as no cookie. Asserted by calling with a
     token signed by a DIFFERENT secret, which is exactly what an attacker can produce. */
  const foreign = await signToken({ exp: Date.now() + 3600e3, sub: 'Denise' }, 'not-the-secret');
  const forgedRes = await listApi({
    request: new Request('https://wcaa.test/api/mailing-list', { headers: { cookie: `wcaa_session=${foreign}` } }),
    env,
  });
  ok('a valid session works, and a forged one is refused (the guard is real)', forged.status === 401
     && forgedRes.status === 401 && (await call(listApi, 'GET', { env, path: '/api/mailing-list' })).status === 200);
  r = await call(sendAll, 'GET', { env, path: '/api/mailing-list/send' });
  ok('GET on send → 405', r.status === 405);
  r = await del(env, { id: 'abc' });
  ok('a non-numeric id → 400', r.status === 400);
  r = await get({ ...env, DB: undefined });
  ok('no database bound → 500 that says so', r.status === 500 && /database/.test(r.json.error), r.json);
}

/* ================= the list does not exist yet (migration 0006 missing) ================= */
{
  const DB = makeDB(ALL.slice(0, 5));
  const env = envOf(DB);
  const r = await get(env);
  ok('before migration 0006: listing says the list isn’t set up, rather than crashing', r.status === 409 && /isn’t set up/.test(r.json.error), r.json);
  ok('  ...and flags it as a schema the panel can apply itself', r.json.needsSchema === true, r.json);
  const w = await blast(env, GOOD);
  ok('  ...and sending refuses the same way, with no provider call', w.status === 409 && requests.length === 0, w.json);
}

/* ================= adding one person, and the dedupe ================= */
{
  const DB = makeDB();
  const env = envOf(DB);
  let r = await add(env, { name: 'Denise Canney', email: 'denise@x.org' });
  ok('adding a person → ok, added:true', r.status === 200 && r.json.ok === true && r.json.added === true, r.json);
  ok('  ...one row, with the name and source "manual"', rows(DB).length === 1 && rows(DB)[0].name === 'Denise Canney' && rows(DB)[0].source === 'manual', rows(DB));

  r = await add(env, { name: 'Denise Canney', email: 'DENISE@X.ORG' });
  ok('the same address in capitals → added:false, still ONE row (case-insensitive)', r.json.added === false && rows(DB).length === 1, r.json);

  r = await add(env, { name: '', email: 'denise@x.org' });
  ok('  ...and a later add with a blank name does not wipe the name we had', rows(DB)[0].name === 'Denise Canney', rows(DB)[0]);

  r = await add(env, { name: 'Someone Else', email: 'denise@x.org' });
  ok('  ...nor does a different name overwrite it (the officer’s entry wins)', rows(DB)[0].name === 'Denise Canney', rows(DB)[0]);

  await add(env, { name: '', email: 'helene@x.org' });
  ok('an add with no name is allowed', rows(DB).length === 2 && rows(DB)[1].name === null, rows(DB)[1]);
  await add(env, { name: 'Helene Smith', email: 'helene@x.org' });
  ok('  ...and a name fills a blank one', rows(DB)[1].name === 'Helene Smith', rows(DB)[1]);

  r = await add(env, { name: 'Bad', email: 'not-an-address' });
  ok('an address that isn’t one → 400, nothing written', r.status === 400 && rows(DB).length === 2, r.json);
  r = await add(env, { name: 'x'.repeat(200), email: 'ok@x.org' });
  ok('a name over 120 characters → 400, nothing written', r.status === 400 && rows(DB).length === 2, r.json);
  r = await add(env, { email: '' });
  ok('a missing address → 400', r.status === 400);
}

/* ================= the panel reads the list ================= */
{
  const DB = makeDB();
  seedList(DB, [['Zoe Adams', 'zoe@x.org'], [null, 'alan@x.org'], ['Bea Carter', 'bea@x.org']]);
  const env = envOf(DB);
  const r = await get(env);
  ok('the list comes back ok with a count', r.status === 200 && r.json.ok === true && r.json.count === 3, r.json);
  ok('  ...with names, emails and where each came from', r.json.subscribers.length === 3 && r.json.subscribers[0].email === 'alan@x.org'
     && r.json.subscribers[0].name === '' && r.json.subscribers[0].source === 'manual', r.json.subscribers[0]);
  ok('  ...sorted by name, with a nameless person filed under their address', r.json.subscribers.map((s) => s.email).join(',')
     === 'alan@x.org,bea@x.org,zoe@x.org', r.json.subscribers.map((s) => s.email));

  const csv = await get(env, '?format=csv');
  ok('the spreadsheet download has just Name and Email (so it can be imported again cleanly)',
     /^Name,Email\r\n/.test(csv.text) && csv.text.split('\r\n').length === 5, csv.text);
}

/* ================= CSV import ================= */
{
  const DB = makeDB();
  const env = envOf(DB);

  // Quoted cell containing a comma — the reason this is a real parser and not split(',').
  const csv = 'Name,Email\r\n"Canney, Denise",denise@x.org\r\nHelene Smith,helene@x.org\r\nBea Carter,bea@x.org\r\nNo Address Here,\r\nDenise Again,DENISE@X.ORG\r\n';
  let r = await importFile(env, csv);
  ok('import → 3 added; the row with no address is reported as skipped',
     r.status === 200 && r.json.added === 3 && r.json.already === 0 && r.json.skipped === 1, r.json);
  ok('  ...a quoted name keeps its comma', rows(DB)[0].name === 'Canney, Denise', rows(DB)[0]);
  ok('  ...the duplicate INSIDE the file collapsed to one row', emails(DB).includes('denise@x.org') && rows(DB).length === 3, emails(DB));
  ok('  ...source is recorded as the spreadsheet', rows(DB).every((x) => x.source === 'csv'), rows(DB));

  r = await importFile(env, csv);
  ok('the SAME file again → 0 added, all 3 already on the list, and still 3 rows',
     r.json.added === 0 && r.json.already === 3 && rows(DB).length === 3, r.json);

  // The other column layouts an officer will actually produce.
  const DB2 = makeDB();
  await importFile(envOf(DB2), 'Email,First,Last\r\na@x.org,Jane,Doe\r\nb@x.org,John,Roe\r\n');
  ok('"Email,First,Last" reads correctly (first+last joined into the name)', rows(DB2).length === 2
     && rows(DB2)[0].name === 'Jane Doe' && rows(DB2)[0].email === 'a@x.org', rows(DB2));

  const DB3 = makeDB();
  await importFile(envOf(DB3), 'a@x.org\nb@x.org\n');
  ok('a bare column of addresses with no header works (blank names)', rows(DB3).length === 2
     && rows(DB3)[0].name === null, rows(DB3));

  const DB4 = makeDB();
  await importFile(envOf(DB4), '\uFEFFName,Email\r\nBOM Person,bom@x.org\r\n');
  ok('a UTF-8 BOM (Excel adds one) does not hide the header or corrupt the first name',
     rows(DB4).length === 1 && rows(DB4)[0].name === 'BOM Person' && rows(DB4)[0].email === 'bom@x.org', rows(DB4));

  // Overlap with people already on the list, from other paths.
  const DB5 = makeDB();
  await add(envOf(DB5), { name: 'Existing Person', email: 'existing@x.org' });
  const r5 = await importFile(envOf(DB5), 'Name,Email\r\nExisting Person,existing@x.org\r\nNew Person,new@x.org\r\n');
  ok('an import that overlaps the existing list adds only the new person', r5.json.added === 1 && r5.json.already === 1 && rows(DB5).length === 2, r5.json);
  ok('  ...and leaves the existing person’s row alone (source stays "manual")',
     rows(DB5).find((x) => x.email_key === 'existing@x.org').source === 'manual', rows(DB5));

  // Refusals.
  r = await importFile(env, '');
  ok('an empty file → 400', r.status === 400 && /empty/i.test(r.json.error), r.json);
  r = await importFile(env, 'Name,Phone\r\nNobody,555-1234\r\n');
  ok('a file with no email addresses at all → 400 that says what a good file looks like', r.status === 400 && /email addresses/.test(r.json.error), r.json);
  r = await importFile(env, 'x'.repeat(1000001));
  ok('a file over the size cap → 413, nothing written', r.status === 413 && rows(DB).length === 3, { status: r.status, rows: rows(DB).length });
  const many = ['Email'].concat(Array.from({ length: 5001 }, (_, i) => `p${i}@x.org`)).join('\n');
  r = await importFile(env, many);
  ok('more than 5,000 addresses in one file is refused with the limit named', r.status === 413 && /5000/.test(r.json.error), r.json);
}

/* ================= the parser itself ================= */
{
  const parsed = parseCsv('a,"b,c"\r\n"say ""hi""",d\n');
  ok('the CSV parser handles quotes, escaped quotes, CRLF and LF',
     JSON.stringify(parsed) === JSON.stringify([['a', 'b,c'], ['say "hi"', 'd']]), parsed);
  ok('blank lines are dropped', JSON.stringify(parseCsv('a\n\n\nb\n')) === JSON.stringify([['a'], ['b']]), parseCsv('a\n\n\nb\n'));
  const h = peopleFromCsv(parseCsv('Name,Email Address\na,b@x.org\n'));
  ok('a header row is recognised and not counted as a person', h.people.length === 1 && h.skipped === 0, h);
  ok('the name cap is applied', peopleFromCsv([['x'.repeat(400), 'a@x.org']]).people[0].name.length === 120);
}

/* ================= sending to everyone ================= */
{
  const DB = makeDB();
  const env = envOf(DB);
  let r = await blast(env, GOOD);
  ok('sending with an empty list → 409 "nobody on the list", no provider call, no audit row',
     r.status === 409 && /nobody/i.test(r.json.error) && requests.length === 0 && DB.raw.prepare('SELECT COUNT(*) n FROM list_sends').get().n === 0, r.json);

  seedList(DB, [['Denise Canney', 'denise@x.org'], [null, 'helene@x.org'], ['Bea', 'bea@x.org']]);
  requests = [];
  r = await blast(env, { ...GOOD, subject: 'Chapter news\r\nBcc: attacker@evil.test' });
  ok('a send → 200 with the delivered count', r.status === 200 && r.json.ok === true && r.json.delivered === 3 && r.json.failed === 0, r.json);
  ok('exactly ONE batch call, to Resend’s batch endpoint', requests.length === 1 && requests[0].url === 'https://api.resend.com/emails/batch', requests.map((x) => x.url));
  const payload = requests[0].body;
  ok('the payload is 3 separate messages, one address each', Array.isArray(payload) && payload.length === 3
     && payload.every((m) => Array.isArray(m.to) && m.to.length === 1), payload);
  ok('⚠ NOBODY SEES ANYONE ELSE: no bcc, no cc, no address in more than one message',
     payload.every((m) => !('bcc' in m) && !('cc' in m))
     && new Set(payload.flatMap((m) => m.to)).size === 3, payload.map((m) => m.to));
  ok('From is the chapter’s notifications address and Reply-To is the officer',
     /<notifications@wcaa-njsepachapter\.com>$/.test(payload[0].from) && payload[0].reply_to === 'dcanney@verizon.net', payload[0]);
  ok('the footer is appended server-side, including how to be taken off the list',
     payload[0].text.endsWith('email dcanney@verizon.net\nTo stop receiving these emails, reply and ask the chapter to take you off the list.')
     && payload[0].text.startsWith('Hi all,'), payload[0].text);
  ok('plain text only: no html part anywhere', payload.every((m) => !('html' in m)));
  ok('a CR/LF in the subject cannot add a header line', !/[\r\n]/.test(payload[0].subject) && !JSON.stringify(payload).includes('\\r'), payload[0].subject);
  ok('an Idempotency-Key is sent, per batch', /^wcaa-list-\d+-0$/.test(requests[0].headers['Idempotency-Key'] || ''), requests[0].headers['Idempotency-Key']);
  let row = DB.raw.prepare('SELECT * FROM list_sends').get();
  ok('audit row: who, subject, recipients, delivered, sent', row.sent_by === 'Denise' && row.recipients === 3 && row.delivered === 3
     && row.status === 'sent' && /^Chapter news/.test(row.subject) && !Number.isNaN(Date.parse(row.created_at)), row);
  ok('no address and no secret are stored in the audit row or echoed back',
     !JSON.stringify(row).includes('@x.org') && !JSON.stringify(row).includes(KEY) && !JSON.stringify(r.json).includes(KEY), r.json);

  // Validation, with nothing sent.
  requests = [];
  for (const [label, patch] of [['empty subject', { subject: '  ' }], ['subject over 150', { subject: 'x'.repeat(151) }],
    ['empty message', { message: '  ' }], ['message over 10000', { message: 'x'.repeat(10001) }], ['non-string subject', { subject: ['a'] }]]) {
    r = await blast(env, { ...GOOD, ...patch });
    ok(`${label} → 400, nothing sent`, r.status === 400 && requests.length === 0, r.json);
  }
  r = await blast(env, { ...GOOD, message: '<script>alert(1)</script> hello' });
  ok('markup in the message goes out as plain text, never as html',
     requests[0].body[0].text.startsWith('<script>') && !('html' in requests[0].body[0]));
  r = await blast({ ...env, RESEND_API_KEY: undefined }, GOOD);
  ok('no RESEND_API_KEY → 503 that says so, nothing sent', r.status === 503 && /isn’t set up/.test(r.json.error)
     && requests.length === 1, r.json);
}

/* ================= sending in batches, and telling the truth about failures ================= */
{
  const DB = makeDB();
  seedList(DB, Array.from({ length: 250 }, (_, i) => [`Person ${i}`, `p${i}@x.org`]));
  const env = envOf(DB);

  requests = [];
  resendReply = () => new Response(JSON.stringify({ data: [{ id: 'msg' }] }), { status: 200 });
  let r = await blast(env, GOOD);
  ok('250 people → 3 batch calls (100 + 100 + 50), all delivered',
     requests.length === 3 && requests.map((x) => x.body.length).join('+') === '100+100+50'
     && r.json.delivered === 250 && r.json.failed === 0 && r.json.status === 'sent', { calls: requests.map((x) => x.body.length), r: r.json });
  ok('  ...no address appears twice across the batches',
     new Set(requests.flatMap((x) => x.body.flatMap((m) => m.to))).size === 250);
  let row = DB.raw.prepare('SELECT * FROM list_sends ORDER BY id DESC').get();
  ok('  ...and the audit says 250 delivered', row.recipients === 250 && row.delivered === 250 && row.status === 'sent', row);

  // A middle batch fails: the rest must still go out, and the count must not claim success.
  requests = [];
  resendReply = (i) => (i === 1
    ? new Response(JSON.stringify({ message: 'One address was rejected' }), { status: 422 })
    : new Response(JSON.stringify({ data: [{ id: 'msg' }] }), { status: 200 }));
  r = await blast(env, GOOD);
  ok('a failed middle batch → 200 ok, delivered 150 of 250, failed 100, status partial',
     r.status === 200 && r.json.delivered === 150 && r.json.failed === 100 && r.json.status === 'partial', r.json);
  ok('  ...the batches AFTER the failure were still attempted (3 calls, not 2)', requests.length === 3, requests.length);
  row = DB.raw.prepare('SELECT * FROM list_sends ORDER BY id DESC').get();
  ok('  ...and the audit row is "partial" with the reason, never "sent"',
     row.status === 'partial' && row.delivered === 150 && /422/.test(row.error), row);

  // Every batch fails: nothing was sent, and the officer is told that.
  requests = [];
  resendReply = () => new Response(JSON.stringify({ message: 'The domain is not verified' }), { status: 403 });
  r = await blast(env, GOOD);
  ok('a 403 on the first batch → 502 "nothing was sent", and it stops instead of repeating 3 times',
     r.status === 502 && /nothing was sent/.test(r.json.error) && requests.length === 1, { r: r.json, calls: requests.length });
  row = DB.raw.prepare('SELECT * FROM list_sends ORDER BY id DESC').get();
  ok('  ...audit "failed", delivered 0, with the reason', row.status === 'failed' && row.delivered === 0 && /403/.test(row.error), row);

  resendReply = () => { throw new Error('network down'); };
  requests = [];
  r = await blast(env, GOOD);
  row = DB.raw.prepare('SELECT * FROM list_sends ORDER BY id DESC').get();
  ok('the provider being unreachable → 502, audit "failed", reason recorded',
     r.status === 502 && row.status === 'failed' && /network/.test(row.error), { r: r.json, row });
  resendReply = () => new Response(JSON.stringify({ data: [{ id: 'msg-1' }] }), { status: 200 });

  // The ceiling.
  const BIG = makeDB();
  seedList(BIG, Array.from({ length: 1001 }, (_, i) => [null, `q${i}@x.org`]));
  requests = [];
  r = await blast(envOf(BIG), GOOD);
  ok('1001 people → refused with the limit named, and nothing sent (a Function has one lifetime)',
     r.status === 409 && /1001/.test(r.json.error) && requests.length === 0, r.json);
}

/* ================= removing one person ================= */
{
  const DB = makeDB();
  seedList(DB, [['Denise', 'denise@x.org'], ['Helene', 'helene@x.org']]);
  const env = envOf(DB);
  const target = DB.raw.prepare("SELECT id FROM mailing_list WHERE email_key = 'denise@x.org'").get().id;
  let r = await del(env, { id: target });
  ok('removing a person → ok, and their row is gone', r.status === 200 && r.json.ok === true && rows(DB).length === 1, r.json);
  r = await del(env, { id: target });
  ok('removing the same person again → 404 (two officers are told, not both thanked)', r.status === 404, r.json);
  r = await get(env);
  ok('  ...and they are gone from the panel’s list too', r.json.subscribers.every((s) => s.email !== 'denise@x.org'), r.json.subscribers);
}

/* ================= signing up for an event adds you to the list ================= */
{
  const signUp = (env, eventId, name, email) => rsvp({
    request: new Request('https://wcaa.test/api/rsvp', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, name, email, 'cf-turnstile-response': 'tok' }),
    }),
    env,
  });

  const DB = makeDB();
  const env = envOf(DB, { TURNSTILE_SECRET: 'test-turnstile' });
  DB.raw.prepare("INSERT INTO events (id, title) VALUES ('zoom-night', 'Zoom night')").run();
  DB.raw.prepare("INSERT INTO events (id, title) VALUES ('holiday-party', 'Holiday party')").run();

  let res = await signUp(env, 'zoom-night', 'Denise Canney', 'denise@x.org');
  const first = await res.clone().json().catch(() => null);
  ok('an event sign-up still succeeds', res.status === 200 && first && first.ok === true, { status: res.status, body: first });
  ok('  ...and the person is now on the chapter email list, with their name', rows(DB).length === 1
     && rows(DB)[0].name === 'Denise Canney' && rows(DB)[0].email_key === 'denise@x.org', rows(DB));
  ok('  ...marked as coming from an event sign-up', rows(DB)[0].source === 'rsvp', rows(DB)[0]);

  await signUp(env, 'holiday-party', 'Denise Canney', 'DENISE@X.ORG');
  ok('the same person signing up for a SECOND event does not add a second row', rows(DB).length === 1, rows(DB));

  await signUp(env, 'holiday-party', 'Helene Smith', 'helene@x.org');
  ok('someone else signing up adds one row', rows(DB).length === 2, rows(DB));

  const listed = await get(env);
  ok('both are on the list the panel shows', listed.json.count === 2, listed.json);

  // The RSVP endpoint must still make no GitHub calls (see functions/api/rsvp.js).
  ok('signing up made no GitHub call — only Turnstile was contacted',
     requests.every((x) => !x.url.includes('github.com')), requests.map((x) => x.url));

  // Best-effort: 0006 not applied must not break a registration.
  const OLD = makeDB(['0001_rsvps', '0002_links_and_limits', '0003_attendee_list']);
  const oldEnv = envOf(OLD, { TURNSTILE_SECRET: 'test-turnstile' });
  OLD.raw.prepare("INSERT INTO events (id, title) VALUES ('zoom-night', 'Zoom night')").run();
  requests = [];
  res = await signUp(oldEnv, 'zoom-night', 'Early Bird', 'early@x.org');
  ok('before migration 0006: the sign-up still works and is still stored',
     res.status === 200 && OLD.raw.prepare('SELECT COUNT(*) n FROM rsvps').get().n === 1, res.status);
  ok('  ...the list failing is not shown to the person registering', (await res.json()).ok === true);

  // And a duplicate add by hand keeps the name from the sign-up.
  await add(env, { name: '', email: 'denise@x.org' });
  ok('adding an event registrant by hand changes nothing (they are already there, name kept)',
     rows(DB).length === 2 && rows(DB)[0].name === 'Denise Canney', rows(DB));
}

/* ================= catching up with sign-ups taken before the list existed =================
   The list only fills itself from the moment 0006 is live. Everyone who registered earlier is in
   `rsvps` and nowhere else, which is exactly the state of the real chapter database: 10 Holiday
   Brunch registrations, none of them on the chapter list. */
{
  const DB = makeDB();
  const env = envOf(DB);
  DB.raw.prepare("INSERT INTO events (id,title) VALUES ('holiday-party','Holiday party'),('zoom-night','Zoom night')").run();
  const addRsvp = DB.raw.prepare('INSERT INTO rsvps (event_id,name,email,email_key,created_at) VALUES (?,?,?,?,?)');
  addRsvp.run('holiday-party', 'Denise Canney', 'denise@x.org', 'denise@x.org', '2026-09-01T00:00:00Z');
  addRsvp.run('zoom-night', '', 'DENISE@X.ORG', 'denise@x.org', '2026-10-01T00:00:00Z');   // later, no name
  addRsvp.run('holiday-party', 'Helene Smith', 'helene@x.org', 'helene@x.org', '2026-09-02T00:00:00Z');
  addRsvp.run('zoom-night', 'Oliver Old', 'old@x.org', 'old@x.org', '2026-09-03T00:00:00Z');

  // Two people an officer already typed in: one has a name worth keeping, one is blank.
  seedList(DB, [['D. Canney', 'denise@x.org']]);
  DB.raw.prepare("INSERT INTO mailing_list (name,email,email_key,source) VALUES ('', 'old@x.org', 'old@x.org', 'manual')").run();

  let g = await get(env);
  ok('the panel counts the event sign-ups missing from the list (distinct addresses, not RSVPs)',
     g.json.pending === 1, g.json);
  ok('  ...and the count is not confused by the two RSVPs from one person',
     DB.raw.prepare('SELECT COUNT(*) n FROM rsvps').get().n === 4 && rows(DB).length === 2, rows(DB));

  let r = await backfill(env, { auth: false });
  ok('backfilling with no session → 401, and nothing written', r.status === 401 && rows(DB).length === 2, r.json);

  r = await backfill(env);
  ok('backfilling adds the one missing person', r.status === 200 && r.json.ok === true && r.json.added === 1, r.json);
  ok('  ...one row per address, even though Denise signed up twice',
     rows(DB).filter((x) => x.email_key === 'denise@x.org').length === 1, rows(DB));
  ok('  ...a name typed in by hand is kept', rows(DB).find((x) => x.email_key === 'denise@x.org').name === 'D. Canney', rows(DB));
  ok('  ...a blank name already on the list is filled from the sign-up',
     rows(DB).find((x) => x.email_key === 'old@x.org').name === 'Oliver Old', rows(DB));
  ok('  ...and the person only on an event arrives with their name and source "rsvp"',
     rows(DB).find((x) => x.email_key === 'helene@x.org')?.name === 'Helene Smith'
     && rows(DB).find((x) => x.email_key === 'helene@x.org')?.source === 'rsvp', rows(DB));

  g = await get(env);
  ok('after catching up, the panel has nothing left to offer', g.json.pending === 0, g.json);
  ok('  ...and the list is exactly the people involved', g.json.count === 3, g.json);

  r = await backfill(env);
  ok('pressing it again adds nobody (0 added, list unchanged)', r.json.added === 0 && rows(DB).length === 3, r.json);

  const BEFORE = makeDB(ALL.slice(0, 5));
  r = await backfill(envOf(BEFORE));
  ok('before migration 0006: caught clearly, and flagged for the panel’s Set up button',
     r.status === 409 && r.json.needsSchema === true, r.json);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
