/* WCAA block templates — turns content/pages.json into the site's HTML.
 *
 * Runs in BOTH runtimes, same as js/render.js:
 *   - functions/api/save.js (Cloudflare Workers) at save time, to generate the
 *     .html files that get committed and served
 *   - tools/build-pages.mjs (Node) for the local build and the tests
 * tools/test-pages.mjs asserts both paths produce byte-identical output, so the
 * same rule applies here: pure string manipulation, no Node/DOM/fetch/Buffer.
 *
 * ⛔ Every officer-supplied value goes through esc/attr/safeHref/safeSrc from
 * render.js AT THE POINT OF INTERPOLATION. See the header of that file for why.
 *
 * ⛔ AND every officer-supplied value that lands in a style="" attribute goes
 * through a TOKEN ALLOWLIST below, not through esc(). Escaping stops an attacker
 * closing the attribute; it does NOT stop them putting arbitrary CSS inside it,
 * and arbitrary CSS in a style attribute can still deface the page and phone
 * home via `background:url(...)`. Layout values here come from a fixed
 * vocabulary — a spacing token, a length, a column ratio — or they fall back to
 * the default. That is the difference between a CMS that writes CSS from a menu
 * and one that writes CSS from user input.
 */
import { esc, attr, safeHref, safeSrc, safeMeetingUrl } from './render.js';

/* ---------- style-value allowlists ---------- */

const SPACE = /^var\(--space-(?:1|2|3|4|5|6|8|10|12|16|24)\)$/;
const LENGTH = /^\d{1,4}(?:px|%)$/;
const COLUMNS = /^\d{1,2}(?:\.\d)?fr(?: \d{1,2}(?:\.\d)?fr)*$/;
const ASPECT = /^\d{1,2} \/ \d{1,2}$/;
const ID = /^[a-z][a-z0-9-]{0,40}$/;          // an HTML id: must start with a letter
/* A page slug becomes a FILENAME, so it may start with a digit — "404.html" is
   the one Cloudflare Pages looks for by name. Still no dots and no slashes, so it
   cannot climb out of the repo root or claim an extension of its own. */
const SLUG = /^[a-z0-9][a-z0-9-]{0,40}$/;

const tok = (re) => (value, fallback) => (typeof value === 'string' && re.test(value) ? value : fallback);
const space = tok(SPACE);
const length = tok(LENGTH);
const columns = tok(COLUMNS);
const aspect = tok(ASPECT);

/* Grid/flex column counts and icon sizes are numbers, so they get clamped
   rather than pattern-matched — an out-of-range value is a mistake, not markup. */
const count = (v, fallback, max) =>
  Number.isInteger(v) && v >= 1 && v <= max ? String(v) : String(fallback);

const oneOf = (list, fallback) => (v) => (list.indexOf(v) !== -1 ? v : fallback);
const btnVariant = oneOf(['primary', 'outline', 'gold', 'onDark'], 'primary');
const btnSize = oneOf(['sm', 'md', 'lg'], 'md');
const headAlign = oneOf(['center', 'left'], 'center');

const styleAttr = (parts) => {
  const s = parts.filter(Boolean).join(';');
  return s ? ' style="' + s + '"' : '';
};

/* Editor-only attributes. `ed` exists only under renderPage(page, site, { edit: true }), so
   published pages never carry them (tools/test-pages.mjs asserts the bytes don't change).
   data-f names a TEXT field the admin makes typeable in place; data-item names one entry of a
   list block, which the admin opens on its own instead of the whole list. Both are paths from
   the page object, e.g. "sections.1.blocks.0.items.2.title". */
const F = (ed, key) => (ed ? ' data-f="' + attr(ed.base + '.' + key) + '"' : '');
const itemEd = (ed, i) => (ed ? { base: ed.base + '.items.' + i } : null);
const I = (ed, i) => (ed ? ' data-item="' + attr(ed.base + '.items.' + i) + '"' : '');

/* An event's registration id: what its Register button links to and what D1 keys sign-ups by.
   Minted once by the admin and never recomputed, so retitling an event keeps its sign-ups. */
export const EVENT_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

/* ---------- shared fragments ---------- */

/* An icon is a CSS mask over a same-origin SVG. safeSrc already restricts the
   path to assets/ or uploads/ with no quotes, parens or spaces in it, so it
   cannot break out of url(). A rejected path renders nothing rather than a
   broken box. */
function iconTag(src, size) {
  const url = safeSrc(src);
  if (!url) return '';
  const px = count(size, 20, 96);
  return (
    '<span aria-hidden="true" style="display:inline-block;width:' + px + 'px;height:' + px +
    'px;background:currentColor;-webkit-mask:url(' + url + ') center/contain no-repeat;mask:url(' +
    url + ') center/contain no-repeat;flex:none"></span>'
  );
}

/* Inline runs inside a paragraph or a contact row. Deliberately tiny: bold, a
   link, and nothing else. Officers get no markup — they get these three fields,
   which is what keeps "escape at interpolation" a complete answer. */
function spans(list) {
  if (!Array.isArray(list)) return '';
  return list
    .map((s) => {
      const text = esc(s && s.text);
      if (!text) return '';
      let html = text;
      if (s.strong) html = '<strong' + (s.heading ? ' style="color:var(--text-heading)"' : '') + '>' + html + '</strong>';
      const href = safeHref(s && s.href);
      if (href) html = '<a href="' + attr(href) + '"' + (s.external ? ' target="_blank" rel="noreferrer"' : '') + '>' + html + '</a>';
      return html;
    })
    .join('');
}

