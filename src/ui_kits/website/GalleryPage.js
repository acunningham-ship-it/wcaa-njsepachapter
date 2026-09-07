// ui_kits/website/GalleryPage.jsx
try { (() => {
const IC = "assets/icons/";
const UP = "uploads/wcaa-instagram-photos/";
const IG = "https://www.instagram.com/wcaasepanjchapter/";
function GalleryPage() {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Gallery"
  }, /*#__PURE__*/React.createElement(__ds_scope.Hero, {
    variant: "page",
    kicker: "Chapter Life",
    title: "Gallery"
  }), /*#__PURE__*/React.createElement(__ds_scope.Section, null, /*#__PURE__*/React.createElement(__ds_scope.SectionHeading, {
    title: "Photos From Around the Chapter",
    lede: "Meetings, workroom tours, trainings, and socials across New Jersey and Southeastern PA."
  }), /*#__PURE__*/React.createElement(__ds_scope.GalleryGrid, {
    columns: 3,
    slots: true,
    items: [{
      id: "gal-1",
      src: UP + "23_DTnYvGvDn8k_1.webp",
      alt: "Trivantage presentation — chapter meeting"
    }, {
      id: "gal-2",
      src: UP + "10_DXPGedUDjPO_0.webp",
      alt: "Lafayette Interior Fashions at Phillips Workroom"
    }, {
      id: "gal-3",
      src: UP + "06_DYUdni2Dq_y_3.webp",
      alt: "Passementerie at Samuel & Sons"
    }, {
      id: "gal-4",
      src: UP + "33_DO1oSklDkk7_2.webp",
      alt: "Trim sample boards"
    }, {
      id: "gal-5",
      src: UP + "14_DVzrjrFDn_S_1.webp",
      alt: "DEL Motorized Solutions event"
    }, {
      id: "gal-6",
      src: UP + "06_DYUdni2Dq_y_1.webp",
      alt: "Samuel & Sons, New York City"
    }, {
      id: "gal-7",
      src: UP + "30_DQsWOH8jhpS_0.webp",
      alt: "Members at the Fall Table Top Show"
    }, {
      id: "gal-8",
      src: UP + "33_DO1oSklDkk7_3.webp",
      alt: "Fabric warehouse tour"
    }, {
      id: "gal-9",
      src: UP + "29_DRTZodOjsS__1.webp",
      alt: "Holiday cookie-decorating workshop"
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: "var(--space-10)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "outline",
    href: IG
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    src: IC + "instagram.svg",
    size: 16
  }), " Follow @wcaasepanjchapter"))));
}
Object.assign(__ds_scope, { GalleryPage });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/GalleryPage.jsx", error: String((e && e.message) || e) }); }
