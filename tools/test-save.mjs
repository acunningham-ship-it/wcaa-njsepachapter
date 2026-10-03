/* Tests the content validator and the save endpoint. Run: node tools/test-save.mjs
 *
 * The save path is the one place an officer can change what every visitor sees,
 * so the questions here are: does it refuse work it cannot render, does it tell
 * the officer WHERE the problem is, does it publish atomically, and does it
 * delete a page they removed.
 *
 * GitHub is stubbed with a fake that speaks the Git Data API and records every
 * request, which is what lets the "ONE commit, not N" rule be asserted rather
 * than described.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateContent, contentFingerprint } from '../js/validate-content.js';
import { BLOCK_TYPES } from '../js/blocks.js';
import { signToken, makeSessionCookie } from '../functions/api/_lib.js';
import { onRequest as save } from '../functions/api/save.js';
import { onRequest as contentApi } from '../functions/api/content.js';
import { DatabaseSync } from 'node:sqlite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 260))); }
};

const REAL_CONTENT = JSON.parse(read('content/pages.json'));
const REAL_SITE = JSON.parse(read('content/site.json'));
const clone = (x) => JSON.parse(JSON.stringify(x));

/* ================= the validator ================= */
{
  /* The single most important case: it must ACCEPT what the site actually ships.
     A validator that rejects the live content is worse than no validator — it
     locks the officer out of their own site on the first save. */
  const r = validateContent(REAL_CONTENT);
  ok('accepts the real content/pages.json', r.ok === true, r);
  ok('  ...and reports the page count', r.pages === REAL_CONTENT.pages.length, r);

  const bad = (label, mutate, expectPath) => {
    const doc = clone(REAL_CONTENT);
    mutate(doc);
    const res = validateContent(doc);
    ok(`rejects ${label}`, res.ok === false && (!expectPath || res.path === expectPath),
       { ok: res.ok, path: res.path, error: res.error });
  };

  bad('a missing pages array', (d) => { delete d.pages; }, 'pages');
  bad('an empty pages array', (d) => { d.pages = []; }, 'pages');
  bad('a page with no slug', (d) => { delete d.pages[1].slug; }, 'pages[1].slug');
  bad('a slug with a slash (path traversal shape)', (d) => { d.pages[1].slug = '../evil'; }, 'pages[1].slug');
  bad('a slug with a capital letter', (d) => { d.pages[1].slug = 'About'; }, 'pages[1].slug');
  bad('a duplicate slug', (d) => { d.pages[1].slug = 'index'; }, 'pages[1].slug');
  bad('content with no home page', (d) => { d.pages[0].slug = 'home'; }, 'pages');
  bad('an unknown block type', (d) => { d.pages[0].sections[0].blocks[0].type = 'iframe'; },
      'pages[0].sections[0].blocks[0].type');
  bad('a block with no type', (d) => { delete d.pages[0].sections[0].blocks[0].type; },
      'pages[0].sections[0].blocks[0].type');
  bad('a block that is not an object', (d) => { d.pages[0].sections[0].blocks[0] = 'heading'; },
      'pages[0].sections[0].blocks[0]');
  bad('an oversized string', (d) => { d.pages[0].sections[0].blocks[0].title = 'x'.repeat(8001); });
  bad('a page with neither hero nor sections', (d) => { delete d.pages[1].hero; d.pages[1].sections = []; }, 'pages[1]');
  bad('a hero with no title', (d) => { delete d.pages[1].hero.title; }, 'pages[1].hero.title');
  bad('sections that are not a list', (d) => { d.pages[1].sections = 'lots'; }, 'pages[1].sections');
  bad('an object where text belongs (would publish "[object Object]")',
      (d) => { d.pages[0].sections[0].blocks[0].title = { nested: 'object' }; });
  bad('a list where text belongs', (d) => { d.pages[0].sections[0].blocks[0].title = ['a', 'b']; });
  bad('an object nested inside a block item',
      (d) => { d.pages[3].sections[0].blocks[1].items[0].alt = { x: 1 }; });

  // Nesting depth, built rather than mutated so the shape is unmistakable.
  {
    const deep = (n) => (n === 0 ? { type: 'text', text: 'bottom' } : { type: 'group', blocks: [deep(n - 1)] });
    const doc = { pages: [{ slug: 'index', hero: { title: 'x' }, sections: [{ blocks: [deep(3)] }] }] };
    ok('allows nesting up to the limit', validateContent(doc).ok === true, validateContent(doc));
    const tooDeep = { pages: [{ slug: 'index', hero: { title: 'x' }, sections: [{ blocks: [deep(6)] }] }] };
    ok('rejects nesting past the limit', validateContent(tooDeep).ok === false);
  }

  // The error must name a real block type, or it cannot help anyone.
  {
    const doc = clone(REAL_CONTENT);
    doc.pages[0].sections[0].blocks[0].type = 'nope';
    const res = validateContent(doc);
    ok('the unknown-type error lists the valid types',
       BLOCK_TYPES.every((t) => res.error.includes(t)), res.error);
  }

  // The validator shares the renderer's registry rather than keeping its own copy.
  ok('every block type the renderer knows is accepted by the validator',
     BLOCK_TYPES.every((type) => {
       const doc = { pages: [{ slug: 'index', hero: { title: 'x' }, sections: [{ blocks: [{ type }] }] }] };
       return validateContent(doc).ok === true;
     }));
}

