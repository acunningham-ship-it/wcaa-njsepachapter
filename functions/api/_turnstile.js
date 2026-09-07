/* Cloudflare Turnstile verification for the two public endpoints.
   https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

   ⛔ FAILS CLOSED, ALWAYS. If TURNSTILE_SECRET is unset, this REFUSES the request
   rather than letting it through unverified. That is the whole point: "the captcha
   is skipped when the key is missing" is the single most common way a bot wall
   gets silently disabled — one bad deploy, one renamed variable, and the form has
   been wide open for a month with nothing in the logs to say so. A chapter site
   that briefly cannot take RSVPs is a phone call; a chapter site quietly
   collecting spam into the officers' inbox is worse and takes longer to notice.

   The failure message says the form is unavailable rather than naming the missing
   key, because the person filling it in cannot fix that and an attacker should not
   be told which control is down. */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const TURNSTILE_UNAVAILABLE =
  'This form isn’t available right now. Please email or call the chapter instead — we’re sorry for the trouble.';
export const TURNSTILE_FAILED =
  'We couldn’t verify that you’re human. Please reload the page and try once more.';

/* Returns { ok: true } or { ok: false, status, error }.
   `status` is 500 for a configuration problem (ours) and 400 for a failed or
   missing challenge (theirs), so the caller does not have to guess. */
export async function verifyTurnstile(env, token, request) {
  if (!env || !env.TURNSTILE_SECRET) {
    return { ok: false, status: 500, error: TURNSTILE_UNAVAILABLE };
  }
  if (typeof token !== 'string' || !token || token.length > 4096) {
    return { ok: false, status: 400, error: TURNSTILE_FAILED };
  }

  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  const ip = request && request.headers ? request.headers.get('CF-Connecting-IP') : null;
  if (ip) form.append('remoteip', ip);

  let res;
  try {
    res = await fetch(VERIFY_URL, { method: 'POST', body: form });
  } catch {
    // Network failure talking to Cloudflare. Still fails closed — we cannot tell a
    // real person from a bot right now, so we do not guess in the bot's favour.
    return { ok: false, status: 503, error: TURNSTILE_UNAVAILABLE };
  }
  if (!res.ok) return { ok: false, status: 503, error: TURNSTILE_UNAVAILABLE };

  let body;
  try { body = await res.json(); } catch { return { ok: false, status: 503, error: TURNSTILE_UNAVAILABLE }; }
  if (!body || body.success !== true) return { ok: false, status: 400, error: TURNSTILE_FAILED };
  return { ok: true };
}
