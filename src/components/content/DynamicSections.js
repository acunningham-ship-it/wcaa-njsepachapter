// components/content/DynamicSections.jsx
try { (() => {
const css = `
.wcaa-dyn__block+.wcaa-dyn__block{margin-top:var(--space-4)}
.wcaa-dyn__text{color:var(--text-body);max-width:var(--prose-max);margin-inline:auto;text-align:center}
.wcaa-dyn__h{font-family:var(--font-display);font-size:var(--text-xl);color:var(--text-strong);text-align:center;margin:var(--space-6) 0 var(--space-2)}
.wcaa-dyn__img{display:block;max-width:100%;height:auto;margin:var(--space-4) auto 0;border-radius:var(--radius-lg)}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-dynamicsections")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-dynamicsections";
  s.textContent = css;
  document.head.appendChild(s);
}

// Officer-editable content, added through the admin panel and stored in Supabase.
//
// ⛔ This component must NEVER be able to break the site. Everything the chapter
// already has is static and lives in the components around it; this only ADDS
// sections. Unconfigured, offline, slow, malformed response, empty table — every
// one of those paths returns null and the page renders exactly as it would have.
// That is deliberate: a CMS outage must not take a client's website down.
const CFG = () => (typeof window !== "undefined" && window.WCAA_SUPABASE) || null;

// Matches the pinned schema exactly — sections(id,title,position,visible,updated_at)
// and blocks(id,section_id,type,position,content,image_path,alt,updated_at). One
// request with an embedded join rather than N+1.
const QUERY =
  "/rest/v1/sections?select=id,title,position,visible," +
  "blocks(id,type,position,content,image_path,alt)" +
  "&visible=is.true&order=position.asc";

function imageUrl(cfg, path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;           // already absolute
  return cfg.url.replace(/\/+$/, "") +
    "/storage/v1/object/public/chapter-images/" +
    path.split("/").map(encodeURIComponent).join("/");
}

function DynamicSections() {
  const [sections, setSections] = React.useState(null);

  React.useEffect(() => {
    const cfg = CFG();
    if (!cfg || !cfg.url || !cfg.anonKey) return;        // not wired up yet — render nothing
    let cancelled = false;
    // Bounded: a hanging CMS must not leave the page waiting on it.
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 6000);

    fetch(cfg.url.replace(/\/+$/, "") + QUERY, {
      headers: { apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey },
      signal: ctrl ? ctrl.signal : undefined
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((rows) => {
        if (cancelled) return;
        setSections(Array.isArray(rows) ? rows : null);
      })
      .catch(() => { /* offline, aborted, 4xx, bad JSON — all mean "render nothing" */ })
      .finally(() => clearTimeout(timer));

    return () => { cancelled = true; clearTimeout(timer); if (ctrl) ctrl.abort(); };
  }, []);

  if (!sections || !sections.length) return null;
  const cfg = CFG();

  return sections.map((sec, i) => {
    const blocks = (sec.blocks || [])
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    if (!sec.title && !blocks.length) return null;

    return /*#__PURE__*/ React.createElement(
      __ds_scope.Section,
      { key: sec.id || i, tint: i % 2 === 1 },
      sec.title
        ? /*#__PURE__*/ React.createElement(__ds_scope.SectionHeading, {
            kicker: "Chapter",
            title: sec.title,
            style: { marginBottom: "var(--space-6)" }
          })
        : null,
      blocks.map((b, j) => {
        const key = b.id || j;
        if (b.type === "heading") {
          return /*#__PURE__*/ React.createElement(
            "h3", { key: key, className: "wcaa-dyn__block wcaa-dyn__h" }, b.content || "");
        }
        if (b.type === "image") {
          const src = imageUrl(cfg, b.image_path);
          if (!src) return null;
          return /*#__PURE__*/ React.createElement("img", {
            key: key,
            className: "wcaa-dyn__block wcaa-dyn__img",
            src: src,
            // alt is authored in the admin panel; "" is a valid decorative value,
            // so only fall back when it is genuinely absent.
            alt: typeof b.alt === "string" ? b.alt : "",
            loading: "lazy",
            // A deleted or failed upload would otherwise render the browser's
            // broken-image icon on a client's live site. Hide it instead — the
            // rest of the section still reads fine without it. Verified against
            // a 404ing image URL: the element ends up display:none.
            onError: (e) => { e.currentTarget.style.display = "none"; }
          });
        }
        // default: text. Rendered as TEXT, never innerHTML — officer input is not
        // trusted markup and must not be able to inject script into the page.
        return /*#__PURE__*/ React.createElement(
          "p", { key: key, className: "wcaa-dyn__block wcaa-dyn__text" }, b.content || "");
      })
    );
  });
}
Object.assign(__ds_scope, { DynamicSections });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/DynamicSections.jsx", error: String((e && e.message) || e) }); }
