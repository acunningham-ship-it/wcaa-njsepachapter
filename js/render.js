/* WCAA page renderer — the SINGLE source of markup.
 *
 * Imported by BOTH:
 *   - functions/api/save.js  (Cloudflare Workers runtime) to generate the .html
 *     files that get committed and served
 *   - admin/            (browser) to draw the live preview before the redeploy
 *
 * ⛔ Therefore: pure string manipulation ONLY. No Node APIs, no DOM APIs, no
 * fetch, no Buffer. If it does not run identically in both runtimes it does not
 * belong in this file. tools/test-pages.mjs asserts both paths produce
 * byte-identical output.
 *
 * ⛔⛔ THE SECURITY RULE OF THIS FILE — read before editing.
 * This module CONCATENATES STRINGS INTO HTML THAT IS THEN COMMITTED AND SERVED.
 * "React renders it as a text node" is a browser-DOM property and it does NOT
 * apply here — there is no DOM at generation time, only string building. Every
 * single value that originates from an officer (or, via events/RSVP, from a
 * stranger) MUST pass through esc() or attr() at the point of interpolation.
 * An unescaped heading, button label, image alt or caption is STORED XSS:
 * committed to a public repo and served to every visitor of a client's site.
 *
 * The rule is "escape at interpolation", NOT "sanitise at storage" — storage
 * sanitising has to guess every context; escaping at the point of use cannot.
 */

/* ---------- escaping ---------- */

/* Escapes the five characters that can break out of text or a quoted attribute.
   Ampersand MUST be replaced first or the other replacements get double-escaped. */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Attribute values use the same escape set; kept as a separate name so call
   sites read as "this is going in an attribute" and so the two can diverge
   later without hunting every use. Always emit attributes double-quoted. */
export const attr = esc;

/* ---------- URL allowlists ---------- */

/* Returns a safe href or '' — never the raw input. Anything not explicitly
   allowed is dropped, so a new scheme is safe-by-default rather than
   dangerous-by-default: javascript:, data:, vbscript:, protocol-relative and
   plain http: all fall through to ''.
   ⛔ Interior control characters REJECT rather than get stripped. Stripping was
   the first implementation and it is subtly worse: `java\tscript:alert(1)` and
   `uploads/x.svg\0.png` both STRIP into something that then passes validation,
   so hostile input gets silently rewritten into a valid-looking value. No real
   URL contains a control character, so their presence is the signal. Surrounding
   whitespace is still trimmed — that is just copy-paste, not an attack. */
