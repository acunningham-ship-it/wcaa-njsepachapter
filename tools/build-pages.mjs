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

if (check) {
  console.log(drift ? `\n${drift} file(s) differ from content/` : '\nno drift');
  process.exit(drift ? 1 : 0);
}
