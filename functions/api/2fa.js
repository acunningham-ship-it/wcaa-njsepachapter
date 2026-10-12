/* /api/2fa — ADMIN. The editor's sign-in code (2FA). The TOTP itself is in _totp.js.

   GET                                    → { ok, ready, on, setting_up, recovery_left }
   POST { action: 'start', password }     → 2FA off: a NEW secret to scan, held as `pending` until confirmed
          (+ code when 2FA is on)         → 2FA on: the CURRENT secret again, to add another officer's phone
   POST { action: 'confirm', code }       → the code from the pending secret switches 2FA ON and returns the
                                            10 recovery codes, the only time they're ever shown
   POST { action: 'off', password, code } → switches it off (sign-in goes back to the password alone)

   A signed-in session isn't enough for any change here. Starting, adding a phone and switching off all
   take the password again (and the code, once it's on), so a borrowed or stolen session can't set its
   own phone up and lock the officers out, or switch the code off. Those password checks share the
   sign-in's per-address limit. */
import { json, requireSession, passwordOk } from './_lib.js';
import { rateLimited, RATE_LIMIT_MESSAGE } from './_guard.js';
import { load2fa, checkCode, matchStep, newSecret, otpauthUri, newRecoveryCodes, hashRecoveryCodes } from './_totp.js';

const WRONG_PASSWORD = 'That password didn’t match. Please try again.';
const WRONG_CODE = 'That code didn’t work. The code changes every 30 seconds, so type the one showing now.';

export async function onRequest(context) {
  const { request, env } = context;
  const session = await requireSession(context);
  if (!session) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (!env.DB) return json({ ok: false, error: 'No database is bound to this site yet (env.DB).' }, 500);

  let row;
  try { row = await load2fa(env); } catch { return json({ ok: false, error: 'Couldn’t read the database. Please try again.' }, 503); }
  const on = !!(row && row.secret);

  if (request.method === 'GET') {
    return json({
      ok: true,
      ready: row !== null,   // false until migration 0004 is applied
      on,
      setting_up: !on && !!(row && row.pending),
      recovery_left: on ? JSON.parse(row.recovery || '[]').length : 0,
    });
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'GET, POST' });
  if (row === null) {
    return json({ ok: false, error: 'The database needs a one-time update first. Please ask your web person.' }, 409);
  }

  let body;
  try { body = await request.json(); } catch { body = null; }
  const action = body && body.action;
  const now = new Date().toISOString();

  if (action === 'start' || action === 'off') {
    if (await rateLimited(env, request, 'login')) return json({ ok: false, error: RATE_LIMIT_MESSAGE }, 429);
    if (!(await passwordOk(env, body.password))) return json({ ok: false, error: WRONG_PASSWORD }, 403);
    if (on || action === 'off') {
      if (!on) return json({ ok: false, error: 'The sign-in code is already off.' }, 409);
      const c = await checkCode(env, body.code);
      if (c !== 'ok') return json({ ok: false, need_code: true, error: c === 'need' ? 'Enter the code from your authenticator app.' : WRONG_CODE }, 403);
    }
    if (action === 'off') {
      await env.DB.prepare("UPDATE admin_2fa SET secret = NULL, pending = NULL, recovery = '[]', updated_at = ? WHERE id = 1").bind(now).run();
      return json({ ok: true, on: false });
    }
    if (on) return json({ ok: true, on: true, secret: row.secret, uri: otpauthUri(row.secret, session.sub) });
    const secret = newSecret();
    await env.DB.prepare(
      'INSERT INTO admin_2fa (id, pending, updated_at) VALUES (1, ?, ?) ON CONFLICT (id) DO UPDATE SET pending = excluded.pending, updated_at = excluded.updated_at'
    ).bind(secret, now).run();
    return json({ ok: true, on: false, secret, uri: otpauthUri(secret, session.sub) });
  }

  if (action === 'confirm') {
    if (on) return json({ ok: false, error: 'The sign-in code is already on.' }, 409);
    if (!row.pending) return json({ ok: false, error: 'Start the setup again: there’s no code waiting to be confirmed.' }, 409);
    const step = await matchStep(row.pending, typeof body.code === 'string' ? body.code.replace(/\s/g, '') : '');
    if (step === null) return json({ ok: false, error: WRONG_CODE }, 403);
    const codes = newRecoveryCodes();
    /* `AND pending = ?`: if someone restarted the setup meanwhile, this code belongs to a QR nobody
       should be using any more, so it doesn't switch anything on. last_step = this code's step, so the
       same code can't then sign anyone in. */
    const r = await env.DB.prepare(
      'UPDATE admin_2fa SET secret = pending, pending = NULL, last_step = ?, recovery = ?, updated_at = ? WHERE id = 1 AND pending = ? AND secret IS NULL'
    ).bind(step, JSON.stringify(await hashRecoveryCodes(codes)), now, row.pending).run();
    if (r.meta.changes !== 1) return json({ ok: false, error: 'The setup changed while you were on it. Please start again.' }, 409);
    return json({ ok: true, on: true, recovery_codes: codes });
  }

  return json({ ok: false, error: 'Unknown action.' }, 400);
}
