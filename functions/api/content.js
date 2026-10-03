/* GET /api/content — the site content as it stands on the branch RIGHT NOW.

   The admin used to read ../content/pages.json from the deployed site, which lags the repo by
   a Cloudflare build (~1 min). An officer who saved and reopened the editor inside that window
   loaded their pre-save copy, and the stale-content check in /api/save would then (correctly)
   refuse their next save. Reading the branch directly closes that window. */
import { json, requireSession, missingEnv, ghGetFile } from './_lib.js';
import { contentFingerprint } from '../../js/validate-content.js';
import { eventItems } from '../../js/blocks.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'GET') return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'GET' });
  if (!(await requireSession(context))) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (missingEnv(env, ['GITHUB_TOKEN']).length) return json({ ok: false, error: 'Not set up.' }, 500);
  const [pages, site] = await Promise.all([ghGetFile(env, 'content/pages.json'), ghGetFile(env, 'content/site.json')]);
  if (!pages.ok || !site.ok || !pages.content || !site.content) {
    return json({ ok: false, error: 'Couldn’t read the current site.' }, 502);
  }
  let content, siteData;
  try {
    content = JSON.parse(pages.content);
    siteData = JSON.parse(site.content);
  } catch {
    return json({ ok: false, error: 'The saved content couldn’t be read.' }, 502);
  }
  /* The fingerprint is of the content AS STORED, taken before the links below are merged in —
     /api/save compares against the stored copy, which never holds a private link. */
  const base = await contentFingerprint(content, siteData);

  /* Private meeting links live in D1, not the repo (see save.js splitPrivateLinks). The editor
     shows them in the event's form, so put them back on the items here — this endpoint is
     officers-only. If D1 can't be read, `links: false` and the items simply carry no link key,
     which /api/save treats as "leave the stored link alone": a read failure can't erase one. */
  let links = false;
  if (env.DB) {
    try {
      const r = await env.DB.prepare('SELECT event_id, url FROM event_links').all();
      const byId = new Map((r.results || []).map((row) => [row.event_id, row.url]));
      for (const e of eventItems(content)) {
        if (typeof e.id === 'string' && byId.has(e.id) && !(e.meetingPublic && e.meetingLink)) e.meetingLink = byId.get(e.id);
      }
      links = true;
    } catch { /* migration 0002 not applied yet */ }
  }
  return json({ ok: true, content, site: siteData, base, links }, 200, { 'Cache-Control': 'no-store' });
}
