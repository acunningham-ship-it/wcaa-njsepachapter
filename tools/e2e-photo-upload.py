#!/usr/bin/env python3
"""E2E: an officer adds a photo to the Gallery in the real editor and presses Save -> the saved content holds that photo.
Real admin/app.js in real Chromium; /api/upload is the real functions/api/upload.js (GitHub faked), /api/save is recorded.
Run: python3 tools/e2e-photo-upload.py   (needs python playwright + node). Exit 0 = pass.
Why it exists: 2026-10-18, photos "added" in the editor were committed to uploads/ but never reached the page (the editor read
body.path, the endpoint answers body.src, so the field was set to undefined and the blank entry was pruned on Save)."""
import json, os, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
PORT = 8799
BASE = f"http://127.0.0.1:{PORT}"
JPEG = bytes([0xFF, 0xD8, 0xFF, 0xE0]) + b"\x00" * 64   # passes the endpoint's magic-byte check; the preview doesn't need to decode it
fails = 0


def ok(name, cond, got=""):
    global fails
    print(("  ok  " if cond else "  FAIL ") + name + ("" if cond else f"  -> {got}"))
    fails += not cond


srv = subprocess.Popen(["node", os.path.join(ROOT, "tools", "e2e-server.mjs"), str(PORT)])
try:
    for _ in range(50):
        try: urllib.request.urlopen(BASE + "/api/session"); break
        except Exception: time.sleep(0.1)
    state = lambda: json.load(urllib.request.urlopen(BASE + "/__state"))
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1400, "height": 900})
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
        b.close()
finally:
    srv.terminate()
print("ALL PASS" if not fails else f"{fails} FAILED"); sys.exit(1 if fails else 0)
