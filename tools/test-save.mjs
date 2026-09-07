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
import { validateContent } from '../js/validate-content.js';
import { BLOCK_TYPES } from '../js/blocks.js';
import { signToken, makeSessionCookie } from '../functions/api/_lib.js';
import { onRequest as save } from '../functions/api/save.js';

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
  ok('the tree carries nothing else',
     paths.length === REAL_CONTENT.pages.length + 2, paths);   // + pages.json, site.json
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
