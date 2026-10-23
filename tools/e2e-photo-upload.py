#!/usr/bin/env python3
"""E2E: an officer adds a photo to the Gallery in the real editor and presses Save -> the saved content holds that photo.
Real admin/app.js in real Chromium; /api/upload is the real functions/api/upload.js (GitHub faked), /api/save is recorded.
Run: python3 tools/e2e-photo-upload.py   (needs python playwright + Pillow + node, and ffmpeg with libx265 to build the
HEIC fixture). Exit 0 = pass. E2E_BROWSER=firefox runs the same checks in Firefox.
Why it exists: 2026-10-18, photos "added" in the editor were committed to uploads/ but never reached the page (the editor read
body.path, the endpoint answers body.src, so the field was set to undefined and the blank entry was pruned on Save).
Then, 2026-10-23: the chapter's editor picked phone photos (HEIC, 9 MB JPEGs) that /api/upload refuses, and saw only an
alert. admin/photo.js now turns whatever she picks into a JPG/PNG/WebP under the limits; the second half checks that, one
file type at a time, with fixtures made here in memory (nothing is written to the repo)."""
import io, json, os, re, socket, struct, subprocess, sys, tempfile, time, urllib.parse, urllib.request
from PIL import Image, ImageChops, ImageDraw, ImageStat
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
with socket.socket() as _s: _s.bind(("127.0.0.1", 0)); PORT = _s.getsockname()[1]   # a free port, never a stale server's
BASE = f"http://127.0.0.1:{PORT}"
JPEG = bytes([0xFF, 0xD8, 0xFF, 0xE0]) + b"\x00" * 64   # passes the endpoint's magic-byte check; the preview doesn't need to decode it
fails = 0


def ok(name, cond, got=""):
    global fails
    print(("  ok  " if cond else "  FAIL ") + name + ("" if cond else f"  -> {got}"))
    fails += not cond


# ---------- fixtures: every one shows the same picture when upright (green block top-left, red top, blue bottom) ----------