function buttonTag(b, extra) {
  if (!b || !b.label) return '';
  extra = extra || '';
  const cls =
    'wcaa-btn wcaa-btn--' + btnVariant(b.variant) + ' wcaa-btn--' + btnSize(b.size) +
    (b.fullWidth ? ' wcaa-btn--full' : '');
  const before = iconTag(b.icon, b.iconSize);
  const after = iconTag(b.iconAfter, b.iconSize);
  const inner = (before ? before + ' ' : '') + esc(b.label) + (after ? ' ' + after : '');
  const href = safeHref(b.href);
  if (href) {
    const ext = /^https:/i.test(href) ? ' target="_blank" rel="noreferrer"' : '';
    return '<a class="' + cls + '" href="' + attr(href) + '"' + ext + extra + '>' + inner + '</a>';
  }
  return '<button class="' + cls + '" type="button"' + extra + '>' + inner + '</button>';
}

/* ---------- form fragments ---------- */

/* A labelled input. Shared by both public forms so they cannot drift apart in
   markup, validation attributes, or the way a required field is marked. */
function formField(id, label, name, type, placeholder, required, extra) {
  return (
    '<div class="wcaa-field">' +
    '<label class="wcaa-field__label" for="' + id + '">' + esc(label) +
    (required ? '<span class="wcaa-field__req">*</span>' : '') + '</label>' +
    '<input class="wcaa-field__input" id="' + id + '" name="' + name + '" type="' + type +
    '" placeholder="' + esc(placeholder) + '"' + (required ? ' required' : '') + (extra || '') + '>' +
    '</div>'
  );
}

/* The Turnstile widget, and NOTHING when no site key is configured.
   ⛔ Rendering an empty widget would be worse than rendering none: the form would
   look complete, submit without a token, and be refused by the endpoint — which
   fails closed — leaving a chapter officer to debug a form that is "broken" for
   no visible reason. With no key the form still renders and still refuses; the
   difference is that the refusal is honest rather than mysterious. */
function turnstileWidget(site) {
  const key = site && typeof site.turnstileSiteKey === 'string' ? site.turnstileSiteKey.trim() : '';
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(key)) return '';
  return '<div class="cf-turnstile" data-sitekey="' + attr(key) + '" style="margin-bottom:var(--space-4)"></div>';
}

/* A field people never see and bots fill in. Off-screen rather than display:none (some bots skip
   hidden inputs), out of the tab order, and hidden from screen readers so nobody fills it by
   accident. functions/api/_guard.js drops any submission that has it filled. */
const HONEYPOT =
  '<div class="wcaa-hp" aria-hidden="true"><label>Leave this empty' +
  '<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>';

/* Does this page carry a form? Decides whether the page loads any script at all —
   the content pages ship none, and that is asserted in tools/test-pages.mjs. */
function pageHasForm(page) {
  const scan = (blocks) => (Array.isArray(blocks) ? blocks : []).some((b) => {
    if (!b || typeof b.type !== 'string') return false;
    if (b.type === 'contactForm') return true;
    if (b.type === 'group') return scan(b.blocks);
    if (b.type === 'split') return scan(b.left) || scan(b.right);
    return false;
  });
  return (Array.isArray(page.sections) ? page.sections : []).some((s) => scan(s && s.blocks));
}

/* ---------- blocks ---------- */

