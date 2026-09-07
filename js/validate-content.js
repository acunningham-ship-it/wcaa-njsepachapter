/* Validates content/pages.json BEFORE it is committed and rendered.
 *
 * Runs in both runtimes (Workers + Node), same rules as js/render.js.
 *
 * ⛔ WHY THIS EXISTS WHEN THE RENDERER ALREADY FAILS CLOSED. blocks.js drops an
 * unrecognised block silently — the correct behaviour for something being SERVED,
 * because a typo must never become markup. But it is the wrong behaviour for
 * something being SAVED: an officer who mistypes a block type would press Save,
 * get a cheerful "saved", and discover a week later that a section vanished. The
 * renderer protects the visitor; this protects the officer's work. Same reason
 * Denise's site puts the validator on the save path rather than trusting the
 * client — the admin UI is a convenience, the endpoint is the trust boundary.
 *
 * It rejects with a PATH (pages[2].sections[0].blocks[3].type) because "invalid
 * content" is not a message anyone can act on.
 *
 * It does NOT check for XSS. Escaping happens at render, on every value, whether
 * or not it passed through here — a validator that tried to decide what is
 * "safe text" would be sanitise-at-storage by another name, and would have to
 * guess every context the value later lands in.
 */
import { BLOCK_TYPES } from './blocks.js';

/* A slug becomes a filename. Leading digit allowed so "404" can exist; no dots
   and no slashes, so it cannot traverse or pick its own extension. */
const SLUG = /^[a-z0-9][a-z0-9-]{0,40}$/;

/* Keys whose value is rendered as TEXT. They must be scalars.
   esc() stringifies whatever it is given, so a block that arrives with
   `title: {}` — an admin-UI bug, or a hand-edited file — validates as perfectly
   good JSON and then publishes the words "[object Object]" onto a live page.
   Checking storability alone does not catch that, because a nested object IS
   storable; the value is well-formed and still wrong. */
const TEXT_KEYS = [
  'title', 'text', 'label', 'caption', 'alt', 'kicker', 'lede', 'name', 'role', 'note',
  'heading', 'month', 'day', 'badge', 'time', 'location', 'description', 'submitLabel',
  'n', 'phone', 'email', 'src', 'href', 'icon', 'iconAfter', 'id', 'type', 'slug',
];

function checkTextKeys(value, path) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const bad = checkTextKeys(value[i], `${path}[${i}]`);
      if (bad) return bad;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  for (const key of Object.keys(value)) {
    const v = value[key];
    if (TEXT_KEYS.indexOf(key) !== -1 && v !== null && v !== undefined && typeof v === 'object') {
      return err(`${path}.${key}`, 'must be text, not a list or a group of values.');
    }
    const bad = checkTextKeys(v, `${path}.${key}`);
    if (bad) return bad;
  }
  return null;
}

/* Caps. None of these is a security boundary on its own — they stop one bad
   paste turning into a repo commit nobody can review or a page nobody can load. */
const LIMITS = {
  bytes: 512 * 1024,   // whole document
  pages: 60,
  sections: 40,        // per page
  blocks: 80,          // per section, and per nested container
  items: 200,          // per block (gallery photos, events, buttons…)
  string: 8000,        // any single string
  depth: 4,            // group/split nesting
};

const err = (path, message) => ({ ok: false, path, error: message });

function checkStrings(value, path, out) {
  if (typeof value === 'string') {
    if (value.length > LIMITS.string) return err(path, `is longer than ${LIMITS.string} characters.`);
    return null;
  }
  if (Array.isArray(value)) {
    if (value.length > LIMITS.items) return err(path, `has more than ${LIMITS.items} entries.`);
    for (let i = 0; i < value.length; i++) {
      const bad = checkStrings(value[i], `${path}[${i}]`, out);
      if (bad) return bad;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const bad = checkStrings(value[key], `${path}.${key}`, out);
      if (bad) return bad;
    }
    return null;
  }
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return null;
  return err(path, 'is not a value we can store (only text, numbers, true/false and lists).');
}

