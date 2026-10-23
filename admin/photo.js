/* Getting a photo ready for /api/upload, in the officer's browser.

   /api/upload takes only a JPG, PNG or WebP under 6 MB (functions/api/upload.js, and that check stays the real
   one). Phones and laptops hand us much more than that: iPhone HEIC, 8–12 MB camera JPEGs, AVIF, GIF, BMP, TIFF,
   ICO, SVG logos. So a file is identified by its first bytes, never by its name or the type the browser guessed
   (HEIC often comes with no type at all, and some files have the wrong extension), and then:
   - a JPG, PNG or WebP already within limits goes up byte-for-byte;
   - anything else is redrawn upright, at most 2400 px on its long side, as a JPEG, or as a WebP when it has
     see-through parts (a logo);
   - HEIC and TIFF, which Chrome and Firefox can't open, go through a decoder in vendor/ that is fetched only
     when such a file is picked. Safari opens both itself, so it never fetches them;
   - an SVG is always drawn to a picture first. The raw file can carry script, which would run on this site;
   - a camera RAW file, or anything that can't be opened, gets a plain message and nothing is uploaded.

   Vendored decoders (unmodified npm files; sha256 in vendor/README.md):
   libheif-js 1.23.5 libheif-wasm/libheif-bundle.js (LGPL-3.0), utif2 4.1.0 UTIF.js (MIT),
   pako 1.0.11 dist/pako_inflate.min.js (MIT), which UTIF needs for Deflate-compressed TIFFs. */

const MAX_BYTES = 5 * 1024 * 1024;   // under the endpoint's 6 MB, with room to spare
const MAX_EDGE = 2400;
const TYPE = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };   // what /api/upload accepts
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const RAW_NAME = /\.(dng|cr2|cr3|crw|nef|nrw|arw|srf|sr2|orf|rw2|raf|pef|srw|x3f|3fr|erf|kdc|mrw|raw|rwl|iiq)$/i;

export const SAY = {
  heic: 'This photo is in Apple’s HEIC format, which this browser can’t open. Try uploading from Safari, or export it from Photos as a JPEG and try again.',
  raw: 'This is a camera RAW file. Export it as a JPEG first.',
  tiff: 'This TIFF file couldn’t be opened here. Please save it as a JPEG or PNG and try again.',
  svg: 'This SVG drawing couldn’t be turned into a picture. Please save it as a PNG and try again.',
  broken: 'This browser couldn’t open that picture. Please save it as a JPEG or PNG and try again.',
  other: 'This file isn’t a photo this site can use. Please choose a JPG, PNG or HEIC photo.',
  moving: 'This GIF moves; the website shows its first frame as a still picture.',
};