const BLOCKS = {
  heading(b, site, ed) {
    const align = headAlign(b.align);
    const cls =
      'wcaa-sh wcaa-sh--' + align + (b.size === 'sm' ? ' wcaa-sh--sm' : '') + (b.onDark ? ' wcaa-sh--onDark' : '');
    const mb = b.flush ? '0' : space(b.marginBottom, '');
    return (
      '<div class="' + cls + '"' + styleAttr([mb ? 'margin-bottom:' + mb : '']) + '>' +
      (b.kicker ? '<div class="wcaa-sh__kicker"' + F(ed, 'kicker') + '>' + esc(b.kicker) + '</div>' : '') +
      '<h2 class="wcaa-sh__title"' + F(ed, 'title') + '>' + esc(b.title) + '</h2>' +
      '<div class="wcaa-sh__rule"></div>' +
      (b.lede ? '<p class="wcaa-sh__lede"' + F(ed, 'lede') + '>' + esc(b.lede) + '</p>' : '') +
      '</div>'
    );
  },

  text(b, site, ed) {
    const body = b.spans ? spans(b.spans) : esc(b.text);
    if (!body) return '';
    const mb = space(b.marginBottom, '');
    return (
      '<p' +
      styleAttr([
        b.prose ? 'max-width:var(--prose-max)' : '',
        b.align === 'center' ? 'text-align:center' : '',
        b.size === 'md' ? 'font-size:var(--text-md)' : '',
        b.muted ? 'color:var(--text-muted)' : '',
        b.prose ? 'margin:0 auto' : mb ? 'margin:0 0 ' + mb : b.flush ? 'margin:0' : '',
      ]) +
      (b.spans ? '' : F(ed, 'text')) + '>' + body + '</p>'
    );
  },

  buttons(b, site, ed) {
    const items = (Array.isArray(b.items) ? b.items : []).map((it, i) => buttonTag(it, I(ed, i))).join('');
    if (!items) return '';
    const mt = space(b.marginTop, '');
    const gap = space(b.gap, 'var(--space-4)');
    const max = length(b.maxWidth, '');
    const id = typeof b.id === 'string' && ID.test(b.id) ? ' id="' + b.id + '"' : '';
    let css;
    if (b.layout === 'row') {
      css = ['display:flex', 'gap:' + gap, 'justify-content:center', mt ? 'margin-top:' + mt : '', 'flex-wrap:wrap'];
    } else if (b.layout === 'stack') {
      css = ['display:flex', 'flex-direction:column', 'gap:' + gap, max ? 'max-width:' + max : '', 'margin:0 auto',
             mt ? 'margin-top:' + mt : ''];
    } else if (b.layout === 'center') {
      css = ['text-align:center', mt ? 'margin-top:' + mt : ''];
    } else {
      css = [mt ? 'margin-top:' + mt : ''];   // "plain": an unstyled wrapper
    }
    return '<div' + id + styleAttr(css) + '>' + items + '</div>';
  },

  cards(b, site, ed) {
    const numbered = b.marker === 'number';
    const max = length(b.maxWidth, '');
    const cards = (Array.isArray(b.items) ? b.items : [])
      .map((it, i) => {
        if (!it || !it.title) return '';
        const ie = itemEd(ed, i);
        if (numbered) {
          return (
            '<div style="background:var(--surface-card);border-radius:var(--radius-md);box-shadow:var(--shadow-card);' +
            'padding:var(--space-8);display:flex;flex-direction:column;gap:var(--space-3);align-items:flex-start"' + I(ed, i) + '>' +
            '<div style="width:44px;height:44px;border-radius:var(--radius-round);background:var(--gold-100);' +
            'border:1px solid var(--gold-300);color:var(--gold-800);font-family:var(--font-display);font-size:20px;' +
            'display:flex;align-items:center;justify-content:center">' + esc(it.n) + '</div>' +
            '<h3 style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--text-heading);margin:0"' + F(ie, 'title') + '>' +
            esc(it.title) + '</h3>' +
            '<p style="font-size:15px;line-height:1.55;color:var(--text-body);margin:0;flex:1"' + F(ie, 'text') + '>' + esc(it.text) + '</p>' +
            buttonTag(it.action) +
            '</div>'
          );
        }
        /* The icon circle renders only when there IS an icon. An icon-marker card
           with no icon (e.g. a vendor perk that's just a name + a discount) would
           otherwise show an empty blue circle — a broken-looking decorative slot.
           No icon = just the title and text, centered. */
        const cardIcon = iconTag(it.icon, 24);
        return (
          '<div style="background:var(--surface-card);border-radius:var(--radius-md);box-shadow:var(--shadow-card);' +
          'padding:var(--space-8) var(--space-6);text-align:center"' + I(ed, i) + '>' +
          (cardIcon
            ? '<div style="width:56px;height:56px;border-radius:var(--radius-round);background:var(--blue-100);' +
              'color:var(--blue-700);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4)">' +
              cardIcon + '</div>'
            : '') +
          '<h3 style="font-family:var(--font-display);font-size:var(--text-lg);color:var(--text-heading);' +
          'margin:0 0 var(--space-2)"' + F(ie, 'title') + '>' + esc(it.title) + '</h3>' +
          '<p style="font-size:15px;line-height:1.55;color:var(--text-muted);margin:0"' + F(ie, 'text') + '>' + esc(it.text) + '</p>' +
          '</div>'
        );
      })
      .join('');
    if (!cards) return '';
    return (
      '<div class="wcaa-grid"' +
      styleAttr([
        'display:grid',
        'grid-template-columns:repeat(' + count(b.columns, 3, 6) + ', 1fr)',
        'gap:' + space(b.gap, 'var(--space-6)'),
        max ? 'max-width:' + max : '',
        max ? 'margin:0 auto' : '',
      ]) +
      '>' + cards + '</div>'
    );
  },

  events(b, site, ed) {
    const cards = (Array.isArray(b.items) ? b.items : [])
      .map((e, i) => {
        if (!e || !e.title) return '';
        const ie = itemEd(ed, i);
        const href = safeHref(e.href);
        /* In the editor, time and location are separate spans so each can be typed into; the
           published card keeps the plain joined text it always had. */
        const meta = ie
          ? [['time', e.time], ['location', e.location]].filter((x) => x[1])
              .map((x) => '<span' + F(ie, x[0]) + '>' + esc(x[1]) + '</span>').join(' · ')
          : [e.time, e.location].filter(Boolean).map(esc).join(' · ');
        /* Register goes to the one registration page (renderRegisterPage). A meeting link shows
           on the card ONLY when the officer ticked "show it to everyone"; otherwise it is never
           in the content at all (functions/api/save.js strips it to D1) and registrants get it
           on the confirmation screen. */
        const reg = e.register && typeof e.id === 'string' && EVENT_ID.test(e.id)
          ? '<a class="wcaa-btn wcaa-btn--primary wcaa-btn--lg wcaa-ev__reg" href="register.html?event=' + attr(e.id) + '">Register for this event</a>'
          : '';
        const meeting = e.meetingPublic ? safeMeetingUrl(e.meetingLink) : '';
        const join = meeting
          ? '<a class="wcaa-btn wcaa-btn--outline wcaa-btn--lg" href="' + attr(meeting) + '" target="_blank" rel="noreferrer">Join the meeting</a>'
          : '';
        return (
          '<article class="wcaa-ev' + (href ? ' wcaa-ev--link' : '') + '"' + I(ed, i) + '>' +
          '<div class="wcaa-ev__date"><span class="wcaa-ev__mo"' + F(ie, 'month') + '>' + esc(e.month) + '</span>' +
          '<span class="wcaa-ev__day"' + F(ie, 'day') + '>' + esc(e.day) + '</span></div>' +
          '<div class="wcaa-ev__body">' +
          (e.badge ? '<div><span class="wcaa-badge wcaa-badge--blue"' + F(ie, 'badge') + '>' + esc(e.badge) + '</span></div>' : '') +
          '<h3 class="wcaa-ev__title"' + F(ie, 'title') + '>' + esc(e.title) + '</h3>' +
          (meta ? '<div class="wcaa-ev__meta">' + meta + '</div>' : '') +
          (e.description ? '<p class="wcaa-ev__desc"' + F(ie, 'description') + '>' + esc(e.description) + '</p>' : '') +
          (href ? '<a class="wcaa-ev__link" href="' + attr(href) + '">' + esc(e.linkLabel || 'Event Details') + ' →</a>' : '') +
          (reg || join ? '<div class="wcaa-ev__actions">' + reg + join + '</div>' : '') +
          '</div></article>'
        );
      })
      .join('');
    if (!cards) return '';
    return '<div style="display:flex;flex-direction:column;gap:' + space(b.gap, 'var(--space-4)') + '">' + cards + '</div>';
  },

  gallery(b, site, ed) {
    const ratio = aspect(b.aspect, '4 / 3');
    const figures = (Array.isArray(b.items) ? b.items : [])
      .map((it, i) => {
        const src = safeSrc(it && it.src);
        const alt = esc(it && it.alt);
        const inner = src
          ? '<img src="' + attr(src) + '" alt="' + alt + '" loading="lazy">'
          : '<span class="wcaa-gal__empty">' + (alt || 'Photo') + '</span>';
        return (
          '<figure class="wcaa-gal__item" style="margin:0"' + I(ed, i) + '>' +
          '<div class="wcaa-gal__ph" style="aspect-ratio:' + ratio + '">' + inner + '</div>' +
          (it && it.caption ? '<figcaption class="wcaa-gal__cap"' + F(itemEd(ed, i), 'caption') + '>' + esc(it.caption) + '</figcaption>' : '') +
          '</figure>'
        );
      })
      .join('');
    if (!figures) return '';
    return (
      '<div class="wcaa-gal" style="grid-template-columns:repeat(' + count(b.columns, 3, 8) + ', 1fr)">' +
      figures + '</div>'
    );
  },

  /* A single image. `gallery` covers a grid; this covers the one-photo case an
     officer reaches for far more often, and it keeps them out of a one-item
     gallery whose column count then means nothing. */
  image(b, site, ed) {
    const src = safeSrc(b.src);
    if (!src) return '';
    const max = length(b.maxWidth, '');
    const ratio = aspect(b.aspect, '');
    const img =
      '<img src="' + attr(src) + '" alt="' + esc(b.alt) + '" loading="lazy"' +
      styleAttr([
        'width:100%',
        'display:block',
        'border-radius:var(--radius-lg)',
        ratio ? 'aspect-ratio:' + ratio : '',
        ratio ? 'object-fit:cover' : '',
      ]) + '>';
    return (
      '<figure' + styleAttr(['margin:0', max ? 'max-width:' + max : '', max ? 'margin:0 auto' : '']) + '>' +
      img +
      (b.caption ? '<figcaption class="wcaa-gal__cap" style="margin-top:var(--space-2)"' + F(ed, 'caption') + '>' + esc(b.caption) + '</figcaption>' : '') +
      '</figure>'
    );
  },

  list(b, site, ed) {
    const marker = iconTag(b.icon, 16);
    const items = (Array.isArray(b.items) ? b.items : [])
      .map((t, i) => {
        const text = esc(t);
        if (!text) return '';
        return (
          '<li style="display:flex;gap:10px;align-items:baseline;font-size:var(--text-md);' +
          'margin-bottom:var(--space-3)">' +
          (marker ? '<span style="color:var(--gold-600);flex:none;transform:translateY(2px)">' + marker + '</span>' : '') +
          '<span' + F(ed, 'items.' + i) + '>' + text + '</span></li>'
        );
      })
      .join('');
    if (!items) return '';
    return '<ul style="list-style:none;padding:0;margin:0">' + items + '</ul>';
  },

  officers(b, site, ed) {
    const cards = (Array.isArray(b.items) ? b.items : [])
      .map((o, i) => {
        if (!o || !o.name) return '';
        const photo = safeSrc(o.photo);
        /* No photo falls back to initials. The design-system prototype showed an
           empty editor drop-slot here instead; a live site has no editor, so the
           production fallback is the right thing to render. */
        const initials = String(o.name).split(/\s+/).map((w) => w[0]).slice(0, 2).join('');
        const tel = String(o.phone || '').replace(/[^+\d]/g, '');
        const contact =
          (o.phone && tel ? '<a href="tel:' + attr(tel) + '">' + esc(o.phone) + '</a>' : '') +
          (o.email ? '<a href="' + attr(safeHref('mailto:' + o.email)) + '">' + esc(o.email) + '</a>' : '');
        return (
          '<div class="wcaa-off"' + I(ed, i) + '>' +
          '<div class="wcaa-off__photo">' +
          (photo
            ? '<img src="' + attr(photo) + '" alt="' + esc(o.name) + '">'
            : '<span class="wcaa-off__init">' + esc(initials) + '</span>') +
          '</div>' +
          '<div class="wcaa-off__name"' + F(itemEd(ed, i), 'name') + '>' + esc(o.name) + '</div>' +
          '<div class="wcaa-off__role"' + F(itemEd(ed, i), 'role') + '>' + esc(o.role) + '</div>' +
          (contact ? '<div class="wcaa-off__contact">' + contact + '</div>' : '') +
          '</div>'
        );
      })
      .join('');
    if (!cards) return '';
    return (
      '<div style="display:flex;justify-content:center;gap:' + space(b.gap, 'var(--space-16)') +
      ';flex-wrap:wrap">' + cards + '</div>'
    );
  },

  iconRows(b) {
    const inline = b.layout === 'inline';
    const mt = space(b.marginTop, '');
    const rows = (Array.isArray(b.items) ? b.items : [])
      .map((r) => {
        const lines = (Array.isArray(r && r.lines) ? r.lines : []).map(spans).filter(Boolean).join('<br>');
        if (!lines) return '';
        if (inline) {
          return (
            '<span style="display:flex;gap:10px;align-items:center;font-size:15px;color:var(--text-body)">' +
            '<span style="color:var(--blue-700)">' + iconTag(r.icon, 17) + '</span>' + lines + '</span>'
          );
        }
        return (
          '<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:var(--space-5);font-size:15px">' +
          '<span style="color:var(--blue-700);flex:none;transform:translateY(2px)">' + iconTag(r.icon, 18) + '</span>' +
          '<span>' + lines + '</span></div>'
        );
      })
      .join('');
    if (!rows) return '';
    if (inline) {
      return (
        '<div style="display:flex;justify-content:center;gap:' + space(b.gap, 'var(--space-8)') +
        (mt ? ';margin-top:' + mt : '') + ';flex-wrap:wrap">' + rows + '</div>'
      );
    }
    return '<div' + styleAttr([mt ? 'margin-top:' + mt : '']) + '>' + rows + '</div>';
  },

  /* The field set is fixed on purpose — these four fields plus a message are
     what the chapter asks for, and a configurable form builder is a different
     product. Officers get the heading, the button label and the footnote. */
  contactForm(b, site, ed) {
    return (
      '<form class="wcaa-form" method="post" action="/api/contact" data-endpoint="/api/contact"' +
      ' data-success="Thank you — we’ve received your message and will be in touch."' +
      ' style="background:var(--surface-card);border-radius:var(--radius-md);' +
      'box-shadow:var(--shadow-card);padding:var(--space-8)">' +
      '<h3 style="font-size:var(--text-xl);margin-bottom:var(--space-6)"' + F(ed, 'heading') + '>' + esc(b.heading) + '</h3>' +
      '<div class="wcaa-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4)">' +
      formField('cf-name', 'Name', 'name', 'text', 'Your name', false) +
      formField('cf-business', 'Business Name', 'business', 'text', 'Workroom or studio', false) +
      formField('cf-email', 'Email', 'email', 'email', 'you@business.com', true) +
      formField('cf-phone', 'Telephone #', 'phone', 'tel', '(555) 555-5555', false) +
      '</div>' +
      '<div class="wcaa-field" style="margin-bottom:var(--space-6)">' +
      '<label class="wcaa-field__label" for="cf-message">Message</label>' +
      '<textarea class="wcaa-field__input" id="cf-message" name="message" rows="4" ' +
      'placeholder="How can we help?" style="resize:vertical"></textarea></div>' +
      HONEYPOT +
      turnstileWidget(site) +
      '<button class="wcaa-btn wcaa-btn--primary wcaa-btn--md" type="submit">' +
      esc(b.submitLabel || 'Send') + '</button>' +
      '<p class="wcaa-form__msg" role="status" hidden></p>' +
      (b.note ? '<p style="font-size:12px;color:var(--text-muted);margin:var(--space-4) 0 0"' + F(ed, 'note') + '>' + esc(b.note) + '</p>' : '') +
      '</form>'
    );
  },

  group(b, site, ed) {
    const mb = space(b.marginBottom, '');
    const gap = space(b.gap, '');
    return (
      '<div' +
      styleAttr([
        gap ? 'display:flex' : '',
        gap ? 'flex-direction:column' : '',
        gap ? 'gap:' + gap : '',
        mb ? 'margin-bottom:' + mb : '',
      ]) +
      '>' + renderBlocks(b.blocks, site, ed && ed.into('blocks')) + '</div>'
    );
  },

  split(b, site, ed) {
    const max = length(b.maxWidth, '');
    const left = renderBlocks(b.left, site, ed && ed.into('left'));
    const right = renderBlocks(b.right, site, ed && ed.into('right'));
    /* A column that renders to nothing — e.g. an events list with no events posted
       yet — would leave a dead half of the grid and a lopsided two-up. Collapse to
       the populated column at full width instead; the grid only appears once both
       sides have content. */
    if (!left || !right) {
      const only = left || right;
      return only
        ? '<div' + styleAttr([max ? 'max-width:' + max : '', b.centered ? 'margin:0 auto' : '']) + '>' + only + '</div>'
        : '';
    }
    return (
      '<div class="wcaa-grid"' +
      styleAttr([
        'display:grid',
        'grid-template-columns:' + columns(b.columns, '1fr 1fr'),
        'gap:' + space(b.gap, 'var(--space-12)'),
        b.align === 'start' ? 'align-items:start' : '',
        max ? 'max-width:' + max : '',
        b.centered ? 'margin:0 auto' : '',
      ]) +
      '>' +
      '<div>' + left + '</div>' +
      '<div>' + right + '</div>' +
      '</div>'
    );
  },
};

