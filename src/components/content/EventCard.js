// components/content/EventCard.jsx
try { (() => {
const css = `
.wcaa-ev{display:flex;background:var(--surface-card);border-radius:var(--radius-md);box-shadow:var(--shadow-card);overflow:hidden;text-align:left;transition:box-shadow var(--dur) var(--ease-out),transform var(--dur) var(--ease-out)}
.wcaa-ev--link:hover{box-shadow:var(--shadow-lift);transform:translateY(-2px)}
.wcaa-ev__date{flex:none;width:96px;background:var(--surface-tint);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:var(--space-4)}
.wcaa-ev__mo{font:600 12px/1 var(--font-body);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--blue-700)}
.wcaa-ev__day{font-family:var(--font-display);font-size:36px;line-height:1;color:var(--blue-900)}
.wcaa-ev__body{padding:var(--space-5) var(--space-6);display:flex;flex-direction:column;gap:6px;min-width:0}
.wcaa-ev__title{font-family:var(--font-display);font-weight:400;font-size:var(--text-xl);color:var(--text-heading);margin:0}
.wcaa-ev__meta{font-size:var(--text-sm);color:var(--text-muted)}
.wcaa-ev__desc{font-size:15px;line-height:1.55;color:var(--text-body);margin:2px 0 0}
.wcaa-ev__link{font:600 13px/1 var(--font-body);letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--color-primary);text-decoration:none;margin-top:var(--space-2);align-self:flex-start}
.wcaa-ev__link:hover{color:var(--link-hover)}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-eventcard")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-eventcard";
  s.textContent = css;
  document.head.appendChild(s);
}
function EventCard({
  month,
  day,
  title,
  badge,
  time,
  location,
  description,
  href,
  linkLabel = "Event Details",
  onClick,
  style
}) {
  const meta = [time, location].filter(Boolean).join(" · ");
  return /*#__PURE__*/React.createElement("article", {
    className: `wcaa-ev${href ? " wcaa-ev--link" : ""}`,
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: "wcaa-ev__date"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wcaa-ev__mo"
  }, month), /*#__PURE__*/React.createElement("span", {
    className: "wcaa-ev__day"
  }, day)), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-ev__body"
  }, badge ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.Badge, null, badge)) : null, /*#__PURE__*/React.createElement("h3", {
    className: "wcaa-ev__title"
  }, title), meta ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-ev__meta"
  }, meta) : null, description ? /*#__PURE__*/React.createElement("p", {
    className: "wcaa-ev__desc"
  }, description) : null, href ? /*#__PURE__*/React.createElement("a", {
    className: "wcaa-ev__link",
    href: href,
    onClick: onClick
  }, linkLabel, " \u2192") : null));
}
Object.assign(__ds_scope, { EventCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/EventCard.jsx", error: String((e && e.message) || e) }); }
