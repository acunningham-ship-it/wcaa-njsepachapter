/* POST /api/upload  (multipart form fields "file" + optional "dest",
                      or JSON { filename, contentType, dataBase64, dest })
   Requires a valid session. Validates the image type (declared + magic bytes) and
   size, then commits it with a safe unique name into one of a FIXED set of folders.
   Returns { src }.

   The destination is never a caller-supplied path: "dest" is a short name that is
   looked up in DESTS, and anything not in that table is rejected. A caller can
   therefore not write outside these two folders, and cannot traverse out of them —
   the filename is rebuilt from a slug plus random hex, never from user input. */
import { json, requireSession, ghPutFile, bytesToBase64, missingEnv } from './_lib.js';

const MAX_BYTES = 6 * 1024 * 1024;
const EXT_FOR = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/* name the client may ask for -> the only folders this endpoint can ever write to */
const DESTS = {
  gallery: 'uploads/gallery/',  // Gallery-page photos (content/gallery.json)
  site: 'uploads/site/',        // photos placed on Home / About (content/site.json *_src keys)
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, { 'Allow': 'POST' });

  const session = await requireSession(context);
  if (!session) return json({ ok: false, error: 'Your session has ended. Please sign in again.' }, 401);

  const miss = missingEnv(env, ['GITHUB_TOKEN']);
  if (miss.length) return json({ ok: false, error: 'Uploads aren’t set up yet. Please contact your web person.' }, 500);

  let bytes, contentType, originalName, dest;
  const ctype = request.headers.get('content-type') || '';
  try {
    if (ctype.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!file || typeof file === 'string') return json({ ok: false, error: 'Please choose a photo to add.' }, 400);
      contentType = file.type;
      originalName = file.name || 'photo';
      dest = form.get('dest');
      bytes = new Uint8Array(await file.arrayBuffer());
    } else {
      const b = await request.json();
      contentType = (b && b.contentType) || '';
      originalName = (b && b.filename) || 'photo';
      dest = b && b.dest;
      const raw = String((b && b.dataBase64) || '').split(',').pop();
      const bin = atob(raw);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    }
  } catch {
    return json({ ok: false, error: 'We couldn’t read that photo. Please try another file.' }, 400);
  }

  const dir = DESTS[typeof dest === 'string' && dest ? dest : 'gallery'];
  if (!dir) return json({ ok: false, error: 'We don’t know where that photo should go.' }, 400);

  const ext = EXT_FOR[contentType];
  if (!ext) return json({ ok: false, error: 'Photos need to be a JPG, PNG, or WebP image.' }, 400);
  if (!bytes || bytes.length === 0) return json({ ok: false, error: 'That photo looks empty.' }, 400);
  if (bytes.length > MAX_BYTES) return json({ ok: false, error: 'That photo is too large. Please use one under 6 MB.' }, 400);
  if (!sniff(bytes, ext)) return json({ ok: false, error: 'That file doesn’t look like a real photo.' }, 400);

  const base = slugify(String(originalName).replace(/\.[^.]+$/, '')) || 'photo';
  const filename = `${base}-${randHex(4)}.${ext}`;
  const path = dir + filename;

  const put = await ghPutFile(env, path, bytesToBase64(bytes), `Add photo ${filename} (via site manager)`, null);
  if (!put.ok) return json({ ok: false, error: 'The photo didn’t upload. Please try again in a minute.' }, 502);

  return json({ ok: true, src: path });
}

function slugify(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}
function randHex(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  let hex = '';
  for (let i = 0; i < b.length; i++) hex += b[i].toString(16).padStart(2, '0');
  return hex;
}
function sniff(b, ext) {
  if (b.length < 12) return false;
  if (ext === 'jpg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (ext === 'png') return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  if (ext === 'webp') return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  return false;
}
