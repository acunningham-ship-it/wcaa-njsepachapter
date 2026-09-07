// components/navigation/NavBar.jsx
try { (() => {
const css = `
.wcaa-nav{background:var(--surface-card);border-bottom:1px solid var(--border-subtle);position:sticky;top:0;z-index:50}
.wcaa-nav__in{max-width:var(--container-max);margin:0 auto;padding:0 var(--space-6);height:76px;display:flex;align-items:center;gap:var(--space-6)}
.wcaa-nav__brand{display:flex;align-items:center;gap:14px;text-decoration:none;flex:none}
.wcaa-nav__brand:hover{text-decoration:none}
.wcaa-nav__mark{font-family:var(--font-display);font-size:30px;letter-spacing:.05em;color:var(--blue-900);line-height:1}
.wcaa-nav__div{width:1px;height:34px;background:var(--gold-400)}
.wcaa-nav__sub{font:600 10.5px/1.35 var(--font-body);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--text-muted);max-width:210px}
.wcaa-nav__links{display:flex;align-items:center;gap:var(--space-6);margin-left:auto}
.wcaa-nav__link{font:600 13px/1 var(--font-body);letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--text-heading);text-decoration:none;padding:6px 0;border-bottom:2px solid transparent;transition:color var(--dur-fast) var(--ease-out)}
.wcaa-nav__link:hover{color:var(--color-primary);text-decoration:none}
.wcaa-nav__link--active{color:var(--color-primary);border-bottom-color:var(--gold-500)}
.wcaa-nav__burger{display:none;margin-left:auto;background:none;border:0;cursor:pointer;padding:10px;flex-direction:column;gap:5px}
.wcaa-nav__burger span{display:block;width:22px;height:2px;background:var(--blue-900)}
.wcaa-nav__sheet{display:none}
@media (max-width:920px){
.wcaa-nav__links{display:none}
.wcaa-nav__burger{display:flex}
.wcaa-nav__sheet{display:flex;flex-direction:column;background:var(--surface-card);border-bottom:1px solid var(--border-subtle);padding:var(--space-2) var(--space-6) var(--space-6)}
.wcaa-nav__sheet .wcaa-nav__link{padding:14px 0;border-bottom:1px solid var(--neutral-100);font-size:14px}
}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-navbar")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-navbar";
  s.textContent = css;
  document.head.appendChild(s);
}
function NavBar({
  links = [],
  activeHref,
  onNavigate,
  cta = {
    label: "Join / Renew",
    href: "#join"
  },
  brandSub = "New Jersey & Southeastern Pennsylvania Chapter",
  homeHref = "#home"
}) {
  const [open, setOpen] = React.useState(false);
  const go = href => e => {
    if (onNavigate) {
      e.preventDefault();
      setOpen(false);
      onNavigate(href);
    }
  };
  const link = l => /*#__PURE__*/React.createElement("a", {
    key: l.href,
    className: `wcaa-nav__link${l.href === activeHref ? " wcaa-nav__link--active" : ""}`,
    href: l.href,
    onClick: go(l.href)
  }, l.label);
  return /*#__PURE__*/React.createElement("nav", {
    className: "wcaa-nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wcaa-nav__in"
  }, /*#__PURE__*/React.createElement("a", {
    className: "wcaa-nav__brand",
    href: homeHref,
    onClick: go(homeHref)
  }, /*#__PURE__*/React.createElement("span", {
    className: "wcaa-nav__mark"
  }, "WCAA"), /*#__PURE__*/React.createElement("span", {
    className: "wcaa-nav__div"
  }), /*#__PURE__*/React.createElement("span", {
    className: "wcaa-nav__sub"
  }, brandSub)), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-nav__links"
  }, links.map(link), cta ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "gold",
    size: "sm",
    href: cta.href,
    onClick: go(cta.href)
  }, cta.label) : null), /*#__PURE__*/React.createElement("button", {
    className: "wcaa-nav__burger",
    "aria-label": "Menu",
    onClick: () => setOpen(!open)
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null))), open ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-nav__sheet"
  }, links.map(link), cta ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "gold",
    size: "sm",
    href: cta.href,
    onClick: go(cta.href),
    style: {
      marginTop: 12
    }
  }, cta.label) : null) : null);
}
Object.assign(__ds_scope, { NavBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavBar.jsx", error: String((e && e.message) || e) }); }
