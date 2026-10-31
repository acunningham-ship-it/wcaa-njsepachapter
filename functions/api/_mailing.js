/* The chapter's email list: CSV in, one row per address out (migration 0006).

   Shared by every endpoint that can touch the list — the RSVP sign-up (which adds people in
   passing), the panel's "add one", the spreadsheet import — so "is this the same person" is
   answered in exactly one place and cannot drift between them.

   ⛔ DEDUPLICATION IS THE DATABASE, NOT THIS FILE. Two officers importing the same spreadsheet
   at the same moment, or one person signing up while another uploads, must still leave ONE row.
   A SELECT-then-INSERT here would let both sides see "not on the list" and both write. So the
   write is a single statement whose conflict target is the UNIQUE index on email_key, and the
   rule for names is in the SQL too.

   Web-standard only (no node imports), same as _lib.js and _input.js, so this runs unchanged in
   Workers and imports cleanly under Node's test runner. */

import { EMAIL } from './_input.js';

export const MAX_NAME = 120;
export const MAX_EMAIL = 200;
export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_CHARS = 1_000_000;   // a 5,000-row spreadsheet is ~150 KB; this is a backstop
export const BATCH_SIZE = 50;                // statements per D1 batch call

/* Keep the name we already have unless it is blank.
   An officer who typed "Denise Canney" by hand should not have it replaced by whatever name the
   next event sign-up form happened to collect ("denise", or nothing at all) — but a blank name
   SHOULD be filled in, because blank is the common case for an address-only import and filling it
   is strictly more useful. `source` is never rewritten: it means "where we first got this person",
   which stops being true the moment it is overwritten. */
export const UPSERT_SQL = `
  INSERT INTO mailing_list (name, email, email_key, source)
  VALUES (?1, ?2, ?3, ?4)
  ON CONFLICT (email_key) DO UPDATE SET
    name = CASE WHEN mailing_list.name IS NULL OR mailing_list.name = ''
                THEN excluded.name ELSE mailing_list.name END,
    email = excluded.email,
    updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`;

/* Add one person. `person` is { name, email, key }. Returns nothing useful; callers that need to
   report "already on the list" check first (single adds only, where that is one cheap read). */
export function addSubscriber(env, person, stmt = env.DB) {
  return stmt.prepare(UPSERT_SQL)
    .bind(person.name || null, person.email, person.key, person.source || 'manual')
    .run();
}

/* Add many people in as few round trips as D1 will take. Used by the CSV import.
   Not a loop of single awaits: 2,000 rows would be 2,000 requests to the database. */
export async function addSubscribers(env, people) {
  let written = 0;
  for (let i = 0; i < people.length; i += BATCH_SIZE) {
    const chunk = people.slice(i, i + BATCH_SIZE);
    await env.DB.batch(chunk.map((p) => env.DB.prepare(UPSERT_SQL).bind(p.name || null, p.email, p.key, p.source)));
    written += chunk.length;
  }
  return written;
}

/* ---------- CSV ---------- */

/* RFC 4180, the subset a spreadsheet actually writes: quoted cells, "" for a quote inside one,
   CRLF or LF row ends, and UTF-8 with a BOM (Excel adds one, and a BOM in the first header cell
   would otherwise stop "Email" being recognised as a header).

   Deliberately NOT a strict validator. The input here is a spreadsheet an officer exported on her
   own computer; the job is to read it, not to lecture her about it. Rows that carry no address are
   dropped later, and reported as a count. */
export function parseCsv(text) {
  const s = String(text == null ? '' : text).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; }        // "" is a literal quote
        else quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { row.push(cell); cell = ''; continue; }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  rows.push(row);

  // Blank lines (and Excel's trailing one) are not rows.
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const HEADER_EMAIL = /^e[\s._-]?mail(\s*(address|addr))?$/i;

/* Turn spreadsheet rows into { name, email, key } without asking the officer to map columns.

   ⛔ NO COLUMN PICKER, AND NO "NAME IS COLUMN 1" ASSUMPTION. The same file might be "Name,Email"
   from one officer and "Email,First,Last" from another, and a chapter volunteer should not have to
   care. For each row we take the cell that IS an email address as the address and the remaining
   cells as the name — which reads all of those layouts correctly, including a bare column of
   addresses with no header at all. A header row simply has no address in it, so it is skipped,
   and a row that does have one but nothing else gives an empty name, which is allowed.

   The consequence to be honest about: a name cell that happens to contain an address would be
   read as the address. Someone's "name" being an email address is not a case worth a mapping UI. */
export function peopleFromCsv(rows) {
  const people = [];
  const seen = new Set();       // duplicates WITHIN the file collapse here; across files, the DB
  let skipped = 0;
  let start = 0;

  // A first row that is only labels ("Email", "Name") is a header, not a person.
  if (rows.length && rows[0].some((c) => HEADER_EMAIL.test(c.trim()))) start = 1;

  for (let r = start; r < rows.length; r++) {
    const cells = rows[r].map((c) => c.replace(/\s+/g, ' ').trim());
    const email = cells.find((c) => c.length <= MAX_EMAIL && EMAIL.test(c));
    if (!email) { skipped++; continue; }
    const name = cells.filter((c) => c && c !== email).join(' ').slice(0, MAX_NAME);
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    people.push({ name, email, key });
  }
  return { people, skipped, header: start === 1 };
}