/* What the file really is, from its first bytes. The name only matters for camera RAW files, which are TIFF inside. */
export function sniffKind(b, name = '') {
  const at = (from, to) => String.fromCharCode(...b.subarray(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (at(0, 4) === '\x89PNG') return 'png';
  if (at(0, 4) === 'RIFF' && at(8, 12) === 'WEBP') return 'webp';
  if (at(0, 6) === 'GIF87a' || at(0, 6) === 'GIF89a') return 'gif';
  if (at(4, 8) === 'ftyp') {   // ISO media: the brands say which
    const end = Math.min(b.length, ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0);
    const brands = [at(8, 12)];
    for (let i = 16; i + 4 <= end; i += 4) brands.push(at(i, i + 4));
    if (brands.some((x) => x === 'avif' || x === 'avis')) return 'avif';
    if (brands.some((x) => /^(hei[cxms]|hev[cxms]|mif1|msf1)$/.test(x))) return 'heic';
    return brands.includes('crx ') ? 'raw' : 'other';   // crx = Canon CR3
  }
  if (at(0, 2) === 'BM') return 'bmp';
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'ico';
  if (at(0, 15) === 'FUJIFILMCCD-RAW' || /^(IIRO|IIRS|MMOR|IIU\0)$/.test(at(0, 4)) || (at(0, 4) === 'II*\0' && at(8, 10) === 'CR')) return 'raw';
  if (at(0, 4) === 'II*\0' || at(0, 4) === 'MM\0*') return RAW_NAME.test(name) ? 'raw' : 'tiff';
  if (/^\s*(<\?xml|<svg|<!doctype svg)/i.test(new TextDecoder().decode(b.subarray(0, 512)).replace(/^﻿/, ''))) return 'svg';
  return RAW_NAME.test(name) ? 'raw' : 'other';
}

/* -> { photo: File to upload, note: '' or a line for the officer }. Throws an Error whose message is for her: anything
   unexpected (a canvas the browser won't export, running out of memory on a huge picture) becomes SAY.broken. */
export async function preparePhoto(file) {
  try {
    return await prepare(file);
  } catch (e) {
    if (Object.values(SAY).includes(e.message)) throw e;
    console.error(e);
    throw new Error(SAY.broken);
  }
}

async function prepare(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffKind(bytes, file.name);
  if (kind === 'raw') throw new Error(SAY.raw);
  const name = file.name.replace(/\.[^.]*$/, '') || 'photo';
  const asIs = () => ({ photo: new File([bytes], name + EXT[TYPE[kind]], { type: TYPE[kind] }), note: '' });   // same bytes, honest type

  let pic = null;
  if (kind === 'svg') pic = await openSvg(bytes).catch(() => null);
  else {
    pic = await openNative(file);
    if (!pic && kind === 'heic') pic = await openHeic(bytes).catch(() => null);
    if (!pic && kind === 'tiff') pic = await openTiff(bytes).catch((e) => { if (e.message === SAY.raw) throw e; return null; });
  }
  if (!pic) {
    if (TYPE[kind]) return asIs();   // can't measure it here: send it as it is and let /api/upload decide, as before
    throw new Error(SAY[kind] || (kind === 'other' ? SAY.other : SAY.broken));
  }
  const w = pic.naturalWidth || pic.width, h = pic.naturalHeight || pic.height;
  if (TYPE[kind] && bytes.length <= MAX_BYTES && Math.max(w, h) <= MAX_EDGE) return asIs();

  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = blank(Math.round(w * scale), Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(pic, 0, 0, canvas.width, canvas.height);
  if (pic.close) pic.close();
  const clear = kind !== 'jpeg' && seeThrough(ctx, canvas);
  const blob = await new Promise((done) => canvas.toBlob(done, clear ? 'image/webp' : 'image/jpeg', 0.85));
  if (!blob || !EXT[blob.type]) throw new Error(SAY.broken);
  // Safari can't write WebP and hands back a PNG, so the name follows what actually came back.
  return { photo: new File([blob], name + EXT[blob.type], { type: blob.type }), note: kind === 'gif' && gifFrames(bytes) > 1 ? SAY.moving : '' };
}

const blank = (width, height) => Object.assign(document.createElement('canvas'), { width, height });

function seeThrough(ctx, canvas) {
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 255) return true;
  return false;
}

/* The browser's own decoders. 'from-image' applies a JPEG's EXIF rotation; the <img> route is for browsers whose
   createImageBitmap can't take this file (or doesn't exist). */
async function openNative(blob) {
  try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch { /* try an <img> */ }
  const url = URL.createObjectURL(blob);
  try { const img = new Image(); img.src = url; await img.decode(); return img; } catch { return null; } finally { URL.revokeObjectURL(url); }
}

/* An SVG is drawn at MAX_EDGE on its long side. It's parsed (never run: a parsed document has no scripting) only to
   read its shape, then shown through an <img>, which runs no script and fetches nothing. */
async function openSvg(bytes) {
  const doc = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
  const px = (v) => (/^\s*[\d.]+(px)?\s*$/.test(v || '') ? parseFloat(v) : 0);
  const box = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  const hasBox = box.length === 4 && box[2] > 0 && box[3] > 0;   // only its shape matters: the size is set below
  const w = hasBox ? box[2] : px(svg.getAttribute('width')) || 300, h = hasBox ? box[3] : px(svg.getAttribute('height')) || 150;
  if (!hasBox) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const scale = MAX_EDGE / Math.max(w, h);
  svg.setAttribute('width', Math.round(w * scale));
  svg.setAttribute('height', Math.round(h * scale));
  return openNative(new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' }));
}

/* A script from vendor/, fetched the first time it's needed and never on an ordinary visit. */
const fetched = {};
function vendor(path) {
  return fetched[path] || (fetched[path] = new Promise((done, fail) => {
    const s = Object.assign(document.createElement('script'), { src: new URL('../vendor/' + path, import.meta.url).href });
    s.onload = done;
    s.onerror = () => { delete fetched[path]; fail(new Error('Couldn’t load ' + path)); };
    document.head.append(s);
  }));
}

let heif = null;
async function openHeic(bytes) {
  await vendor('libheif-js-1.23.5/libheif-bundle.js');
  heif = heif || window.libheif();   // builds the decoder once; libheif applies the photo's rotation itself
  const images = new heif.HeifDecoder().decode(bytes);
  try {
    if (!images.length) return null;
    const w = images[0].get_width(), h = images[0].get_height();
    const canvas = blank(w, h), ctx = canvas.getContext('2d'), data = ctx.createImageData(w, h);
    if (!(await new Promise((done) => images[0].display(data, done)))) return null;
    ctx.putImageData(data, 0, 0);
    return canvas;
  } finally {
    images.forEach((im) => im.free());
  }
}

async function openTiff(bytes) {
  await vendor('pako-1.0.11/pako_inflate.min.js');   // UTIF picks up `pako` as it loads, so this goes first
  await vendor('utif2-4.1.0/UTIF.js');
  const ifds = window.UTIF.decode(bytes.buffer);
  if (ifds.some((d) => d.t50706)) throw new Error(SAY.raw);   // DNGVersion: a camera RAW named .tif
  const area = (d) => (d.t256 ? d.t256[0] : 0) * (d.t257 ? d.t257[0] : 0);
  const ifd = ifds.reduce((a, d) => (area(d) > area(a) ? d : a));   // the full picture, not a thumbnail page
  window.UTIF.decodeImage(bytes.buffer, ifd);
  const rgba = window.UTIF.toRGBA8(ifd), w = ifd.width, h = ifd.height;
  const canvas = blank(w, h);
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, w * h * 4), w, h), 0, 0);
  return upright(canvas, ifd.t274 ? ifd.t274[0] : 1);
}

