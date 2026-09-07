// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const css = `
.wcaa-field{display:flex;flex-direction:column;gap:6px;font-family:var(--font-body)}
.wcaa-field__label{font:600 13px/1.2 var(--font-body);color:var(--text-heading)}
.wcaa-field__req{color:var(--color-error)}
.wcaa-field__input{font:400 15px/1.4 var(--font-body);color:var(--text-heading);background:var(--surface-card);border:1px solid var(--border-strong);border-radius:var(--radius-xs);padding:11px 14px;transition:border-color var(--dur-fast) var(--ease-out),box-shadow var(--dur-fast) var(--ease-out);width:100%;box-sizing:border-box}
.wcaa-field__input::placeholder{color:var(--neutral-400)}
.wcaa-field__input:hover{border-color:var(--neutral-400)}
.wcaa-field__input:focus{outline:none;border-color:var(--color-primary);box-shadow:var(--focus-ring)}
.wcaa-field--error .wcaa-field__input{border-color:var(--color-error)}
.wcaa-field__msg{font-size:13px;color:var(--text-muted)}
.wcaa-field--error .wcaa-field__msg{color:var(--color-error)}
.wcaa-field__input[disabled]{background:var(--neutral-100);color:var(--text-muted);cursor:not-allowed}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-input")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-input";
  s.textContent = css;
  document.head.appendChild(s);
}
function Input({
  label,
  required = false,
  error,
  helper,
  id,
  style,
  ...rest
}) {
  const auto = React.useId();
  const inputId = id || auto;
  return /*#__PURE__*/React.createElement("div", {
    className: `wcaa-field${error ? " wcaa-field--error" : ""}`,
    style: style
  }, label ? /*#__PURE__*/React.createElement("label", {
    className: "wcaa-field__label",
    htmlFor: inputId
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    className: "wcaa-field__req"
  }, "*") : null) : null, /*#__PURE__*/React.createElement("input", _extends({
    className: "wcaa-field__input",
    id: inputId,
    required: required
  }, rest)), error || helper ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-field__msg"
  }, error || helper) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }
