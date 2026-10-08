/* Exercises functions/api/login.js directly (no Cloudflare needed — it uses only
   Web-standard APIs, and Node has fetch/Request/Response/crypto.subtle built in).
   Run: node tools/test-login.mjs

   Covers the two changes made when porting this from Bound at the Seams:
   username normalisation, and ADMIN_USERNAME coming from env. The negative cases
   matter more than the positive ones — an accept-only test passes against a login
   that accepts everything. */
import { onRequest } from '../functions/api/login.js';

const PASSWORD = 'Chapter!$26';
// sha256 of PASSWORD, computed here rather than pasted so the fixture can't drift
const hashHex = async (s) => {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log('  ok  ' + name); }
                             else { fail++; console.log('  FAIL ' + name); } };

const call = async (body, env) => {
  const req = new Request('https://example.test/api/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  const res = await onRequest({ request: req, env });
  let json = null;
  try { json = await res.clone().json(); } catch { /* non-JSON body */ }
  return { status: res.status, json, cookie: res.headers.get('Set-Cookie') };
};

const env = {
  ADMIN_PASSWORD_HASH: await hashHex(PASSWORD),
  SESSION_SECRET: 'test-session-secret-not-a-real-one',
};

/* --- the positive case --- */
let r = await call({ username: 'Denise', password: PASSWORD }, env);
ok('correct credentials return ok', r.status === 200 && r.json?.ok === true);
ok('success sets a session cookie', /wcaa_session=/.test(r.cookie || ''));
ok('cookie is HttpOnly + Secure + SameSite=Strict',
   /HttpOnly/.test(r.cookie) && /Secure/.test(r.cookie) && /SameSite=Strict/.test(r.cookie));

/* --- the port fix: username case/whitespace must not lock a real officer out --- */
for (const u of ['denise', 'DENISE', ' Denise ', 'DeNiSe', '\tdenise\n']) {
  r = await call({ username: u, password: PASSWORD }, env);
  ok(`username ${JSON.stringify(u)} is accepted (normalised)`, r.status === 200 && r.json?.ok === true);
}

/* --- ADMIN_USERNAME override --- */
r = await call({ username: 'chapterpres', password: PASSWORD },
               { ...env, ADMIN_USERNAME: 'ChapterPres' });
ok('ADMIN_USERNAME override is honoured (and normalised)', r.status === 200);
r = await call({ username: 'Denise', password: PASSWORD },
               { ...env, ADMIN_USERNAME: 'ChapterPres' });
ok('the default username is REJECTED once overridden', r.status === 401);

/* --- negative controls: normalising the username must not have weakened anything --- */
r = await call({ username: 'Denise', password: 'wrong' }, env);
ok('wrong password is rejected', r.status === 401 && r.json?.ok !== true);
ok('failed login sets NO cookie', !r.cookie);
r = await call({ username: 'someone-else', password: PASSWORD }, env);
ok('wrong username is rejected', r.status === 401);
r = await call({ username: 'Denise', password: '' }, env);
ok('empty password is rejected', r.status === 401);
r = await call({ username: '', password: '' }, env);
ok('empty everything is rejected', r.status === 401);
r = await call({}, env);
ok('missing fields are rejected', r.status === 401);
r = await call('not json at all', env);
ok('non-JSON body is rejected, not a 500', r.status === 401);
r = await call({ username: 'Denise', password: PASSWORD }, { SESSION_SECRET: 'x' });
ok('missing ADMIN_PASSWORD_HASH fails closed (500, no cookie)', r.status === 500 && !r.cookie);
r = await call({ username: 'Denise', password: PASSWORD }, { ADMIN_PASSWORD_HASH: env.ADMIN_PASSWORD_HASH });
ok('missing SESSION_SECRET fails closed (500, no cookie)', r.status === 500 && !r.cookie);

/* --- the hash is compared case-insensitively, so an uppercase env value still works --- */
r = await call({ username: 'Denise', password: PASSWORD },
               { ...env, ADMIN_PASSWORD_HASH: env.ADMIN_PASSWORD_HASH.toUpperCase() });
ok('uppercase ADMIN_PASSWORD_HASH still verifies', r.status === 200);

/* --- GET must not mint a session --- */
{
  const res = await onRequest({ request: new Request('https://example.test/api/login'), env });
  ok('GET is method-not-allowed and sets no cookie',
     res.status === 405 && !res.headers.get('Set-Cookie'));
}

/* ---------- log out (officer request 2026-10-07: "how do I log out of the editor?") ----------
   The clearing cookie must hit the SAME cookie login set: same name, same Path. A mismatch on
   either leaves the real session in place while the button looks like it worked. */
{
  const { onRequest: logout } = await import('../functions/api/logout.js');
  const { requireSession } = await import('../functions/api/_lib.js');
  const attrs = (c) => Object.fromEntries((c || '').split(/;\s*/).map((p) => { const i = p.indexOf('=');
    return i < 0 ? [p.toLowerCase(), true] : [p.slice(0, i).toLowerCase(), p.slice(i + 1)]; }));
  const signedIn = await call({ username: 'Denise', password: PASSWORD }, env);
  const loginName = signedIn.cookie.split('=')[0];
  const loginAttrs = attrs(signedIn.cookie);
  const sessionCookie = signedIn.cookie.split(';')[0];
  const asked = (cookie) => requireSession({ request: new Request('https://example.test/api/save', { headers: cookie ? { cookie } : {} }), env });
  ok('a signed-in browser has a working session (control)', !!(await asked(sessionCookie)));

  const res = await logout({ request: new Request('https://example.test/api/logout', { method: 'POST', headers: { cookie: sessionCookie } }) });
  const cleared = res.headers.get('Set-Cookie') || '';
  const c = attrs(cleared);
  ok('log out answers 200 ok', res.status === 200 && (await res.json()).ok === true);
  ok('...and clears the SAME cookie login set (same name, same Path)', cleared.split('=')[0] === loginName && c.path === loginAttrs.path && c.path === '/');
  ok('...by emptying it and expiring it now (Max-Age=0)', c[loginName.toLowerCase()] === '' && c['max-age'] === '0');
  ok('...with the same protections (HttpOnly, Secure, SameSite=Strict)', c.httponly === true && c.secure === true && /^strict$/i.test(c.samesite));
  ok('the browser is then signed out: no cookie, or the emptied one, gets no session',
     !(await asked(null)) && !(await asked(cleared.split(';')[0])));
  const noSession = await logout({ request: new Request('https://example.test/api/logout', { method: 'POST' }) });
  ok('log out works even when the session has already expired', noSession.status === 200 && !!noSession.headers.get('Set-Cookie'));
  const viaGet = await logout({ request: new Request('https://example.test/api/logout') });
  ok('log out is POST-only (a link or an image can’t trigger it)', viaGet.status === 405 && !viaGet.headers.get('Set-Cookie'));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