/* ================= a fake GitHub that speaks the Git Data API ================= */
let gh;
const resetGH = (previousContent) => {
  gh = {
    calls: [],
    blobs: 0,
    trees: [],
    commits: 0,
    refPatches: 0,
    refStatus: 200,
    previous: previousContent,
    previousSite: read('content/site.json'),
    blobBySha: {},
    blobContent: {},
  };
};
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const method = init.method || 'GET';
  gh.calls.push(method + ' ' + u.replace('https://api.github.com/repos/acunningham-ship-it/wcaa-njsepachapter', ''));
  const body = init.body ? JSON.parse(init.body) : null;
  const send = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

  if (/\/contents\/content\/pages\.json/.test(u)) {
    if (gh.previous === null) return send({}, 404);
    return send({ content: b64(gh.previous), sha: 'oldsha' });
  }
  if (/\/contents\/content\/site\.json/.test(u)) return send({ content: b64(gh.previousSite), sha: 'oldsite' });
  if (/\/git\/ref\/heads\//.test(u)) return send({ object: { sha: 'HEADSHA' } });
  if (/\/git\/commits\/HEADSHA/.test(u)) return send({ tree: { sha: 'BASETREE' } });
  if (/\/git\/blobs$/.test(u)) {
    gh.blobs++;
    const sha = 'blob' + gh.blobs;
    gh.blobBySha[sha] = Buffer.from(body.content, 'base64').toString('utf8');
    return send({ sha });
  }
  if (/\/git\/trees$/.test(u)) {
    gh.trees.push(body);
    for (const entry of body.tree) if (entry.sha) gh.blobContent[entry.path] = gh.blobBySha[entry.sha];
    return send({ sha: 'NEWTREE' });
  }
  if (/\/git\/commits$/.test(u)) { gh.commits++; gh.lastCommit = body; return send({ sha: 'NEWCOMMIT' }); }
  if (/\/git\/refs\/heads\//.test(u)) {
    gh.refPatches++;
    if (gh.refStatus !== 200) return new Response('conflict', { status: gh.refStatus });
    return send({ object: { sha: 'NEWCOMMIT' } });
  }
  throw new Error('unexpected GitHub call: ' + method + ' ' + u);
};

const SECRET = 'test-session-secret';
const ENV = { SESSION_SECRET: SECRET, GITHUB_TOKEN: 'ghp_test' };
const COOKIE = makeSessionCookie(await signToken({ exp: Date.now() + 3600e3, sub: 'Denise' }, SECRET), 3600);

const callSave = async (payload, { cookie = COOKIE, env = ENV } = {}) => {
  const headers = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  const request = new Request('https://wcaa.test/api/save', { method: 'POST', headers, body: JSON.stringify(payload) });
  const res = await save({ request, env });
  return { status: res.status, json: await res.clone().json() };
};

