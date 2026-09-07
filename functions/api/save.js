/* POST /api/save  { content: {pages:[…]}, site: {…} }  — ADMIN.
   Saves the site: writes content/pages.json + content/site.json, regenerates
   every page from them, and commits the whole set as ONE commit.

   This is the endpoint that makes "officers can add a page and reorder blocks"
   real. The admin UI is a convenience on top of it; THIS is the trust boundary,
   so nothing here trusts that the client already validated.

   Order matters and is deliberate:
     session → validate → render → diff → commit
   Rendering before committing means a document that cannot be rendered is never
   written. Rendering is pure string work (js/blocks.js), so it cannot fail
   halfway and leave anything behind.

   ⛔ ONE COMMIT, NOT N. A save touches pages.json, site.json and up to 60 .html
   files. Committing those one at a time would fire one Cloudflare Pages build per
   file and, on a failure partway through, leave the committed content and the
   committed HTML disagreeing — live, with no symptom beyond "the page didn't
   change". See ghCommitFiles in _lib.js. */
import { json, requireSession, missingEnv, ghGetFile, ghCommitFiles } from './_lib.js';
import { readBody } from './_input.js';
import { validateContent } from '../../js/validate-content.js';
import { renderSite } from '../../js/blocks.js';

const SLUG = /^[a-z0-9][a-z0-9-]{0,40}$/;

/* site.json is small and its shape is fixed, so it gets checked here rather than
   earning its own module. The nav is the part worth guarding: it is the only
   place a bad value would appear on every single page at once. */
function validateSite(site) {
  if (!site || typeof site !== 'object' || Array.isArray(site)) return { ok: false, error: 'The site settings are not valid.' };
  for (const key of ['brandMark', 'brandSub', 'title', 'copyright']) {
    if (typeof site[key] !== 'string' || !site[key].trim()) return { ok: false, error: `Site settings: ${key} is required.` };
    if (site[key].length > 2000) return { ok: false, error: `Site settings: ${key} is too long.` };
  }
  for (const key of ['nav', 'footerLinks', 'socials']) {
    if (site[key] !== undefined && !Array.isArray(site[key])) return { ok: false, error: `Site settings: ${key} must be a list.` };
    if (Array.isArray(site[key]) && site[key].length > 40) return { ok: false, error: `Site settings: ${key} has too many entries.` };
  }
  return { ok: true };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });

  const session = await requireSession(context);
  if (!session) return json({ ok: false, error: 'Please sign in.' }, 401);

  const miss = missingEnv(env, ['GITHUB_TOKEN', 'SESSION_SECRET']);
  if (miss.length) return json({ ok: false, error: 'Saving isn’t set up yet. Please contact your web person.' }, 500);

  const body = await readBody(request);
  if (!body) return json({ ok: false, error: 'We couldn’t read that. Please try again.' }, 400);

  const content = body.content;
  const site = body.site;

  const v = validateContent(content);
  if (!v.ok) return json({ ok: false, error: `${v.path} ${v.error}`, path: v.path }, 400);
  const sv = validateSite(site);
  if (!sv.ok) return json({ ok: false, error: sv.error }, 400);

  /* Render BEFORE writing anything. A document that renders to nothing means a
     block type passed validation and produced no markup — worth refusing rather
     than publishing a blank page over a working one. */
  let pages;
  try {
    pages = renderSite(content, site);
  } catch (e) {
    return json({ ok: false, error: 'That content couldn’t be turned into pages.' }, 400);
  }
  const names = Object.keys(pages);
  if (names.length !== content.pages.length) {
    return json({ ok: false, error: 'Some pages could not be generated. Check every page has a valid address.' }, 400);
  }
  for (const name of names) {
    if (pages[name].length < 400) return json({ ok: false, error: `${name} came out empty.` }, 400);
  }

  /* Which .html files did the PREVIOUS content produce? Anything it had that this
     one does not is a page the officer deleted, and it has to be removed from the
     repo or it keeps being served forever — a deleted page that stays live is the
     failure people actually notice. */
  const previous = await ghGetFile(env, 'content/pages.json');
  if (!previous.ok) return json({ ok: false, error: 'Couldn’t read the current site. Please try again.' }, 502);
  const removed = [];
  if (previous.content) {
    try {
      const old = JSON.parse(previous.content);
      for (const page of old.pages || []) {
        if (page && typeof page.slug === 'string' && SLUG.test(page.slug) && !pages[page.slug + '.html']) {
          removed.push(page.slug + '.html');
        }
      }
    } catch { /* unparseable previous content: skip deletions rather than guess */ }
  }

  const files = [
    { path: 'content/pages.json', content: JSON.stringify(content, null, 2) + '\n' },
    { path: 'content/site.json', content: JSON.stringify(site, null, 2) + '\n' },
    ...names.map((name) => ({ path: name, content: pages[name] })),
    ...removed.map((name) => ({ path: name, content: null })),
  ];

  const who = typeof session.sub === 'string' ? session.sub : 'an officer';
  const summary = `Update site content (${names.length} page${names.length === 1 ? '' : 's'}` +
                  `${removed.length ? `, ${removed.length} removed` : ''})`;
  const result = await ghCommitFiles(env, files, `${summary}\n\nSaved from the site manager by ${who}.`);

  if (!result.ok) {
    /* 409 means the branch moved under us — another officer saved, or a developer
       pushed. Say so plainly and tell them what to do, rather than retrying and
       overwriting whatever landed. */
    if (result.status === 409 || result.status === 422) {
      return json({ ok: false, error: 'Someone else saved while you were editing. Reload and make your change again.' }, 409);
    }
    return json({ ok: false, error: 'Couldn’t save to the site. Please try again in a moment.' }, 502);
  }

  return json({
    ok: true,
    commit: result.commit,
    pages: names.length,
    removed,
    note: 'Saved. The live site updates in about a minute.',
  });
}
