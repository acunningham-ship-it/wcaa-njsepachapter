// ui_kits/website/HomePage.jsx
try { (() => {
const IC = "assets/icons/";
const UP = "uploads/wcaa-instagram-photos/";
const IG = "https://www.instagram.com/wcaasepanjchapter/";
const pillarStyles = {
  card: {
    background: "var(--surface-card)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-card)",
    padding: "var(--space-8) var(--space-6)",
    textAlign: "center"
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: "var(--radius-round)",
    background: "var(--blue-100)",
    color: "var(--blue-700)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto var(--space-4)"
  },
  h: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-lg)",
    color: "var(--text-heading)",
    margin: "0 0 var(--space-2)"
  },
  p: {
    fontSize: 15,
    lineHeight: 1.55,
    color: "var(--text-muted)",
    margin: 0
  }
};
function Pillar({
  icon,
  title,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: pillarStyles.card
  }, /*#__PURE__*/React.createElement("div", {
    style: pillarStyles.circle
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    src: IC + icon,
    size: 24
  })), /*#__PURE__*/React.createElement("h3", {
    style: pillarStyles.h
  }, title), /*#__PURE__*/React.createElement("p", {
    style: pillarStyles.p
  }, children));
}
function HomePage({
  go
}) {
  const nav = href => e => {
    e.preventDefault();
    go(href);
  };
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Home"
  }, /*#__PURE__*/React.createElement(__ds_scope.Hero, {
    kicker: "Window Coverings Association of America",
    title: "New Jersey & Southeastern Pennsylvania Chapter",
    subtitle: "Window covering professionals across New Jersey and Southeastern Pennsylvania \u2014 education, collaboration, and connection.",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: "gold",
      size: "lg",
      href: "#join",
      onClick: nav("#join")
    }, "Join / Renew"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: "onDark",
      size: "lg",
      href: "#events",
      onClick: nav("#events")
    }, "Upcoming Events")),
    media: /*#__PURE__*/React.createElement("image-slot", {
      id: "home-hero",
      shape: "rect",
      src: UP + "23_DTnYvGvDn8k_0.webp",
      placeholder: "Drop a chapter group photo (from @wcaasepanjchapter)"
    })
  }), /*#__PURE__*/React.createElement(__ds_scope.Section, null, /*#__PURE__*/React.createElement(__ds_scope.SectionHeading, {
    kicker: "Welcome",
    title: "A Community of Window Covering Professionals"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      maxWidth: "var(--prose-max)",
      margin: "0 auto",
      textAlign: "center",
      fontSize: "var(--text-md)"
    }
  }, "We are proud members of the Window Coverings Association of America \u2014 the only national non-profit trade association dedicated to the retail window coverings industry and to the dealers, designers, decorators, workrooms, fabricators, and installers who are our members.")), /*#__PURE__*/React.createElement(__ds_scope.Section, {
    tint: true,
    tight: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement(Pillar, {
    icon: "calendar-days.svg",
    title: "Monthly Programs"
  }, "Speakers, software demos, and workroom education at our monthly chapter meetings."), /*#__PURE__*/React.createElement(Pillar, {
    icon: "users.svg",
    title: "A Professional Network"
  }, "Dealers, designers, workrooms, fabricators, and installers \u2014 all in one room."), /*#__PURE__*/React.createElement(Pillar, {
    icon: "map-pin.svg",
    title: "Local to Our Region"
  }, "Serving Southeastern Pennsylvania and New Jersey, with events close to home."))), /*#__PURE__*/React.createElement(__ds_scope.Section, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "0.9fr 1.4fr",
      gap: "var(--space-12)",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeading, {
    align: "left",
    kicker: "Around the Chapter",
    title: "Recent Events",
    lede: "We meet monthly \u2014 typically a Thursday morning \u2014 announced via email, Facebook, and Instagram.",
    style: {
      marginBottom: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.EventCard, {
    month: "Jun",
    day: "18",
    badge: "Zoom",
    title: "Centurion Roman Shade: Elevated Designs",
    time: "9:30 AM ET",
    location: "Zoom",
    description: "Elevated Roman shade techniques \u2014 relaxed and hobbled styles, top-down/bottom-up functionality, and more.",
    href: "#events",
    onClick: nav("#events")
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "outline",
    size: "sm",
    href: "#events",
    onClick: nav("#events")
  }, "All Chapter Events"))))), /*#__PURE__*/React.createElement(__ds_scope.Section, {
    tint: true
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeading, {
    kicker: "@wcaasepanjchapter",
    title: "Follow Along",
    lede: "Photos from meetings, workroom tours, and member socials."
  }), /*#__PURE__*/React.createElement(__ds_scope.GalleryGrid, {
    columns: 4,
    aspect: "1 / 1",
    slots: true,
    items: [{
      id: "home-ig-1",
      src: UP + "06_DYUdni2Dq_y_0.webp",
      alt: "Samuel & Sons showroom tour, NYC"
    }, {
      id: "home-ig-2",
      src: UP + "33_DO1oSklDkk7_1.webp",
      alt: "Trim workshop at Stout Textiles"
    }, {
      id: "home-ig-3",
      src: UP + "30_DQsWOH8jhpS_1.webp",
      alt: "Membership table at the Fall Table Top Show"
    }, {
      id: "home-ig-4",
      src: UP + "29_DRTZodOjsS__0.webp",
      alt: "Holiday cookie-decorating social"
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: "var(--space-8)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "outline",
    href: IG
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    src: IC + "instagram.svg",
    size: 16
  }), " Follow on Instagram"))), /*#__PURE__*/React.createElement(__ds_scope.Section, {
    dark: true,
    tight: true
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeading, {
    onDark: true,
    kicker: "Membership",
    title: "Take your business to new heights",
    lede: "Join the WCAA New Jersey & Southeastern Pennsylvania Chapter community.",
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
    href: "#join",
    onClick: nav("#join")
  }, "Join / Renew Today"))));
}
Object.assign(__ds_scope, { HomePage });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/HomePage.jsx", error: String((e && e.message) || e) }); }
