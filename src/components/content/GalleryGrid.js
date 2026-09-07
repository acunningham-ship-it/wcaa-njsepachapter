// components/content/GalleryGrid.jsx
try { (() => {
const css = `
.wcaa-gal{display:grid;gap:var(--space-4)}
.wcaa-gal__item{display:flex;flex-direction:column;gap:8px;min-width:0}
.wcaa-gal__ph{position:relative;border-radius:var(--radius-lg);overflow:hidden;background:var(--blue-100)}
.wcaa-gal__ph>img,.wcaa-gal__ph>image-slot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.wcaa-gal__empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;font:600 12px/1.5 var(--font-body);letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--blue-400)}
.wcaa-gal__cap{font-size:13px;color:var(--text-muted);text-align:center}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-gallerygrid")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-gallerygrid";
  s.textContent = css;
  document.head.appendChild(s);
}
function GalleryGrid({
  items = [],
  columns = 3,
  aspect = "4 / 3",
  slots = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "wcaa-gal",
    style: {
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      ...style
    }
  }, items.map(it => /*#__PURE__*/React.createElement("figure", {
    key: it.id,
    className: "wcaa-gal__item",
    style: {
      margin: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wcaa-gal__ph",
    style: {
      aspectRatio: aspect
    }
  }, slots ? React.createElement("image-slot", {
    id: it.id,
    placeholder: it.alt,
    src: it.src
  }) : it.src ? /*#__PURE__*/React.createElement("img", {
    src: it.src,
    alt: it.alt || ""
  }) : /*#__PURE__*/React.createElement("span", {
    className: "wcaa-gal__empty"
  }, it.alt || "Photo")), it.caption ? /*#__PURE__*/React.createElement("figcaption", {
    className: "wcaa-gal__cap"
  }, it.caption) : null)));
}
Object.assign(__ds_scope, { GalleryGrid });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/GalleryGrid.jsx", error: String((e && e.message) || e) }); }
