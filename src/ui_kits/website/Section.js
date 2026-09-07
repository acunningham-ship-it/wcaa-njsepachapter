// ui_kits/website/Section.jsx
try { (() => {
const css = `
.wcaa-sec{padding:var(--space-24) var(--space-6)}
.wcaa-sec--tint{background:var(--surface-tint)}
.wcaa-sec--dark{background:var(--surface-dark)}
.wcaa-sec--tight{padding:var(--space-16) var(--space-6)}
.wcaa-sec__in{max-width:var(--container-max);margin:0 auto}
.wcaa-sec__in--narrow{max-width:var(--prose-max)}
@media (max-width:720px){.wcaa-sec{padding:var(--space-16) var(--space-5)}}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-section")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-section";
  s.textContent = css;
  document.head.appendChild(s);
}
function Section({
  tint = false,
  dark = false,
  tight = false,
  narrow = false,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: `wcaa-sec${tint ? " wcaa-sec--tint" : ""}${dark ? " wcaa-sec--dark" : ""}${tight ? " wcaa-sec--tight" : ""}`,
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: `wcaa-sec__in${narrow ? " wcaa-sec__in--narrow" : ""}`
  }, children));
}
Object.assign(__ds_scope, { Section });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Section.jsx", error: String((e && e.message) || e) }); }
