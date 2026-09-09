#!/usr/bin/env node
/**
 * Guards the github.io -> wcaa-njsepachapter.com canonical redirect.
 *
 * ⛔ WHY THIS EXISTS AT ALL. The two URLs are ONE branch: GitHub Pages serves master, and
 * Cloudflare Pages deploys the same master. So a naive redirect in the site's HTML runs on BOTH
 * and points the .com at itself — an infinite loop on a live client site. The redirect is
 * therefore hostname-GUARDED, and the guard is the only thing standing between "fixes a confusing
 * URL" and "takes the site down". That deserves a test.
 *
 * ⛔ It evaluates the REAL snippet lifted out of index.html — not a copy of the logic. A copy
 * agreeing with itself proves nothing about what ships; the whole point is to assert the deployed
 * bytes behave, so editing the page and forgetting this file cannot pass.
 *
 *   node canonical-redirect.test.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { runInNewContext } from "node:vm";

const PAGES = ["index.html", "about.html", "contact.html", "events.html", "gallery.html", "join.html", "404.html"];
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { ok ? pass++ : fail++; console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${detail ? `  [${detail}]` : ""}`); };

// ── lift the real snippet out of the real page ───────────────────────────────────────────────
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const m = html.match(/<script>\s*\(function\(\)\{[\s\S]*?__wcaaRedirectTarget[\s\S]*?\}\)\(\);\s*<\/script>/);
if (!m) { console.log("  FAIL could not find the redirect snippet in index.html"); process.exit(1); }
const js = m[0].replace(/^<script>/, "").replace(/<\/script>$/, "");

const sandbox = { window: {} };            // no `location` -> the self-executing half is inert
runInNewContext(js, sandbox);
const target = sandbox.window.__wcaaRedirectTarget;
check("the real snippet exposes its mapping function", typeof target === "function");

const MIRROR = "acunningham-ship-it.github.io";

console.log("\nA. the mirror redirects, path-mapped");
check("mirror root -> canonical root",
  target(MIRROR, "/wcaa-njsepachapter/", "", "") === "https://wcaa-njsepachapter.com/",
  target(MIRROR, "/wcaa-njsepachapter/", "", ""));
check("mirror deep link keeps its page",
  target(MIRROR, "/wcaa-njsepachapter/about.html", "", "") === "https://wcaa-njsepachapter.com/about.html");
check("no trailing slash still maps to root",
  target(MIRROR, "/wcaa-njsepachapter", "", "") === "https://wcaa-njsepachapter.com/");
check("query + hash are preserved",
  target(MIRROR, "/wcaa-njsepachapter/events.html", "?y=2026", "#june") === "https://wcaa-njsepachapter.com/events.html?y=2026#june");
// ⛔ A redirect to the BARE domain would dump every bookmarked deep link on the homepage — the
// second failure hiding behind the first. This is the assertion that catches it.
check("a deep link does NOT collapse to the homepage",
  target(MIRROR, "/wcaa-njsepachapter/gallery.html", "", "") !== "https://wcaa-njsepachapter.com/");

console.log("\nB. ⛔ THE LOOP GUARD — the canonical host must NEVER redirect");
for (const [host, why] of [
  ["wcaa-njsepachapter.com", "the canonical domain itself — same file, so an unguarded redirect loops it"],
  ["www.wcaa-njsepachapter.com", "the www form"],
  ["localhost", "local preview"],
  ["127.0.0.1", "local preview by ip"],
  ["", "no hostname (file://)"],
]) check(`${host || "(empty)"} does NOT redirect — ${why}`, target(host, "/", "", "") === null);

console.log("\nC. the snippet is on every page (a bookmark can point at any of them)");
for (const p of PAGES) {
  const s = readFileSync(new URL(`./${p}`, import.meta.url), "utf8");
  check(`${p} carries the redirect`, s.includes("__wcaaRedirectTarget"));
  // it must run BEFORE the body renders, or the mirror flashes a full page before leaving
  check(`${p} has it inside <head>`, s.indexOf("__wcaaRedirectTarget") < s.indexOf("</head>"));
}

console.log("\nD. the README no longer advertises the mirror as the live address");
const readme = readFileSync(new URL("./README.md", import.meta.url), "utf8");
const liveLine = readme.split("\n").find((l) => /^Live:/i.test(l.trim())) || "";
check("README Live: points at the canonical domain", /wcaa-njsepachapter\.com/.test(liveLine), liveLine.trim() || "(no Live: line)");
check("...and not at the github.io mirror", !/github\.io/.test(liveLine), liveLine.trim());

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
