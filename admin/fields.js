/* What each block type offers an officer, as data.
 *
 * The editor is GENERATED from this table rather than hand-written per block.
 * Fourteen hand-built forms would drift from the renderer the first time anyone
 * added a field, and the drift is invisible: the form simply stops offering
 * something the page can display, or offers something it ignores.
 *
 * `tools/test-admin.mjs` asserts every type in blocks.js BLOCK_TYPES appears
 * here, so adding a block to the renderer and forgetting the editor is a failing
 * test rather than a mystery.
 *
 * Field kinds: text · long · check · number · select · image · link · items
 * `items` fields describe a repeating row and carry their own sub-fields.
 */

export const SPACING = ['', 'var(--space-2)', 'var(--space-4)', 'var(--space-6)', 'var(--space-8)',
                        'var(--space-12)', 'var(--space-16)'];

const BUTTON_ITEM = [
  { key: 'label', kind: 'text', label: 'Button text' },
  { key: 'href', kind: 'link', label: 'Links to' },
  { key: 'variant', kind: 'select', label: 'Style', options: ['primary', 'outline', 'gold', 'onDark'] },
  { key: 'size', kind: 'select', label: 'Size', options: ['md', 'sm', 'lg'] },
  { key: 'fullWidth', kind: 'check', label: 'Full width' },
];

export const FIELDS = {
  heading: [
    { key: 'kicker', kind: 'text', label: 'Eyebrow', hint: 'Small line above the title' },
    { key: 'title', kind: 'text', label: 'Title', required: true },
    { key: 'lede', kind: 'long', label: 'Intro line' },
    { key: 'align', kind: 'select', label: 'Alignment', options: ['center', 'left'] },
    { key: 'size', kind: 'select', label: 'Size', options: ['', 'sm'] },
    { key: 'onDark', kind: 'check', label: 'On a dark background' },
    { key: 'marginBottom', kind: 'select', label: 'Space below', options: SPACING },
  ],
  text: [
    { key: 'text', kind: 'long', label: 'Paragraph', required: true },
    { key: 'align', kind: 'select', label: 'Alignment', options: ['', 'center'] },
    { key: 'size', kind: 'select', label: 'Size', options: ['', 'md'] },
    { key: 'muted', kind: 'check', label: 'Muted colour' },
    { key: 'prose', kind: 'check', label: 'Narrow column' },
    { key: 'marginBottom', kind: 'select', label: 'Space below', options: SPACING },
  ],
  buttons: [
    { key: 'layout', kind: 'select', label: 'Arrangement', options: ['center', 'row', 'stack', 'plain'] },
    { key: 'marginTop', kind: 'select', label: 'Space above', options: SPACING },
    { key: 'items', kind: 'items', label: 'Buttons', fields: BUTTON_ITEM },
  ],
  cards: [
    { key: 'marker', kind: 'select', label: 'Marked with', options: ['icon', 'number'] },
    { key: 'columns', kind: 'number', label: 'Columns', min: 1, max: 6 },
    { key: 'items', kind: 'items', label: 'Cards', fields: [
      { key: 'title', kind: 'text', label: 'Card title' },
      { key: 'text', kind: 'long', label: 'Card text' },
      { key: 'icon', kind: 'image', label: 'Icon', hint: 'assets/icons/…' },
      { key: 'n', kind: 'text', label: 'Number', hint: 'Only for numbered cards' },
    ] },
  ],
  events: [
    { key: 'gap', kind: 'select', label: 'Space between', options: SPACING },
    { key: 'items', kind: 'items', label: 'Events', fields: [
      { key: 'month', kind: 'text', label: 'Month', hint: 'Jun' },
      { key: 'day', kind: 'text', label: 'Day', hint: '18' },
      { key: 'title', kind: 'text', label: 'Event title' },
      { key: 'badge', kind: 'text', label: 'Tag', hint: 'Zoom, In Person…' },
      { key: 'time', kind: 'text', label: 'Time' },
      { key: 'location', kind: 'text', label: 'Location' },
      { key: 'description', kind: 'long', label: 'Description' },
      { key: 'href', kind: 'link', label: 'Links to' },
    ] },
  ],
  gallery: [
    { key: 'columns', kind: 'number', label: 'Columns', min: 1, max: 8 },
    { key: 'aspect', kind: 'select', label: 'Shape', options: ['4 / 3', '1 / 1', '3 / 2', '16 / 9'] },
    { key: 'items', kind: 'items', label: 'Photos', fields: [
      { key: 'src', kind: 'image', label: 'Photo' },
      { key: 'alt', kind: 'text', label: 'Description', hint: 'For screen readers and when the photo fails to load' },
      { key: 'caption', kind: 'text', label: 'Caption' },
    ] },
  ],
  image: [
    { key: 'src', kind: 'image', label: 'Photo', required: true },
    { key: 'alt', kind: 'text', label: 'Description' },
    { key: 'caption', kind: 'text', label: 'Caption' },
    { key: 'aspect', kind: 'select', label: 'Crop to', options: ['', '4 / 3', '1 / 1', '3 / 2', '16 / 9'] },
    { key: 'maxWidth', kind: 'text', label: 'Max width', hint: 'e.g. 720px' },
  ],
  list: [
    { key: 'icon', kind: 'image', label: 'Bullet icon', hint: 'assets/icons/…' },
    { key: 'items', kind: 'items', label: 'Points', simple: true, fields: [
      { key: '', kind: 'text', label: 'Point' },
    ] },
  ],
  officers: [
    { key: 'items', kind: 'items', label: 'Officers', fields: [
      { key: 'name', kind: 'text', label: 'Name' },
      { key: 'role', kind: 'text', label: 'Role' },
      { key: 'phone', kind: 'text', label: 'Phone' },
      { key: 'email', kind: 'text', label: 'Email' },
      { key: 'photo', kind: 'image', label: 'Photo', hint: 'Leave empty to show their initials' },
    ] },
  ],
  iconRows: [
    { key: 'layout', kind: 'select', label: 'Arrangement', options: ['stack', 'inline'] },
    { key: 'marginTop', kind: 'select', label: 'Space above', options: SPACING },
    { key: 'items', kind: 'items', label: 'Rows', fields: [
      { key: 'icon', kind: 'image', label: 'Icon' },
      { key: 'text', kind: 'text', label: 'Text', lines: true },
    ] },
  ],
  contactForm: [
    { key: 'heading', kind: 'text', label: 'Form heading' },
    { key: 'submitLabel', kind: 'text', label: 'Button text' },
    { key: 'note', kind: 'long', label: 'Small print' },
  ],
  group: [
    { key: 'gap', kind: 'select', label: 'Space between blocks', options: SPACING },
    { key: 'marginBottom', kind: 'select', label: 'Space below', options: SPACING },
  ],
  split: [
    { key: 'columns', kind: 'select', label: 'Column widths',
      options: ['1fr 1fr', '0.9fr 1.4fr', '1.2fr 1fr', '1fr 2fr', '2fr 1fr'] },
    { key: 'gap', kind: 'select', label: 'Space between', options: SPACING },
    { key: 'maxWidth', kind: 'text', label: 'Max width', hint: 'e.g. 1000px' },
  ],
};

