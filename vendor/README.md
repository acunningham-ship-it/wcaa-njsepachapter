# vendor/

Third-party files, served same-origin and committed unchanged. `react*.js` and `qrcode.js` load on the site.
The three folders below load only in the site manager, and only when an officer picks a photo the browser can't
open itself (`admin/photo.js`): a HEIC fetches libheif; a TIFF fetches pako and then UTIF.

Each file is copied byte-for-byte from the npm tarball (its `dist.integrity` was checked first).

| file | npm package, path in it | license | sha256 |
|---|---|---|---|
| `libheif-js-1.23.5/libheif-bundle.js` | `libheif-js@1.23.5`, `libheif-wasm/libheif-bundle.js` (wasm inlined) | LGPL-3.0 (`LICENSE`, `LICENSE.libheif`) | `074b2b55ef3de477ba9f794ca381f3f0324c1cba8c91b4af07395f39c22d54cc` |
| `utif2-4.1.0/UTIF.js` | `utif2@4.1.0`, `UTIF.js` | MIT (`LICENSE`) | `290e83d171a73f604b2d1723861b0b55ba7308f79a8bb594360e627474fb30d1` |
| `pako-1.0.11/pako_inflate.min.js` | `pako@1.0.11`, `dist/pako_inflate.min.js` (UTIF needs `self.pako` for Deflate TIFFs) | MIT (`LICENSE`) | `2ca27e9a8dae569cdeac42752ed1aed1afeff7f19282d3cc12c0aaa54a08bc04` |

To update one: download the new tarball, check its integrity, copy the file into a new versioned folder, change the
path in `admin/photo.js`, update this table, and run `python3 tools/e2e-photo-upload.py` (it uploads a real HEIC and TIFF).
