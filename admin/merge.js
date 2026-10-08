/* Three-way merge of the site's content, for when two officers edit at the same time.

   base   = what this editor loaded (or last saved)
   mine   = what this officer has now
   theirs = what is on the site now (someone else saved in between)

   Changes on different things are combined. When both changed the same words differently, this
   officer's version is kept (it's the one on her screen) and the place is reported.

   Lists have no ids (an event, a photo, a section is just an object in an array), and a new event
   goes on TOP of the list, so merging by position would put an officer's edit on the wrong event.
   Lists are merged the way diff3/git merge lines: items unchanged on all three sides anchor the
   list, and each stretch between anchors is taken from whichever side changed it. When both
   reshaped the same list in ways that can't be combined (one moved an event the other was editing),
   that list is NOT merged: it is reported as a clash, holding both versions, and the officer
   chooses (see swapList). Keeping hers without asking would silently drop the other officer's
   changes to that list, which is the very loss this file exists to prevent. */

// Compare by value, with object keys sorted, so key order never reads as a change.
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]])) : x)) ?? 'undefined';
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

export function merge3(base, mine, theirs) {
  const conflicts = [], clashes = [];
  const value = mergeValue(base, mine, theirs, [], conflicts, clashes);
  /* conflicts: same words changed by both; hers kept. clashes: lists that couldn't be combined;
     hers is in `value` for now, with { path, mine, theirs } so the officer can pick. Paths point
     into MINE, e.g. ['content', 'pages', 3, 'title']. */
  return { value, conflicts, clashes };
}

/* Puts `to` where the list `from` is in a merge result (found by identity: a clashed list is the
   officer's own array, untouched). Returns whether it was found. */
export function swapList(root, from, to) {
  if (!root || typeof root !== 'object') return false;
  for (const k of Object.keys(root)) {
    if (root[k] === from) { root[k] = to; return true; }
    if (swapList(root[k], from, to)) return true;
  }
  return false;
}

function mergeValue(b, m, t, path, conflicts, clashes) {
  const cb = canon(b), cm = canon(m), ct = canon(t);
  if (cm === ct || ct === cb) return m;
  if (cm === cb) return t;
  if (isObj(m) && isObj(t)) {
    const bo = isObj(b) ? b : {};
    const out = {};
    for (const k of new Set([...Object.keys(t), ...Object.keys(m)])) {
      const v = mergeValue(bo[k], m[k], t[k], [...path, k], conflicts, clashes);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  if (Array.isArray(m) && Array.isArray(t)) return mergeList(Array.isArray(b) ? b : [], m, t, path, conflicts, clashes);
  conflicts.push(path);
  return m;
}

// Longest common subsequence of two lists of canon strings, as [indexInA, indexInB] pairs.
function lcs(a, b) {
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
    L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  }
  const pairs = [];
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return pairs;
}

function mergeList(b, m, t, path, conflicts, clashes) {
  const [cb, cm, ct] = [b, m, t].map((list) => list.map(canon));
  const inM = new Map(lcs(cb, cm)), inT = new Map(lcs(cb, ct));
  // Anchors: base items that survive unchanged on both sides.
  const anchors = [...inM.keys()].filter((i) => inT.has(i)).map((i) => [i, inM.get(i), inT.get(i)]);
  const out = [];
  let i = 0, j = 0, k = 0;
  for (const [ai, aj, ak] of [...anchors, [b.length, m.length, t.length]]) {
    const bc = b.slice(i, ai), mc = m.slice(j, aj), tc = t.slice(k, ak);
    const sb = canon(bc), sm = canon(mc), st = canon(tc);
    if (sm === sb) out.push(...tc);
    else if (st === sb || sm === st) out.push(...mc);
    else if (bc.length === 1 && mc.length === 1 && tc.length === 1) out.push(mergeValue(bc[0], mc[0], tc[0], [...path, j], conflicts, clashes));
    else if (bc.length === 0) out.push(...mc, ...tc);   // both added things in the same spot: keep both
    else {
      /* Both changed this stretch in different ways (say one moved an event and the other edited
         it). Splicing could show the event twice, and keeping either list drops the other
         officer's changes to it, so this list is the officer's call. Hers stays for now. */
      clashes.push({ path, mine: m, theirs: t });
      return m;
    }
    if (ai < b.length) out.push(m[aj]);
    i = ai + 1; j = aj + 1; k = ak + 1;
  }
  return out;
}