export function safeHref(href) {
  if (typeof href !== 'string') return '';
  const cleaned = href.trim();
  if (!cleaned) return '';
  if (/[\u0000-\u001F\u007F]/.test(cleaned)) return '';
  // internal: a path, a hash, or a query
  if (/^[/#?][^/\\]/.test(cleaned) || cleaned === '/' || cleaned === '#') return cleaned;
  // a bare relative page like "about.html"
  if (/^[a-z0-9][a-z0-9._-]*\.html(?:[?#].*)?$/i.test(cleaned)) return cleaned;
  if (/^https:\/\/[^\s"'<>]+$/i.test(cleaned)) return cleaned;
  if (/^mailto:[^\s"'<>]+$/i.test(cleaned)) return cleaned;
  if (/^tel:[+0-9()\-.\s]+$/i.test(cleaned)) return cleaned;
  return '';
}

/* Images may only come from the folders the upload endpoint can write to.
   A caller-supplied absolute URL is refused: it would let an officer (or anyone
   who got a write in) point the client's site at third-party tracking. */
export function safeSrc(src) {
  if (typeof src !== 'string') return '';
  const cleaned = src.trim();
  if (/[\u0000-\u001F\u007F]/.test(cleaned)) return '';   // see safeHref: reject, never strip
  if (cleaned.indexOf('..') !== -1) return '';
  if (/^(uploads|assets)\/[A-Za-z0-9/._-]+\.(jpe?g|png|webp|gif|svg)$/i.test(cleaned)) return cleaned;
  return '';
}

/* An uploaded video file: only from uploads/videos/ (the one folder /api/upload writes videos to),
   only the three formats it accepts. Same reject-don't-strip rule as safeSrc. */
export function safeVideoSrc(src) {
  if (typeof src !== 'string') return '';
  const cleaned = src.trim();
  if (/[\u0000-\u001F\u007F]/.test(cleaned)) return '';
  if (cleaned.indexOf('..') !== -1) return '';
  if (/^uploads\/videos\/[A-Za-z0-9._-]+\.(mp4|webm|mov)$/i.test(cleaned)) return cleaned;
  return '';
}

/* An event's meeting link: https on Zoom, Google Meet or Microsoft Teams, nothing else.
   It becomes a "Join the meeting" button that a registrant clicks without a second look,
   so an allowlist of the three services the chapter actually uses, not "any https URL".
   Returns the parsed, normalised URL, or '' when it isn't one of those. */
const MEETING_HOSTS = /^(?:(?:[a-z0-9-]+\.)*zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com)$/;
export function safeMeetingUrl(value) {
  if (typeof value !== 'string') return '';
  const cleaned = value.trim();
  if (!cleaned || /[\u0000-\u001F\u007F\s"'<>\\]/.test(cleaned)) return '';
  let u;
  try { u = new URL(cleaned); } catch { return ''; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return '';
  return MEETING_HOSTS.test(u.hostname) ? u.href : '';
}

/* A pasted video LINK -> { site, embed, watch, ratio }, or null. Only YouTube, Facebook and
   Instagram are accepted, and the embed address is BUILT from the id parsed out of the link:
   the pasted text itself is never used as an iframe src, and raw embed code is never stored.
   The renderer (blocks.js) and the save-time validator (validate-content.js) both import THIS
   function, so they cannot disagree. The Denise/BATS site has a twin of it in two files. */
export function videoEmbed(v) {
  if (typeof v !== 'string' || v.length > 500 || /[\s<>"'\\]/.test(v) || /[\u0000-\u001f\u007f]/.test(v)) return null;
  var m = /^https:\/\/([A-Za-z0-9.-]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i.exec(v);
  if (!m) return null;
  var host = m[1].toLowerCase().replace(/^(www|m)\./, ''), path = m[2] || '/', q = m[3] || '', id;
  if (host === 'youtube.com') {
    id = path === '/watch' ? (/(?:^\?|&)v=([A-Za-z0-9_-]{11})(?:&|$)/.exec(q) || [])[1] : (/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/.exec(path) || [])[1];
  } else if (host === 'youtu.be') {
    id = (/^\/([A-Za-z0-9_-]{11})\/?$/.exec(path) || [])[1];
  } else if (host === 'instagram.com') {
    var ig = /^\/(p|reel|tv)\/([A-Za-z0-9_-]{5,30})\/?$/.exec(path);
    return ig ? { site: 'Instagram', embed: 'https://www.instagram.com/' + ig[1] + '/' + ig[2] + '/embed/', watch: v, ratio: '4/5' } : null;
  } else if (host === 'facebook.com' || host === 'fb.watch') {
    var good = host === 'fb.watch' ? /^\/[A-Za-z0-9_-]{4,30}\/?$/.test(path)
      : (path === '/watch' || path === '/watch/') ? /(?:^\?|&)v=[0-9]{5,25}(?:&|$)/.test(q)
      : /^\/(?:reel\/[0-9]{5,25}|[A-Za-z0-9.]{1,80}\/videos\/(?:[^/]{1,80}\/)?[0-9]{5,25}|share\/[rv]\/[A-Za-z0-9_-]{4,30})\/?$/.test(path);
    return good ? { site: 'Facebook', embed: 'https://www.facebook.com/plugins/video.php?show_text=false&href=' + encodeURIComponent(v.replace(/#.*$/, '')), watch: v, ratio: '16/9' } : null;
  }
  return id ? { site: 'YouTube', embed: 'https://www.youtube-nocookie.com/embed/' + id, watch: v, ratio: '16/9' } : null;
}

/* ---------- small helpers ---------- */

/* Renders an attribute only when it has a value, so we never emit alt="" by
   accident where alt was genuinely absent, or href="" (which links to the
   current page rather than doing nothing). */
export function optAttr(name, value) {
  const v = value === null || value === undefined ? '' : String(value);
  return v ? ' ' + name + '="' + attr(v) + '"' : '';
}

export function classAttr(list) {
  const cls = (Array.isArray(list) ? list : [list]).filter(Boolean).join(' ');
  return cls ? ' class="' + attr(cls) + '"' : '';
}

/* Text that may contain paragraph breaks. Split on blank lines, escape each
   part, wrap in <p>. Never passes markup through — a paragraph break is the
   only formatting an officer gets, deliberately. */
export function paragraphs(text, className) {
  const raw = text === null || text === undefined ? '' : String(text);
  const parts = raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return '';
  return parts
    .map((p) => '<p' + classAttr(className) + '>' + esc(p).replace(/\n/g, '<br>') + '</p>')
    .join('\n');
}
