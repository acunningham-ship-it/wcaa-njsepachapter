/* POST /api/contact — PUBLIC. The contact form on contact.html posts here.
   Body (JSON or form-encoded): { name?, business?, email, phone?, message,
                                  "cf-turnstile-response" }

   Same shape and the same hard rule as /api/rsvp: a stranger's details go to D1
   and make ZERO GitHub calls, because every GitHub write on this site lands in a
   public repo and stays in its history forever. Turnstile runs first.

   Officers read these in the admin. Nothing is emailed from here — an email
   sender is another credential, another deliverability problem, and another way
   for this endpoint to be turned into a spam relay. The admin list is enough for
   a chapter that meets monthly. */
import { json } from './_lib.js';
import { readBody, validate, text, multiline, email as emailField, phone as phoneField } from './_input.js';
import { verifyTurnstile } from './_turnstile.js';

const GENERIC = 'Something went wrong sending your message. Please try again, or call the chapter directly.';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  if (!env.DB) return json({ ok: false, error: GENERIC }, 500);

  const body = await readBody(request);
  if (!body) return json({ ok: false, error: 'We couldn’t read that form. Please try again.' }, 400);

  const gate = await verifyTurnstile(env, body['cf-turnstile-response'], request);
  if (!gate.ok) return json({ ok: false, error: gate.error }, gate.status);

  const v = validate(body, {
    name: (x) => text(x, { label: 'Name', max: 120 }),
    business: (x) => text(x, { label: 'Business name', max: 160 }),
    email: (x) => emailField(x, { required: true }),
    phone: (x) => phoneField(x),
    message: (x) => multiline(x, { label: 'Message', max: 4000, required: true }),
  });
  if (!v.ok) return json({ ok: false, error: v.error }, 400);
  const f = v.values;

  try {
    await env.DB
      .prepare('INSERT INTO contact_messages (name, business, email, phone, message) VALUES (?, ?, ?, ?, ?)')
      .bind(f.name || null, f.business || null, f.email, f.phone || null, f.message)
      .run();
  } catch {
    return json({ ok: false, error: GENERIC }, 500);
  }

  return json({ ok: true });
}