/* What each block is CALLED in the editor, and a one-line description. Officers
   do not think in "iconRows" — and a label that reads like a developer's variable
   name is how a CMS ends up unused. */
export const BLOCK_LABELS = {
  heading:     ['Heading',        'A title with an optional eyebrow and intro line'],
  text:        ['Paragraph',      'A block of text'],
  buttons:     ['Buttons',        'One or more buttons or links'],
  cards:       ['Cards',          'A row of cards with an icon or a number'],
  events:      ['Events',         'Dated event cards'],
  gallery:     ['Photo grid',     'Several photos in a grid'],
  image:       ['Photo',          'A single photo'],
  list:        ['Bulleted list',  'Short points with an icon bullet'],
  officers:    ['Officers',       'Chapter officers with contact details'],
  iconRows:    ['Icon rows',      'Lines of text, each with an icon'],
  contactForm: ['Contact form',   'The form that emails the chapter'],
  group:       ['Group',          'Holds other blocks together'],
  split:       ['Two columns',    'Two columns, each holding its own blocks'],
};

/* A new block of each type, so "Add block" produces something that renders
   immediately rather than an empty shell the officer has to decode. */
export const BLOCK_DEFAULTS = {
  heading:     () => ({ type: 'heading', title: 'New heading' }),
  text:        () => ({ type: 'text', text: 'New paragraph.' }),
  buttons:     () => ({ type: 'buttons', layout: 'center', items: [{ label: 'Button', href: 'index.html', variant: 'primary' }] }),
  cards:       () => ({ type: 'cards', columns: 3, marker: 'icon', items: [{ title: 'Card', text: 'Card text.' }] }),
  events:      () => ({ type: 'events', items: [{ month: 'Jan', day: '1', title: 'New event' }] }),
  gallery:     () => ({ type: 'gallery', columns: 3, items: [] }),
  image:       () => ({ type: 'image', src: '', alt: '' }),
  list:        () => ({ type: 'list', icon: 'assets/icons/chevron-right.svg', items: ['First point'] }),
  officers:    () => ({ type: 'officers', items: [{ name: 'Name', role: 'Role' }] }),
  /* `lines`, not `text` — the renderer reads lines, and a default that wrote
     `text` produced a row that added cleanly and then rendered nothing at all. */
  iconRows:    () => ({ type: 'iconRows', layout: 'stack',
                        items: [{ icon: 'assets/icons/mail.svg', lines: [[{ text: 'Text' }]] }] }),
  contactForm: () => ({ type: 'contactForm', heading: 'Get in touch', submitLabel: 'Send' }),
  group:       () => ({ type: 'group', blocks: [] }),
  split:       () => ({ type: 'split', columns: '1fr 1fr', left: [], right: [] }),
};

/* iconRows stores `lines` (a list of lists of spans) because a row can hold a
   bold run and a link. That is more structure than an officer should ever have to
   see, so the editor offers a single text box and converts. Round-trips cleanly
   for anything the editor itself produced; a row hand-authored with links keeps
   its structure and is shown read-only. */
export function linesToText(lines) {
  if (!Array.isArray(lines)) return '';
  return lines.map((line) => (Array.isArray(line) ? line.map((s) => (s && s.text) || '').join('') : '')).join('\n');
}
export function textToLines(text) {
  return String(text || '').split('\n').map((line) => [{ text: line }]).filter((l) => l[0].text !== '');
}
export function isSimpleLines(lines) {
  return Array.isArray(lines) && lines.every((line) =>
    Array.isArray(line) && line.every((s) => s && typeof s.text === 'string' && !s.href && !s.strong));
}
