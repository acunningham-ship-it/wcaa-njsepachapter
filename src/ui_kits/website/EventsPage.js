// ui_kits/website/EventsPage.jsx
try { (() => {
const IC = "assets/icons/";
const IG = "https://www.instagram.com/wcaasepanjchapter/";
function EventsPage({
  go
}) {
  const nav = href => e => {
    e.preventDefault();
    go(href);
  };
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Events"
  }, /*#__PURE__*/React.createElement(__ds_scope.Hero, {
    variant: "page",
    kicker: "Calendar",
    title: "Chapter Events"
  }), /*#__PURE__*/React.createElement(__ds_scope.Section, {
    narrow: true
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeading, {
    title: "Recent Events",
    lede: "We meet monthly \u2014 typically a Thursday morning. New meetings are announced via email, our Facebook page, and @wcaasepanjchapter."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.EventCard, {
    month: "Jun",
    day: "18",
    badge: "Zoom",
    title: "Centurion Roman Shade: Elevated Designs",
    time: "9:30 AM ET",
    location: "Zoom",
    description: "Expert techniques and elevated design details \u2014 relaxed and hobbled styles, top-down/bottom-up functionality, and the Centurion widget kit. Presented with the New Hampshire chapter."
  }), /*#__PURE__*/React.createElement(__ds_scope.EventCard, {
    month: "Apr",
    day: "16",
    badge: "In Person",
    title: "Lafayette Interior Fashions",
    time: "10:30 AM",
    location: "Phillips Workroom, Chadds Ford, PA",
    description: "An extensive range of customizable window treatments \u2014 and how a Lafayette partnership can complement your business. Lunch served after the presentation."
  }), /*#__PURE__*/React.createElement(__ds_scope.EventCard, {
    month: "Mar",
    day: "11",
    badge: "Membership Drive",
    title: "Designing with Motorized Shading \u2014 LuAnn Nigara",
    time: "10:00 AM \u2013 1:30 PM",
    location: "Del Motorized Solutions, Bensalem, PA",
    description: "Sales, programming, fabrication methods, and installation tips from Lutron experts, with guest speaker LuAnn Nigara. Giveaways and light lunch provided."
  }), /*#__PURE__*/React.createElement(__ds_scope.EventCard, {
    month: "Feb",
    day: "19",
    badge: "In Person + Zoom",
    title: "Live Q&A with Master Installer Shawn Yett",
    time: "10:30 AM",
    location: "R Garner Custom Designs",
    description: "Advanced installation techniques and troubleshooting for interior designers, workrooms, and window treatment specialists."
  }), /*#__PURE__*/React.createElement(__ds_scope.EventCard, {
    month: "Jan",
    day: "15",
    badge: "In Person",
    title: "Experience Trivantage: Presentation, Tour & Lunch",
    time: "10:30 AM",
    location: "Trivantage, Somerset, NJ",
    description: "High-quality fabrics, threads, tools, and workroom supplies with Lisa Campbell, Market Manager \u2013 Workrooms."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-4)",
      justifyContent: "center",
      marginTop: "var(--space-12)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "outline",
    href: IG
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    src: IC + "instagram.svg",
    size: 16
  }), " Follow for Announcements"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    href: "#contact",
    onClick: nav("#contact")
  }, "Ask About a Meeting"))));
}
Object.assign(__ds_scope, { EventsPage });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/EventsPage.jsx", error: String((e && e.message) || e) }); }
