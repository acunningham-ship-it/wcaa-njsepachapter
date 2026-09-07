/* Input validation for the two PUBLIC endpoints (/api/rsvp, /api/contact).
   Web-standard only, same as _lib.js, so it runs on Workers and imports under Node.

   These are the only endpoints on this site a stranger can reach, so this file is
   the trust boundary. Two rules it follows:

   1. REJECT, DON'T REPAIR. A value that fails is refused with a message the person
      can act on. Silently trimming hostile input into something that passes is how
      you end up storing a "valid" value nobody typed — the same mistake safeSrc()
      made in js/render.js when it stripped control characters instead of refusing
      them. Surrounding whitespace is the one exception: that is copy-paste, not an
      attack.
   2. CAP EVERY LENGTH. Unbounded text is a storage and a display problem long
      before it is a security one, and D1 will happily take a 5MB "name".

   Escaping is NOT done here. These values are stored raw and escaped wherever they
   are rendered — the admin list, a CSV cell, an email. Sanitising at storage has to
   guess every future context; escaping at use does not. */

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/; // allows \t \n \r
const CONTROL_STRICT = /[\u0000-\u001F\u007F]/;                   // single-line fields

/* Deliberately permissive, deliberately not a full RFC 5322 parser. The job is to
   catch a typo and refuse a header-injection attempt, not to adjudicate exotic but
   legal addresses — that argument has no winner and rejecting a real member's
   address is the worse failure. A confirmation email bouncing is the real check. */
const EMAIL = /^[^\s@,;:<>"'\\]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

const PHONE = /^[+0-9()\-.\s]{7,40}$/;

export function fieldError(message) { return { ok: false, error: message }; }

/* A single-line field: required or not, capped, no control characters at all. */
export function text(value, { label, max, required = false }) {
  if (value === null || value === undefined) value = '';
  if (typeof value !== 'string') return fieldError(`${label} isn’t valid.`);
  const v = value.trim();
  if (!v) return required ? fieldError(`${label} is required.`) : { ok: true, value: '' };
  if (v.length > max) return fieldError(`${label} is too long (max ${max} characters).`);
  if (CONTROL_STRICT.test(v)) return fieldError(`${label} contains characters we can’t accept.`);
  return { ok: true, value: v };
}

/* A multi-line field: line breaks and tabs allowed, everything else the same. */
export function multiline(value, { label, max, required = false }) {
  if (value === null || value === undefined) value = '';
  if (typeof value !== 'string') return fieldError(`${label} isn’t valid.`);
  const v = value.trim();
  if (!v) return required ? fieldError(`${label} is required.`) : { ok: true, value: '' };
  if (v.length > max) return fieldError(`${label} is too long (max ${max} characters).`);
  if (CONTROL.test(v)) return fieldError(`${label} contains characters we can’t accept.`);
  return { ok: true, value: v };
}

export function email(value, { label = 'Email', required = true } = {}) {
  const t = text(value, { label, max: 200, required });
  if (!t.ok) return t;
  if (!t.value) return { ok: true, value: '', key: '' };
  if (!EMAIL.test(t.value)) return fieldError('That email address doesn’t look right.');
  return { ok: true, value: t.value, key: t.value.toLowerCase() };
}

export function phone(value, { label = 'Phone', required = false } = {}) {
  const t = text(value, { label, max: 40, required });
  if (!t.ok || !t.value) return t;
  if (!PHONE.test(t.value)) return fieldError('That phone number doesn’t look right.');
  return t;
}

/* Guests must be a whole number in range. A string of digits is accepted because
   that is what an HTML form posts; anything else is refused rather than coerced —
   Number("") is 0 and Number("3 friends") is NaN, and neither should quietly
   become a seat count. */
export function count(value, { label = 'Guests', max = 10 } = {}) {
  if (value === null || value === undefined || value === '') return { ok: true, value: 0 };
  const n = typeof value === 'number' ? value : (/^\d{1,3}$/.test(String(value).trim()) ? Number(String(value).trim()) : NaN);
  if (!Number.isInteger(n) || n < 0) return fieldError(`${label} must be a whole number.`);
  if (n > max) return fieldError(`${label} can be at most ${max}.`);
  return { ok: true, value: n };
}

/* Runs a field spec and returns { ok, values } or the FIRST error. One error at a
   time is deliberate: a form that reports five problems at once reads as broken,
   and the person fixes them one at a time anyway. */
export function validate(body, spec) {
  const values = {};
  for (const [key, run] of Object.entries(spec)) {
    const result = run(body ? body[key] : undefined);
    if (!result.ok) return result;
    values[key] = result.value;
    if (result.key !== undefined) values[key + '_key'] = result.key;
  }
  return { ok: true, values };
}

/* Reads a JSON or form-encoded body. The public forms post as HTML forms so they
   keep working with no JavaScript; the admin posts JSON. Accepting both means one
   endpoint, not two. */
export async function readBody(request) {
  const type = (request.headers.get('content-type') || '').toLowerCase();
  try {
    if (type.includes('application/json')) return await request.json();
    if (type.includes('form')) {
      const form = await request.formData();
      const out = {};
      for (const [k, v] of form.entries()) out[k] = typeof v === 'string' ? v : '';
      return out;
    }
    return await request.json();
  } catch {
    return null;
  }
}
