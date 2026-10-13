/* POST /api/email — ADMIN. { event_id, subject, message }: email everyone registered for an event.

   ONE message, every registrant in BCC and nobody else in To/CC, so they never see each other's
   address. (Resend wants a To; it is the reply-to address, i.e. the officer who gets a copy of what went
   out.) Sent through Resend's HTTP API, because a Worker can't speak SMTP. Needs two Worker secrets:
   RESEND_API_KEY, and the sending domain verified in Resend (SPF + DKIM) — see README.
   Optional vars: EMAIL_FROM (default below) and EMAIL_REPLY_TO (default below).

   Every send carries the same server-side footer, so what a member reads doesn't depend on what the
   officer remembered to type. The audit row (email_sends, migration 0005) is written BEFORE the send
   and settled after it: no table, no send. A provider failure is shown to the officer and recorded as
   'failed' — never reported as sent.

   Resend takes at most 50 addresses per message; one more than that is refused rather than silently split
   (this chapter's events are far smaller). Plain text only: nothing the officer types is ever rendered
   as markup. */
import { json, requireSession } from './_lib.js';

const RESEND = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'WCAA NJ/SEPA Chapter <notifications@wcaa-njsepachapter.com>';
const DEFAULT_REPLY_TO = 'dcanney@verizon.net';
const MAX_BCC = 49;                                   // Resend: 50 recipients in total, one is the To
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

export const footerFor = (replyTo) => `\n\n--\nFor any inquiries, email ${replyTo}`;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  const session = await requireSession(context);
  if (!session) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (!env.DB) return json({ ok: false, error: 'The database isn’t configured.' }, 500);
  if (!env.RESEND_API_KEY) return json({ ok: false, error: 'Email isn’t set up on the website yet. Please ask your web person.' }, 503);

  let body;
  try { body = await request.json(); } catch { body = null; }
  const eventId = body && typeof body.event_id === 'string' ? body.event_id.trim() : '';
  const subject = body && typeof body.subject === 'string' ? body.subject.replace(/[\r\n]+/g, ' ').trim() : '';
  const message = body && typeof body.message === 'string' ? body.message.trim() : '';
  if (!eventId) return json({ ok: false, error: 'Which event?' }, 400);
  if (!subject || subject.length > 150) return json({ ok: false, error: 'Please give the email a subject (up to 150 characters).' }, 400);
  if (!message || message.length > 10000) return json({ ok: false, error: 'Please write a message (up to 10,000 characters).' }, 400);

  let rows;
  try {
    const event = await env.DB.prepare('SELECT id FROM events WHERE id = ?').bind(eventId).first();
    if (!event) return json({ ok: false, error: 'No such event.' }, 404);
    rows = (await env.DB.prepare('SELECT email FROM rsvps WHERE event_id = ? ORDER BY created_at ASC, id ASC').bind(eventId).all()).results || [];
  } catch { return json({ ok: false, error: 'Couldn’t read the registrations.' }, 500); }

  const seen = new Set();
  const bcc = [];
  for (const r of rows) {
    const e = String(r.email || '').trim();
    if (EMAIL.test(e) && !seen.has(e.toLowerCase())) { seen.add(e.toLowerCase()); bcc.push(e); }
  }
  if (!bcc.length) return json({ ok: false, error: 'Nobody with an email address has registered for this event yet.' }, 409);
  if (bcc.length > MAX_BCC) return json({ ok: false, error: `That’s ${bcc.length} people; one email can reach ${MAX_BCC}. Please ask your web person.` }, 409);

  const replyTo = env.EMAIL_REPLY_TO || DEFAULT_REPLY_TO;
  const sentBy = typeof session.sub === 'string' ? session.sub : null;
  const now = new Date().toISOString();

  let auditId;
  try {
    const r = await env.DB.prepare(
      "INSERT INTO email_sends (event_id, sent_by, subject, recipients, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)"
    ).bind(eventId, sentBy, subject, bcc.length, now).run();
    auditId = r.meta && r.meta.last_row_id;
  } catch {
    return json({ ok: false, error: 'The database needs a one-time update before email can be sent. Please ask your web person.' }, 409);
  }

  const settle = (status, providerId, error) =>
    env.DB.prepare('UPDATE email_sends SET status = ?, provider_id = ?, error = ? WHERE id = ?')
      .bind(status, providerId || null, error || null, auditId).run().catch(() => {});

  let res, out = null;
  try {
    res = await fetch(RESEND, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `wcaa-send-${auditId}` },
      body: JSON.stringify({
        from: env.EMAIL_FROM || DEFAULT_FROM,
        to: [replyTo],
        bcc,
        reply_to: replyTo,
        subject,
        text: message + footerFor(replyTo),
      }),
    });
    out = await res.json().catch(() => null);
  } catch { res = null; }

  if (!res || !res.ok) {
    await settle('failed', null, res ? `HTTP ${res.status} ${String(out && out.message || '').slice(0, 200)}` : 'network error');
    return json({ ok: false, error: 'The email service didn’t accept the message, so nothing was sent. Please try again in a minute.' }, 502);
  }
  await settle('sent', out && out.id);
  return json({ ok: true, recipients: bcc.length });
}
