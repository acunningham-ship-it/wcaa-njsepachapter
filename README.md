# WCAA New Jersey & Southeastern Pennsylvania Chapter — website

Live: https://wcaa-njsepachapter.com/

(The `acunningham-ship-it.github.io/wcaa-njsepachapter/` address is an OLD GitHub Pages
mirror of the same `master` branch. It still serves, so it is not 404ed — board members may
have it bookmarked — but every page now redirects it to the canonical domain above. Hand out
the .com; the mirror URL contains a personal name and confused the board.)
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
| `POST /api/email` | officer | email everyone registered for an event (one message, all in BCC) |
| `POST /api/mailing-list/send` | officer | one announcement to the whole chapter list |
| `GET /api/mailing-list` | officer | the chapter's email list (`?format=csv` to download it) |
| `POST /api/mailing-list` | officer | add one person, by name and email |
| `POST /api/mailing-list/import` | officer | add everyone in a `.csv` (deduplicated) |
| `POST /api/mailing-list/delete` | officer | take one person off the list |
| `POST /api/logout` | anyone | sign out: clears the cookie and kills that session token on the server |
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

### Emailing everyone who registered

**Email everyone** (Event sign-ups → the event's list) sends ONE message through [Resend](https://resend.com)'s
HTTP API (a Worker can't speak SMTP). Everyone is in BCC, so nobody sees anyone else's address; the To is the
reply-to officer, who therefore gets a copy; replies go to her; the line "For any inquiries, email …" is added
by the server to every send; each press of Send is logged in `email_sends` (who, when, subject, how many).
It needs, as Cloudflare Pages **secrets/variables**: `RESEND_API_KEY` (secret, required), and optionally
`EMAIL_FROM` (default `WCAA NJ/SEPA Chapter <notifications@wcaa-njsepachapter.com>`) and `EMAIL_REPLY_TO`
(default `dcanney@verizon.net`). Without the key the button answers "Email isn't set up on the website yet".
Resend takes 50 addresses per message, so a list over 49 is refused rather than split. One-time DNS setup:
`~/reports/wcaa-email-setup-2026-10-13.md` (kept outside the repo).

### The chapter email list

The **Email list** tab is the chapter's own address book, and it is deliberately not the same thing
as an event's sign-ups. An RSVP is a fact about one Thursday (a seat, a phone number); the list is
who the chapter can reach at all, and it outlives every event. So they are separate tables
(`rsvps` and `mailing_list`), and deleting an event's sign-up list does not take anybody off the
chapter list.

**It fills itself.** Every successful event sign-up adds that person's name and email
(`functions/api/rsvp.js`). That is best-effort on purpose: the sign-up is already stored, so a
failure to add them here — including the table not existing yet — is never shown to the person
registering, and never costs them their seat.

**One row per address, enforced by the database.** `mailing_list.email_key` is the trimmed,
lowercased address with a UNIQUE index on it, and every path (a sign-up, a name typed in by hand, a
spreadsheet uploaded twice) is a single `ON CONFLICT` upsert (`functions/api/_mailing.js`). So
signing up for three events, or uploading the same file twice, leaves one person — not three, and
not a duplicate that gets the announcement twice. A name an officer typed by hand is never replaced
by a later sign-up's version of it; a blank name is filled in.

**Importing a spreadsheet** needs no column mapping. For each row the endpoint takes the cell that
*is* an email address as the address and the remaining cells as the name, so `Name,Email`,
`Email,First,Last` and a bare column of addresses all read correctly (quoted cells, CRLF and an
Excel BOM included). The reply says what happened — added, already on the list, and lines with no
address that were skipped — and it is true on a re-import because "added" is measured as the change
in the list's size, not as rows processed.

**Sending an announcement** goes to every address, one message per person, through Resend's batch
endpoint (100 messages per call). It is not the BCC trick `/api/email` uses: that caps at 50
addresses in total, which cannot reach a chapter list, and splitting it would deliver duplicates to
anyone on two batches. Each person gets their own message with only their own address on it, replies
come to the chapter's reply address, and the server appends both the usual inquiries line and how to
be taken off the list. A batch that fails does not stop the rest; the officer is told exactly how
many were delivered and how many were not, and `list_sends` records the same numbers. (Resend's free
tier allows 2 requests a second, so there is a short pause between batches. One announcement is
capped at 1,000 people and one import at 5,000 addresses.)

Nothing here is committed to the repo: it is D1 only, same rule as the RSVPs.

**Before the table exists**, the tab used to say "ask your web person" and stop. It now shows a
one-time **Set up the email list** button that calls `POST /api/migrate` and reloads. It is safe to
press more than once: every migration is `CREATE … IF NOT EXISTS`, so it cannot change or empty a
list that is already there.

### Event sign-ups that are no longer on the website

An `events` row is registration state; the website is content. They are kept in step by
`syncRegistration` in `functions/api/save.js`, which reconciles against the **whole table**, not just
the previous version of `pages.json`. That matters because a commit made straight to the repo never
runs `/api/save`: when the old copy of Holiday Brunch was removed that way, its D1 row stayed open
with nobody on it and the same event appeared twice on the Sign-ups screen.

On every save, a row whose event is no longer anywhere in the content is deleted when it has no
sign-ups (it can never be reached again — `register.html` only exists for events in the content) and
kept but closed when it has some, so those people can still be read and exported. The delete
re-checks emptiness in the same statement, exactly like `/api/events/delete`, so an RSVP arriving in
the gap cannot be cascade-deleted. An event that is still on the page with registration switched off
is **not** stale: its row stays, closed. The Sign-ups screen also marks these leftovers and offers to
remove the empty ones in one click, for a database that already has one.

### Setting up the database

The schema is not created on first request — an unauthenticated stranger's RSVP is
the wrong thing to be triggering `CREATE TABLE`. Apply it deliberately, either way:

```bash
npx wrangler d1 execute wcaa-rsvps --remote --file=migrations/0001_rsvps.sql
```

...or sign in and `POST /api/migrate`, which runs the same file and then reports
which tables actually exist rather than that the statements were sent. In the panel, the
**Email list** tab's one-time **Set up the email list** button does the same thing without a
terminal; it appears whenever `mailing_list` is missing.

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
vendor/                    React + ReactDOM production builds, served same-origin; plus the HEIC/TIFF decoders
                           the site manager loads only when needed (see vendor/README.md)
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

Photos added in the site manager go through `admin/photo.js` first. `/api/upload` only takes JPEG, PNG or WebP up to
20 MB (a backstop), so the browser converts anything else (HEIC, AVIF, GIF, BMP, TIFF, ICO, SVG, or any photo over
5 MB or 2400px) to a JPEG (WebP if at least 1% of it is see-through), upright, at most 2400px and under 5 MB, so
gallery pages stay light. The file type is read from the bytes, not
the name. Camera RAW files are refused with a message. Tested by `tools/e2e-photo-upload.py`.
