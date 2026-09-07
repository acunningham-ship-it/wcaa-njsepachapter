/* Shared helpers for the WCAA NJ/SEPA chapter admin API (Cloudflare Pages Functions).
   Deliberately uses only Web-standard APIs (crypto.subtle, TextEncoder, btoa/atob,
   fetch) so this exact module runs unchanged in Workers AND imports cleanly under
   Node's global webcrypto for unit testing (tools/test-auth.mjs). */

const enc = new TextEncoder();
const dec = new TextDecoder();

export const COOKIE_NAME = 'wcaa_session';

/* ---------- responses ---------- */
export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, extraHeaders),
  });
}

/* ---------- base64 helpers ---------- */
export function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
export function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function utf8ToBase64(str) { return bytesToBase64(enc.encode(str)); }
function b64url(b64) { return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return s;
}

/* ---------- SHA-256 hex ---------- */
export async function sha256Hex(str) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(str));
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

/* ---------- constant-time string compare (runtime independent of where they differ) ---------- */
export function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const al = a.length, bl = b.length;
  const n = al > bl ? al : bl;
  let diff = al ^ bl;
  for (let i = 0; i < n; i++) {
    const ca = i < al ? a.charCodeAt(i) : 0;
    const cb = i < bl ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

/* ---------- HMAC-SHA256 session token: base64url(payloadJSON) "." base64url(sig) ---------- */
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function hmac(data, secret) {
  const key = await hmacKey(secret);
  return b64url(bytesToBase64(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)))));
}
export async function signToken(payload, secret) {
  const data = b64url(bytesToBase64(enc.encode(JSON.stringify(payload))));
  return data + '.' + (await hmac(data, secret));
}
export async function verifyToken(token, secret) {
  if (typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!data || !sig) return null;
  const expected = await hmac(data, secret);
  if (!constantTimeEqual(sig, expected)) return null;
  let payload;
  try { payload = JSON.parse(dec.decode(base64ToBytes(unb64url(data)))); } catch { return null; }
  if (!payload || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
  return payload;
}

/* ---------- cookies ---------- */
export function makeSessionCookie(token, maxAgeSeconds) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}
export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}
export function getCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  const parts = raw.split(/;\s*/);
  for (let i = 0; i < parts.length; i++) {
    const eq = parts[i].indexOf('=');
    if (eq > -1 && parts[i].slice(0, eq) === name) return parts[i].slice(eq + 1);
  }
  return null;
}
export async function requireSession(context) {
  const { request, env } = context;
  if (!env.SESSION_SECRET) return null;
  const token = getCookie(request, COOKIE_NAME);
  if (!token) return null;
  return verifyToken(token, env.SESSION_SECRET);
}

/* ---------- env ---------- */
export function missingEnv(env, keys) { return keys.filter((k) => !env[k]); }
export function repoOf(env) { return env.GITHUB_REPO || 'acunningham-ship-it/wcaa-njsepachapter'; }
export function branchOf(env) { return env.GITHUB_BRANCH || 'master'; }

/* ---------- GitHub Contents API ---------- */
const GH_API = 'https://api.github.com';
function ghHeaders(env) {
  return {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'wcaa-njsepachapter-admin',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}
function contentsUrl(env, path) {
  const safe = path.split('/').map(encodeURIComponent).join('/');
  return `${GH_API}/repos/${repoOf(env)}/contents/${safe}`;
}
export async function ghGetFileSha(env, path) {
  const res = await fetch(`${contentsUrl(env, path)}?ref=${encodeURIComponent(branchOf(env))}`, { headers: ghHeaders(env) });
  if (res.status === 404) return { ok: true, sha: null };
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const body = await res.json();
  return { ok: true, sha: body.sha };
}
export async function ghPutFile(env, path, base64Content, message, sha) {
  const payload = { message, content: base64Content, branch: branchOf(env) };
  if (sha) payload.sha = sha;
  const res = await fetch(contentsUrl(env, path), {
    method: 'PUT',
    headers: Object.assign(ghHeaders(env), { 'content-type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const body = await res.json();
  return { ok: true, commit: body.commit && body.commit.sha };
}