/* The renderer IS the list of valid block types. Exported so js/validate-content.js
   cannot keep a second copy that drifts — a validator with its own hardcoded list
   eventually rejects a block the renderer handles, or accepts one it silently
   drops, and both look like the CMS losing the officer's work. */
export const BLOCK_TYPES = Object.keys(BLOCKS);

/* An unknown block type renders NOTHING rather than throwing or passing the
   value through. pages.json is officer-editable, so an unrecognised type is
   either a typo or an injection attempt; both should be inert, and neither
   should take the whole page down. */
export function renderBlocks(list, site, ed) {
  if (!Array.isArray(list)) return '';
  return list
    .map((b, i) => {
      const fn = b && typeof b.type === 'string' && Object.prototype.hasOwnProperty.call(BLOCKS, b.type)
        ? BLOCKS[b.type] : null;
      if (!ed) return fn ? fn(b, site) : '';
      const path = ed.at(i);
      const base = pathKey(path);
      const html = fn ? fn(b, site, Object.assign({ base }, ed.child(i))) : '';
      /* A visible "+ Add an event" under every list block: adding must not depend on hovering
         (older officers, touch screens), and an empty list gets the same affordance below. */
      const add = html && ADD_NOUN[b.type]
        ? '<button type="button" class="wcaa-edit-add" data-add="' + attr(base + '.items') + '">+ Add ' + ADD_NOUN[b.type] + '</button>'
        : '';
      return editWrap(path, html + add, b, base);
    })
    .filter(Boolean)
    .join('');
}

