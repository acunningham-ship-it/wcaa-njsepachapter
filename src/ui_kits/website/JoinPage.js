// ui_kits/website/JoinPage.jsx
try { (() => {
const IC = "assets/icons/";
const joinStyles = {
  step: {
    background: "var(--surface-card)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-card)",
    padding: "var(--space-8)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
    alignItems: "flex-start"
  },
  num: {
    width: 44,
    height: 44,
    borderRadius: "var(--radius-round)",
    background: "var(--gold-100)",
    border: "1px solid var(--gold-300)",
    color: "var(--gold-800)",
    fontFamily: "var(--font-display)",
    fontSize: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  h: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-xl)",
    color: "var(--text-heading)",
    margin: 0
  },
  p: {
    fontSize: 15,
    lineHeight: 1.55,
    color: "var(--text-body)",
    margin: 0,
    flex: 1
  }
};
function Step({
  n,
  title,
  action,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: joinStyles.step
  }, /*#__PURE__*/React.createElement("div", {
    style: joinStyles.num
  }, n), /*#__PURE__*/React.createElement("h3", {
    style: joinStyles.h
  }, title), /*#__PURE__*/React.createElement("p", {
    style: joinStyles.p
  }, children), action);
}
function JoinPage({
  go
}) {
  const nav = href => e => {
    e.preventDefault();
    go(href);
  };
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Join/Renew"
  }, /*#__PURE__*/React.createElement(__ds_scope.Hero, {
    variant: "page",
    kicker: "Membership",
    title: "Join / Renew"
  }), /*#__PURE__*/React.createElement(__ds_scope.Section, {
    narrow: true
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-md)",
      textAlign: "center",
      margin: "0 0 var(--space-4)"
    }
  }, "We're excited to welcome both new and returning members to the WCAA New Jersey & Southeastern Pennsylvania Chapter. Our local community brings together window covering professionals who value education, collaboration, and connection within the industry."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-base)",
      textAlign: "center",
      color: "var(--text-muted)",
      margin: 0
    }
  }, "Chapter membership requires an ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--text-heading)"
    }
  }, "active WCAA National membership"), ". New to WCAA? Start with Step 1.")), /*#__PURE__*/React.createElement(__ds_scope.Section, {
    tint: true,
    tight: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-6)",
      maxWidth: 880,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(Step, {
    n: "1",
    title: "Join WCAA National",
    action: /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: "outline",
      href: "https://www.wcaa.org/"
    }, "WCAA National ", /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      src: IC + "external-link.svg",
      size: 14
    }))
  }, "Become (or confirm you are) a member of the Window Coverings Association of America \u2014 it's the prerequisite for every local chapter."), /*#__PURE__*/React.createElement(Step, {
    n: "2",
    title: "Pay Chapter Dues",
    action: /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: "outline",
      href: "#join-dues",
      onClick: e => e.preventDefault()
    }, "See Dues Below")
  }, "Once your National membership is active, select and pay your NJ/SEPA Chapter dues using the buttons below."))), /*#__PURE__*/React.createElement(__ds_scope.Section, {
    narrow: true
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeading, {
    title: "Pay Annual Dues Here",
    lede: "Please use these buttons to join or renew your membership."
  }), /*#__PURE__*/React.createElement("div", {
    id: "join-dues",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
      maxWidth: 520,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "lg",
    fullWidth: true
  }, "Individual Membership Dues"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "lg",
    fullWidth: true
  }, "Corporate Membership Dues (Includes 2 Members)"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "outline",
    fullWidth: true
  }, "Add-on Employee (Corporate Members Only)"))), /*#__PURE__*/React.createElement(__ds_scope.Section, {
    dark: true,
    tight: true
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeading, {
    onDark: true,
    title: "Join now and take your business to new heights!",
    style: {
      marginBottom: "var(--space-6)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "gold",
    size: "lg",
    href: "#contact",
    onClick: nav("#contact")
  }, "Contact Us About Membership"))));
}
Object.assign(__ds_scope, { JoinPage });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/JoinPage.jsx", error: String((e && e.message) || e) }); }