/* TIFF Orientation (same numbering as EXIF): the canvas transform from the stored picture to the upright one. */
function upright(src, o) {
  const w = src.width, h = src.height;
  const m = { 2: [-1, 0, 0, 1, w, 0], 3: [-1, 0, 0, -1, w, h], 4: [1, 0, 0, -1, 0, h], 5: [0, 1, 1, 0, 0, 0],
              6: [0, 1, -1, 0, h, 0], 7: [0, -1, -1, 0, h, w], 8: [0, -1, 1, 0, 0, w] }[o];
  if (!m) return src;
  const out = o > 4 ? blank(h, w) : blank(w, h), ctx = out.getContext('2d');
  ctx.setTransform(...m);
  ctx.drawImage(src, 0, 0);
  return out;
}

/* How many frames a GIF has (stops counting at 2). */
function gifFrames(b) {
  let i = 13 + (b[10] & 0x80 ? 3 << ((b[10] & 7) + 1) : 0), n = 0;
  while (i < b.length && b[i] !== 0x3b && n < 2) {
    if (b[i] === 0x2c) { n++; i += 11 + (b[i + 9] & 0x80 ? 3 << ((b[i + 9] & 7) + 1) : 0); }   // image: descriptor, colours, LZW size
    else i += 2;                                                                         // extension: introducer + label
    while (i < b.length && b[i]) i += b[i] + 1;                                          // data sub-blocks
    i++;
  }
  return n;
}