/* ================= save: refusals first ================= */
{
  resetGH(read('content/pages.json'));
  let r = await callSave({ content: REAL_CONTENT, site: REAL_SITE }, { cookie: null });
  ok('save is 401 with no session', r.status === 401, r.json);
  ok('  ...and touched GitHub not at all', gh.calls.length === 0, gh.calls);

  resetGH(read('content/pages.json'));
  r = await callSave({ content: REAL_CONTENT, site: REAL_SITE }, { env: { SESSION_SECRET: SECRET } });
  ok('save fails closed with no GITHUB_TOKEN', r.status === 500, r.json);
  ok('  ...and touched GitHub not at all', gh.calls.length === 0, gh.calls);

  resetGH(read('content/pages.json'));
  const broken = clone(REAL_CONTENT);
  broken.pages[0].sections[0].blocks[0].type = 'iframe';
  r = await callSave({ content: broken, site: REAL_SITE });
  ok('save refuses an unknown block type', r.status === 400, r.json);
  ok('  ...and names the path so it can be fixed', r.json?.path === 'pages[0].sections[0].blocks[0].type', r.json);
  ok('  ...and committed NOTHING', gh.commits === 0, gh.calls);

  resetGH(read('content/pages.json'));
  r = await callSave({ content: REAL_CONTENT, site: { brandMark: 'WCAA' } });
  ok('save refuses incomplete site settings', r.status === 400, r.json);
  ok('  ...and committed NOTHING', gh.commits === 0);
}

/* ================= save: the stale-editor check =================
   An officer's tab loaded content at T0; someone saved (or a developer pushed) at T1; the
   officer saves at T2. ghCommitFiles builds on the fresh head, so without this check the T0
   copy silently overwrites T1. `base` = fingerprint of what the editor loaded. */
{
  const base = await contentFingerprint(REAL_CONTENT, REAL_SITE);

  resetGH(read('content/pages.json'));
  let r = await callSave({ content: REAL_CONTENT, site: REAL_SITE, base });
  ok('stale check: an up-to-date editor saves', r.status === 200, r.json);
  ok('  ...and gets back the fingerprint of what it just saved (so its NEXT save passes)',
     r.json?.base === await contentFingerprint(REAL_CONTENT, REAL_SITE), r.json);

  const newer = clone(REAL_CONTENT);
  newer.pages[0].title = 'Changed by someone else';
  resetGH(JSON.stringify(newer, null, 2));
  r = await callSave({ content: REAL_CONTENT, site: REAL_SITE, base });
  ok('stale check: refuses when the branch content moved since the editor loaded', r.status === 409 && r.json?.stale === true, r.json);
  ok('  ...and committed NOTHING', gh.commits === 0 && gh.refPatches === 0, gh.calls);

  resetGH(read('content/pages.json'));
  gh.previousSite = JSON.stringify({ ...REAL_SITE, copyright: 'someone edited site.json' });
  r = await callSave({ content: REAL_CONTENT, site: REAL_SITE, base });
  ok('stale check: a site.json change counts too', r.status === 409, r.json);

  resetGH(JSON.stringify(REAL_CONTENT));   // same content, different whitespace
  r = await callSave({ content: REAL_CONTENT, site: REAL_SITE, base });
  ok('stale check: a pure reformat is NOT a change', r.status === 200, r.json);

  resetGH(JSON.stringify(newer, null, 2));
  r = await callSave({ content: REAL_CONTENT, site: REAL_SITE });
  ok('stale check: an old admin page that sends no base still saves (compat)', r.status === 200, r.json);
}

/* ================= save: sample text is refused SERVER-side too =================
   The admin disables Save on sample text, but the endpoint trusts nothing the page does:
   a hand-crafted POST with the 1feb57e placeholder must be refused and commit nothing. */
{
  resetGH(read('content/pages.json'));
  const doc = clone(REAL_CONTENT);
  const ev = (function find(bs) { for (const b of bs || []) { if (b.type === 'events') return b;
    const r = find(b.blocks) || find(b.left) || find(b.right); if (r) return r; } return null; })(doc.pages[0].sections[2].blocks);
  ev.items = [{ month: 'Jan', day: '1', title: 'New event' }];
  const r = await callSave({ content: doc, site: REAL_SITE });
  ok('server refuses the sample event ("New event")', r.status === 400 && /sample text/.test(r.json?.error || ''), r.json);
  ok('  ...and committed NOTHING', gh.commits === 0, gh.calls);
}

