// ui_kits/website/WebsiteApp.jsx
try { (() => {
const IC = "assets/icons/";
const PAGES = {
  "#home": __ds_scope.HomePage,
  "#about": __ds_scope.AboutPage,
  "#events": __ds_scope.EventsPage,
  "#gallery": __ds_scope.GalleryPage,
  "#join": __ds_scope.JoinPage,
  "#contact": __ds_scope.ContactPage
};
const NAV_LINKS = [{
  label: "Home",
  href: "#home"
}, {
  label: "About Us",
  href: "#about"
}, {
  label: "Events",
  href: "#events"
}, {
  label: "Gallery",
  href: "#gallery"
}, {
  label: "Contact Us",
  href: "#contact"
}];
function WebsiteApp() {
  const initial = typeof location !== "undefined" && PAGES[location.hash] ? location.hash : "#home";
  const [page, setPage] = React.useState(initial);
  const go = href => {
    if (PAGES[href]) {
      setPage(href);
      try {
        history.replaceState(null, "", href);
      } catch (e) {}
      window.scrollTo(0, 0);
    } else if (href && /^https?:/.test(href)) {
      window.open(href, "_blank");
    }
  };
  const Page = PAGES[page];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.NavBar, {
    links: NAV_LINKS,
    activeHref: page,
    onNavigate: go,
    cta: {
      label: "Join / Renew",
      href: "#join"
    }
  }), /*#__PURE__*/React.createElement(Page, {
    go: go
  }), /*#__PURE__*/React.createElement(__ds_scope.Footer, {
    links: [...NAV_LINKS, {
      label: "Join/Renew",
      href: "#join"
    }],
    onNavigate: go,
    socials: [{
      label: "Instagram",
      href: "https://www.instagram.com/wcaasepanjchapter/",
      iconSrc: IC + "instagram.svg"
    }]
  }));
}
Object.assign(__ds_scope, { WebsiteApp });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/WebsiteApp.jsx", error: String((e && e.message) || e) }); }
