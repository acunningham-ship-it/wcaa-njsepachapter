// components/forms/TextArea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TextArea({
  label,
  required = false,
  error,
  helper,
  id,
  rows = 4,
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
  }, "*") : null) : null, /*#__PURE__*/React.createElement("textarea", _extends({
    className: "wcaa-field__input",
    id: inputId,
    rows: rows,
    required: required,
    style: {
      resize: "vertical"
    }
  }, rest)), error || helper ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-field__msg"
  }, error || helper) : null);
}
Object.assign(__ds_scope, { TextArea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextArea.jsx", error: String((e && e.message) || e) }); }