/* ================= save: the happy path ================= */
{
  resetGH(read('content/pages.json'));
  const r = await callSave({ content: REAL_CONTENT, site: REAL_SITE });
  ok('a valid save succeeds', r.status === 200 && r.json?.ok === true, r.json);

  ok('it made exactly ONE commit', gh.commits === 1, { commits: gh.commits });
  ok('it updated the ref exactly once', gh.refPatches === 1);
  ok('the commit has one parent (no force, no rewrite)',
     gh.lastCommit?.parents?.length === 1 && gh.lastCommit.parents[0] === 'HEADSHA', gh.lastCommit?.parents);

  const paths = gh.trees[0].tree.map((t) => t.path).sort();
  ok('the tree carries both content files',
     paths.includes('content/pages.json') && paths.includes('content/site.json'), paths);
  ok('the tree carries every generated page',
     REAL_CONTENT.pages.every((pg) => paths.includes(pg.slug + '.html')), paths);
  ok('the tree carries register.html (generated on every save, not a content page)', paths.includes('register.html'), paths);
  ok('the tree carries nothing else',
     paths.length === REAL_CONTENT.pages.length + 3, paths);   // + pages.json, site.json, register.html
  ok('it did NOT touch prototype.html or src/',
     !paths.some((p) => p === 'prototype.html' || p.startsWith('src/')), paths);
  ok('every written entry is a blob with a sha', gh.trees[0].tree.every((t) => t.type === 'blob' && t.sha));
  ok('the commit message says who saved it', /Saved from the site manager by Denise\./.test(gh.lastCommit.message),
     gh.lastCommit.message);

  /* The committed HTML must be the same bytes the local build produces, or the
     live site and `build-pages --check` disagree the moment anyone saves.
     ⛔ An earlier version of this check counted blobs and called that
     "byte-identical". It was named for a property it never tested — the fake now
     records what each blob CONTAINED, so this compares the actual bytes. */
  for (const name of ['index.html', 'about.html', 'join.html']) {
    ok(`the committed ${name} is byte-identical to the local build`,
       gh.blobContent[name] === read(name),
       { committed: (gh.blobContent[name] || '').length, local: read(name).length });
  }
}

/* ================= save: deleting a page ================= */
{
  const withExtra = clone(REAL_CONTENT);
  withExtra.pages.push({ slug: 'retired', hero: { title: 'Old page' }, sections: [] });
  resetGH(JSON.stringify(withExtra));

  const r = await callSave({ content: REAL_CONTENT, site: REAL_SITE });
  ok('saving without a page that used to exist succeeds', r.status === 200, r.json);
  ok('  ...and reports it as removed', JSON.stringify(r.json?.removed) === '["retired.html"]', r.json);
  const entry = gh.trees[0].tree.find((t) => t.path === 'retired.html');
  ok('  ...and the tree DELETES it (sha null)', entry && entry.sha === null, entry);
  ok('  ...in the same single commit', gh.commits === 1);
}

/* ================= save: someone else got there first ================= */
{
  resetGH(read('content/pages.json'));
  gh.refStatus = 409;
  const r = await callSave({ content: REAL_CONTENT, site: REAL_SITE });
  ok('a moved branch is reported as a conflict, not a success', r.status === 409, r.json);
  ok('  ...with a message that says what to do',
     /reload/i.test(r.json?.error || '') && /saved while you were editing/i.test(r.json?.error || ''), r.json);
}

/* ================= save: unparseable previous content ================= */
{
  resetGH('{ not json');
  const r = await callSave({ content: REAL_CONTENT, site: REAL_SITE });
  ok('an unreadable previous pages.json still saves', r.status === 200, r.json);
  ok('  ...and deletes nothing rather than guessing', JSON.stringify(r.json?.removed) === '[]', r.json);
}

