// components/core/Badge.jsx
try { (() => {
const css = `
.wcaa-badge{display:inline-flex;align-items:center;gap:6px;border-radius:var(--radius-round);font:600 11px/1 var(--font-body);letter-spacing:var(--tracking-caps);text-transform:uppercase;padding:6px 12px;border:1px solid transparent}
.wcaa-badge--blue{background:var(--blue-100);color:var(--blue-800);border-color:var(--blue-200)}
.wcaa-badge--gold{background:var(--gold-100);color:var(--gold-800);border-color:var(--gold-300)}
.wcaa-badge--neutral{background:var(--neutral-100);color:var(--neutral-600);border-color:var(--neutral-200)}
.wcaa-badge--success{background:var(--surface-success);color:var(--color-success);border-color:#bfdccb}
.wcaa-badge--onDark{background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.35)}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-badge")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-badge";
  s.textContent = css;
  document.head.appendChild(s);
}
function Badge({
  tone = "blue",
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: `wcaa-badge wcaa-badge--${tone}`,
    style: style
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }
