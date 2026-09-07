# WCAA New Jersey & Southeastern Pennsylvania Chapter — website

Live: https://acunningham-ship-it.github.io/wcaa-njsepachapter/
Deploys from the **`master`** branch, root directory, via GitHub Pages.

## How to change the site

Edit the files under **`src/`**, then:

```bash
python3 build.py          # regenerates _ds_bundle.js from src/
python3 build.py --check  # verifies the bundle matches src/ without writing
git add -A && git commit && git push origin master
```

Commit **both** `src/` and the regenerated `_ds_bundle.js` — the browser loads the
bundle, not `src/`.

## Layout

```
src/
  _header.txt              bundle metadata comment (leave alone)
  _prologue.js             IIFE opener + namespace setup (leave alone)
  _epilogue.js             the __ds_ns exports + IIFE close (add a line if you add a component)
  _order.json              concatenation order — a new component must be listed here
  components/core/         Badge, Button, Icon, SectionHeading
  components/content/      EventCard, GalleryGrid, Hero, OfficerCard
  components/forms/        Input, TextArea
  components/navigation/   Footer, NavBar
  ui_kits/website/         the pages (Home, About, Events, Gallery, Join, Contact),
                           Section, WebsiteApp (routing), image-slot
build.py                   the whole build. No npm, no bundler, no toolchain.
vendor/                    React + ReactDOM production builds, served same-origin
tokens/*.css, styles.css   design tokens and global styles
uploads/                   photos (served as .webp; the .jpg originals are unreferenced)
```

Each component file is self-contained: it injects its own CSS (a `<style>` tag keyed
by id) and registers itself on `__ds_scope`. Components use `React.createElement`
directly — **there is deliberately no JSX**, so no transpile step is needed and the
browser runs the source as written.

## Why it looks like this

The site was originally produced by claude-design as a compiled `_ds_bundle.js` with
no source in the repo — editing it meant hand-patching a generated blob. `src/` was
recovered from that bundle by splitting it at its component boundaries.

**The recovery is provably lossless:** `build.py --check` re-derives the bundle from
`src/` and compares it to the committed file, and it was **byte-for-byte identical** at
the moment of recovery. If you ever doubt that `src/` is the real source of what ships,
run that command — it answers for the bundle as it is *now*, which is the only version
the question is ever really about.

(An earlier draft of this README quoted the exact character count. It went stale within
one commit, because the count changes every time anything is edited. A number a human has
to remember to update is not documentation of a live property — the command is.)

## Two things that will silently break the site

1. **`.nojekyll` must exist.** GitHub Pages runs Jekyll by default, and Jekyll drops
   files beginning with an underscore — which includes `_ds_bundle.js`. Without that
   file the site serves HTTP 200 and renders blank.
2. **Push to `master`, not `main`.** A push to `main` succeeds and changes nothing.

## Images

Photos are served as WebP, capped at 1400px on the long edge — the gallery and the
homepage strip render them at ~363px CSS, so anything larger is wasted bytes. When
adding a photo:

```bash
convert in.jpg -resize '1400x1400>' -quality 82 -define webp:method=6 -strip out.webp
```

The `.jpg` originals under `uploads/` are no longer referenced by the site. They cost
repo size, not page weight.