/* ---------- editor mode (admin preview ONLY) ----------
   renderPage(page, site, { edit: true }) tags every block with the path the admin uses to
   address it, and gives an EMPTY block a visible stand-in. Without `edit` none of this runs:
   published pages are byte-identical (build-pages --check and test-pages assert it).
   ⛔ Why the stand-in matters: an events or cards block with no items renders nothing, so an
   officer looking at the preview had nothing to click where "Upcoming Events" should be — and
   the first officer save turned the neighbouring button into a new events block instead. */
const EMPTY_TEXT = {
  events: 'No events listed yet', cards: 'No cards yet', gallery: 'No photos yet',
  officers: 'No officers listed yet', list: 'No points yet', buttons: 'No buttons yet', image: 'No photo chosen yet',
};

const ADD_NOUN = { events: 'an event', cards: 'a card', gallery: 'a photo', officers: 'an officer',
                   list: 'a point', buttons: 'a button' };

/* { section: 1, chain: [{ index: 0, key: 'left' }, { index: 2, key: 'blocks' }] }
   -> "sections.1.blocks.0.left.2" — the same walk admin/app.js containerAt/blockAt do. */
export function pathKey(path) {
  let out = 'sections.' + path.section + '.blocks';
  path.chain.forEach((step, n) => {
    out += '.' + step.index + (n < path.chain.length - 1 ? '.' + step.key : '');
  });
  return out;
}

