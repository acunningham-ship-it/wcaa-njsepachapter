// ui_kits/website/AboutPage.jsx
try { (() => {
const IC = "assets/icons/";
const aboutStyles = {
  block: {
    marginBottom: "var(--space-16)"
  },
  p: {
    fontSize: "var(--text-md)",
    margin: 0
  },
  li: {
    display: "flex",
    gap: 10,
    alignItems: "baseline",
    fontSize: "var(--text-md)",
    marginBottom: "var(--space-3)"
  },
  meta: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    fontSize: 15,
    color: "var(--text-body)"
  }
};
function Goal({
  children
}) {
  return /*#__PURE__*/React.createElement("li", {
    style: aboutStyles.li
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--gold-600)",
      flex: "none",
      transform: "translateY(2px)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    src: IC + "chevron-right.svg",
    size: 16
  })), /*#__PURE__*/React.createElement("span", null, children));
}
function AboutPage() {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "About Us"
  }, /*#__PURE__*/React.createElement(__ds_scope.Hero, {
    variant: "page",
    kicker: "Our Chapter",
    title: "About Us"
  }), /*#__PURE__*/React.createElement(__ds_scope.Section, {
    narrow: true
  }, /*#__PURE__*/React.createElement("div", {
    style: aboutStyles.block
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeading, {
    align: "left",
    size: "sm",
    title: "WCAA \u2014 New Jersey & Southeastern Pennsylvania Chapter"
  }), /*#__PURE__*/React.createElement("p", {
    style: aboutStyles.p
  }, "We are proud members of the Window Coverings Association of America, the only national non-profit trade association dedicated to the retail window coverings industry and to the dealers, designers, decorators, workrooms, fabricators, and installers that are our members. We meet monthly \u2014 typically on a Thursday morning \u2014 and meetings are announced via email, our Facebook page, Instagram, and the Events page.")), /*#__PURE__*/React.createElement("div", {
    style: aboutStyles.block
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeading, {
    align: "left",
    size: "sm",
    title: "Mission Statement"
  }), /*#__PURE__*/React.createElement("p", {
    style: aboutStyles.p
  }, "Our mission is to make available educational opportunities in the window coverings and interior fashions professions, to encourage a code of ethics for fair business practice in the industry, and to work for the betterment of the industry.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.SectionHeading, {
    align: "left",
    size: "sm",
    title: "Our Goals"
  }), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      padding: 0,
      margin: 0
    }
  }, /*#__PURE__*/React.createElement(Goal, null, "To promote professionalism in the industry"), /*#__PURE__*/React.createElement(Goal, null, "To provide a common voice for the interests of independent retailers"), /*#__PURE__*/React.createElement(Goal, null, "To aid in the success and profitability of our members")))), /*#__PURE__*/React.createElement(__ds_scope.Section, {
    tint: true,
    tight: true
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeading, {
    kicker: "Leadership",
    title: "Chapter Officers",
    lede: "Questions about the chapter or membership? Reach out \u2014 we'd love to hear from you."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      gap: "var(--space-16)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.OfficerCard, {
    name: "Marie Weaverling",
    role: "Chapter President",
    phone: "(610) 331-5474",
    photo: /*#__PURE__*/React.createElement("image-slot", {
      id: "officer-marie",
      shape: "rect",
      placeholder: "Photo"
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      gap: "var(--space-8)",
      marginTop: "var(--space-8)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: aboutStyles.meta
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--blue-700)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    src: IC + "clock.svg",
    size: 17
  })), "Monthly chapter meetings"), /*#__PURE__*/React.createElement("span", {
    style: aboutStyles.meta
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--blue-700)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    src: IC + "map-pin.svg",
    size: 17
  })), "New Jersey & Southeastern Pennsylvania"), /*#__PURE__*/React.createElement("span", {
    style: aboutStyles.meta
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--blue-700)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    src: IC + "mail.svg",
    size: 17
  })), "Announced by email & social"))));
}
Object.assign(__ds_scope, { AboutPage });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/AboutPage.jsx", error: String((e && e.message) || e) }); }
