/* Local stand-in for the Cloudflare site, for tools/e2e-photo-upload.py. Serves the repo's files and answers /api/*.
 * /api/upload is the REAL functions/api/upload.js (only GitHub is faked), so the browser sees the real response shape.
 * /api/save is recorded, not committed. GET /__state returns what was committed/saved.   node tools/e2e-server.mjs [port] */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { signToken } from '../functions/api/_lib.js';
import { onRequest as upload } from '../functions/api/upload.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SECRET = 'e2e-secret';
const env = { SESSION_SECRET: SECRET, GITHUB_TOKEN: 'e2e-token' };
const state = { ghPuts: [], saves: [] };
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (!String(url).startsWith('https://api.github.com/')) return realFetch(url, opts);
  state.ghPuts.push(decodeURIComponent(new URL(url).pathname.split('/contents/')[1]));
  return new Response(JSON.stringify({ commit: { sha: 'e2e' } }), { status: 201 });
};
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const cookie = 'wcaa_session=' + await signToken({ exp: Date.now() + 3600e3, sub: 'e2e' }, SECRET);
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => r(Buffer.concat(c))); });

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (path === '/__state') return send(res, 200, state);
  if (path === '/api/session') return send(res, 200, { ok: true });
  if (path === '/api/content') return send(res, 500, { ok: false });   // the admin falls back to content/*.json
  if (path === '/api/save') { state.saves.push(JSON.parse((await readBody(req)).toString())); return send(res, 200, { ok: true, base: 'e2e-next' }); }
  if (path === '/api/upload') {
    const body = await readBody(req);
    const r = await upload({ env, request: new Request('http://x/api/upload', { method: 'POST', headers: { 'content-type': req.headers['content-type'], cookie }, body }) });
    return send(res, r.status, Buffer.from(await r.arrayBuffer()));
  }
  if (path.startsWith('/api/')) return send(res, 404, { ok: false });
  let f = join(ROOT, path.endsWith('/') ? path + 'index.html' : path);
  if (!f.startsWith(ROOT) || !existsSync(f) || statSync(f).isDirectory()) return send(res, 404, 'not found', 'text/plain');
  send(res, 200, readFileSync(f), TYPES[extname(f)] || 'application/octet-stream');
}).listen(Number(process.argv[2]) || 8799, '127.0.0.1');
