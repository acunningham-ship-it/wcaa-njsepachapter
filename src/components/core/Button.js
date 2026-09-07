// components/core/Button.jsx
try { (() => {
const css = `
.wcaa-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font-body);font-weight:var(--weight-bold);text-transform:uppercase;letter-spacing:var(--tracking-caps);border-radius:var(--radius-xs);border:1.5px solid transparent;cursor:pointer;text-decoration:none;white-space:nowrap;transition:background var(--dur-fast) var(--ease-out),color var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out)}
.wcaa-btn:hover{text-decoration:none}
.wcaa-btn--md{font-size:13px;padding:11px 24px}
.wcaa-btn--sm{font-size:12px;padding:7px 16px}
.wcaa-btn--lg{font-size:14px;padding:15px 32px}
.wcaa-btn--primary{background:var(--color-primary);color:var(--text-on-primary)}
.wcaa-btn--primary:hover{background:var(--color-primary-hover);color:var(--text-on-primary)}
.wcaa-btn--primary:active{background:var(--color-primary-active)}
.wcaa-btn--outline{background:transparent;color:var(--color-primary);border-color:var(--color-primary)}
.wcaa-btn--outline:hover{background:var(--blue-50);color:var(--color-primary-hover)}
.wcaa-btn--outline:active{background:var(--blue-100)}
.wcaa-btn--gold{background:var(--gold-500);color:var(--blue-950)}
.wcaa-btn--gold:hover{background:var(--gold-400);color:var(--blue-950)}
.wcaa-btn--gold:active{background:var(--gold-600)}
.wcaa-btn--onDark{background:transparent;color:#fff;border-color:rgba(255,255,255,.7)}
.wcaa-btn--onDark:hover{background:rgba(255,255,255,.14);color:#fff;border-color:#fff}
.wcaa-btn--onDark:active{background:rgba(255,255,255,.22)}
.wcaa-btn--full{width:100%}
.wcaa-btn[disabled],.wcaa-btn--disabled{opacity:.45;pointer-events:none}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-button")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-button";
  s.textContent = css;
  document.head.appendChild(s);
}
function Button({
  variant = "primary",
  size = "md",
  href,
  onClick,
  fullWidth = false,
  disabled = false,
  type = "button",
  children,
  style
}) {
  const cls = `wcaa-btn wcaa-btn--${variant} wcaa-btn--${size}${fullWidth ? " wcaa-btn--full" : ""}${disabled ? " wcaa-btn--disabled" : ""}`;
  if (href && !disabled) return /*#__PURE__*/React.createElement("a", {
    className: cls,
    href: href,
    onClick: onClick,
    style: style
  }, children);
  return /*#__PURE__*/React.createElement("button", {
    className: cls,
    type: type,
    onClick: onClick,
    disabled: disabled,
    style: style
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }
