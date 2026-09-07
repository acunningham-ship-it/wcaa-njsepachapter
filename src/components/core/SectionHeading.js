// components/core/SectionHeading.jsx
try { (() => {
const css = `
.wcaa-sh{margin:0 0 var(--space-8)}
.wcaa-sh--center{text-align:center}
.wcaa-sh__kicker{font:var(--type-label);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--gold-600);margin-bottom:var(--space-3)}
.wcaa-sh__title{font-family:var(--font-display);font-weight:400;color:var(--text-heading);font-size:var(--text-3xl);line-height:var(--leading-tight);margin:0 0 var(--space-4)}
.wcaa-sh--sm .wcaa-sh__title{font-size:var(--text-2xl)}
.wcaa-sh__rule{width:var(--rule-w);height:var(--rule-h);background:var(--gold-500)}
.wcaa-sh--center .wcaa-sh__rule{margin:0 auto}
.wcaa-sh__lede{font-size:var(--text-md);color:var(--text-muted);max-width:var(--prose-max);margin:var(--space-4) 0 0}
.wcaa-sh--center .wcaa-sh__lede{margin-left:auto;margin-right:auto}
.wcaa-sh--onDark .wcaa-sh__title{color:var(--text-on-dark)}
.wcaa-sh--onDark .wcaa-sh__kicker{color:var(--gold-300)}
.wcaa-sh--onDark .wcaa-sh__lede{color:var(--text-on-dark-muted)}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-sectionheading")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-sectionheading";
  s.textContent = css;
  document.head.appendChild(s);
}
function SectionHeading({
  kicker,
  title,
  lede,
  align = "center",
  size = "md",
  onDark = false,
  style
}) {
  const cls = `wcaa-sh wcaa-sh--${align}${size === "sm" ? " wcaa-sh--sm" : ""}${onDark ? " wcaa-sh--onDark" : ""}`;
  return /*#__PURE__*/React.createElement("div", {
    className: cls,
    style: style
  }, kicker ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-sh__kicker"
  }, kicker) : null, /*#__PURE__*/React.createElement("h2", {
    className: "wcaa-sh__title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-sh__rule"
  }), lede ? /*#__PURE__*/React.createElement("p", {
    className: "wcaa-sh__lede"
  }, lede) : null);
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionHeading.jsx", error: String((e && e.message) || e) }); }
