// components/core/Icon.jsx
try { (() => {
function Icon({
  src,
  size = 20,
  label,
  color,
  style
}) {
  const s = {
    display: "inline-block",
    width: size,
    height: size,
    background: color || "currentColor",
    WebkitMask: `url(${src}) center/contain no-repeat`,
    mask: `url(${src}) center/contain no-repeat`,
    flex: "none",
    ...style
  };
  return /*#__PURE__*/React.createElement("span", {
    role: label ? "img" : undefined,
    "aria-label": label,
    "aria-hidden": label ? undefined : true,
    style: s
  });
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }
