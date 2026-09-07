// components/navigation/Footer.jsx
try { (() => {
const css = `
.wcaa-foot{background:var(--surface-footer);color:var(--text-on-dark-muted);text-align:center;padding:var(--space-16) var(--space-6) var(--space-8)}
.wcaa-foot__mark{font-family:var(--font-display);font-size:34px;letter-spacing:.05em;color:#fff;line-height:1}
.wcaa-foot__rule{width:var(--rule-w);height:var(--rule-h);background:var(--gold-400);margin:14px auto}
.wcaa-foot__sub{font:600 11px/1.4 var(--font-body);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--text-on-dark-muted)}
.wcaa-foot__links{display:flex;gap:var(--space-6);justify-content:center;flex-wrap:wrap;margin:var(--space-8) 0}
.wcaa-foot__links a{font:600 12px/1 var(--font-body);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:#dbe7f2;text-decoration:none}
.wcaa-foot__links a:hover{color:var(--gold-300);text-decoration:none}
.wcaa-foot__soc{display:flex;gap:12px;justify-content:center;margin-bottom:var(--space-8)}
.wcaa-foot__soc a{width:42px;height:42px;border-radius:var(--radius-round);border:1px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;color:#fff;transition:background var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out)}
.wcaa-foot__soc a:hover{background:rgba(255,255,255,.12);border-color:#fff;color:#fff}
.wcaa-foot__copy{font-size:13px;color:#8fa5bb;border-top:1px solid rgba(255,255,255,.12);padding-top:var(--space-6);max-width:var(--container-max);margin:0 auto}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-footer")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-footer";
  s.textContent = css;
  document.head.appendChild(s);
}
function Footer({
  brandSub = "New Jersey & Southeastern Pennsylvania Chapter",
  links = [],
  socials = [],
  onNavigate,
  copyright = "Copyright © 2026 Window Coverings Association of America — New Jersey and Southeastern Pennsylvania Chapter — All Rights Reserved."
}) {
  const go = href => e => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(href);
    }
  };
  return /*#__PURE__*/React.createElement("footer", {
    className: "wcaa-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wcaa-foot__mark"
  }, "WCAA"), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-foot__rule"
  }), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-foot__sub"
  }, brandSub), links.length ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-foot__links"
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l.href,
    href: l.href,
    onClick: go(l.href)
  }, l.label))) : null, socials.length ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-foot__soc"
  }, socials.map(s => /*#__PURE__*/React.createElement("a", {
    key: s.label,
    href: s.href,
    "aria-label": s.label,
    target: "_blank",
    rel: "noreferrer"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    src: s.iconSrc,
    size: 18
  })))) : null, /*#__PURE__*/React.createElement("div", {
    className: "wcaa-foot__copy"
  }, copyright));
}
Object.assign(__ds_scope, { Footer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Footer.jsx", error: String((e && e.message) || e) }); }