/* ================= private meeting links + registration state (D1) =================
   ⛔ The repo is PUBLIC. A meeting link meant only for registrants must never be committed —
   not in pages.json, not in any generated page — and the D1 rows must follow the content. */
{
  class Stmt {
    constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
    bind(...a) { this.args = a; return this; }
    async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: r.changes } }; }
    async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; }
    async first() { const r = this.db.prepare(this.sql).get(...this.args); return r === undefined ? null : r; }
  }
  const makeDB = ({ failBatch = false, only0001 = false } = {}) => {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(read('migrations/0001_rsvps.sql'));
    if (!only0001) db.exec(read('migrations/0002_links_and_limits.sql'));
    return {
      raw: db,
      prepare: (sql) => new Stmt(db, sql),
      // D1's batch is one transaction: all or nothing.
      batch: async (stmts) => {
        if (failBatch) throw new Error('D1 unavailable');
        db.exec('BEGIN');
        try { for (const st of stmts) db.prepare(st.sql).run(...st.args); db.exec('COMMIT'); }
        catch (e) { db.exec('ROLLBACK'); throw e; }
        return stmts.map(() => ({ success: true }));
      },
    };
  };
  const evPage = (doc) => doc.pages.find((pg) => pg.slug === 'events');
  const evItems = (doc) => evPage(doc).sections[0].blocks.find((b) => b.type === 'events').items;
  const committedFiles = () => gh.blobContent;
  const PRIVATE = 'https://us02web.zoom.us/j/PRIVATE111';
  const PUBLIC = 'https://meet.google.com/pub-lic-xyz';

  const DB = makeDB();
  const doc = clone(REAL_CONTENT);
  Object.assign(evItems(doc)[0], { register: true, id: 'jun-18-centurion', meetingLink: PRIVATE, meetingPublic: false });
  Object.assign(evItems(doc)[1], { register: true, id: 'apr-16-lafayette', meetingLink: PUBLIC, meetingPublic: true });
  resetGH(read('content/pages.json'));
  let r = await callSave({ content: doc, site: REAL_SITE }, { env: { ...ENV, DB } });
  ok('a save with one private and one public meeting link succeeds', r.status === 200 && r.json?.ok, r.json);
  const leaked = Object.entries(committedFiles()).filter(([, body]) => body.includes('PRIVATE111')).map(([p]) => p);
  ok('⛔ the PRIVATE link is in NO committed file (pages.json, any page, register.html)', leaked.length === 0 && Object.keys(committedFiles()).length > 5, leaked);
  ok('  ...it is in D1 instead', DB.raw.prepare("SELECT url FROM event_links WHERE event_id = 'jun-18-centurion'").get()?.url === PRIVATE);
  const savedDoc = JSON.parse(committedFiles()['content/pages.json']);
  ok('  ...and the committed item keeps its registration switch and id, just not the link',
     evItems(savedDoc)[0].register === true && evItems(savedDoc)[0].id === 'jun-18-centurion' && !('meetingLink' in evItems(savedDoc)[0]), evItems(savedDoc)[0]);
  ok('the PUBLIC link stays in the content and is on the events page', evItems(savedDoc)[1].meetingLink === PUBLIC &&
     committedFiles()['events.html'].includes('href="' + PUBLIC + '" target="_blank" rel="noreferrer">Join the meeting</a>'));
  ok('  ...and is in D1 too (registrants see it on their confirmation)', DB.raw.prepare("SELECT url FROM event_links WHERE event_id = 'apr-16-lafayette'").get()?.url === PUBLIC);
  ok('both events are open for registration in D1',
     DB.raw.prepare("SELECT COUNT(*) n FROM events WHERE closed = 0 AND id IN ('jun-18-centurion','apr-16-lafayette')").get().n === 2);
  ok('the events page links each to register.html',
     committedFiles()['events.html'].includes('register.html?event=jun-18-centurion') && committedFiles()['events.html'].includes('register.html?event=apr-16-lafayette'));
  ok('the returned base is the fingerprint of what was COMMITTED (no private link)',
     r.json.base === await contentFingerprint(savedDoc, REAL_SITE));

  // /api/content puts the private link back for the editor, and fingerprints the STORED copy.
  gh.previous = committedFiles()['content/pages.json'];
  const getContent = async (env) => {
    const req = new Request('https://wcaa.test/api/content', { method: 'GET', headers: { cookie: COOKIE } });
    const res = await contentApi({ request: req, env });
    return { status: res.status, json: await res.clone().json() };
  };
  let c = await getContent({ ...ENV, DB });
  ok('/api/content (officers only) shows the private link in the editor', evItems(c.json.content)[0].meetingLink === PRIVATE && c.json.links === true, evItems(c.json.content)[0]);
  ok('  ...and its base matches the stored copy, so the next save is not refused as stale', c.json.base === r.json.base);
  const unauth = await contentApi({ request: new Request('https://wcaa.test/api/content'), env: { ...ENV, DB } });
  ok('/api/content is 401 without a session (the private link never leaves without one)', unauth.status === 401);
  c = await getContent({ ...ENV, DB: { prepare: () => { throw new Error('down'); } } });
  ok('D1 unreadable: content still loads, links:false, and the item carries NO link key (so a save leaves D1 alone)',
     c.status === 200 && c.json.links === false && !('meetingLink' in evItems(c.json.content)[0]), c.json.links);

  // Second save, built on what the editor loaded: registration off for one, link key absent, officer-closed kept.
  DB.raw.prepare("UPDATE events SET closed = 1 WHERE id = 'jun-18-centurion'").run();   // closed on the Sign-ups screen
  const next = clone(savedDoc);
  evItems(next)[1].register = false; evItems(next)[1].meetingPublic = true;
  r = await callSave({ content: next, site: REAL_SITE, base: r.json.base }, { env: { ...ENV, DB } });
  ok('a follow-up save with the returned base passes the stale check', r.status === 200, r.json);
  ok('turning registration OFF closes that event in D1', DB.raw.prepare("SELECT closed FROM events WHERE id = 'apr-16-lafayette'").get().closed === 1);
  ok('an event the officer closed on the Sign-ups screen STAYS closed while registration stays on',
     DB.raw.prepare("SELECT closed FROM events WHERE id = 'jun-18-centurion'").get().closed === 1);
  ok('an item saved WITHOUT a meetingLink key leaves its stored link alone',
     DB.raw.prepare("SELECT url FROM event_links WHERE event_id = 'jun-18-centurion'").get()?.url === PRIVATE);

  // Turning it back on reopens; an empty link removes it.
  gh.previous = committedFiles()['content/pages.json'];
  const third = JSON.parse(gh.previous);
  evItems(third)[1].register = true;
  evItems(third)[0].meetingLink = '';
  r = await callSave({ content: third, site: REAL_SITE }, { env: { ...ENV, DB } });
  ok('turning registration back ON reopens it', r.status === 200 && DB.raw.prepare("SELECT closed FROM events WHERE id = 'apr-16-lafayette'").get().closed === 0, r.json);
  ok('an EMPTY meeting link removes the stored one', !DB.raw.prepare("SELECT url FROM event_links WHERE event_id = 'jun-18-centurion'").get());

  // D1 down: nothing is committed (no Register button live in front of a database that refuses it).
  resetGH(read('content/pages.json'));
  r = await callSave({ content: doc, site: REAL_SITE }, { env: { ...ENV, DB: makeDB({ failBatch: true }) } });
  ok('if D1 can’t be updated, the save is refused with a plain message', r.status === 502 && /nothing was saved/.test(r.json.error), r.json);
  ok('  ...and NOTHING was committed', gh.commits === 0 && gh.blobs === 0, gh.calls.slice(-3));
  resetGH(read('content/pages.json'));
  r = await callSave({ content: doc, site: REAL_SITE }, { env: ENV });
  ok('no database bound at all: refused too, nothing committed', r.status === 502 && gh.commits === 0, r.json);
  // The real deploy window: code is live, migration 0002 isn't applied yet, so event_links doesn't exist.
  const DB01 = makeDB({ only0001: true });
  resetGH(read('content/pages.json'));
  r = await callSave({ content: doc, site: REAL_SITE }, { env: { ...ENV, DB: DB01 } });
  ok('migration 0002 not applied (no event_links table): a save with a meeting link is refused, nothing committed',
     r.status === 502 && /nothing was saved/.test(r.json.error) && gh.commits === 0 && gh.blobs === 0, r.json);
  ok('  ...and the batch rolled back whole: no half-written events rows',
     DB01.raw.prepare('SELECT COUNT(*) n FROM events').get().n === 0);

  // A private link on an event with registration off is refused BEFORE anything is written.
  const DB2 = makeDB();
  const orphan = clone(REAL_CONTENT);
  Object.assign(evItems(orphan)[2], { meetingLink: 'https://zoom.us/j/ORPHAN' });
  resetGH(read('content/pages.json'));
  r = await callSave({ content: orphan, site: REAL_SITE }, { env: { ...ENV, DB: DB2 } });
  ok('a private link with nobody to see it is refused (400), D1 untouched, nothing committed',
     r.status === 400 && gh.commits === 0 && DB2.raw.prepare('SELECT COUNT(*) n FROM event_links').get().n === 0, r.json);
  // A content page can't take register.html's place.
  const squat = clone(REAL_CONTENT);
  squat.pages.push({ slug: 'register', navHref: 'register.html', title: 'x', hero: { title: 'x' } });
  resetGH(read('content/pages.json'));
  r = await callSave({ content: squat, site: REAL_SITE }, { env: { ...ENV, DB: DB2 } });
  ok('a page with the address “register” is refused', r.status === 400 && gh.commits === 0, r.json);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
