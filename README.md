# WCAA New Jersey & Southeastern Pennsylvania Chapter — website

Live: https://acunningham-ship-it.github.io/wcaa-njsepachapter/
Deploys from the **`master`** branch, root directory, via GitHub Pages.

## How to change the site

The pages are **generated** from `content/`. Edit the content, rebuild, commit both:

```bash
node tools/build-pages.mjs          # regenerates the .html files from content/
node tools/build-pages.mjs --check  # verifies the .html files match content/, writes nothing
node tools/test-pages.mjs           # determinism + dual-runtime + escaping
git add -A && git commit && git push origin master
```

`content/site.json` holds the chrome every page shares — brand line, nav, footer,
copyright. `content/pages.json` holds the pages themselves: each one is a hero plus a
list of sections, and each section is a list of blocks.

**Do not hand-edit `index.html`, `about.html`, `events.html`, `gallery.html`,
`contact.html` or `join.html`.** They are build output; the next save overwrites them.
`--check` exists to catch exactly that mistake before it reaches a commit.

### The blocks

| type | what it is |
|---|---|
| `heading` | kicker + title + rule + lede |
| `text` | a paragraph; `spans` for a bold run or an inline link |
| `buttons` | a row, a centred one, or a full-width stack |
| `cards` | a grid of cards, marked with an `icon` or a `number` |
| `events` | dated event cards |
| `gallery` | a photo grid |
| `image` | a single photo |
| `list` | an icon-bulleted list |
| `officers` | officer photo/initials, role, phone |
| `iconRows` | icon + text rows, `stack` or `inline` |
| `contactForm` | the contact form (fixed fields; heading and footnote are editable) |
| `group` | wraps a run of blocks, optionally spacing them with `gap` |
| `split` | a two-column row; each column holds its own blocks |

An **unrecognised block type renders nothing at all**. That is deliberate — this file
is edited through a CMS, so an unknown type is either a typo or an injection attempt,
and both should be inert. The trade-off is that a typo makes a section vanish silently,
which is why `tools/test-pages.mjs` asserts a landmark string from every page.

### Editing it without touching a file

`admin/` is the site manager. An officer signs in, adds a page, adds and reorders
blocks, edits their fields, sees a live preview, and presses **Save changes**.

Save goes to `POST /api/save`, which validates the content, regenerates every page,
and commits the whole set — content and HTML — as **one** commit. One commit means
one Cloudflare Pages build and no window where the committed content and the
committed HTML disagree with each other.

The preview is rendered by `js/blocks.js`, the same module the Worker runs at save
time. That is what the dual-runtime test is for: what the officer sees before saving
is produced by the identical code that produces what ships.

The editor's forms are generated from `admin/fields.js`, a table of what each block
offers. `tools/test-admin.mjs` asserts that table covers every block type the
renderer knows — so adding a block and forgetting the editor is a failing test
rather than a capability that quietly doesn't exist.

⛔ **Nothing in `admin/` is a security control.** Every check there is a courtesy to
the person using it; `functions/api/save.js` trusts none of it. If the two disagree,
the endpoint is right.

## The API

| endpoint | who | what |
|---|---|---|
| `POST /api/login` | public | sign in, sets a 12h session cookie |
| `GET /api/session` | anyone | am I signed in? |
| `POST /api/save` | officer | validate, regenerate, commit — one commit |
| `POST /api/upload` | officer | add a photo to `uploads/` |
| `POST /api/rsvp` | **public** | register for an event |
| `POST /api/contact` | **public** | the contact form |
| `GET/POST /api/events` | officer | open, cap and close registration |
| `GET /api/rsvps` | officer | the registration list (`?format=csv`) |
| `POST /api/rsvps/delete` | officer | remove a registration |
| `GET/POST /api/messages` | officer | read, mark handled, delete |
| `GET/POST /api/migrate` | officer | check / apply the database schema |

**The two public endpoints make zero GitHub calls.** Everything else on this site
commits to a public repo; the bodies of those two requests are a stranger's name,
email and phone number, and committing that would publish it permanently — it stays
in the git history after any later deletion. Those rows go to D1 and nowhere else.
`tools/test-rsvp.mjs` records every outbound fetch and fails if `api.github.com`
appears.

**Turnstile fails closed.** With no `TURNSTILE_SECRET` the public endpoints refuse
rather than skip verification, and they refuse when the network to Cloudflare fails
too. "The captcha is skipped when the key is missing" is how a bot wall gets silently
disabled for a month.

**The RSVP and contact forms need JavaScript**, because the Turnstile widget does.
The six content pages ship none.

### Setting up the database

The schema is not created on first request — an unauthenticated stranger's RSVP is
the wrong thing to be triggering `CREATE TABLE`. Apply it deliberately, either way:

```bash
npx wrangler d1 execute wcaa-rsvps --remote --file=migrations/0001_rsvps.sql
```

...or sign in and `POST /api/migrate`, which runs the same file and then reports
which tables actually exist rather than that the statements were sent.

### The old React prototype

`src/` + `_ds_bundle.js` are the original claude-design prototype that these pages were
ported from. It is kept as the visual reference the port was verified against, and it
still builds:

```bash
python3 build.py          # regenerates _ds_bundle.js from src/
python3 build.py --check  # verifies the bundle matches src/ without writing
```

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

## How the port was verified

Every page was screenshotted from the React prototype and from the generated static
page at 1280×DPR1 and compared pixel by pixel. **Five of the six pages match at zero
pixels; `about.html` differs by 642 px, and that difference is intended** — see below.
(`404.html` has no counterpart in the prototype; it was added afterwards.)

Photographs are compared separately, with every image hidden but its box preserved,
because they cannot match byte-for-byte and the reason is not a defect: the prototype
positions a photo with a fractional CSS `transform` and the static page uses
`object-fit: cover`, so the same file in the same box lands half a pixel apart and
resamples differently. Measured, not assumed — the alignment search over ±2 px in both
axes puts the minimum at (0, 0), so there is no offset, only resampling.

Two differences are deliberate:

1. **The officer avatar.** The prototype drew an empty editor drop-slot; a live site has
   no editor, so the static page falls back to the officer's initials. 642 px on
   `about.html`, all of them inside that circle.
2. **The mobile nav.** The prototype collapsed the links into a burger and opened them
   with React state. These pages ship no JavaScript, so below 920 px the links wrap onto
   their own row instead of hiding behind a button that could never open.

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
