/* Tests admin/merge.js, the three-way merge the editor runs when someone else saved while an
   officer was editing. Run: node tools/test-merge.mjs

   Built on the chapter's real content. The case that matters most is the one officers actually
   hit: one officer adds an event (it goes on TOP of the list) while another edits an existing
   event. A merge by list position puts the second officer's edit on the wrong event and publishes
   it without a word, which is worse than refusing the save. */
import { readFileSync } from 'node:fs';
import { merge3 } from '../admin/merge.js';

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 300))); }
};
const clone = (x) => JSON.parse(JSON.stringify(x));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const BASE = {
  content: JSON.parse(readFileSync(new URL('../content/pages.json', import.meta.url), 'utf8')),
  site: JSON.parse(readFileSync(new URL('../content/site.json', import.meta.url), 'utf8')),
};
// The events list on the Events page, found rather than hardcoded so a content edit can't break the test.
const pageIx = BASE.content.pages.findIndex((p) => p.slug === 'events');
const where = (() => {
  const secs = BASE.content.pages[pageIx].sections;
  for (let s = 0; s < secs.length; s++) for (let b = 0; b < secs[s].blocks.length; b++) {
    if (secs[s].blocks[b].type === 'events' && secs[s].blocks[b].items.length >= 3) return [s, b];
  }
})();
const events = (doc) => doc.content.pages[pageIx].sections[where[0]].blocks[where[1]].items;
ok('fixture: the Events page has an events list with 3+ events', !!where && events(BASE).length >= 3);
const n = events(BASE).length;
const NEW = (title) => ({ month: 'Dec', day: '9', title, time: '6 PM', location: 'Cherry Hill', description: 'New one.' });

/* ---------- nothing to merge ---------- */
{
  const mine = clone(BASE); events(mine)[1].description = 'Mine.';
  let r = merge3(BASE, mine, clone(BASE));
  ok('only I changed something: the result is exactly mine, no conflicts', eq(r.value, mine) && r.conflicts.length === 0);
  r = merge3(BASE, clone(BASE), mine);
  ok('only they changed something: the result is exactly theirs, no conflicts', eq(r.value, mine) && r.conflicts.length === 0);
  r = merge3(BASE, mine, clone(mine));
  ok('we both made the same change: no conflict', eq(r.value, mine) && r.conflicts.length === 0);
}

/* ---------- THE CASE: they added an event on top, I edited an existing one ---------- */
{
  const target = events(BASE)[1].title;
  const theirs = clone(BASE); events(theirs).unshift(NEW('Holiday Mixer'));
  const mine = clone(BASE); events(mine)[1].description = 'Bring a guest — Helene.';
  const r = merge3(BASE, mine, theirs);
  const got = events(r.value);
  ok('their new event is kept, on top', got.length === n + 1 && got[0].title === 'Holiday Mixer', got.map((e) => e.title));
  ok('my edit lands on the event I edited (found by title), not on whatever is now in its old position',
     got.find((e) => e.title === target)?.description === 'Bring a guest — Helene.' &&
     got.filter((e) => e.description === 'Bring a guest — Helene.').length === 1, got.map((e) => [e.title, e.description]));
  ok('...and no conflict is reported for it', r.conflicts.length === 0, r.conflicts);
  // Negative control: what a position-based merge would have done, so the test above means something.
  const naive = clone(theirs); events(naive)[1].description = 'Bring a guest — Helene.';
  ok('control: merging by position WOULD have put my edit on the wrong event', events(naive)[1].title !== target);
}