function checkBlocks(blocks, path, depth) {
  if (!Array.isArray(blocks)) return err(path, 'must be a list of blocks.');
  if (blocks.length > LIMITS.blocks) return err(path, `has more than ${LIMITS.blocks} blocks.`);
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const p = `${path}[${i}]`;
    if (!b || typeof b !== 'object' || Array.isArray(b)) return err(p, 'is not a block.');
    if (typeof b.type !== 'string' || !b.type) return err(p + '.type', 'is missing.');
    if (BLOCK_TYPES.indexOf(b.type) === -1) {
      return err(p + '.type', `is not a block type we know. Try one of: ${BLOCK_TYPES.join(', ')}.`);
    }
    if (b.type === 'group' || b.type === 'split') {
      if (depth >= LIMITS.depth) return err(p, `is nested more than ${LIMITS.depth} levels deep.`);
      const inner = b.type === 'group' ? [['blocks', b.blocks]] : [['left', b.left], ['right', b.right]];
      for (const [key, list] of inner) {
        if (list === undefined) continue;
        const bad = checkBlocks(list, `${p}.${key}`, depth + 1);
        if (bad) return bad;
      }
    }
  }
  return null;
}

export function validateContent(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return err('content', 'must be an object.');
  if (!Array.isArray(doc.pages)) return err('pages', 'must be a list of pages.');
  if (!doc.pages.length) return err('pages', 'must have at least one page.');
  if (doc.pages.length > LIMITS.pages) return err('pages', `has more than ${LIMITS.pages} pages.`);

  let size;
  try { size = JSON.stringify(doc).length; } catch { return err('content', 'contains a value that cannot be saved.'); }
  if (size > LIMITS.bytes) return err('content', `is larger than ${Math.round(LIMITS.bytes / 1024)} KB.`);

  const seen = Object.create(null);
  for (let i = 0; i < doc.pages.length; i++) {
    const page = doc.pages[i];
    const p = `pages[${i}]`;
    if (!page || typeof page !== 'object' || Array.isArray(page)) return err(p, 'is not a page.');
    if (typeof page.slug !== 'string' || !SLUG.test(page.slug)) {
      return err(p + '.slug', 'must be lowercase letters, numbers and hyphens, starting with a letter.');
    }
    /* A duplicate slug is not a cosmetic problem: two pages render to the same
       filename and the second silently overwrites the first on save. */
    if (seen[page.slug]) return err(p + '.slug', `is already used by ${seen[page.slug]}.`);
    seen[page.slug] = p;

    if (page.hero !== undefined) {
      if (!page.hero || typeof page.hero !== 'object' || Array.isArray(page.hero)) return err(p + '.hero', 'is not valid.');
      if (typeof page.hero.title !== 'string' || !page.hero.title.trim()) {
        return err(p + '.hero.title', 'is required when a page has a hero.');
      }
    }

    const sections = page.sections;
    if (sections !== undefined) {
      if (!Array.isArray(sections)) return err(p + '.sections', 'must be a list.');
      if (sections.length > LIMITS.sections) return err(p + '.sections', `has more than ${LIMITS.sections} sections.`);
      for (let j = 0; j < sections.length; j++) {
        const s = sections[j];
        const sp = `${p}.sections[${j}]`;
        if (!s || typeof s !== 'object' || Array.isArray(s)) return err(sp, 'is not a section.');
        const bad = checkBlocks(s.blocks, sp + '.blocks', 0);
        if (bad) return bad;
      }
    }

    /* A page with a hero and no sections is fine (a landing stub). A page with
       neither renders as bare chrome, which is always a mistake. */
    if (page.hero === undefined && (!Array.isArray(sections) || !sections.length)) {
      return err(p, 'has no hero and no sections — there would be nothing on it.');
    }
  }

  /* The homepage is not optional. Without it the site has no index.html and
     every visitor to the bare domain gets a 404 — a mistake that is one dropped
     array entry away and impossible to notice in an editor that shows you the
     page you are currently editing. */
  if (!seen.index) return err('pages', 'must include the home page (slug "index").');

  const bad = checkStrings(doc, 'content', null);
  if (bad) return bad;
  const badText = checkTextKeys(doc.pages, 'pages');
  if (badText) return badText;

  return { ok: true, pages: doc.pages.length, bytes: size };
}
