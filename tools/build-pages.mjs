/* Generates the site's .html files from content/pages.json + content/site.json.
   Run: node tools/build-pages.mjs           (writes)
        node tools/build-pages.mjs --check   (writes nothing; exits 1 on drift)

   --check is the one that matters in CI and before a commit: it re-renders from
   content/ and diffs against what is on disk, so a hand-edit to a generated
   .html file is caught instead of being silently overwritten by the next save.
   The pages are build OUTPUT; content/ is the source. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderSite } from '../js/blocks.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const site = JSON.parse(read('content/site.json'));
const content = JSON.parse(read('content/pages.json'));
const pages = renderSite(content, site);

const check = process.argv.includes('--check');
let drift = 0;

for (const [name, html] of Object.entries(pages)) {
  const path = join(ROOT, name);
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current === html) {
    console.log(`  same  ${name}  ${html.length} B`);
    continue;
  }
  if (check) {
    drift++;
    // Report WHERE it diverges, not just that it did — a byte offset turns a
    // failed check into a one-line fix instead of a hunt.
    if (current === null) {
      console.log(`  MISSING ${name}`);
    } else {
      let i = 0;
      while (i < current.length && i < html.length && current[i] === html[i]) i++;
      console.log(`  DRIFT ${name}  first difference at char ${i}`);
      console.log(`    on disk:  ${JSON.stringify(current.slice(i - 40 < 0 ? 0 : i - 40, i + 60))}`);
      console.log(`    rendered: ${JSON.stringify(html.slice(i - 40 < 0 ? 0 : i - 40, i + 60))}`);
    }
  } else {
    writeFileSync(path, html);
    console.log(`  wrote ${name}  ${html.length} B`);
  }
}

/* ---------- deploy precondition: a form on the page needs a key behind it ----------
   ⛔ A page can carry a complete-looking form with NO Turnstile widget, because the
   widget is gated on a configured site key and the form is not. Deployed in that
   state the visitor fills the form in, submits with no token, and /api/contact
   fails closed — so they get "We couldn't verify that you're human. Please reload
   the page and try once more." forever, and reloading cannot help, because there is
   no widget to produce a token. Verified against the live Worker, not reasoned about.

   This is a WARNING here and not a failing unit test on purpose: "the forms exist,
   the client hasn't issued a key yet" is a legitimate state to sit in for days. It
   stops being legitimate at deploy, which is where this runs. */
{
  const keyed = /^[A-Za-z0-9_-]{8,64}$/.test(String(site.turnstileSiteKey || '').trim());
  const withForms = Object.entries(pages)
    .filter(([, html]) => html.includes('data-endpoint='))
    .map(([name]) => name);
  if (withForms.length && !keyed) {
    const carry = withForms.length === 1 ? 'carries a form' : 'carry forms';
    console.log(`\n⛔ ${withForms.join(', ')} ${carry} and content/site.json has no valid`);
    console.log('   turnstileSiteKey. Deployed like this every submission fails closed and the');
    console.log('   visitor is told to reload, which cannot fix it. Set the key before pushing.');
    if (check) process.exitCode = 1;
  }
}

if (check) {
  console.log(drift ? `\n${drift} file(s) differ from content/` : '\nno drift');
  process.exit(drift ? 1 : (process.exitCode || 0));
}