function editor(section, chain) {
  return {
    at: (i) => ({ section, chain: chain.concat([{ index: i, key: 'blocks' }]) }),
    // Where block i's own children live: a group's list, or one side of a split.
    child: (i) => ({ into: (key) => editor(section, chain.concat([{ index: i, key }])) }),
  };
}

function editWrap(path, html, b, base) {
  const tag = ' data-edit="' + attr(JSON.stringify(path)) + '" data-edit-type="' + attr(b && b.type) + '"';
  if (html) return '<div' + tag + ' style="display:contents">' + html + '</div>';
  const add = ADD_NOUN[b && b.type] ? ' data-add="' + attr(base + '.items') + '"' : '';
  return '<div' + tag + add + ' class="wcaa-edit-empty" style="border:2px dashed var(--gold-300,#d9b86c);' +
    'border-radius:8px;padding:18px;text-align:center;color:var(--text-muted,#666);font:15px/1.4 sans-serif">' +
    esc(EMPTY_TEXT[b && b.type] || 'This block is empty') + ' — click here to add some</div>';
}

/* ---------- page chrome ---------- */

function renderSection(s, site, ed) {
  const body = renderBlocks(s && s.blocks, site, ed);
  if (!body) return '';
  const cls =
    'wcaa-sec' + (s.tint ? ' wcaa-sec--tint' : '') + (s.dark ? ' wcaa-sec--dark' : '') +
    (s.tight ? ' wcaa-sec--tight' : '');
  return (
    '<section class="' + cls + '"><div class="wcaa-sec__in' + (s.narrow ? ' wcaa-sec__in--narrow' : '') + '">' +
    body + '</div></section>'
  );
}

function renderHero(h, ed) {
  if (!h || !h.title) return '';
  const page = h.variant === 'page';
  const media = safeSrc(h.image);
  const logo = safeSrc(h.logo);
  return (
    '<section class="wcaa-hero wcaa-hero--' + (page ? 'page' : 'full') + '" style="min-height:' +
    (page ? '240' : '540') + 'px"' + (ed ? ' data-hero' : '') + '>' +
    /* The hero photo is a backdrop behind the headline — the heading carries the
       meaning, so alt is empty by design rather than by omission. */
    (media ? '<div class="wcaa-hero__media"><img src="' + attr(media) + '" alt=""></div>' : '') +
    '<div class="wcaa-hero__ovl"></div>' +
    '<div class="wcaa-hero__in">' +
    (logo
      ? '<img class="wcaa-hero__logo" src="' + attr(logo) + '" alt="' + attr(h.logoAlt || '') + '" width="132" height="132">'
      : (h.kicker ? '<div class="wcaa-hero__kicker"' + F(ed, 'kicker') + '>' + esc(h.kicker) + '</div>' : '')) +
    '<h1 class="wcaa-hero__title"' + F(ed, 'title') + '>' + esc(h.title) + '</h1>' +
    '<div class="wcaa-hero__rule"></div>' +
    (h.subtitle ? '<p class="wcaa-hero__sub"' + F(ed, 'subtitle') + '>' + esc(h.subtitle) + '</p>' : '') +
    (Array.isArray(h.actions) && h.actions.length
      ? '<div class="wcaa-hero__actions">' + h.actions.map((a) => buttonTag(a)).join('') + '</div>'
      : '') +
    '</div></section>'
  );
}

