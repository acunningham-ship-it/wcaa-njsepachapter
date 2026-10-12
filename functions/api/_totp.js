/* The editor's sign-in code (2FA): a 6-digit code from an authenticator app (Google Authenticator,
   Microsoft Authenticator, 1Password...), RFC 6238 TOTP with SHA-1, 30-second steps. Web-standard APIs
   only, like _lib.js, so it runs in Workers and under Node for tools/test-2fa.mjs.

   The state is one row of admin_2fa (migrations/0004_admin_2fa.sql). The secret sits in D1 as-is.
   ponytail: not encrypted at rest. Whoever can read this D1 holds the Cloudflare account, and that
   account can already replace ADMIN_PASSWORD_HASH and the code itself, so encrypting under an env
   secret wouldn't stop them, and it would turn a SESSION_SECRET rotation into a lockout.

   Locked out (every phone AND every recovery code lost)? The web person runs
   `DELETE FROM admin_2fa` in the D1 console: sign-in goes back to the password alone. */
import { sha256Hex, constantTimeEqual } from './_lib.js';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
// Recovery codes leave out one side of each look-alike pair (O 0, I L 1, S, B 8) so one copied off paper types right.
const RECOVERY_ALPHABET = 'ACDEFGHJKMNPQRTUVWXYZ2345679';

export function base32Encode(bytes) {
  let out = '', bits = 0, value = 0;
  for (const b of bytes) {
    value = ((value << 8) | b) & 0xfff; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s) {
  const out = [];
  let bits = 0, value = 0;
  for (const c of String(s).toUpperCase().replace(/[\s=-]/g, '')) {
    const i = B32.indexOf(c);
    if (i < 0) throw new Error('not base32');
    value = ((value << 5) | i) & 0xfff; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

export const newSecret = () => base32Encode(crypto.getRandomValues(new Uint8Array(20)));   // 160 bits, RFC 4226's size

export const otpauthUri = (secret, account) =>
  `otpauth://totp/${encodeURIComponent('WCAA website:' + account)}?secret=${secret}&issuer=${encodeURIComponent('WCAA website')}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;

export async function codeAt(secret, step) {
  const key = await crypto.subtle.importKey('raw', base32Decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new DataView(new ArrayBuffer(8));
  msg.setUint32(0, Math.floor(step / 2 ** 32));
  msg.setUint32(4, step >>> 0);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg.buffer));
  const o = h[19] & 15;
  const n = (((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6;
  return String(n).padStart(6, '0');
}

/* The 30-second step this code belongs to, or null. One step either side of now is accepted, so a phone
   clock a little off (or a code typed as it rolled over) still works. */
export async function matchStep(secret, code, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const t = Math.floor(now / 1000 / STEP_SECONDS);
  for (const s of [t, t - 1, t + 1]) if (constantTimeEqual(await codeAt(secret, s), code)) return s;
  return null;
}

export function newRecoveryCodes(n = 10) {
  const pick = () => {
    for (;;) {   // rejection sampling: a plain % would favour the first few letters
      const b = crypto.getRandomValues(new Uint8Array(1))[0];
      if (b < 252) return RECOVERY_ALPHABET[b % 28];
    }
  };
  return Array.from({ length: n }, () => {
    const s = Array.from({ length: 10 }, pick).join('');   // 28^10 ≈ 2^48
    return s.slice(0, 5) + '-' + s.slice(5);
  });
}
const hashRecovery = (code) => sha256Hex('wcaa-recovery|' + String(code).toUpperCase().replace(/[^A-Z0-9]/g, ''));
export const hashRecoveryCodes = (codes) => Promise.all(codes.map(hashRecovery));

/* The admin_2fa row: null when there's no database or migration 0004 isn't applied yet (2FA can't be on),
   {} when it's never been set up. Any OTHER database error throws, so a sign-in fails closed while 2FA
   might be on instead of quietly skipping the code. */
export async function load2fa(env) {
  if (!env.DB) return null;
  try {
    return (await env.DB.prepare('SELECT secret, pending, last_step, recovery FROM admin_2fa WHERE id = 1').first()) || {};
  } catch (e) {
    if (/no such table/i.test(String(e && e.message))) return null;
    throw e;
  }
}

/* The second step of signing in. 'off' = 2FA isn't on, the password is enough. 'ok' = the code was right
   and is now used up. 'need' = 2FA is on and no code came. 'bad' = wrong, too old, or already used.
   A 6-digit code is checked against the app; anything else is tried as a recovery code. Both are used
   up with a conditional UPDATE, so two sign-ins racing with the same code can't both win. */
export async function checkCode(env, code) {
  const row = await load2fa(env);
  if (!row || !row.secret) return 'off';
  code = typeof code === 'string' ? code.replace(/\s/g, '') : '';
  if (!code) return 'need';
  if (/^\d{6}$/.test(code)) {
    const step = await matchStep(row.secret, code);
    if (step === null || step <= row.last_step) return 'bad';
    const r = await env.DB.prepare('UPDATE admin_2fa SET last_step = ? WHERE id = 1 AND secret = ? AND last_step < ?')
      .bind(step, row.secret, step).run();
    return r.meta.changes === 1 ? 'ok' : 'bad';
  }
  const hashes = JSON.parse(row.recovery || '[]');
  const h = await hashRecovery(code);
  const i = hashes.findIndex((x) => constantTimeEqual(x, h));
  if (i < 0) return 'bad';
  const left = JSON.stringify(hashes.filter((_, j) => j !== i));
  const r = await env.DB.prepare('UPDATE admin_2fa SET recovery = ? WHERE id = 1 AND recovery = ?').bind(left, row.recovery).run();
  return r.meta.changes === 1 ? 'ok' : 'bad';
}
