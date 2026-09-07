// components/content/OfficerCard.jsx
try { (() => {
const css = `
.wcaa-off{text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px}
.wcaa-off__photo{width:96px;height:96px;border-radius:var(--radius-round);overflow:hidden;background:var(--blue-100);border:1px solid var(--blue-200);display:flex;align-items:center;justify-content:center;margin-bottom:var(--space-3)}
.wcaa-off__photo>*{width:100%;height:100%;object-fit:cover}
.wcaa-off__init{font-family:var(--font-display);font-size:30px;color:var(--blue-800)}
.wcaa-off__name{font-family:var(--font-display);font-size:var(--text-lg);color:var(--text-heading)}
.wcaa-off__role{font:600 11px/1.2 var(--font-body);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--gold-600)}
.wcaa-off__contact{font-size:13px;color:var(--text-muted);margin-top:4px;display:flex;flex-direction:column;gap:2px}
.wcaa-off__contact a{color:var(--link)}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-officercard")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-officercard";
  s.textContent = css;
  document.head.appendChild(s);
}
function OfficerCard({
  name,
  role,
  phone,
  email,
  photo,
  style
}) {
  const initials = (name || "").split(/\s+/).map(w => w[0]).slice(0, 2).join("");
  return /*#__PURE__*/React.createElement("div", {
    className: "wcaa-off",
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: "wcaa-off__photo"
  }, photo ? photo : /*#__PURE__*/React.createElement("span", {
    className: "wcaa-off__init"
  }, initials)), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-off__name"
  }, name), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-off__role"
  }, role), phone || email ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-off__contact"
  }, phone ? /*#__PURE__*/React.createElement("a", {
    href: `tel:${phone.replace(/[^+\d]/g, "")}`
  }, phone) : null, email ? /*#__PURE__*/React.createElement("a", {
    href: `mailto:${email}`
  }, email) : null) : null);
}
Object.assign(__ds_scope, { OfficerCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/OfficerCard.jsx", error: String((e && e.message) || e) }); }
