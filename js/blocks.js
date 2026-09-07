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
import { esc, attr, safeHref, safeSrc } from './render.js';

/* ---------- style-value allowlists ---------- */

const SPACE = /^var\(--space-(?:1|2|3|4|5|6|8|10|12|16|24)\)$/;
const LENGTH = /^\d{1,4}(?:px|%)$/;
const COLUMNS = /^\d{1,2}(?:\.\d)?fr(?: \d{1,2}(?:\.\d)?fr)*$/;
const ASPECT = /^\d{1,2} \/ \d{1,2}$/;
const ID = /^[a-z][a-z0-9-]{0,40}$/;

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

function buttonTag(b) {
  if (!b || !b.label) return '';
  const cls =
    'wcaa-btn wcaa-btn--' + btnVariant(b.variant) + ' wcaa-btn--' + btnSize(b.size) +
    (b.fullWidth ? ' wcaa-btn--full' : '');
  const before = iconTag(b.icon, b.iconSize);
  const after = iconTag(b.iconAfter, b.iconSize);
  const inner = (before ? before + ' ' : '') + esc(b.label) + (after ? ' ' + after : '');
  const href = safeHref(b.href);
  if (href) {
    const ext = /^https:/i.test(href) ? ' target="_blank" rel="noreferrer"' : '';
    return '<a class="' + cls + '" href="' + attr(href) + '"' + ext + '>' + inner + '</a>';
  }
  return '<button class="' + cls + '" type="button">' + inner + '</button>';
}

/* ---------- blocks ---------- */

