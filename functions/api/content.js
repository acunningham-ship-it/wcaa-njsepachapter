/* GET /api/content — the site content as it stands on the branch RIGHT NOW.

   The admin used to read ../content/pages.json from the deployed site, which lags the repo by
   a Cloudflare build (~1 min). An officer who saved and reopened the editor inside that window
   loaded their pre-save copy, and the stale-content check in /api/save would then (correctly)
   refuse their next save. Reading the branch directly closes that window. */
import { json, requireSession, missingEnv, ghGetFile } from './_lib.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'GET') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'GET' });
  if (!(await requireSession(context))) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (missingEnv(env, ['GITHUB_TOKEN']).length) return json({ ok: false, error: 'Not set up.' }, 500);
  const [pages, site] = await Promise.all([ghGetFile(env, 'content/pages.json'), ghGetFile(env, 'content/site.json')]);
  if (!pages.ok || !site.ok || !pages.content || !site.content) {
    return json({ ok: false, error: 'Couldn’t read the current site.' }, 502);
  }
  try {
    return json({ ok: true, content: JSON.parse(pages.content), site: JSON.parse(site.content) }, 200,
                { 'Cache-Control': 'no-store' });
  } catch {
    return json({ ok: false, error: 'The saved content couldn’t be read.' }, 502);
  }
}
