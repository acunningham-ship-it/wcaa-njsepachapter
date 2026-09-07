/* Tests the page generator. Run: node tools/test-pages.mjs
 *
 * Three things are being proved here, and only the third is about "does it look
 * right" — the render itself is checked against the live site by pixel diff, not
 * by a string assertion in a test file.
 *
 *   1. DETERMINISM — same content in, same bytes out. The generated .html files
 *      are committed, so a renderer that reorders anything turns every save into
 *      a noisy diff and makes `build-pages --check` useless as a drift alarm.
 *   2. DUAL-RUNTIME BYTE-MATCH — the same modules run in a context stripped of
 *      every Node-only global (no process, Buffer, require, fs, window,
 *      document) and produce byte-identical output. save.js runs these on
 *      Cloudflare Workers; the admin preview runs them in a browser. A helper
 *      that quietly reached for a Node API would render fine here and throw in
 *      production, so the check has to be a real second runtime, not a grep.
 *   3. ESCAPING UNDER REAL PAGE SHAPES — tools/test-render-escaping.mjs proves
 *      the primitives are sound in isolation; this proves the block templates
 *      actually CALL them, by pushing payloads through every officer-editable
 *      field of every block type and asserting the page comes out inert.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { renderSite, renderPage, renderBlocks } from '../js/blocks.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 300))); }
};

const site = JSON.parse(read('content/site.json'));
const content = JSON.parse(read('content/pages.json'));

/* ---------- 1. determinism ---------- */
{
  const a = renderSite(content, site);
  const b = renderSite(JSON.parse(read('content/pages.json')), JSON.parse(read('content/site.json')));
  const names = Object.keys(a);
  /* Derived from the content, not hardcoded — a count written as a literal has to
     be edited every time an officer adds a page, and the edit that "fixes the
     test" is exactly the edit that stops it noticing a page went missing. */
  ok(`renders every page in pages.json (${content.pages.length})`,
     names.length === content.pages.length, names);
  ok('two renders of the same content are byte-identical',
     names.every((n) => a[n] === b[n]),
     names.filter((n) => a[n] !== b[n]));
  ok('output contains no timestamp-shaped value',
     !/\b20\d\d-\d\d-\d\dT\d\d:/.test(Object.values(a).join('')));
}

/* ---------- 2. dual-runtime byte-match ---------- */
{
  /* Concatenate the two modules and strip the ESM syntax, so the same source can
     be evaluated as a plain script inside a bare vm context. The context is
     given NOTHING: no process, no Buffer, no require, no fs, no window, no
     document — only the JS builtins a Cloudflare Worker also has. Any reach for
     a Node API is a ReferenceError here rather than a production surprise. */
  const strip = (src) =>
    src.replace(/^import[^;]+;$/gm, '').replace(/^export (function|const|class)/gm, '$1');
  const script = '(function(){' + strip(read('js/render.js')) + '\n' + strip(read('js/blocks.js')) +
                 '\nreturn { renderSite };})()';

  const sandbox = Object.create(null);
  let worker = null, err = null;
  try {
    worker = vm.runInNewContext(script, vm.createContext(sandbox), { timeout: 10000 });
  } catch (e) { err = e; }

  ok('modules evaluate with no Node globals available', !!worker && !err, err && String(err));
  if (worker) {
    const node = renderSite(content, site);
    const wk = worker.renderSite(content, site);
    const names = Object.keys(node);
    ok('Workers-shaped runtime produces byte-identical pages',
       names.every((n) => node[n] === wk[n]),
       names.filter((n) => node[n] !== wk[n]));
  }
  // A negative control: the sandbox really is bare, so this test could fail.
  ok('the sandbox genuinely lacks process (negative control)',
     (() => { try { vm.runInNewContext('typeof process', vm.createContext(Object.create(null))); } catch { return true; }
              return vm.runInNewContext('typeof process', vm.createContext(Object.create(null))) === 'undefined'; })());
}

