/* POST /api/mailing-list/send — ADMIN. { subject, message } to everyone on the chapter list.

   ONE MESSAGE PER PERSON, through Resend's batch endpoint (POST /emails/batch, up to 100 messages
   per call), 100 addresses at a time.

   ⛔ WHY NOT THE BCC TRICK /api/email USES. That one sends a single message with up to 49 people in
   BCC, which is fine for a chapter event and impossible for "everyone": Resend caps a message at 50
   addresses in total, so a list of 300 would be refused (and splitting it into six BCC messages
   would deliver six copies to anyone who appears on two of them). Here each person gets their own
   message with only their own address on it, so nobody sees anybody else, there is no ceiling per
   batch, and a failure is attributable to a batch instead of to "the send".

   A BATCH THAT FAILS DOES NOT STOP THE REST. Resend rejects a whole batch if one message in it is
   bad, so one stale address could otherwise cost the chapter the other 900 people. Failed batches
   are counted, the next batch is attempted, and the officer is told exactly how many got it and
   how many did not — never "sent" when some did not. A 401/403 (a bad key, not a bad address) stops
   immediately, because every remaining batch would fail the same way.

   The audit row (list_sends, migration 0006) is written BEFORE the first batch and settled after
   the last: no table, no send. Same rule as /api/email and for the same reason. */
import { json, requireSession } from '../_lib.js';
import { footerFor } from '../email.js';
import { EMAIL } from '../_input.js';

const RESEND_BATCH = 'https://api.resend.com/emails/batch';
const DEFAULT_FROM = 'WCAA NJ/SEPA Chapter <notifications@wcaa-njsepachapter.com>';
const DEFAULT_REPLY_TO = 'dcanney@verizon.net';
const CHUNK = 100;                 // Resend: at most 100 messages per batch call
const MAX_RECIPIENTS = 1000;       // 10 batches, comfortably inside a Function's lifetime
const PAUSE_MS = 600;              // Resend's free tier is 2 requests/second

/* The same server-side footer /api/email adds, plus the one line a bulk announcement needs and an
   event email does not: how to make it stop. Nobody should have to guess, and an officer should not
   have to remember to type it. */
export const listFooterFor = (replyTo) =>
  footerFor(replyTo) + '\nTo stop receiving these emails, reply and ask the chapter to take you off the list.';

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  const session = await requireSession(context);
  if (!session) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (!env.DB) return json({ ok: false, error: 'The database isn’t configured.' }, 500);
  if (!env.RESEND_API_KEY) return json({ ok: false, error: 'Email isn’t set up on the website yet. Please ask your web person.' }, 503);

  let body;
  try { body = await request.json(); } catch { body = null; }
  const subject = body && typeof body.subject === 'string' ? body.subject.replace(/[\r\n]+/g, ' ').trim() : '';
  const message = body && typeof body.message === 'string' ? body.message.trim() : '';
  if (!subject || subject.length > 150) return json({ ok: false, error: 'Please give the email a subject (up to 150 characters).' }, 400);
  if (!message || message.length > 10000) return json({ ok: false, error: 'Please write a message (up to 10,000 characters).' }, 400);

  let rows;
  try {
    rows = (await env.DB.prepare('SELECT email FROM mailing_list ORDER BY id ASC').all()).results || [];
  } catch {
    return json({ ok: false, error: 'The email list isn’t set up in the database yet. Please ask your web person.' }, 409);
  }

  /* The table is the deduplication, so this is belt-and-braces: an address that was imported before
     the validator existed, or a row someone edited by hand at the SQL console, must not be emailed
     twice in one announcement. */
  const seen = new Set();
  const to = [];
  for (const r of rows) {
    const e = String(r.email || '').trim();
    const key = e.toLowerCase();
    if (EMAIL.test(e) && e.length <= 200 && !seen.has(key)) { seen.add(key); to.push(e); }
  }
  if (!to.length) return json({ ok: false, error: 'There’s nobody on the email list yet.' }, 409);
  if (to.length > MAX_RECIPIENTS) {
    return json({ ok: false, error: `That’s ${to.length} people; one announcement can reach ${MAX_RECIPIENTS}. Please ask your web person.` }, 409);
  }

  const from = env.EMAIL_FROM || DEFAULT_FROM;
  const replyTo = env.EMAIL_REPLY_TO || DEFAULT_REPLY_TO;
  const sentBy = typeof session.sub === 'string' ? session.sub : null;
  const text = message + listFooterFor(replyTo);

  let auditId;
  try {
    const r = await env.DB.prepare(
      "INSERT INTO list_sends (sent_by, subject, recipients, delivered, status, created_at) VALUES (?, ?, ?, 0, 'pending', ?)"
    ).bind(sentBy, subject, to.length, new Date().toISOString()).run();
    auditId = r.meta && r.meta.last_row_id;
  } catch {
    return json({ ok: false, error: 'The database needs a one-time update before email can be sent. Please ask your web person.' }, 409);
  }

  const settle = (status, delivered, providerId, error) =>
    env.DB.prepare('UPDATE list_sends SET status = ?, delivered = ?, provider_id = ?, error = ? WHERE id = ?')
      .bind(status, delivered, providerId || null, error || null, auditId).run().catch(() => {});

  let delivered = 0;
  const ids = [];
  let failure = '';
  let stop = false;

  for (let i = 0; i < to.length && !stop; i += CHUNK) {
    const chunk = to.slice(i, i + CHUNK);
    const payload = chunk.map((address) => ({ from, to: [address], reply_to: replyTo, subject, text }));
    let res = null, out = null;
    try {
      res = await fetch(RESEND_BATCH, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `wcaa-list-${auditId}-${i / CHUNK}`,
        },
        body: JSON.stringify(payload),
      });
      out = await res.json().catch(() => null);
    } catch {
      res = null;
    }

    if (res && res.ok) {
      delivered += chunk.length;
      const got = out && Array.isArray(out.data) ? out.data : [];
      for (const m of got) if (m && m.id) ids.push(String(m.id));
    } else {
      const reason = res ? `HTTP ${res.status} ${String((out && out.message) || '').slice(0, 160)}` : 'network error';
      if (!failure) failure = reason;
      if (res && (res.status === 401 || res.status === 403)) stop = true;   // the key is wrong; the rest will too
    }

    if (i + CHUNK < to.length && !stop) await pause(PAUSE_MS);
  }

  const failed = to.length - delivered;
  const status = delivered === 0 ? 'failed' : (failed === 0 ? 'sent' : 'partial');
  await settle(status, delivered, ids.join(' ').slice(0, 500), failure || null);

  if (delivered === 0) {
    return json({ ok: false, error: 'The email service didn’t accept the message, so nothing was sent. Please try again in a minute.' }, 502);
  }
  return json({ ok: true, recipients: to.length, delivered, failed, status });
}
