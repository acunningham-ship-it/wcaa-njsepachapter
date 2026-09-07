/* Tests the admin's data layer. Run: node tools/test-admin.mjs
 *
 * The admin UI itself is a browser thing and is not unit-tested here. What IS
 * tested is the table it is generated from, because that table is the one place
 * the editor can silently drift from the renderer: add a block type to
 * js/blocks.js, forget admin/fields.js, and the officer simply never sees it —
 * no error, no warning, just a capability that quietly does not exist.
 *
 * The other thing worth proving is that "Add block" produces something that
 * actually appears. A default that renders to an empty string gives the officer
 * a row in the outline and nothing on the page, which reads as the CMS being
 * broken.
 */
import { BLOCK_TYPES, renderBlocks } from '../js/blocks.js';
import { validateContent } from '../js/validate-content.js';
import { FIELDS, BLOCK_LABELS, BLOCK_DEFAULTS, linesToText, textToLines, isSimpleLines } from '../admin/fields.js';

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 240))); }
};

/* ---------- the drift guard ---------- */
{
  for (const type of BLOCK_TYPES) {
    ok(`${type} has editor fields`, Array.isArray(FIELDS[type]), Object.keys(FIELDS));
    ok(`${type} has a human name`, Array.isArray(BLOCK_LABELS[type]) && BLOCK_LABELS[type].length === 2);
    ok(`${type} has a default`, typeof BLOCK_DEFAULTS[type] === 'function');
  }
  // ...and nothing in the editor that the renderer cannot draw.
  for (const type of Object.keys(FIELDS)) {
    ok(`the editor offers no block the renderer lacks: ${type}`, BLOCK_TYPES.includes(type), BLOCK_TYPES);
  }
  ok('the two lists are the same length', Object.keys(FIELDS).length === BLOCK_TYPES.length,
     { fields: Object.keys(FIELDS).length, renderer: BLOCK_TYPES.length });
}

/* ---------- field specs are well-formed ---------- */
{
  for (const [type, specs] of Object.entries(FIELDS)) {
    for (const spec of specs) {
      ok(`${type}.${spec.key || '(row)'} has a label`, typeof spec.label === 'string' && spec.label.length > 0, spec);
      if (spec.kind === 'items') {
        ok(`${type}.${spec.key} describes its row fields`, Array.isArray(spec.fields) && spec.fields.length > 0, spec);
      }
      if (spec.kind === 'select') {
        ok(`${type}.${spec.key} lists options`, Array.isArray(spec.options) && spec.options.length > 0, spec);
      }
    }
  }
}

/* ---------- every default renders something ---------- */
{
  /* group and split are containers: empty is the correct render for an empty
     container, so they are checked WITH a child instead of being exempted and
     forgotten. */
  const CONTAINERS = { group: (b) => ({ ...b, blocks: [{ type: 'text', text: 'inside' }] }),
                       split: (b) => ({ ...b, left: [{ type: 'text', text: 'L' }], right: [{ type: 'text', text: 'R' }] }) };

  for (const type of BLOCK_TYPES) {
    const base = BLOCK_DEFAULTS[type]();
    ok(`the default ${type} declares its own type`, base.type === type, base);

    const block = CONTAINERS[type] ? CONTAINERS[type](base) : base;
    const html = renderBlocks([block]);
    /* gallery and image default to no photo, which correctly renders nothing
       until one is chosen — the editor's job, not the renderer's. */
    const mayBeEmpty = type === 'gallery' || type === 'image';
    ok(`the default ${type} renders visible markup`, mayBeEmpty || html.length > 0, { type, html: html.slice(0, 80) });
    ok(`the default ${type} renders no raw < from its own content`,
       !/<[^>]*<script/i.test(html));
  }
}

/* ---------- a page built only from defaults is valid and saveable ---------- */
{
  const doc = {
    pages: [{
      slug: 'index',
      navHref: 'index.html',
      title: 'Everything',
      hero: { variant: 'page', title: 'Everything' },
      sections: [{ blocks: BLOCK_TYPES.map((t) => BLOCK_DEFAULTS[t]()) }],
    }],
  };
  const v = validateContent(doc);
  ok('a page containing one of every default block validates', v.ok === true, v);
}

/* ---------- iconRows text <-> spans ---------- */
{
  ok('a single line round-trips',
     linesToText(textToLines('Hello there')) === 'Hello there');
  ok('two lines round-trip',
     linesToText(textToLines('First\nSecond')) === 'First\nSecond');
  ok('empty lines are dropped rather than stored as blanks',
     JSON.stringify(textToLines('a\n\nb')) === JSON.stringify([[{ text: 'a' }], [{ text: 'b' }]]));
  ok('linesToText survives a non-array', linesToText(null) === '' && linesToText('x') === '');

  ok('a plain row is editable as text', isSimpleLines([[{ text: 'plain' }]]) === true);
  /* The reason this check exists: a row carrying a link or bold text cannot be
     represented in one text box, and flattening it would DELETE the link on the
     next save. The editor shows those read-only instead. */
  ok('a row with a link is NOT treated as simple',
     isSimpleLines([[{ text: 'x', href: 'https://example.com' }]]) === false);
  ok('a row with bold is NOT treated as simple',
     isSimpleLines([[{ text: 'x', strong: true }]]) === false);
  ok('the real contact rows are correctly classified as not-simple',
     isSimpleLines([[{ text: 'Marie Weaverling', strong: true }, { text: ', Chapter President' }]]) === false);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
