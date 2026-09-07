#!/usr/bin/env python3
"""Rebuild _ds_bundle.js from the editable sources in src/.

No dependencies, no toolchain, no npm — deploying stays `git push`. The bundle
this produces is byte-for-byte identical to the one that was originally shipped
by claude-design, which is what makes the source recovery provably lossless:
`build.py --check` re-derives the bundle and diffs it against the committed one.

Edit the files under src/, run `python3 build.py`, commit both.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "_ds_bundle.js"


def build() -> str:
    header = (SRC / "_header.txt").read_text(encoding="utf-8")
    prologue = (SRC / "_prologue.js").read_text(encoding="utf-8")
    epilogue = (SRC / "_epilogue.js").read_text(encoding="utf-8")
    order = json.loads((SRC / "_order.json").read_text(encoding="utf-8"))

    parts = [header, prologue]
    for path in order:
        f = SRC / path.replace(".jsx", ".js")
        if not f.exists():
            sys.exit(f"ERROR: {f} is listed in _order.json but does not exist")
        parts.append(f.read_text(encoding="utf-8"))
    parts.append(epilogue)
    return "\n".join(parts)


if __name__ == "__main__":
    out = build()
    if "--check" in sys.argv:
        current = OUT.read_text(encoding="utf-8")
        if out == current:
            print(f"OK — rebuild is byte-identical to {OUT.name} ({len(out)} chars)")
        else:
            # Report the first divergence rather than a wall of diff.
            n = min(len(out), len(current))
            i = next((i for i in range(n) if out[i] != current[i]), n)
            print(f"MISMATCH at char {i} (built {len(out)} vs committed {len(current)})")
            print("  built   :", repr(out[max(0, i - 60):i + 60]))
            print("  committed:", repr(current[max(0, i - 60):i + 60]))
            sys.exit(1)
    else:
        OUT.write_text(out, encoding="utf-8")
        print(f"wrote {OUT.name} ({len(out)} chars) from {len(json.loads((SRC / '_order.json').read_text()))} components")
