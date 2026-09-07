// ui_kits/website/ContactPage.jsx
try { (() => {
const IC = "assets/icons/";
const IG = "https://www.instagram.com/wcaasepanjchapter/";
const contactStyles = {
  card: {
    background: "var(--surface-card)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-card)",
    padding: "var(--space-8)"
  },
  row: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: "var(--space-5)",
    fontSize: 15
  },
  ic: {
    color: "var(--blue-700)",
    flex: "none",
    transform: "translateY(2px)"
  },
  ok: {
    background: "var(--surface-success)",
    color: "var(--color-success)",
    borderRadius: "var(--radius-xs)",
    padding: "12px 16px",
    font: "600 14px/1.4 var(--font-body)"
  }
};
function Row({
  icon,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: contactStyles.row
  }, /*#__PURE__*/React.createElement("span", {
    style: contactStyles.ic
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    src: IC + icon,
    size: 18
  })), /*#__PURE__*/React.createElement("span", null, children));
}
function ContactPage() {
  const [sent, setSent] = React.useState(false);
  const submit = e => {
    e.preventDefault();
    setSent(true);
  };
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Contact Us"
  }, /*#__PURE__*/React.createElement(__ds_scope.Hero, {
    variant: "page",
    kicker: "Say Hello",
    title: "Contact Us"
  }), /*#__PURE__*/React.createElement(__ds_scope.Section, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.2fr 1fr",
      gap: "var(--space-16)",
      alignItems: "start",
      maxWidth: 1000,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("form", {
    style: contactStyles.card,
    onSubmit: submit
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: "var(--text-xl)",
      marginBottom: "var(--space-6)"
    }
  }, "We'd like to communicate with you!"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-4)",
      marginBottom: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Input, {
    label: "Name",
    name: "name",
    placeholder: "Your name"
  }), /*#__PURE__*/React.createElement(__ds_scope.Input, {
    label: "Business Name",
    name: "business",
    placeholder: "Workroom or studio"
  }), /*#__PURE__*/React.createElement(__ds_scope.Input, {
    label: "Email",
    name: "email",
    type: "email",
    required: true,
    placeholder: "you@business.com"
  }), /*#__PURE__*/React.createElement(__ds_scope.Input, {
    label: "Telephone #",
    name: "phone",
    type: "tel",
    placeholder: "(555) 555-5555"
  })), /*#__PURE__*/React.createElement(__ds_scope.TextArea, {
    label: "Message",
    name: "message",
    rows: 4,
    placeholder: "How can we help?",
    style: {
      marginBottom: "var(--space-6)"
    }
  }), sent ? /*#__PURE__*/React.createElement("div", {
    style: contactStyles.ok
  }, "Thank you! We've received your message and will be in touch.") : /*#__PURE__*/React.createElement(__ds_scope.Button, {
    type: "submit"
  }, "Send"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      margin: "var(--space-4) 0 0"
    }
  }, "This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.SectionHeading, {
    align: "left",
    size: "sm",
    title: "Chapter Contact",
    lede: "We meet monthly and invite you to contact us about membership."
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "phone.svg"
  }, /*#__PURE__*/React.createElement("strong", null, "Marie Weaverling"), ", Chapter President", /*#__PURE__*/React.createElement("br", null), "(610) 331-5474"), /*#__PURE__*/React.createElement(Row, {
    icon: "instagram.svg"
  }, /*#__PURE__*/React.createElement("a", {
    href: IG,
    target: "_blank",
    rel: "noreferrer"
  }, "@wcaasepanjchapter")), /*#__PURE__*/React.createElement(Row, {
    icon: "map-pin.svg"
  }, "Serving New Jersey & Southeastern Pennsylvania"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "outline",
    size: "sm",
    href: IG
  }, "Follow Our Chapter"))))));
}
Object.assign(__ds_scope, { ContactPage });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ContactPage.jsx", error: String((e && e.message) || e) }); }