const BLOCKS = {
  heading(b) {
    const align = headAlign(b.align);
    const cls =
      'wcaa-sh wcaa-sh--' + align + (b.size === 'sm' ? ' wcaa-sh--sm' : '') + (b.onDark ? ' wcaa-sh--onDark' : '');
    const mb = b.flush ? '0' : space(b.marginBottom, '');
    return (
      '<div class="' + cls + '"' + styleAttr([mb ? 'margin-bottom:' + mb : '']) + '>' +
      (b.kicker ? '<div class="wcaa-sh__kicker">' + esc(b.kicker) + '</div>' : '') +
      '<h2 class="wcaa-sh__title">' + esc(b.title) + '</h2>' +
      '<div class="wcaa-sh__rule"></div>' +
      (b.lede ? '<p class="wcaa-sh__lede">' + esc(b.lede) + '</p>' : '') +
      '</div>'
    );
  },

  text(b) {
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
      '>' + body + '</p>'
    );
  },

  buttons(b) {
    const items = (Array.isArray(b.items) ? b.items : []).map(buttonTag).join('');
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

  cards(b) {
    const numbered = b.marker === 'number';
    const max = length(b.maxWidth, '');
    const cards = (Array.isArray(b.items) ? b.items : [])
      .map((it) => {
        if (!it || !it.title) return '';
        if (numbered) {
          return (
            '<div style="background:var(--surface-card);border-radius:var(--radius-md);box-shadow:var(--shadow-card);' +
            'padding:var(--space-8);display:flex;flex-direction:column;gap:var(--space-3);align-items:flex-start">' +
            '<div style="width:44px;height:44px;border-radius:var(--radius-round);background:var(--gold-100);' +
            'border:1px solid var(--gold-300);color:var(--gold-800);font-family:var(--font-display);font-size:20px;' +
            'display:flex;align-items:center;justify-content:center">' + esc(it.n) + '</div>' +
            '<h3 style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--text-heading);margin:0">' +
            esc(it.title) + '</h3>' +
            '<p style="font-size:15px;line-height:1.55;color:var(--text-body);margin:0;flex:1">' + esc(it.text) + '</p>' +
            buttonTag(it.action) +
            '</div>'
          );
        }
        return (
          '<div style="background:var(--surface-card);border-radius:var(--radius-md);box-shadow:var(--shadow-card);' +
          'padding:var(--space-8) var(--space-6);text-align:center">' +
          '<div style="width:56px;height:56px;border-radius:var(--radius-round);background:var(--blue-100);' +
          'color:var(--blue-700);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4)">' +
          iconTag(it.icon, 24) + '</div>' +
          '<h3 style="font-family:var(--font-display);font-size:var(--text-lg);color:var(--text-heading);' +
          'margin:0 0 var(--space-2)">' + esc(it.title) + '</h3>' +
          '<p style="font-size:15px;line-height:1.55;color:var(--text-muted);margin:0">' + esc(it.text) + '</p>' +
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

  events(b) {
    const cards = (Array.isArray(b.items) ? b.items : [])
      .map((e) => {
        if (!e || !e.title) return '';
        const href = safeHref(e.href);
        const meta = [e.time, e.location].filter(Boolean).map(esc).join(' · ');
        return (
          '<article class="wcaa-ev' + (href ? ' wcaa-ev--link' : '') + '">' +
          '<div class="wcaa-ev__date"><span class="wcaa-ev__mo">' + esc(e.month) + '</span>' +
          '<span class="wcaa-ev__day">' + esc(e.day) + '</span></div>' +
          '<div class="wcaa-ev__body">' +
          (e.badge ? '<div><span class="wcaa-badge wcaa-badge--blue">' + esc(e.badge) + '</span></div>' : '') +
          '<h3 class="wcaa-ev__title">' + esc(e.title) + '</h3>' +
          (meta ? '<div class="wcaa-ev__meta">' + meta + '</div>' : '') +
          (e.description ? '<p class="wcaa-ev__desc">' + esc(e.description) + '</p>' : '') +
          (href ? '<a class="wcaa-ev__link" href="' + attr(href) + '">' + esc(e.linkLabel || 'Event Details') + ' →</a>' : '') +
          '</div></article>'
        );
      })
      .join('');
    if (!cards) return '';
    return '<div style="display:flex;flex-direction:column;gap:' + space(b.gap, 'var(--space-4)') + '">' + cards + '</div>';
  },

  gallery(b) {
    const ratio = aspect(b.aspect, '4 / 3');
    const figures = (Array.isArray(b.items) ? b.items : [])
      .map((it) => {
        const src = safeSrc(it && it.src);
        const alt = esc(it && it.alt);
        const inner = src
          ? '<img src="' + attr(src) + '" alt="' + alt + '" loading="lazy">'
          : '<span class="wcaa-gal__empty">' + (alt || 'Photo') + '</span>';
        return (
          '<figure class="wcaa-gal__item" style="margin:0">' +
          '<div class="wcaa-gal__ph" style="aspect-ratio:' + ratio + '">' + inner + '</div>' +
          (it && it.caption ? '<figcaption class="wcaa-gal__cap">' + esc(it.caption) + '</figcaption>' : '') +
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

  list(b) {
    const marker = iconTag(b.icon, 16);
    const items = (Array.isArray(b.items) ? b.items : [])
      .map((t) => {
        const text = esc(t);
        if (!text) return '';
        return (
          '<li style="display:flex;gap:10px;align-items:baseline;font-size:var(--text-md);' +
          'margin-bottom:var(--space-3)">' +
          (marker ? '<span style="color:var(--gold-600);flex:none;transform:translateY(2px)">' + marker + '</span>' : '') +
          '<span>' + text + '</span></li>'
        );
      })
      .join('');
    if (!items) return '';
    return '<ul style="list-style:none;padding:0;margin:0">' + items + '</ul>';
  },

  officers(b) {
    const cards = (Array.isArray(b.items) ? b.items : [])
      .map((o) => {
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
          '<div class="wcaa-off">' +
          '<div class="wcaa-off__photo">' +
          (photo
            ? '<img src="' + attr(photo) + '" alt="' + esc(o.name) + '">'
            : '<span class="wcaa-off__init">' + esc(initials) + '</span>') +
          '</div>' +
          '<div class="wcaa-off__name">' + esc(o.name) + '</div>' +
          '<div class="wcaa-off__role">' + esc(o.role) + '</div>' +
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
     product. Officers get the heading, the button label and the footnote.
     ⚠️ POSTs to /api/contact, which does not exist yet (step 2). This page must
     not go live until it does. */
  contactForm(b) {
    const field = (id, label, name, type, placeholder, required) =>
      '<div class="wcaa-field">' +
      '<label class="wcaa-field__label" for="' + id + '">' + esc(label) +
      (required ? '<span class="wcaa-field__req">*</span>' : '') + '</label>' +
      '<input class="wcaa-field__input" id="' + id + '" name="' + name + '" type="' + type +
      '" placeholder="' + esc(placeholder) + '"' + (required ? ' required' : '') + '>' +
      '</div>';
    return (
      '<form method="post" action="/api/contact" style="background:var(--surface-card);' +
      'border-radius:var(--radius-md);box-shadow:var(--shadow-card);padding:var(--space-8)">' +
      '<h3 style="font-size:var(--text-xl);margin-bottom:var(--space-6)">' + esc(b.heading) + '</h3>' +
      '<div class="wcaa-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4)">' +
      field('cf-name', 'Name', 'name', 'text', 'Your name', false) +
      field('cf-business', 'Business Name', 'business', 'text', 'Workroom or studio', false) +
      field('cf-email', 'Email', 'email', 'email', 'you@business.com', true) +
      field('cf-phone', 'Telephone #', 'phone', 'tel', '(555) 555-5555', false) +
      '</div>' +
      '<div class="wcaa-field" style="margin-bottom:var(--space-6)">' +
      '<label class="wcaa-field__label" for="cf-message">Message</label>' +
      '<textarea class="wcaa-field__input" id="cf-message" name="message" rows="4" ' +
      'placeholder="How can we help?" style="resize:vertical"></textarea></div>' +
      '<button class="wcaa-btn wcaa-btn--primary wcaa-btn--md" type="submit">' +
      esc(b.submitLabel || 'Send') + '</button>' +
      (b.note ? '<p style="font-size:12px;color:var(--text-muted);margin:var(--space-4) 0 0">' + esc(b.note) + '</p>' : '') +
      '</form>'
    );
  },

  /* A plain wrapper around a run of blocks. With `gap` it becomes a flex column,
     which is how you space sibling blocks evenly — margins on the children would
     collapse into each other and give you one gap where you asked for two. */
  group(b) {
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
      '>' + renderBlocks(b.blocks) + '</div>'
    );
  },

  split(b) {
    const max = length(b.maxWidth, '');
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
      '<div>' + renderBlocks(b.left) + '</div>' +
      '<div>' + renderBlocks(b.right) + '</div>' +
      '</div>'
    );
  },
};

/* An unknown block type renders NOTHING rather than throwing or passing the
   value through. pages.json is officer-editable, so an unrecognised type is
   either a typo or an injection attempt; both should be inert, and neither
   should take the whole page down. */
export function renderBlocks(list) {
  if (!Array.isArray(list)) return '';
  return list
    .map((b) => {
      const fn = b && typeof b.type === 'string' && Object.prototype.hasOwnProperty.call(BLOCKS, b.type)
        ? BLOCKS[b.type] : null;
      return fn ? fn(b) : '';
    })
    .filter(Boolean)
    .join('');
}

/* ---------- page chrome ---------- */

function renderSection(s) {
  const body = renderBlocks(s && s.blocks);
  if (!body) return '';
  const cls =
    'wcaa-sec' + (s.tint ? ' wcaa-sec--tint' : '') + (s.dark ? ' wcaa-sec--dark' : '') +
    (s.tight ? ' wcaa-sec--tight' : '');
  return (
    '<section class="' + cls + '"><div class="wcaa-sec__in' + (s.narrow ? ' wcaa-sec__in--narrow' : '') + '">' +
    body + '</div></section>'
  );
}

function renderHero(h) {
  if (!h || !h.title) return '';
  const page = h.variant === 'page';
  const media = safeSrc(h.image);
  return (
    '<section class="wcaa-hero wcaa-hero--' + (page ? 'page' : 'full') + '" style="min-height:' +
    (page ? '240' : '540') + 'px">' +
    /* The hero photo is a backdrop behind the headline — the heading carries the
       meaning, so alt is empty by design rather than by omission. */
    (media ? '<div class="wcaa-hero__media"><img src="' + attr(media) + '" alt=""></div>' : '') +
    '<div class="wcaa-hero__ovl"></div>' +
    '<div class="wcaa-hero__in">' +
    (h.kicker ? '<div class="wcaa-hero__kicker">' + esc(h.kicker) + '</div>' : '') +
    '<h1 class="wcaa-hero__title">' + esc(h.title) + '</h1>' +
    '<div class="wcaa-hero__rule"></div>' +
    (h.subtitle ? '<p class="wcaa-hero__sub">' + esc(h.subtitle) + '</p>' : '') +
    (Array.isArray(h.actions) && h.actions.length
      ? '<div class="wcaa-hero__actions">' + h.actions.map(buttonTag).join('') + '</div>'
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
  return (
    '<nav class="wcaa-nav"><div class="wcaa-nav__in">' +
    '<a class="wcaa-nav__brand" href="' + attr(safeHref(site.homeHref) || 'index.html') + '">' +
    '<span class="wcaa-nav__mark">' + esc(site.brandMark) + '</span>' +
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

/* The whole document for one page. Deterministic: same inputs, same bytes —
   no timestamps, no random ids, no Date. tools/test-pages.mjs asserts it. */
export function renderPage(page, site) {
  return (
    '<!DOCTYPE html>\n' +
    '<html lang="en">\n<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + esc(page.title || site.title) + '</title>\n' +
    '<link rel="stylesheet" href="styles.css">\n' +
    '<link rel="stylesheet" href="css/components.css">\n' +
    '<link rel="stylesheet" href="css/pages.css">\n' +
    '</head>\n<body>\n' +
    renderNav(site, page.navHref) +
    renderHero(page.hero) +
    (Array.isArray(page.sections) ? page.sections.map(renderSection).join('') : '') +
    renderFooter(site) +
    '\n</body>\n</html>\n'
  );
}

export function renderSite(content, site) {
  const out = {};
  for (const page of content.pages || []) {
    if (page && typeof page.slug === 'string' && ID.test(page.slug)) out[page.slug + '.html'] = renderPage(page, site);
  }
  return out;
}