function renderNav(site, activeHref) {
  const link = (l) => {
    const href = safeHref(l && l.href);
    if (!href) return '';
    return (
      '<a class="wcaa-nav__link' + (href === activeHref ? ' wcaa-nav__link--active' : '') + '" href="' +
      attr(href) + '">' + esc(l.label) + '</a>'
    );
  };
  const brandLogo = safeSrc(site.brandLogo);
  return (
    '<nav class="wcaa-nav"><div class="wcaa-nav__in">' +
    '<a class="wcaa-nav__brand" href="' + attr(safeHref(site.homeHref) || 'index.html') + '">' +
    (brandLogo
      ? '<img class="wcaa-nav__logo" src="' + attr(brandLogo) + '" alt="' + attr(site.brandLogoAlt || site.brandMark) + '" width="48" height="48">'
      : '<span class="wcaa-nav__mark">' + esc(site.brandMark) + '</span>') +
    '<span class="wcaa-nav__div"></span>' +
    '<span class="wcaa-nav__sub">' + esc(site.brandSub) + '</span></a>' +
    '<div class="wcaa-nav__links">' + (site.nav || []).map(link).join('') +
    (site.navCta ? buttonTag({ label: site.navCta.label, href: site.navCta.href, variant: 'gold', size: 'sm' }) : '') +
    '</div>' +
    /* No burger. These pages ship no JavaScript, so a burger would be a button
       that opens nothing; css/pages.css wraps the links onto their own row below
       the breakpoint instead. */
    '</div></nav>'
  );
}

function renderFooter(site) {
  const links = (site.footerLinks || [])
    .map((l) => {
      const href = safeHref(l && l.href);
      return href ? '<a href="' + attr(href) + '">' + esc(l.label) + '</a>' : '';
    })
    .join('');
  const socials = (site.socials || [])
    .map((s) => {
      const href = safeHref(s && s.href);
      return href
        ? '<a href="' + attr(href) + '" aria-label="' + attr(s.label) + '" target="_blank" rel="noreferrer">' +
          iconTag(s.icon, 18) + '</a>'
        : '';
    })
    .join('');
  return (
    '<footer class="wcaa-foot">' +
    '<div class="wcaa-foot__mark">' + esc(site.brandMark) + '</div>' +
    '<div class="wcaa-foot__rule"></div>' +
    '<div class="wcaa-foot__sub">' + esc(site.brandSub) + '</div>' +
    (links ? '<div class="wcaa-foot__links">' + links + '</div>' : '') +
    (socials ? '<div class="wcaa-foot__soc">' + socials + '</div>' : '') +
    '<div class="wcaa-foot__copy">' + esc(site.copyright) + '</div>' +
    '</footer>'
  );
}

/* The github.io -> .com canonical redirect, emitted into EVERY page's <head>.
   It lives HERE, in the renderer, because it used to be hand-injected into the built HTML —
   and the admin's save re-renders every page, so the first officer save (1feb57e, 09-14)
   silently stripped it from all seven. Inline (not js/*.js) so it still resolves on a
   mirror 404 at any depth. Hostname-guarded: see canonical-redirect.test.mjs. */
export const CANONICAL_REDIRECT = [
  "<!-- canonical-redirect: the github.io mirror serves the SAME master branch as the .com",
  "     (GitHub Pages + Cloudflare Pages, one source). A plain redirect in this file would run on",
  "     BOTH and loop the .com onto itself, so it is guarded by hostname and can only ever fire on",
  "     the mirror. Path-mapped because the mirror serves under /wcaa-njsepachapter/ while the .com",
  "     serves at root — redirecting to the bare domain would dump every deep link on the homepage. -->",
  "<script>",
  "(function(){",
  "  var CANON = \"https://wcaa-njsepachapter.com\", MIRROR = \"acunningham-ship-it.github.io\", BASE = \"/wcaa-njsepachapter\";",
  "  function target(host, path, search, hash){",
  "    if (host !== MIRROR) return null;",
  "    path = path.replace(new RegExp(\"^\" + BASE + \"(?=/|$)\"), \"\") || \"/\";",
  "    return CANON + path + (search || \"\") + (hash || \"\");",
  "  }",
  "  if (typeof window !== \"undefined\") window.__wcaaRedirectTarget = target;",
  "  var t = (typeof location !== \"undefined\") && target(location.hostname, location.pathname, location.search, location.hash);",
  "  if (t) location.replace(t);",
  "})();",
  "</script>",
].join('\n') + '\n';

/* The document shell every generated page shares. */
function documentFor(site, { title, navHref, hasForm, hero, body }) {
  return (
    '<!DOCTYPE html>\n' +
    '<html lang="en">\n<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + esc(title) + '</title>\n' +
    '<link rel="stylesheet" href="styles.css">\n' +
    '<link rel="stylesheet" href="css/components.css">\n' +
    '<link rel="stylesheet" href="css/pages.css">\n' +
    /* Scripts ONLY on a page that carries a form. The content pages ship none,
       and tools/test-pages.mjs asserts that per page rather than site-wide — the
       Turnstile widget needs JavaScript, so a bot-gated form has no JS-free path,
       but that is no reason for the other six pages to pay for it. */
    (hasForm
      ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>\n' +
        '<script src="js/forms.js" defer></script>\n'
      : '') +
    CANONICAL_REDIRECT +
    '</head>\n<body>\n' +
    renderNav(site, navHref) +
    hero +
    body +
    renderFooter(site) +
    '\n</body>\n</html>\n'
  );
}

/* The whole document for one page. Deterministic: same inputs, same bytes —
   no timestamps, no random ids, no Date. tools/test-pages.mjs asserts it. */
export function renderPage(page, site, opts) {
  const edit = !!(opts && opts.edit);
  return documentFor(site, {
    title: page.title || site.title,
    navHref: page.navHref,
    hasForm: pageHasForm(page),
    hero: renderHero(page.hero, edit ? { base: 'hero' } : null),
    body: Array.isArray(page.sections)
      ? page.sections.map((s, i) => renderSection(s, site, edit ? editor(i, []) : null)).join('') : '',
  });
}

/* Every events-block item on every page, nested blocks included. One walker, so the register
   page, the save-time D1 sync, the admin's link merge and the validator can't disagree about
   which events exist. */