/* ---------- 3. escaping under real page shapes ---------- */
{
  const XSS = '"><img src=x onerror=alert(1)><script>alert(2)</script>';
  const BAD_URL = 'javascript:alert(1)';
  const BAD_SRC = '../../etc/passwd';
  const BAD_STYLE = 'red;background:url(https://evil.example.com/x)';

  /* Every block type, every officer-editable field, all hostile at once. */
  const hostile = {
    pages: [{
      slug: 'xss',
      navHref: 'xss.html',
      title: XSS,
      hero: { variant: 'full', kicker: XSS, title: XSS, subtitle: XSS, image: BAD_SRC,
              actions: [{ label: XSS, href: BAD_URL, variant: XSS, size: XSS, icon: BAD_SRC }] },
      sections: [{
        tint: true,
        blocks: [
          { type: 'heading', kicker: XSS, title: XSS, lede: XSS, align: XSS, marginBottom: BAD_STYLE },
          { type: 'text', text: XSS, marginBottom: BAD_STYLE },
          { type: 'text', spans: [{ text: XSS, strong: true, href: BAD_URL }] },
          { type: 'buttons', id: XSS, layout: 'stack', gap: BAD_STYLE, maxWidth: BAD_STYLE,
            items: [{ label: XSS, href: BAD_URL, iconAfter: BAD_SRC }] },
          { type: 'cards', columns: 99, marker: 'icon', gap: BAD_STYLE, maxWidth: BAD_STYLE,
            items: [{ icon: BAD_SRC, title: XSS, text: XSS }] },
          { type: 'cards', columns: 2, marker: 'number',
            items: [{ n: XSS, title: XSS, text: XSS, action: { label: XSS, href: BAD_URL } }] },
          { type: 'events', gap: BAD_STYLE,
            items: [{ month: XSS, day: XSS, badge: XSS, title: XSS, time: XSS, location: XSS,
                      description: XSS, href: BAD_URL, linkLabel: XSS }] },
          { type: 'gallery', columns: 3, aspect: BAD_STYLE,
            items: [{ src: BAD_SRC, alt: XSS, caption: XSS }] },
          { type: 'list', icon: BAD_SRC, items: [XSS] },
          { type: 'officers', gap: BAD_STYLE,
            items: [{ name: XSS, role: XSS, phone: XSS, email: XSS, photo: BAD_SRC }] },
          { type: 'iconRows', layout: 'stack', marginTop: BAD_STYLE,
            items: [{ icon: BAD_SRC, lines: [[{ text: XSS, href: BAD_URL, external: true }]] }] },
          { type: 'iconRows', layout: 'inline', items: [{ icon: BAD_SRC, lines: [[{ text: XSS }]] }] },
          { type: 'contactForm', heading: XSS, submitLabel: XSS, note: XSS },
          { type: 'rsvpForm', eventId: 'jun-18', heading: XSS, submitLabel: XSS, successMessage: XSS },
          { type: 'rsvpForm', eventId: XSS, heading: XSS },
          { type: 'group', marginBottom: BAD_STYLE, blocks: [{ type: 'text', text: XSS }] },
          { type: 'split', columns: BAD_STYLE, gap: BAD_STYLE, maxWidth: BAD_STYLE,
            left: [{ type: 'text', text: XSS }], right: [{ type: 'text', text: XSS }] },
        ],
      }],
    }],
  };
  const hostileSite = {
    brandMark: XSS, brandSub: XSS, title: XSS, homeHref: BAD_URL,
    nav: [{ label: XSS, href: BAD_URL }, { label: XSS, href: 'about.html' }],
    navCta: { label: XSS, href: BAD_URL },
    footerLinks: [{ label: XSS, href: BAD_URL }],
    socials: [{ label: XSS, href: BAD_URL, icon: BAD_SRC }],
    copyright: XSS,
  };
  const html = renderSite(hostile, hostileSite)['xss.html'];

  ok('hostile content still renders a page', typeof html === 'string' && html.length > 2000);
  /* This page carries forms, so it legitimately loads the two permitted scripts.
     What must never happen is a script the CONTENT introduced — so check the
     script tags structurally: no inline body, and no src outside the allowlist. */
  {
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    const srcs = scripts.map((m) => (m[1].match(/src="([^"]+)"/) || [])[1]).filter(Boolean);
    ok('the payload introduced no script',
       scripts.every((m) => m[2].trim() === '') &&
       srcs.every((u) => u === 'js/forms.js' || u === 'https://challenges.cloudflare.com/turnstile/v0/api.js'),
       { srcs, inline: scripts.map((m) => m[2].slice(0, 30)) });
  }
  ok('the payload never becomes real markup', html.indexOf('<img src=x') === -1);
  ok('no javascript: URL survives', !/javascript:/i.test(html));
  ok('no path traversal survives', html.indexOf('..') === -1);
  ok('no attacker CSS reached a style attribute', !/evil\.example\.com/.test(html));
  ok('the payload IS present as escaped text (so the test is not passing on an empty page)',
     html.includes('&lt;script&gt;alert(2)&lt;/script&gt;'));

  /* The structural checks. A keyword scan is the WRONG instrument here and it
     cost a false failure on the first run of this file: the payload text
     `onerror=alert(1)` appears 13 times in the output as `&lt;img src=x
     onerror=alert(1)&gt;` — escaped, inside a text node, inert. What actually
     matters is not whether a scary word appears in the document, it is whether
     it appears INSIDE A TAG as an attribute. So: pull the real tags out, and
     assert about those.
     (Same mistake, same shape, as the one already documented in
     tools/test-render-escaping.mjs. Test for the structural property.) */
  const tags = html.match(/<[a-z][^>]*>/gi) || [];
  const unbalanced = tags.filter((t) => (t.match(/"/g) || []).length % 2 !== 0);
  ok('every tag has balanced attribute quotes', unbalanced.length === 0, unbalanced.slice(0, 3));
  /* Parse attribute NAMES rather than scanning the tag text.
     ⛔ A bare /\son[a-z]+=/ scan reports a false positive the moment a payload
     lands inside an attribute VALUE: data-success="&lt;img src=x onerror=..." is
     one attribute whose value happens to contain those characters, escaped and
     inert. The name/value regex below consumes each quoted value whole, so it
     can only ever match a real attribute name. Verified by hand on the rendered
     <form>: six attributes, none beginning "on", quotes balanced. */
  const attrNames = (tag) => [...tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"[^"]*"/g)].map((m) => m[1]);
  const handlers = tags.filter((t) => attrNames(t).some((n) => /^on/i.test(n)));
  ok('no tag carries an event-handler attribute', handlers.length === 0, handlers.slice(0, 2));
  // Control: the extractor really does see attributes, so this cannot pass by finding none.
  ok('the attribute extractor works (control)',
     attrNames('<a class="x" href="y" onclick="z">').join(',') === 'class,href,onclick');
  const styled = tags.filter((t) => /style="[^"]*(url\(\s*['"]?https?:|expression\()/i.test(t));
  ok('no style attribute fetches a remote resource', styled.length === 0, styled.slice(0, 3));

  ok('an unknown block type renders nothing', renderBlocks([{ type: 'constructor' }, { type: 'evil' }]) === '');
  ok('a prototype-polluting type name is not callable',
     renderBlocks([{ type: '__proto__' }, { type: 'toString' }, { type: 'hasOwnProperty' }]) === '');
  ok('a non-array block list renders nothing', renderBlocks('<script>') === '' && renderBlocks(null) === '');
}

/* ---------- 4. the real pages actually contain their content ---------- */
{
  /* Fail-closed rendering means a typo'd block type disappears silently. These
     landmarks are the alarm: if a block stops rendering, a page loses a section
     and nothing else would say so. */
  const p = renderSite(content, site);
  const has = (file, needle) => ok(`${file} contains ${JSON.stringify(needle.slice(0, 42))}`,
                                   p[file] && p[file].includes(needle));

  has('index.html', 'A Community of Window Covering Professionals');
  has('index.html', 'Monthly Programs');
  has('index.html', 'Centurion Roman Shade: Elevated Designs');
  has('index.html', 'uploads/wcaa-instagram-photos/23_DTnYvGvDn8k_0.webp');
  has('index.html', 'Take your business to new heights');
  has('about.html', 'Mission Statement');
  has('about.html', 'To aid in the success and profitability of our members');
  has('about.html', 'Marie Weaverling');
  has('events.html', 'Experience Trivantage: Presentation, Tour &amp; Lunch');
  has('gallery.html', 'Photos From Around the Chapter');
  has('contact.html', 'We&#39;d like to communicate with you!');
  has('contact.html', 'name="message"');
  has('join.html', 'active WCAA National membership');
  has('join.html', 'Corporate Membership Dues (Includes 2 Members)');
  has('404.html', 'We couldn’t find that page');
  has('404.html', 'Contact the Chapter');
  /* Match the class EXACTLY. A bare /wcaa-nav__link/ also matches the container's
     `wcaa-nav__links`, which counts one link too many — the same substring-vs-
     structure mistake this suite catches elsewhere, made here in the test itself. */
  ok('404.html still carries the full nav, so a lost visitor can get out',
     (p['404.html'].match(/class="wcaa-nav__link"/g) || []).length === site.nav.length,
     { found: (p['404.html'].match(/class="wcaa-nav__link"/g) || []).length, expected: site.nav.length });

  const navHrefs = site.nav.map((l) => l.href);
  /* The two allowed scripts, and only on a page that carries a form. Turnstile
     needs JavaScript, so a bot-gated form has no JS-free path — but that is no
     reason for the other pages to pay for it, so this is asserted PER PAGE.
     ⛔ Not "does the site ship JS" but "which page ships what": a site-wide check
     would have gone quietly permissive the moment one page needed a script. */
  const ALLOWED_SRC = [
    'https://challenges.cloudflare.com/turnstile/v0/api.js',
    'js/forms.js',
  ];
  for (const [name, html] of Object.entries(p)) {
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    const hasForm = /<form\b/i.test(html);
    ok(`${name} has no inline script and no event-handler attributes`,
       scripts.every((m) => m[2].trim() === '') && !/ on[a-z]+=/i.test(html),
       scripts.map((m) => m[2].slice(0, 40)));
    const srcs = scripts.map((m) => (m[1].match(/src="([^"]+)"/) || [])[1]).filter(Boolean);
    ok(`${name} loads only permitted scripts`, srcs.every((u) => ALLOWED_SRC.includes(u)), srcs);
    if (hasForm) {
      ok(`${name} has a form, so it loads both form scripts`,
         ALLOWED_SRC.every((u) => srcs.includes(u)), srcs);
    } else {
      ok(`${name} has no form, so it ships NO script at all`, scripts.length === 0, srcs);
    }
    /* A page highlights its own nav link, and only pages that ARE in the nav can.
       join.html and 404.html are reachable but not nav entries, so zero is right
       for them — derived from site.json rather than a list of exceptions. */
    const page = content.pages.find((pg) => pg.slug + '.html' === name);
    const expected = navHrefs.includes(page.navHref) ? 1 : 0;
    ok(`${name} marks its own nav link active (${expected})`,
       (html.match(/wcaa-nav__link--active/g) || []).length === expected);
  }
  ok('every gallery image has an alt attribute',
     (p['gallery.html'].match(/<img /g) || []).length === (p['gallery.html'].match(/<img [^>]*alt="/g) || []).length);
  ok('gallery renders all nine photos', (p['gallery.html'].match(/<figure /g) || []).length === 9);
  ok('events page renders all five events', (p['events.html'].match(/<article /g) || []).length === 5);
}

/* ---------- 5. the Turnstile widget is gated on a configured site key ---------- */
{
  const page = content.pages.find((pg) => pg.slug === 'contact');
  const withoutKey = renderPage(page, site);
  ok('no site key configured means NO widget is rendered',
     !withoutKey.includes('cf-turnstile'), withoutKey.slice(withoutKey.indexOf('<form'), 200));

  const withKey = renderPage(page, { ...site, turnstileSiteKey: '0x4AAAAAAABkMYinukE8nzYS' });
  ok('a configured site key renders the widget',
     withKey.includes('class="cf-turnstile" data-sitekey="0x4AAAAAAABkMYinukE8nzYS"'), 'missing');
  ok('the widget sits inside the form', withKey.indexOf('cf-turnstile') > withKey.indexOf('<form') &&
     withKey.indexOf('cf-turnstile') < withKey.indexOf('</form>'));

  /* A malformed key must render NOTHING rather than an empty widget: an empty
     widget looks like a working form, submits with no token, and is refused by an
     endpoint that fails closed — leaving an officer debugging a form that is
     "broken" for no visible reason. */
  for (const bad of ['', '   ', 'has spaces', '<script>', 'x', 'a'.repeat(200)]) {
    ok(`a malformed site key ${JSON.stringify(bad.slice(0, 12))} renders no widget`,
       !renderPage(page, { ...site, turnstileSiteKey: bad }).includes('cf-turnstile'));
  }

  // The form still posts to the endpoint either way — the gate is the widget, not the form.
  ok('the form targets /api/contact with or without a key',
     withoutKey.includes('data-endpoint="/api/contact"') && withKey.includes('data-endpoint="/api/contact"'));

  // An rsvpForm with no event id renders nothing rather than a form that cannot work.
  ok('an rsvpForm without an event id renders nothing',
     renderBlocks([{ type: 'rsvpForm', heading: 'Register' }], site) === '');
  ok('an rsvpForm with an event id renders a form',
     renderBlocks([{ type: 'rsvpForm', eventId: 'jun-18' }], site).includes('name="event_id" value="jun-18"'));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
