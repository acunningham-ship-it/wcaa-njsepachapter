/* Event picture + gallery video link. Run: node tools/test-media.mjs
 * The validator and the renderer must carry the SAME rule: a link the page would refuse to show
 * must also be refused at save, and what the page shows must come from the allowlist parser,
 * never from the pasted text. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { videoEmbed } from '../js/render.js';
import { renderPage } from '../js/blocks.js';
import { validateContent } from '../js/validate-content.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = JSON.parse(readFileSync(join(ROOT, 'content/pages.json'), 'utf8'));
const SITE = JSON.parse(readFileSync(join(ROOT, 'content/site.json'), 'utf8'));
const clone = (x) => JSON.parse(JSON.stringify(x));
let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 240))); }
};

/* ---- the parser ---- */
const GOOD = [
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'YouTube', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
  ['https://youtu.be/dQw4w9WgXcQ?t=5', 'YouTube', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
  ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'YouTube', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
  ['https://www.instagram.com/reel/CxYz123abc/', 'Instagram', 'https://www.instagram.com/reel/CxYz123abc/embed/'],
  ['https://www.facebook.com/watch/?v=1234567890', 'Facebook', null],
  ['https://fb.watch/abcDEF123/', 'Facebook', null],
];
for (const [url, site, embed] of GOOD) {
  const v = videoEmbed(url);
  ok('accepts ' + url, !!v && v.site === site && (embed ? v.embed === embed : v.embed.startsWith('https://www.facebook.com/plugins/video.php?')), v);
}
const BAD = [
  'http://www.youtube.com/watch?v=dQw4w9WgXcQ', 'javascript:alert(1)', 'https://evil.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com.evil.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=short',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ"onload="x', 'https://youtu.be/dQw4w9WgXcQ<script>', '<iframe src=x>',
  'https://vimeo.com/123456', '', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ ' + 'a'.repeat(500), null, 42,
];
for (const b of BAD) ok('refuses ' + JSON.stringify(b).slice(0, 60), videoEmbed(b) === null);

/* ---- fixtures: a gallery item with a video, an event with a picture ---- */
const IMG = 'uploads/site/denise-ad.jpg';
const gallery = (d) => d.pages[3].sections[0].blocks[1];
const events = (d) => d.pages[2].sections[0].blocks[1];
const page = (d, i) => renderPage(d.pages[i], SITE);

const base = clone(CONTENT);
ok('the real content still validates', validateContent(base).ok === true, validateContent(base));

/* gallery video */
{
  const d = clone(CONTENT);
  gallery(d).items[0].video = 'https://youtu.be/dQw4w9WgXcQ';
  ok('validator accepts a good video link', validateContent(d).ok === true, validateContent(d));
  const html = page(d, 3);
  ok('page carries a Play button with the parsed embed address', html.includes('data-embed="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"'));
  ok('page carries a plain "Watch on YouTube" link (https, new tab, noopener)', /<a class="wcaa-vid__link" href="https:\/\/(?:youtu\.be|www\.youtube\.com)\/[^"]*dQw4w9WgXcQ[^"]*" target="_blank" rel="noopener noreferrer">Watch on YouTube<\/a>/.test(html));
  ok('NO iframe in the markup (click-to-load)', !/<iframe/i.test(html));
  ok('page loads js/video.js', html.includes('<script src="js/video.js" defer></script>'));
  ok('a page with no video does not load js/video.js', !page(base, 3).includes('video.js') && !page(base, 0).includes('video.js'));
}
{
  const d = clone(CONTENT);
  gallery(d).items[0].video = 'https://evil.com/x';
  const r = validateContent(d);
  ok('validator rejects a video link off the allowlist, naming the photo', r.ok === false && /items\[0\]\.video/.test(r.path || ''), r);
  ok('...and the renderer shows nothing for it (tampered content)', !/wcaa-vid|data-embed|evil\.com/.test(page(d, 3)));
  gallery(d).items[0].video = '<script>alert(1)</script>';
  ok('a script payload in video is rejected and never rendered', validateContent(d).ok === false && !/<script>alert/.test(page(d, 3)));
}

/* event picture */
{
  const d = clone(CONTENT);
  events(d).items[0].image = IMG;
  ok('validator accepts an uploaded event picture', validateContent(d).ok === true, validateContent(d));
  const html = page(d, 2);
  ok('event card renders the picture, alt = event title', html.includes('<div class="wcaa-ev__media"><img src="' + IMG + '" alt="HOLIDAY BRUNCH"'), html.match(/wcaa-ev__media.{0,160}/));
  ok('an event with no picture renders no media box', !page(base, 2).includes('wcaa-ev__media'));
  for (const bad of ['https://evil.com/x.jpg', 'javascript:alert(1)', '../../etc/passwd', '"onerror="x', '//evil.com/a.png']) {
    const e = clone(CONTENT);
    events(e).items[0].image = bad;
    const r = validateContent(e);
    ok('validator rejects event picture ' + JSON.stringify(bad), r.ok === false && /image/.test(r.path || ''), r);
    ok('  ...and the renderer drops it', !page(e, 2).includes('wcaa-ev__media'));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