export function eventItems(content) {
  const out = [];
  const walk = (blocks) => (Array.isArray(blocks) ? blocks : []).forEach((b) => {
    if (!b || typeof b !== 'object') return;
    if (b.type === 'events' && Array.isArray(b.items)) b.items.forEach((e) => { if (e && typeof e === 'object') out.push(e); });
    if (b.type === 'group') walk(b.blocks);
    if (b.type === 'split') { walk(b.left); walk(b.right); }
  });
  for (const page of (content && Array.isArray(content.pages) ? content.pages : [])) {
    for (const s of (page && Array.isArray(page.sections) ? page.sections : [])) walk(s && s.blocks);
  }
  return out;
}

/* Events that take registration, by id. The same event can be listed twice (home page and
   Events page) under one id; the first listing describes it. */
export function registerableEvents(content) {
  const out = {};
  for (const e of eventItems(content)) {
    if (e.register === true && typeof e.id === 'string' && EVENT_ID.test(e.id) && e.title && !out[e.id]) out[e.id] = e;
  }
  return out;
}

/* register.html — the one page every "Register for this event" button opens, with the event
   named in the address (register.html?event=<id>). It is generated on every save like the
   others but is NOT in pages.json, so it can't be deleted out from under those buttons (the
   slug is reserved in js/validate-content.js). One thing on screen at a time: the event, three
   fields, one button; then "You're registered", and the meeting button if there is one.
   The registerable events ride along as JSON and js/forms.js fills the page in with
   textContent. `<` is escaped so no value can close the script element. */
export function renderRegisterPage(content, site) {
  const events = {};
  for (const [id, e] of Object.entries(registerableEvents(content))) {
    events[id] = {
      title: String(e.title),
      when: [[e.month, e.day].filter(Boolean).join(' '), e.time].filter(Boolean).map(String).join(' · '),
      where: e.location ? String(e.location) : '',
    };
  }
  const pages = content && Array.isArray(content.pages) ? content.pages : [];
  const back = pages.some((p) => p && p.slug === 'events') ? 'events.html' : 'index.html';
  const field = (id, label, name, type, extra) =>
    '<div class="wcaa-field wcaa-reg__field">' +
    '<label class="wcaa-field__label" for="' + id + '">' + label + '</label>' +
    '<input class="wcaa-field__input" id="' + id + '" name="' + name + '" type="' + type + '"' + extra + '>' +
    '</div>';
  const body =
    '<section class="wcaa-sec"><div class="wcaa-sec__in wcaa-sec__in--narrow"><div class="wcaa-reg">' +
    '<div class="wcaa-reg__panel" id="reg-missing">' +
    '<h2 class="wcaa-reg__title">Choose an event first</h2>' +
    '<p class="wcaa-reg__lead">Go to the events page and press <strong>Register for this event</strong> on the one you want to attend.</p>' +
    '<a class="wcaa-btn wcaa-btn--primary wcaa-btn--lg" href="' + back + '">See the events</a></div>' +
    '<form class="wcaa-form wcaa-reg__panel" id="reg-form" method="post" action="/api/rsvp" data-endpoint="/api/rsvp" data-register hidden>' +
    '<p class="wcaa-reg__kicker">You’re registering for</p>' +
    '<h2 class="wcaa-reg__title" id="reg-title"></h2>' +
    '<p class="wcaa-reg__lead" id="reg-when"></p>' +
    '<input type="hidden" name="event_id" id="reg-id" value="">' +
    field('reg-name', 'Your name', 'name', 'text', ' autocomplete="name" autocapitalize="words" required') +
    field('reg-email', 'Email', 'email', 'email', ' autocomplete="email" inputmode="email" required') +
    field('reg-phone', 'Phone <span class="wcaa-reg__opt">(optional)</span>', 'phone', 'tel', ' autocomplete="tel" inputmode="tel"') +
    HONEYPOT +
    '<p class="wcaa-reg__notice">Your information goes only to the WCAA NJ/SE-PA chapter for this event.</p>' +
    turnstileWidget(site) +
    '<button class="wcaa-btn wcaa-btn--primary wcaa-btn--lg wcaa-btn--full" type="submit">Register</button>' +
    '<p class="wcaa-form__msg" role="alert" hidden></p>' +
    '</form>' +
    '<div class="wcaa-reg__panel" id="reg-done" tabindex="-1" hidden>' +
    '<h2 class="wcaa-reg__title">You’re registered for <span id="reg-done-title"></span></h2>' +
    '<p class="wcaa-reg__lead" id="reg-done-when"></p>' +
    '<a class="wcaa-btn wcaa-btn--primary wcaa-btn--lg" id="reg-join" target="_blank" rel="noreferrer" hidden>Join the meeting</a>' +
    '<p class="wcaa-reg__lead" id="reg-join-note" hidden>Save this link, you’ll use it to join on the day: ' +
    '<span class="wcaa-reg__url" id="reg-join-url"></span><br>' +
    'Lost it? Register again with the same email and it will show here again.</p>' +
    '<a class="wcaa-btn wcaa-btn--outline wcaa-btn--lg" href="' + back + '">Back to the events</a></div>' +
    '<script type="application/json" id="reg-events">' + JSON.stringify(events).replace(/</g, '\\u003c') + '</script>' +
    '</div></div></section>';
  return documentFor(site, {
    title: 'Register for an event — ' + (site.title || ''),
    navHref: back,
    hasForm: true,
    hero: renderHero({ variant: 'page', title: 'Event registration' }),
    body,
  });
}

/* Page files by name: one per content page, plus register.html. */
export function renderSite(content, site) {
  const out = {};
  for (const page of content.pages || []) {
    if (page && typeof page.slug === 'string' && SLUG.test(page.slug)) out[page.slug + '.html'] = renderPage(page, site);
  }
  out['register.html'] = renderRegisterPage(content, site);
  return out;
}
