/* Two cheap filters in front of the public forms (/api/rsvp, /api/contact). Turnstile is still
   the real gate; these run first so the obvious junk never costs a siteverify call or a row.

   HONEYPOT. js/blocks.js renders a `website` field nobody can see or tab to. People leave it
   empty; form-filling bots don't. A filled one is answered with a normal-looking success and
   dropped, so the bot learns nothing.

   RATE LIMIT. A few submissions per address per ten minutes is plenty for a household signing
   up; more than that is a script. The key is a SALTED HASH of the IP (salted with
   SESSION_SECRET, so the table can't be reversed by hashing every address), never the address,
   and rows older than an hour are deleted on every request.
   It fails OPEN when the table isn't there yet (migration 0002 not applied): refusing every
   registration because a counter is missing would be the worse failure, and Turnstile still
   stands behind it. */

export function honeypotFilled(body) {
  return !!body && typeof body.website === 'string' && body.website.trim() !== '';
}

const WINDOW_SECONDS = 600;
const MAX_PER_WINDOW = 8;

async function hashKey(bucket, secret, ip) {
  const bytes = new TextEncoder().encode(bucket + '|' + (secret || '') + '|' + ip);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bucket + ':' + Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

/* true = refuse this request. */
export async function rateLimited(env, request, bucket) {
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip || !env.DB) return false;   // no client address outside Cloudflare (local tests)
  const now = Math.floor(Date.now() / 1000);
  try {
    const key = await hashKey(bucket, env.SESSION_SECRET, ip);
    await env.DB.prepare('DELETE FROM rate_hits WHERE at < ?').bind(now - 3600).run();
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM rate_hits WHERE k = ? AND at > ?')
      .bind(key, now - WINDOW_SECONDS).first();
    if (row && row.n >= MAX_PER_WINDOW) return true;
    await env.DB.prepare('INSERT INTO rate_hits (k, at) VALUES (?, ?)').bind(key, now).run();
  } catch {
    return false;
  }
  return false;
}

export const RATE_LIMIT_MESSAGE =
  'That’s a lot of tries in a short time. Please wait ten minutes, then try again.';
