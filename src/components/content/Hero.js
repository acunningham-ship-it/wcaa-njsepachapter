// components/content/Hero.jsx
try { (() => {
const css = `
.wcaa-hero{position:relative;overflow:hidden;background:linear-gradient(160deg,var(--blue-900),var(--blue-950));display:flex;align-items:center;justify-content:center;text-align:center}
.wcaa-hero__media{position:absolute;inset:0}
.wcaa-hero__media>*{width:100%;height:100%;object-fit:cover;display:block}
.wcaa-hero__ovl{position:absolute;inset:0;background:var(--overlay-hero);pointer-events:none}
.wcaa-hero__in{position:relative;max-width:820px;padding:var(--space-16) var(--space-6);display:flex;flex-direction:column;align-items:center;gap:var(--space-5)}
.wcaa-hero__kicker{font:600 13px/1 var(--font-body);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--gold-300)}
.wcaa-hero__title{font-family:var(--font-display);font-weight:400;color:#fff;font-size:var(--text-4xl);line-height:var(--leading-tight);margin:0;text-wrap:balance}
.wcaa-hero--page .wcaa-hero__title{font-size:var(--text-3xl)}
.wcaa-hero__rule{width:var(--rule-w);height:var(--rule-h);background:var(--gold-400)}
.wcaa-hero__sub{font-size:var(--text-lg);line-height:1.55;color:#dbe7f2;margin:0;max-width:640px;text-wrap:pretty}
.wcaa-hero__actions{display:flex;gap:var(--space-4);flex-wrap:wrap;justify-content:center;margin-top:var(--space-2)}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-hero")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-hero";
  s.textContent = css;
  document.head.appendChild(s);
}
function Hero({
  variant = "full",
  kicker,
  title,
  subtitle,
  actions,
  media,
  minHeight,
  style
}) {
  const h = minHeight != null ? minHeight : variant === "page" ? 240 : 540;
  return /*#__PURE__*/React.createElement("section", {
    className: `wcaa-hero wcaa-hero--${variant}`,
    style: {
      minHeight: h,
      ...style
    }
  }, media ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-hero__media"
  }, media) : null, /*#__PURE__*/React.createElement("div", {
    className: "wcaa-hero__ovl"
  }), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-hero__in"
  }, kicker ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-hero__kicker"
  }, kicker) : null, /*#__PURE__*/React.createElement("h1", {
    className: "wcaa-hero__title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-hero__rule"
  }), subtitle ? /*#__PURE__*/React.createElement("p", {
    className: "wcaa-hero__sub"
  }, subtitle) : null, actions ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-hero__actions"
  }, actions) : null));
}
Object.assign(__ds_scope, { Hero });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Hero.jsx", error: String((e && e.message) || e) }); }
