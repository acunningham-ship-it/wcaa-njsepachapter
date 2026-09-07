/* POST /api/login  { username, password }
   Verifies the officer username and SHA-256(password) === env.ADMIN_PASSWORD_HASH,
   both via constant-time compare so timing never reveals whether the username or
   the password was the wrong one. On success mints a 12h HMAC session cookie.

   Two deliberate differences from the Bound-at-the-Seams original this was ported
   from, both fixing failure modes that bit that site:

   1. The username compare is CASE- AND WHITESPACE-INSENSITIVE. On the original,
      'denise' 401'd and only 'Denise' worked, so a phone autocapitalise or a stray
      space from autofill read as a wrong password and sent us hunting the wrong
      thing. The username was never the secret — the password hash is — so
      normalising it removes a real lockout with no loss of strength.
   2. The expected username comes from env (ADMIN_USERNAME), so adding or changing
      a chapter officer is a config change, not a code change and redeploy. */
import { json, sha256Hex, constantTimeEqual, signToken, makeSessionCookie, missingEnv } from './_lib.js';

const SESSION_TTL_SECONDS = 12 * 60 * 60;
const DEFAULT_USER = 'Denise';   // first chapter officer; override with ADMIN_USERNAME
const normUser = (u) => String(u == null ? '' : u).trim().toLowerCase();

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { 'Allow': 'POST' });

  const miss = missingEnv(env, ['ADMIN_PASSWORD_HASH', 'SESSION_SECRET']);
  if (miss.length) {
    return json({ ok: false, error: 'The sign-in isn’t set up yet. Please contact your web person.' }, 500);
  }

  let body;
  try { body = await request.json(); } catch { body = null; }
  const username = body && typeof body.username === 'string' ? body.username : '';
  const password = body && typeof body.password === 'string' ? body.password : '';

  // Hash both sides of both comparisons so each check costs the same regardless of input.
  const requiredUser = env.ADMIN_USERNAME || DEFAULT_USER;
  const [userHash, expectedUserHash, passHash] = await Promise.all([
    sha256Hex(normUser(username)),
    sha256Hex(normUser(requiredUser)),
    sha256Hex(password),
  ]);
  const userOk = constantTimeEqual(userHash, expectedUserHash);
  const passOk = constantTimeEqual(passHash, String(env.ADMIN_PASSWORD_HASH).toLowerCase());

  if (!(userOk && passOk)) {
    return json({ ok: false, error: 'That username or password didn’t match. Please try again.' }, 401);
  }

  const token = await signToken({ exp: Date.now() + SESSION_TTL_SECONDS * 1000, sub: requiredUser }, env.SESSION_SECRET);
  return json({ ok: true }, 200, { 'Set-Cookie': makeSessionCookie(token, SESSION_TTL_SECONDS) });
}
