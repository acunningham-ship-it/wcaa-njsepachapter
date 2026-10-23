/* Tests the size cap on /api/upload. Run: node tools/test-upload.mjs
 *
 * The site manager shrinks photos to 5 MB / 2400 px before it sends them (admin/photo.js); the endpoint's 20 MB is
 * a backstop for anything that gets past that. This calls the function in-process with GitHub stubbed: nothing
 * leaves this machine, and nothing is ever sent to a deployed site.
 */
import { signToken, makeSessionCookie, base64ToBytes } from '../functions/api/_lib.js';
import { onRequest as upload } from '../functions/api/upload.js';

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 260))); }
};

const puts = [];
globalThis.fetch = async (url, init = {}) => {
  if (!String(url).startsWith('https://api.github.com/') || init.method !== 'PUT') throw new Error('unexpected fetch ' + url);
  puts.push({ url: String(url), body: JSON.parse(init.body) });
  return new Response(JSON.stringify({ commit: { sha: 'abc123' } }), { status: 201 });
};

const SECRET = 'test-secret-'.repeat(4);
const ENV = { SESSION_SECRET: SECRET, GITHUB_TOKEN: 'ghp_test', GITHUB_REPO: 'example/repo' };
const COOKIE = makeSessionCookie(await signToken({ exp: Date.now() + 3600e3, sub: 'Denise' }, SECRET), 3600).split(';')[0];
const MB = 1024 * 1024;

function jpeg(bytes) {   // a JPEG header and then filler: the endpoint checks the magic bytes and the size, not the picture
  const b = new Uint8Array(bytes);
  b.set([0xff, 0xd8, 0xff, 0xe0]);
  for (let i = 4; i < b.length; i++) b[i] = (i * 2654435761) >>> 24;
  return b;
}
async function send(bytes) {
  const form = new FormData();
  form.append('file', new File([bytes], 'big.jpg', { type: 'image/jpeg' }));
  const request = new Request('http://localhost/api/upload', { method: 'POST', headers: { cookie: COOKIE }, body: form });
  const res = await upload({ request, env: ENV });
  return { status: res.status, json: await res.json() };
}

{
  const big = jpeg(19 * MB);
  const r = await send(big);
  ok('a 19 MB photo is accepted', r.status === 200 && r.json.ok === true, r);
  const put = puts.at(-1);
  ok('  ...and committed whole (base64 decodes to the same 19 MB)', put && base64ToBytes(put.body.content).length === big.length
     && base64ToBytes(put.body.content).every((v, i) => v === big[i]), put && put.body.content.length);
  ok('  ...into uploads/gallery/ as a .jpg', put && /\/contents\/uploads\/gallery\/big-[0-9a-f]{8}\.jpg$/.test(put.url), put && put.url);
}
{
  const n = puts.length;
  const r = await send(jpeg(21 * MB));
  ok('a 21 MB photo is refused', r.status === 400 && r.json.ok === false, r);
  ok('  ...with the 20 MB limit in the message', /under 20 MB/.test(r.json.error || ''), r.json);
  ok('  ...and nothing is committed', puts.length === n, puts.length - n);
}
{
  const r = await send(jpeg(20 * MB));
  ok('exactly 20 MB is still accepted', r.status === 200, r);
  const r2 = await send(jpeg(20 * MB + 1));
  ok('20 MB and one byte is refused', r2.status === 400, r2);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