def layout(w, h, alpha=False):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im); m = round(min(w, h) * 0.04) if alpha else 0   # alpha: a see-through margin all round
    d.rectangle([m, m, w - 1 - m, h // 2], fill=(220, 0, 0, 255))
    d.rectangle([m, h // 2, w - 1 - m, h - 1 - m], fill=(0, 0, 220, 255))
    d.rectangle([m, m, int(w * 0.3), int(h * 0.3)], fill=(0, 200, 0, 255))
    return im if alpha else im.convert("RGB")


def encode(im, fmt, **kw):
    b = io.BytesIO(); im.save(b, fmt, **kw); return b.getvalue()


def turned(upright_im):
    """Stored on its side, the way a phone stores a portrait photo; the file then says 'turn 90° clockwise to view'."""
    return upright_im.transpose(Image.Transpose.ROTATE_90)


def heic(stored, irot=0):
    """A real HEIC: one HEVC still (ffmpeg's libx265) in a minimal HEIF box. irot = anticlockwise quarter turns to view."""
    with tempfile.TemporaryDirectory() as d:
        stored.convert("RGB").save(d + "/in.png")
        subprocess.run(["ffmpeg", "-v", "error", "-i", d + "/in.png", "-frames:v", "1", "-pix_fmt", "yuv420p", "-c:v", "libx265",
                        "-x265-params", "log-level=error", "-f", "hevc", d + "/out.hevc"], check=True)
        annexb = open(d + "/out.hevc", "rb").read()
    nals = [n.rstrip(b"\0") for n in annexb.split(b"\0\0\1") if n.strip(b"\0")]
    kind = lambda n: (n[0] >> 1) & 0x3F
    vps, sps, pps = (next(n for n in nals if kind(n) == t) for t in (32, 33, 34))
    ptl = sps[2:].replace(b"\0\0\3", b"\0\0")[1:13]   # general profile/tier/level, byte-aligned at the start of the SPS
    box = lambda t, *p: struct.pack(">I", 8 + sum(map(len, p))) + t + b"".join(p)
    full = lambda t, v, *p: box(t, struct.pack(">I", v << 24), *p)
    cfg = b"\1" + ptl + bytes([0xF0, 0, 0xFC, 0xFD, 0xF8, 0xF8, 0, 0, 0x0F, 3])   # 4:2:0, 8-bit, 4-byte NAL lengths, 3 arrays
    for t, n in ((32, vps), (33, sps), (34, pps)): cfg += bytes([0x80 | t]) + struct.pack(">HH", 1, len(n)) + n
    props = [box(b"hvcC", cfg), full(b"ispe", 0, struct.pack(">II", *stored.size))] + ([box(b"irot", bytes([irot & 3]))] if irot else [])
    assoc = bytes([0x81, 0x02] + ([0x83] if irot else []))
    data = b"".join(struct.pack(">I", len(n)) + n for n in nals if kind(n) < 32)
    ftyp = box(b"ftyp", b"heic", b"\0\0\0\0", b"mif1heic")
    meta = lambda off: full(b"meta", 0, full(b"hdlr", 0, b"\0" * 4, b"pict", b"\0" * 13), full(b"pitm", 0, struct.pack(">H", 1)),
                            full(b"iloc", 0, b"\x44\0", struct.pack(">HHHHII", 1, 1, 0, 1, off, len(data))),
                            full(b"iinf", 0, struct.pack(">H", 1), full(b"infe", 2, struct.pack(">HH", 1, 0), b"hvc1\0")),
                            box(b"iprp", box(b"ipco", *props), full(b"ipma", 0, struct.pack(">IHB", 1, 1, len(props)), assoc)))
    return ftyp + meta(len(ftyp) + len(meta(0)) + 8) + box(b"mdat", data)


def camera_jpeg():   # a 6000x4000 photo of about 9 MB: the picture plus sensor-like noise, so it doesn't compress away
    noise = Image.merge("RGB", [Image.effect_noise((6000, 4000), 20) for _ in range(3)])
    return encode(ImageChops.add(layout(6000, 4000), noise, 1, -128), "JPEG", quality=90)


def gif_two_frames():
    first, second = layout(500, 400).convert("P"), Image.new("RGB", (500, 400), (0, 0, 220)).convert("P")
    return encode(first, "GIF", save_all=True, append_images=[second], duration=500, loop=0)


SVG = (b'<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" onload="window.top.__svgRan=1">'
       b'<script>window.top.__svgRan = 1</script><rect x="16" y="12" width="368" height="138" fill="#dc0000"/>'
       b'<rect x="16" y="150" width="368" height="138" fill="#0000dc"/><rect x="16" y="12" width="104" height="78" fill="#00c800"/></svg>')
FAKE_HEIC = b"\0\0\0\x18ftypheic\0\0\0\0mif1heic" + bytes(range(256)) * 8   # says HEIC, holds no picture
NEF = b"MM\0*\0\0\0\x08" + b"\0" * 504                                           # Nikon RAW is TIFF inside: only the name tells
CR2 = b"II*\0\x10\0\0\0CR\x02\0" + b"\0" * 500                                    # Canon RAW, sold here as photo.jpg

# ---------- checks on what landed ----------

MAGIC = [(b"\xff\xd8\xff", "jpeg"), (b"\x89PNG", "png"), (b"RIFF", "webp")]
DECODER = re.compile(r"/vendor/(libheif|utif|pako)")


def fmt(b):
    return next((k for m, k in MAGIC if b.startswith(m) and (k != "webp" or b[8:12] == b"WEBP")), None)


def colour(im, fx, fy):   # the dominant colour of a small patch around (fx, fy), as fractions of the picture
    w, h = im.size; r = max(2, int(min(w, h) * 0.03))
    m = ImageStat.Stat(im.convert("RGB").crop((int(fx * w) - r, int(fy * h) - r, int(fx * w) + r, int(fy * h) + r))).mean
    top = max(range(3), key=lambda i: m[i])
    return "rgb"[top] if all(m[top] > m[i] + 60 for i in range(3) if i != top) else "?"


def is_upright(im):
    return (colour(im, 0.15, 0.15), colour(im, 0.85, 0.2), colour(im, 0.5, 0.8)) == ("g", "r", "b")


srv = subprocess.Popen(["node", os.path.join(ROOT, "tools", "e2e-server.mjs"), str(PORT)])
try:
    for _ in range(50):
        try: urllib.request.urlopen(BASE + "/api/session"); break
        except Exception: time.sleep(0.1)
    state = lambda: json.load(urllib.request.urlopen(BASE + "/__state"))
    with sync_playwright() as p:
        b = getattr(p, os.environ.get("E2E_BROWSER", "chromium")).launch(); pg = b.new_page(viewport={"width": 1400, "height": 900})
        alerts = []; pg.on("dialog", lambda d: (alerts.append(d.message), d.dismiss()))
        pg.goto(BASE + "/admin/"); pg.wait_for_selector("#app:not([hidden])")
        pg.select_option("#page-select", label="Gallery"); pg.wait_for_timeout(600)
        fr = pg.frame_locator("iframe")
        before = fr.locator("[data-item]").count()
        fr.locator("[data-item]").first.click()
        pg.click("text=+ Add another photo")
        pg.set_input_files("#drawer-body input[type=file]", {"name": "chapter-night.jpg", "mimeType": "image/jpeg", "buffer": JPEG})
        pg.wait_for_function("!document.querySelector('#drawer-body .upload-wrap button').disabled", timeout=8000)
        committed = [x for x in state()["ghPuts"] if x.startswith("uploads/")]
        ok("the upload committed one image under uploads/", len(committed) == 1, committed)
        ok("the editor showed no error", not alerts, alerts)
        ok("the file box can't be typed into (an officer once typed a caption there)", not pg.is_editable("#drawer-body input.input >> nth=0"))
        ok("the editor says the photo isn't published until Save", "Save changes" in pg.inner_text("#status"), pg.inner_text("#status"))
        pg.click("#drawer-close"); pg.wait_for_timeout(300)
        can_save = pg.is_enabled("#save")
        ok("Save changes is offered (the photo counts as a change)", can_save)
        if can_save:
            pg.click("#save"); pg.wait_for_function("document.querySelector('#save').textContent === 'Save changes'", timeout=8000)
        saves = state()["saves"]
        ok("Save was sent", len(saves) == 1, len(saves))
        want = committed[0] if committed else None
        gal = next(pg_ for pg_ in saves[0]["content"]["pages"] if pg_["slug"] == "gallery") if saves else {"sections": []}
        items = [i for sec in gal["sections"] for blk in sec["blocks"] if blk["type"] == "gallery" for i in blk["items"]]
        ok("the saved gallery holds the uploaded photo, not a blank entry", want and any(i.get("src") == want for i in items), [i.get("src") for i in items][-3:])
        pg.close()

        # ---------- one file of each kind through "Choose a photo…" ----------

        def pick(name, mime, data):
            """A fresh editor; one file into a gallery photo's picker; wait until the button is back to normal."""
            pg = b.new_page(viewport={"width": 1400, "height": 900})
            seen = {"alerts": [], "urls": []}
            pg.on("dialog", lambda d: (seen["alerts"].append(d.message), d.dismiss()))
            pg.on("request", lambda r: seen["urls"].append(r.url))
            pg.goto(BASE + "/admin/"); pg.wait_for_selector("#app:not([hidden])")
            pg.select_option("#page-select", label="Gallery"); pg.wait_for_timeout(600)
            pg.frame_locator("iframe").locator("[data-item]").first.click()
            pg.click("text=+ Add another photo")
            pg.evaluate("""() => { window.__labels = []; const btn = document.querySelector('#drawer-body .upload-wrap button');
                new MutationObserver((rs) => rs.forEach((r) => r.addedNodes.forEach((n) => window.__labels.push(n.textContent)))).observe(btn, { childList: true }); }""")
            n, m = len(state()["ghPuts"]), len(state()["uploads"])
            pg.set_input_files("#drawer-body input[type=file]", {"name": name, "mimeType": mime, "buffer": data})
            pg.wait_for_function("""() => { const l = window.__labels, btn = document.querySelector('#drawer-body .upload-wrap button');
                return l.length >= 2 && l[l.length - 1] === 'Choose a photo…' && !btn.disabled; }""", timeout=90000)
            now = state(); puts = [x for x in now["ghPuts"][n:] if x.startswith("uploads/")]
            seen.update(sent=now["uploads"][m:], landed=[(x, urllib.request.urlopen(BASE + "/__file?path=" + urllib.parse.quote(x)).read()) for x in puts],
                        labels=pg.evaluate("window.__labels"), status=pg.inner_text("#status"), svg_ran=pg.evaluate("!!window.__svgRan"),
                        decoders=[u for u in seen["urls"] if DECODER.search(u)])
            pg.close()
            return seen

        def lands(label, r, size=None, kind=None, same=None, alpha=False):
            one = r["landed"][0][1] if len(r["landed"]) == 1 else b""
            ok(f"{label}: lands, one commit, no error", len(r["landed"]) == 1 and not r["alerts"], (len(r["landed"]), r["alerts"]))
            if not one: return None
            im = Image.open(io.BytesIO(one)); ext = r["landed"][0][0].rsplit(".", 1)[-1]
            ok(f"{label}: a {kind or 'JPG/PNG/WebP'} of {len(one) / 1e6:.2f} MB (limit 6 MB), long edge {max(im.size)} ≤ 2400",
               fmt(one) in ((kind,) if kind else ("jpeg", "png", "webp")) and len(one) <= 6 * 1024 * 1024 and max(im.size) <= 2400
               and {"jpg": "jpeg"}.get(ext, ext) == fmt(one), (fmt(one), len(one), im.size, ext))
            ok(f"{label}: upright, {size[0]}x{size[1]}" if size else f"{label}: upright",
               is_upright(im) and (not size or im.size == size) and im.getexif().get(274, 1) == 1, (im.size, im.getexif().get(274)))
            if same is not None: ok(f"{label}: uploaded byte-for-byte unchanged", one == same, (len(one), len(same)))
            if alpha: ok(f"{label}: its see-through parts stay see-through", im.convert("RGBA").getpixel((1, 1))[3] == 0, im.mode)
            return r

        def refused(label, r, said):
            ok(f"{label}: says “{said[:60]}…”", len(r["alerts"]) == 1 and said in r["alerts"][0], r["alerts"])
            ok(f"{label}: nothing is uploaded", not r["sent"] and not r["landed"], (r["sent"], [x for x, _ in r["landed"]]))

        heic_text = "This photo is in Apple’s HEIC format, which this browser can’t open. Try uploading from Safari, or export it from Photos as a JPEG and try again."
        raw_text = "This is a camera RAW file. Export it as a JPEG first."

        big = camera_jpeg()
        assert 8e6 < len(big) < 11e6, len(big)   # the fixture really is a ~9 MB photo, over the endpoint's 6 MB
        r = lands("camera JPEG, 9 MB, 6000x4000", pick("IMG_1201.JPG", "image/jpeg", big), (2400, 1600), "jpeg")
        if r:
            ok("camera JPEG: the button read “Preparing photo…” while it worked", "Preparing photo…" in r["labels"], r["labels"])
            ok("camera JPEG: no HEIC/TIFF decoder was fetched", not r["decoders"], r["decoders"])

        sideways = Image.Exif(); sideways[274] = 6
        lands("phone JPEG stored sideways (EXIF orientation 6)",
              pick("IMG_1202.JPG", "image/jpeg", encode(turned(layout(3024, 4032)), "JPEG", quality=90, exif=sideways.tobytes())), (1800, 2400), "jpeg")

        logo = encode(layout(400, 300, alpha=True), "PNG")
        lands("small PNG logo with see-through parts", pick("logo.png", "image/png", logo), (400, 300), "png", same=logo, alpha=True)

        small = encode(layout(800, 600), "JPEG", quality=90)
        r = lands("JPEG labelled image/pjpeg, named .jfif", pick("scan.jfif", "image/pjpeg", small), (800, 600), "jpeg", same=small)
        if r: ok("small JPEG: no decoder was fetched for it, or for the editor itself", not r["decoders"], r["decoders"])

        webp = encode(layout(800, 600), "WEBP", quality=90)
        lands("WebP named .jpg and labelled image/jpeg", pick("download.jpg", "image/jpeg", webp), (800, 600), "webp", same=webp)

        r = lands("iPhone HEIC, no type given, turned by irot", pick("IMG_0412.HEIC", "", heic(turned(layout(720, 960)), irot=3)), (720, 960))
        if r: ok("HEIC: fetched the HEIC decoder, and only that", r["decoders"] and all("/libheif" in u for u in r["decoders"]), r["decoders"])

        refused("a HEIC the decoder can't read either", pick("IMG_0413.HEIC", "image/heic", FAKE_HEIC), heic_text)

        lands("AVIF", pick("photo.avif", "image/avif", encode(layout(1600, 1200), "AVIF", quality=80)), (1600, 1200))

        r = lands("animated GIF (lands as its first frame)", pick("party.gif", "image/gif", gif_two_frames()), (500, 400))
        if r: ok("animated GIF: the editor says only the first frame is used", "first frame" in r["status"], r["status"])

        lands("BMP", pick("flyer.bmp", "image/bmp", encode(layout(640, 480), "BMP")), (640, 480))

        r = lands("TIFF, Deflate-compressed, Orientation 6", pick("scan.tif", "image/tiff",
                  encode(turned(layout(900, 1200)), "TIFF", compression="tiff_adobe_deflate", tiffinfo={274: 6})), (900, 1200))
        if r: ok("TIFF: fetched the TIFF decoder (UTIF + pako), not the HEIC one", r["decoders"] and all(re.search("/(utif|pako)", u) for u in r["decoders"]), r["decoders"])

        lands("ICO with see-through corners", pick("favicon.ico", "image/x-icon",
              encode(layout(256, 256, alpha=True), "ICO", sizes=[(256, 256), (48, 48), (16, 16)])), (256, 256), alpha=True)

        r = pick("logo.svg", "image/svg+xml", SVG)
        lands("SVG logo (with a script inside)", r, (2400, 1800), alpha=True)
        ok("SVG: never sent as SVG (an upload went out, and the endpoint received no SVG)", r["sent"] and not any(
           "svg" in (s["type"] or "") or re.search(r"<\?xml|<svg|<script", s["head"], re.I) for s in r["sent"]), r["sent"])
        ctl = b.new_page(); ctl.set_content("<!doctype html>" + SVG.decode().split("?>", 1)[1])
        ok("SVG: its script never ran here (control: the same SVG does run when placed in a page)", not r["svg_ran"] and ctl.evaluate("window.__svgRan === 1"), (r["svg_ran"], ctl.evaluate("window.__svgRan")))
        ctl.close()

        refused("Nikon RAW (.NEF)", pick("DSC_0001.NEF", "image/x-nikon-nef", NEF), raw_text)
        refused("Canon RAW named photo.jpg, labelled image/jpeg", pick("photo.jpg", "image/jpeg", CR2), raw_text)

        site = b.new_page(); urls = []; site.on("request", lambda q: urls.append(q.url))
        loaded = site.goto(BASE + "/gallery.html"); site.wait_for_load_state("load")
        ok("a visitor's page loads (it fetched the page and its files)", loaded.ok and len(urls) > 1, (loaded.status, urls))
        ok("a visitor's page fetches no decoder (and no editor code)", not [u for u in urls if DECODER.search(u) or "/admin/" in u], [u for u in urls if DECODER.search(u) or "/admin/" in u])
        site.close()
        b.close()
finally:
    srv.terminate()
print("ALL PASS" if not fails else f"{fails} FAILED"); sys.exit(1 if fails else 0)