/* ---------- different things, combined ---------- */
{
  const theirs = clone(BASE); theirs.content.pages[0].hero.title = 'Theirs';
  const mine = clone(BASE); events(mine)[0].time = '7:30 PM';
  let r = merge3(BASE, mine, theirs);
  ok('different pages: both changes kept', r.value.content.pages[0].hero.title === 'Theirs' && events(r.value)[0].time === '7:30 PM' && !r.conflicts.length);

  const t2 = clone(BASE); events(t2)[2].location = 'Their place';
  const m2 = clone(BASE); events(m2)[2].time = 'My time';
  r = merge3(BASE, m2, t2);
  ok('same event, different fields: both kept', events(r.value)[2].location === 'Their place' && events(r.value)[2].time === 'My time' && !r.conflicts.length);

  const t3 = clone(BASE); t3.site.copyright = 'Theirs ©';
  r = merge3(BASE, mine, t3);
  ok('a site-wide change (footer) and a page change: both kept', r.value.site.copyright === 'Theirs ©' && events(r.value)[0].time === '7:30 PM' && !r.conflicts.length);

  const t4 = clone(BASE); events(t4).splice(2, 1);
  const m4 = clone(BASE); events(m4)[0].title = 'Renamed by me';
  r = merge3(BASE, m4, t4);
  ok('they deleted one event, I edited another: the deletion stands and my edit is kept',
     events(r.value).length === n - 1 && events(r.value)[0].title === 'Renamed by me' && !events(r.value).some((e) => e.title === events(BASE)[2].title) && !r.conflicts.length);

  const t5 = clone(BASE); events(t5).unshift(NEW('Theirs new'));
  const m5 = clone(BASE); events(m5).unshift(NEW('Mine new'));
  r = merge3(BASE, m5, t5);
  ok('we both added an event: both are kept', events(r.value).length === n + 2 && ['Mine new', 'Theirs new'].every((t) => events(r.value).some((e) => e.title === t)), events(r.value).map((e) => e.title));

  const keys = clone(BASE); keys.content.pages[0] = Object.fromEntries(Object.entries(keys.content.pages[0]).reverse());
  r = merge3(BASE, mine, keys);
  ok('the same data with keys in another order is not a change', !r.conflicts.length && events(r.value)[0].time === '7:30 PM');
}

/* ---------- real conflicts: mine kept, and reported ---------- */
{
  const theirs = clone(BASE); events(theirs)[1].description = 'Their words.';
  const mine = clone(BASE); events(mine)[1].description = 'My words.';
  let r = merge3(BASE, mine, theirs);
  ok('we both changed the same words: mine is kept', events(r.value)[1].description === 'My words.');
  ok('...and it is reported, pointing at that page', r.conflicts.length === 1 && r.conflicts[0][0] === 'content' && r.conflicts[0][1] === 'pages' && r.conflicts[0][2] === pageIx, r.conflicts);

  const t2 = clone(BASE); events(t2).splice(1, 1);
  const m2 = clone(BASE); events(m2)[1].description = 'I was editing this one.';
  r = merge3(BASE, m2, t2);
  ok('they deleted the event I was editing: my edit survives (reported), nothing silently lost',
     events(r.value).some((e) => e.description === 'I was editing this one.') && r.conflicts.length === 1, r.conflicts);

  // They moved a section, I edited that same section: splicing could show it twice.
  const px = BASE.content.pages.reduce((best, p, i, all) => (p.sections.length > all[best].sections.length ? i : best), 0);
  const secs = (doc) => doc.content.pages[px].sections;
  ok('fixture: some page has 3+ sections to move', secs(BASE).length >= 3);
  {
    const t3 = clone(BASE); secs(t3).push(secs(t3).shift());
    const m3 = clone(BASE); secs(m3)[0].tint = !secs(m3)[0].tint;
    r = merge3(BASE, m3, t3);
    const firsts = secs(r.value).filter((s) => JSON.stringify(s.blocks) === JSON.stringify(secs(BASE)[0].blocks)).length;
    ok('they moved a section I edited: no section appears twice (my list kept, reported)', firsts === 1 && secs(r.value).length === secs(BASE).length && r.conflicts.length >= 1, { firsts, conflicts: r.conflicts });
  }
}

/* ---------- a broad sweep: one-sided changes always come through untouched ---------- */
{
  let bad = 0, tried = 0;
  for (let p = 0; p < BASE.content.pages.length; p++) {
    const one = clone(BASE); one.content.pages[p].title = 'X' + p;
    for (const [m, t] of [[one, BASE], [BASE, one]]) { tried++; const r = merge3(BASE, m, t); if (!eq(r.value, one) || r.conflicts.length) bad++; }
  }
  ok(`one-sided change on every page, both directions (${tried} merges): result is that side exactly`, bad === 0 && tried > 8, bad);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
