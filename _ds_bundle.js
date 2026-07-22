/* @ds-bundle: {"format":4,"namespace":"WCAASEPANJDesignSystem_207f6d","components":[{"name":"EventCard","sourcePath":"components/content/EventCard.jsx"},{"name":"GalleryGrid","sourcePath":"components/content/GalleryGrid.jsx"},{"name":"Hero","sourcePath":"components/content/Hero.jsx"},{"name":"OfficerCard","sourcePath":"components/content/OfficerCard.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"SectionHeading","sourcePath":"components/core/SectionHeading.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"TextArea","sourcePath":"components/forms/TextArea.jsx"},{"name":"Footer","sourcePath":"components/navigation/Footer.jsx"},{"name":"NavBar","sourcePath":"components/navigation/NavBar.jsx"},{"name":"AboutPage","sourcePath":"ui_kits/website/AboutPage.jsx"},{"name":"ContactPage","sourcePath":"ui_kits/website/ContactPage.jsx"},{"name":"EventsPage","sourcePath":"ui_kits/website/EventsPage.jsx"},{"name":"GalleryPage","sourcePath":"ui_kits/website/GalleryPage.jsx"},{"name":"HomePage","sourcePath":"ui_kits/website/HomePage.jsx"},{"name":"JoinPage","sourcePath":"ui_kits/website/JoinPage.jsx"},{"name":"Section","sourcePath":"ui_kits/website/Section.jsx"},{"name":"WebsiteApp","sourcePath":"ui_kits/website/WebsiteApp.jsx"}],"sourceHashes":{"components/content/EventCard.jsx":"529384725ffb","components/content/GalleryGrid.jsx":"28d64fb4cb2c","components/content/Hero.jsx":"b3c4dd8460a8","components/content/OfficerCard.jsx":"edba041b11e3","components/core/Badge.jsx":"07487b10ca1f","components/core/Button.jsx":"0ea33467db98","components/core/Icon.jsx":"07cfb835ff2c","components/core/SectionHeading.jsx":"af1c5cdd3f88","components/forms/Input.jsx":"d4019b92ddf4","components/forms/TextArea.jsx":"2c5a59bcb866","components/navigation/Footer.jsx":"d4adc3c468c3","components/navigation/NavBar.jsx":"a3d6178ae128","ui_kits/website/AboutPage.jsx":"83044a6d318d","ui_kits/website/ContactPage.jsx":"6ad40f227e96","ui_kits/website/EventsPage.jsx":"11e529949e6d","ui_kits/website/GalleryPage.jsx":"a04ac546a34e","ui_kits/website/HomePage.jsx":"74e378527d7f","ui_kits/website/JoinPage.jsx":"5f7cfa0b102b","ui_kits/website/Section.jsx":"edb13cbf4aa1","ui_kits/website/WebsiteApp.jsx":"297bc1e6ba47","ui_kits/website/image-slot.js":"d797f41b7d66"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.WCAASEPANJDesignSystem_207f6d = window.WCAASEPANJDesignSystem_207f6d || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/content/GalleryGrid.jsx
try { (() => {
const css = `
.wcaa-gal{display:grid;gap:var(--space-4)}
.wcaa-gal__item{display:flex;flex-direction:column;gap:8px;min-width:0}
.wcaa-gal__ph{position:relative;border-radius:var(--radius-lg);overflow:hidden;background:var(--blue-100)}
.wcaa-gal__ph>img,.wcaa-gal__ph>image-slot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.wcaa-gal__empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;font:600 12px/1.5 var(--font-body);letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--blue-400)}
.wcaa-gal__cap{font-size:13px;color:var(--text-muted);text-align:center}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-gallerygrid")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-gallerygrid";
  s.textContent = css;
  document.head.appendChild(s);
}
function GalleryGrid({
  items = [],
  columns = 3,
  aspect = "4 / 3",
  slots = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "wcaa-gal",
    style: {
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      ...style
    }
  }, items.map(it => /*#__PURE__*/React.createElement("figure", {
    key: it.id,
    className: "wcaa-gal__item",
    style: {
      margin: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wcaa-gal__ph",
    style: {
      aspectRatio: aspect
    }
  }, slots ? React.createElement("image-slot", {
    id: it.id,
    placeholder: it.alt,
    src: it.src
  }) : it.src ? /*#__PURE__*/React.createElement("img", {
    src: it.src,
    alt: it.alt || ""
  }) : /*#__PURE__*/React.createElement("span", {
    className: "wcaa-gal__empty"
  }, it.alt || "Photo")), it.caption ? /*#__PURE__*/React.createElement("figcaption", {
    className: "wcaa-gal__cap"
  }, it.caption) : null)));
}
Object.assign(__ds_scope, { GalleryGrid });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/GalleryGrid.jsx", error: String((e && e.message) || e) }); }

// components/content/Hero.jsx
try { (() => {
const css = `
.wcaa-hero{position:relative;overflow:hidden;background:linear-gradient(160deg,var(--blue-900),var(--blue-950));display:flex;align-items:center;justify-content:center;text-align:center}
.wcaa-hero__media{position:absolute;inset:0}
.wcaa-hero__media>*{width:100%;height:100%;object-fit:cover;display:block}
.wcaa-hero__ovl{position:absolute;inset:0;background:var(--overlay-hero);pointer-events:none}
.wcaa-hero__in{position:relative;max-width:820px;padding:var(--space-16) var(--space-6);display:flex;flex-direction:column;align-items:center;gap:var(--space-5)}
.wcaa-hero__kicker{font:600 13px/1 var(--font-body);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--gold-300)}
.wcaa-hero__title{font-family:var(--font-display);font-weight:400;color:#fff;font-size:var(--text-4xl);line-height:var(--leading-tight);margin:0;text-wrap:balance}
.wcaa-hero--page .wcaa-hero__title{font-size:var(--text-3xl)}
.wcaa-hero__rule{width:var(--rule-w);height:var(--rule-h);background:var(--gold-400)}
.wcaa-hero__sub{font-size:var(--text-lg);line-height:1.55;color:#dbe7f2;margin:0;max-width:640px;text-wrap:pretty}
.wcaa-hero__actions{display:flex;gap:var(--space-4);flex-wrap:wrap;justify-content:center;margin-top:var(--space-2)}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-hero")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-hero";
  s.textContent = css;
  document.head.appendChild(s);
}
function Hero({
  variant = "full",
  kicker,
  title,
  subtitle,
  actions,
  media,
  minHeight,
  style
}) {
  const h = minHeight != null ? minHeight : variant === "page" ? 240 : 540;
  return /*#__PURE__*/React.createElement("section", {
    className: `wcaa-hero wcaa-hero--${variant}`,
    style: {
      minHeight: h,
      ...style
    }
  }, media ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-hero__media"
  }, media) : null, /*#__PURE__*/React.createElement("div", {
    className: "wcaa-hero__ovl"
  }), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-hero__in"
  }, kicker ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-hero__kicker"
  }, kicker) : null, /*#__PURE__*/React.createElement("h1", {
    className: "wcaa-hero__title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-hero__rule"
  }), subtitle ? /*#__PURE__*/React.createElement("p", {
    className: "wcaa-hero__sub"
  }, subtitle) : null, actions ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-hero__actions"
  }, actions) : null));
}
Object.assign(__ds_scope, { Hero });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Hero.jsx", error: String((e && e.message) || e) }); }

// components/content/OfficerCard.jsx
try { (() => {
const css = `
.wcaa-off{text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px}
.wcaa-off__photo{width:96px;height:96px;border-radius:var(--radius-round);overflow:hidden;background:var(--blue-100);border:1px solid var(--blue-200);display:flex;align-items:center;justify-content:center;margin-bottom:var(--space-3)}
.wcaa-off__photo>*{width:100%;height:100%;object-fit:cover}
.wcaa-off__init{font-family:var(--font-display);font-size:30px;color:var(--blue-800)}
.wcaa-off__name{font-family:var(--font-display);font-size:var(--text-lg);color:var(--text-heading)}
.wcaa-off__role{font:600 11px/1.2 var(--font-body);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--gold-600)}
.wcaa-off__contact{font-size:13px;color:var(--text-muted);margin-top:4px;display:flex;flex-direction:column;gap:2px}
.wcaa-off__contact a{color:var(--link)}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-officercard")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-officercard";
  s.textContent = css;
  document.head.appendChild(s);
}
function OfficerCard({
  name,
  role,
  phone,
  email,
  photo,
  style
}) {
  const initials = (name || "").split(/\s+/).map(w => w[0]).slice(0, 2).join("");
  return /*#__PURE__*/React.createElement("div", {
    className: "wcaa-off",
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: "wcaa-off__photo"
  }, photo ? photo : /*#__PURE__*/React.createElement("span", {
    className: "wcaa-off__init"
  }, initials)), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-off__name"
  }, name), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-off__role"
  }, role), phone || email ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-off__contact"
  }, phone ? /*#__PURE__*/React.createElement("a", {
    href: `tel:${phone.replace(/[^+\d]/g, "")}`
  }, phone) : null, email ? /*#__PURE__*/React.createElement("a", {
    href: `mailto:${email}`
  }, email) : null) : null);
}
Object.assign(__ds_scope, { OfficerCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/OfficerCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const css = `
.wcaa-badge{display:inline-flex;align-items:center;gap:6px;border-radius:var(--radius-round);font:600 11px/1 var(--font-body);letter-spacing:var(--tracking-caps);text-transform:uppercase;padding:6px 12px;border:1px solid transparent}
.wcaa-badge--blue{background:var(--blue-100);color:var(--blue-800);border-color:var(--blue-200)}
.wcaa-badge--gold{background:var(--gold-100);color:var(--gold-800);border-color:var(--gold-300)}
.wcaa-badge--neutral{background:var(--neutral-100);color:var(--neutral-600);border-color:var(--neutral-200)}
.wcaa-badge--success{background:var(--surface-success);color:var(--color-success);border-color:#bfdccb}
.wcaa-badge--onDark{background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.35)}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-badge")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-badge";
  s.textContent = css;
  document.head.appendChild(s);
}
function Badge({
  tone = "blue",
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: `wcaa-badge wcaa-badge--${tone}`,
    style: style
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/content/EventCard.jsx
try { (() => {
const css = `
.wcaa-ev{display:flex;background:var(--surface-card);border-radius:var(--radius-md);box-shadow:var(--shadow-card);overflow:hidden;text-align:left;transition:box-shadow var(--dur) var(--ease-out),transform var(--dur) var(--ease-out)}
.wcaa-ev--link:hover{box-shadow:var(--shadow-lift);transform:translateY(-2px)}
.wcaa-ev__date{flex:none;width:96px;background:var(--surface-tint);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:var(--space-4)}
.wcaa-ev__mo{font:600 12px/1 var(--font-body);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--blue-700)}
.wcaa-ev__day{font-family:var(--font-display);font-size:36px;line-height:1;color:var(--blue-900)}
.wcaa-ev__body{padding:var(--space-5) var(--space-6);display:flex;flex-direction:column;gap:6px;min-width:0}
.wcaa-ev__title{font-family:var(--font-display);font-weight:400;font-size:var(--text-xl);color:var(--text-heading);margin:0}
.wcaa-ev__meta{font-size:var(--text-sm);color:var(--text-muted)}
.wcaa-ev__desc{font-size:15px;line-height:1.55;color:var(--text-body);margin:2px 0 0}
.wcaa-ev__link{font:600 13px/1 var(--font-body);letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--color-primary);text-decoration:none;margin-top:var(--space-2);align-self:flex-start}
.wcaa-ev__link:hover{color:var(--link-hover)}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-eventcard")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-eventcard";
  s.textContent = css;
  document.head.appendChild(s);
}
function EventCard({
  month,
  day,
  title,
  badge,
  time,
  location,
  description,
  href,
  linkLabel = "Event Details",
  onClick,
  style
}) {
  const meta = [time, location].filter(Boolean).join(" · ");
  return /*#__PURE__*/React.createElement("article", {
    className: `wcaa-ev${href ? " wcaa-ev--link" : ""}`,
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: "wcaa-ev__date"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wcaa-ev__mo"
  }, month), /*#__PURE__*/React.createElement("span", {
    className: "wcaa-ev__day"
  }, day)), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-ev__body"
  }, badge ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.Badge, null, badge)) : null, /*#__PURE__*/React.createElement("h3", {
    className: "wcaa-ev__title"
  }, title), meta ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-ev__meta"
  }, meta) : null, description ? /*#__PURE__*/React.createElement("p", {
    className: "wcaa-ev__desc"
  }, description) : null, href ? /*#__PURE__*/React.createElement("a", {
    className: "wcaa-ev__link",
    href: href,
    onClick: onClick
  }, linkLabel, " \u2192") : null));
}
Object.assign(__ds_scope, { EventCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/EventCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const css = `
.wcaa-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font-body);font-weight:var(--weight-bold);text-transform:uppercase;letter-spacing:var(--tracking-caps);border-radius:var(--radius-xs);border:1.5px solid transparent;cursor:pointer;text-decoration:none;white-space:nowrap;transition:background var(--dur-fast) var(--ease-out),color var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out)}
.wcaa-btn:hover{text-decoration:none}
.wcaa-btn--md{font-size:13px;padding:11px 24px}
.wcaa-btn--sm{font-size:12px;padding:7px 16px}
.wcaa-btn--lg{font-size:14px;padding:15px 32px}
.wcaa-btn--primary{background:var(--color-primary);color:var(--text-on-primary)}
.wcaa-btn--primary:hover{background:var(--color-primary-hover);color:var(--text-on-primary)}
.wcaa-btn--primary:active{background:var(--color-primary-active)}
.wcaa-btn--outline{background:transparent;color:var(--color-primary);border-color:var(--color-primary)}
.wcaa-btn--outline:hover{background:var(--blue-50);color:var(--color-primary-hover)}
.wcaa-btn--outline:active{background:var(--blue-100)}
.wcaa-btn--gold{background:var(--gold-500);color:var(--blue-950)}
.wcaa-btn--gold:hover{background:var(--gold-400);color:var(--blue-950)}
.wcaa-btn--gold:active{background:var(--gold-600)}
.wcaa-btn--onDark{background:transparent;color:#fff;border-color:rgba(255,255,255,.7)}
.wcaa-btn--onDark:hover{background:rgba(255,255,255,.14);color:#fff;border-color:#fff}
.wcaa-btn--onDark:active{background:rgba(255,255,255,.22)}
.wcaa-btn--full{width:100%}
.wcaa-btn[disabled],.wcaa-btn--disabled{opacity:.45;pointer-events:none}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-button")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-button";
  s.textContent = css;
  document.head.appendChild(s);
}
function Button({
  variant = "primary",
  size = "md",
  href,
  onClick,
  fullWidth = false,
  disabled = false,
  type = "button",
  children,
  style
}) {
  const cls = `wcaa-btn wcaa-btn--${variant} wcaa-btn--${size}${fullWidth ? " wcaa-btn--full" : ""}${disabled ? " wcaa-btn--disabled" : ""}`;
  if (href && !disabled) return /*#__PURE__*/React.createElement("a", {
    className: cls,
    href: href,
    onClick: onClick,
    style: style
  }, children);
  return /*#__PURE__*/React.createElement("button", {
    className: cls,
    type: type,
    onClick: onClick,
    disabled: disabled,
    style: style
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

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

// components/core/SectionHeading.jsx
try { (() => {
const css = `
.wcaa-sh{margin:0 0 var(--space-8)}
.wcaa-sh--center{text-align:center}
.wcaa-sh__kicker{font:var(--type-label);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--gold-600);margin-bottom:var(--space-3)}
.wcaa-sh__title{font-family:var(--font-display);font-weight:400;color:var(--text-heading);font-size:var(--text-3xl);line-height:var(--leading-tight);margin:0 0 var(--space-4)}
.wcaa-sh--sm .wcaa-sh__title{font-size:var(--text-2xl)}
.wcaa-sh__rule{width:var(--rule-w);height:var(--rule-h);background:var(--gold-500)}
.wcaa-sh--center .wcaa-sh__rule{margin:0 auto}
.wcaa-sh__lede{font-size:var(--text-md);color:var(--text-muted);max-width:var(--prose-max);margin:var(--space-4) 0 0}
.wcaa-sh--center .wcaa-sh__lede{margin-left:auto;margin-right:auto}
.wcaa-sh--onDark .wcaa-sh__title{color:var(--text-on-dark)}
.wcaa-sh--onDark .wcaa-sh__kicker{color:var(--gold-300)}
.wcaa-sh--onDark .wcaa-sh__lede{color:var(--text-on-dark-muted)}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-sectionheading")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-sectionheading";
  s.textContent = css;
  document.head.appendChild(s);
}
function SectionHeading({
  kicker,
  title,
  lede,
  align = "center",
  size = "md",
  onDark = false,
  style
}) {
  const cls = `wcaa-sh wcaa-sh--${align}${size === "sm" ? " wcaa-sh--sm" : ""}${onDark ? " wcaa-sh--onDark" : ""}`;
  return /*#__PURE__*/React.createElement("div", {
    className: cls,
    style: style
  }, kicker ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-sh__kicker"
  }, kicker) : null, /*#__PURE__*/React.createElement("h2", {
    className: "wcaa-sh__title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-sh__rule"
  }), lede ? /*#__PURE__*/React.createElement("p", {
    className: "wcaa-sh__lede"
  }, lede) : null);
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionHeading.jsx", error: String((e && e.message) || e) }); }

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

// components/navigation/Footer.jsx
try { (() => {
const css = `
.wcaa-foot{background:var(--surface-footer);color:var(--text-on-dark-muted);text-align:center;padding:var(--space-16) var(--space-6) var(--space-8)}
.wcaa-foot__mark{font-family:var(--font-display);font-size:34px;letter-spacing:.05em;color:#fff;line-height:1}
.wcaa-foot__rule{width:var(--rule-w);height:var(--rule-h);background:var(--gold-400);margin:14px auto}
.wcaa-foot__sub{font:600 11px/1.4 var(--font-body);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--text-on-dark-muted)}
.wcaa-foot__links{display:flex;gap:var(--space-6);justify-content:center;flex-wrap:wrap;margin:var(--space-8) 0}
.wcaa-foot__links a{font:600 12px/1 var(--font-body);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:#dbe7f2;text-decoration:none}
.wcaa-foot__links a:hover{color:var(--gold-300);text-decoration:none}
.wcaa-foot__soc{display:flex;gap:12px;justify-content:center;margin-bottom:var(--space-8)}
.wcaa-foot__soc a{width:42px;height:42px;border-radius:var(--radius-round);border:1px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;color:#fff;transition:background var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out)}
.wcaa-foot__soc a:hover{background:rgba(255,255,255,.12);border-color:#fff;color:#fff}
.wcaa-foot__copy{font-size:13px;color:#8fa5bb;border-top:1px solid rgba(255,255,255,.12);padding-top:var(--space-6);max-width:var(--container-max);margin:0 auto}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-footer")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-footer";
  s.textContent = css;
  document.head.appendChild(s);
}
function Footer({
  brandSub = "New Jersey & Southeastern Pennsylvania Chapter",
  links = [],
  socials = [],
  onNavigate,
  copyright = "Copyright © 2026 Window Coverings Association of America — New Jersey and Southeastern Pennsylvania Chapter — All Rights Reserved."
}) {
  const go = href => e => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(href);
    }
  };
  return /*#__PURE__*/React.createElement("footer", {
    className: "wcaa-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wcaa-foot__mark"
  }, "WCAA"), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-foot__rule"
  }), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-foot__sub"
  }, brandSub), links.length ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-foot__links"
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l.href,
    href: l.href,
    onClick: go(l.href)
  }, l.label))) : null, socials.length ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-foot__soc"
  }, socials.map(s => /*#__PURE__*/React.createElement("a", {
    key: s.label,
    href: s.href,
    "aria-label": s.label,
    target: "_blank",
    rel: "noreferrer"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    src: s.iconSrc,
    size: 18
  })))) : null, /*#__PURE__*/React.createElement("div", {
    className: "wcaa-foot__copy"
  }, copyright));
}
Object.assign(__ds_scope, { Footer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Footer.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavBar.jsx
try { (() => {
const css = `
.wcaa-nav{background:var(--surface-card);border-bottom:1px solid var(--border-subtle);position:sticky;top:0;z-index:50}
.wcaa-nav__in{max-width:var(--container-max);margin:0 auto;padding:0 var(--space-6);height:76px;display:flex;align-items:center;gap:var(--space-6)}
.wcaa-nav__brand{display:flex;align-items:center;gap:14px;text-decoration:none;flex:none}
.wcaa-nav__brand:hover{text-decoration:none}
.wcaa-nav__mark{font-family:var(--font-display);font-size:30px;letter-spacing:.05em;color:var(--blue-900);line-height:1}
.wcaa-nav__div{width:1px;height:34px;background:var(--gold-400)}
.wcaa-nav__sub{font:600 10.5px/1.35 var(--font-body);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--text-muted);max-width:210px}
.wcaa-nav__links{display:flex;align-items:center;gap:var(--space-6);margin-left:auto}
.wcaa-nav__link{font:600 13px/1 var(--font-body);letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--text-heading);text-decoration:none;padding:6px 0;border-bottom:2px solid transparent;transition:color var(--dur-fast) var(--ease-out)}
.wcaa-nav__link:hover{color:var(--color-primary);text-decoration:none}
.wcaa-nav__link--active{color:var(--color-primary);border-bottom-color:var(--gold-500)}
.wcaa-nav__burger{display:none;margin-left:auto;background:none;border:0;cursor:pointer;padding:10px;flex-direction:column;gap:5px}
.wcaa-nav__burger span{display:block;width:22px;height:2px;background:var(--blue-900)}
.wcaa-nav__sheet{display:none}
@media (max-width:920px){
.wcaa-nav__links{display:none}
.wcaa-nav__burger{display:flex}
.wcaa-nav__sheet{display:flex;flex-direction:column;background:var(--surface-card);border-bottom:1px solid var(--border-subtle);padding:var(--space-2) var(--space-6) var(--space-6)}
.wcaa-nav__sheet .wcaa-nav__link{padding:14px 0;border-bottom:1px solid var(--neutral-100);font-size:14px}
}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-navbar")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-navbar";
  s.textContent = css;
  document.head.appendChild(s);
}
function NavBar({
  links = [],
  activeHref,
  onNavigate,
  cta = {
    label: "Join / Renew",
    href: "#join"
  },
  brandSub = "New Jersey & Southeastern Pennsylvania Chapter",
  homeHref = "#home"
}) {
  const [open, setOpen] = React.useState(false);
  const go = href => e => {
    if (onNavigate) {
      e.preventDefault();
      setOpen(false);
      onNavigate(href);
    }
  };
  const link = l => /*#__PURE__*/React.createElement("a", {
    key: l.href,
    className: `wcaa-nav__link${l.href === activeHref ? " wcaa-nav__link--active" : ""}`,
    href: l.href,
    onClick: go(l.href)
  }, l.label);
  return /*#__PURE__*/React.createElement("nav", {
    className: "wcaa-nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wcaa-nav__in"
  }, /*#__PURE__*/React.createElement("a", {
    className: "wcaa-nav__brand",
    href: homeHref,
    onClick: go(homeHref)
  }, /*#__PURE__*/React.createElement("span", {
    className: "wcaa-nav__mark"
  }, "WCAA"), /*#__PURE__*/React.createElement("span", {
    className: "wcaa-nav__div"
  }), /*#__PURE__*/React.createElement("span", {
    className: "wcaa-nav__sub"
  }, brandSub)), /*#__PURE__*/React.createElement("div", {
    className: "wcaa-nav__links"
  }, links.map(link), cta ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "gold",
    size: "sm",
    href: cta.href,
    onClick: go(cta.href)
  }, cta.label) : null), /*#__PURE__*/React.createElement("button", {
    className: "wcaa-nav__burger",
    "aria-label": "Menu",
    onClick: () => setOpen(!open)
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null))), open ? /*#__PURE__*/React.createElement("div", {
    className: "wcaa-nav__sheet"
  }, links.map(link), cta ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "gold",
    size: "sm",
    href: cta.href,
    onClick: go(cta.href),
    style: {
      marginTop: 12
    }
  }, cta.label) : null) : null);
}
Object.assign(__ds_scope, { NavBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Section.jsx
try { (() => {
const css = `
.wcaa-sec{padding:var(--space-24) var(--space-6)}
.wcaa-sec--tint{background:var(--surface-tint)}
.wcaa-sec--dark{background:var(--surface-dark)}
.wcaa-sec--tight{padding:var(--space-16) var(--space-6)}
.wcaa-sec__in{max-width:var(--container-max);margin:0 auto}
.wcaa-sec__in--narrow{max-width:var(--prose-max)}
@media (max-width:720px){.wcaa-sec{padding:var(--space-16) var(--space-5)}}
`;
if (typeof document !== "undefined" && !document.getElementById("wcaa-css-section")) {
  const s = document.createElement("style");
  s.id = "wcaa-css-section";
  s.textContent = css;
  document.head.appendChild(s);
}
function Section({
  tint = false,
  dark = false,
  tight = false,
  narrow = false,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: `wcaa-sec${tint ? " wcaa-sec--tint" : ""}${dark ? " wcaa-sec--dark" : ""}${tight ? " wcaa-sec--tight" : ""}`,
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: `wcaa-sec__in${narrow ? " wcaa-sec__in--narrow" : ""}`
  }, children));
}
Object.assign(__ds_scope, { Section });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Section.jsx", error: String((e && e.message) || e) }); }

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
      src: UP + "23_DTnYvGvDn8k_1.jpg",
      alt: "Trivantage presentation — chapter meeting"
    }, {
      id: "gal-2",
      src: UP + "10_DXPGedUDjPO_0.jpg",
      alt: "Lafayette Interior Fashions at Phillips Workroom"
    }, {
      id: "gal-3",
      src: UP + "06_DYUdni2Dq_y_3.jpg",
      alt: "Passementerie at Samuel & Sons"
    }, {
      id: "gal-4",
      src: UP + "33_DO1oSklDkk7_2.jpg",
      alt: "Trim sample boards"
    }, {
      id: "gal-5",
      src: UP + "14_DVzrjrFDn_S_1.jpg",
      alt: "DEL Motorized Solutions event"
    }, {
      id: "gal-6",
      src: UP + "06_DYUdni2Dq_y_1.jpg",
      alt: "Samuel & Sons, New York City"
    }, {
      id: "gal-7",
      src: UP + "30_DQsWOH8jhpS_0.jpg",
      alt: "Members at the Fall Table Top Show"
    }, {
      id: "gal-8",
      src: UP + "33_DO1oSklDkk7_3.jpg",
      alt: "Fabric warehouse tour"
    }, {
      id: "gal-9",
      src: UP + "29_DRTZodOjsS__1.jpg",
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
      src: UP + "23_DTnYvGvDn8k_0.jpg",
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
      src: UP + "06_DYUdni2Dq_y_0.jpg",
      alt: "Samuel & Sons showroom tour, NYC"
    }, {
      id: "home-ig-2",
      src: UP + "33_DO1oSklDkk7_1.jpg",
      alt: "Trim workshop at Stout Textiles"
    }, {
      id: "home-ig-3",
      src: UP + "30_DQsWOH8jhpS_1.jpg",
      alt: "Membership table at the Fall Table Top Show"
    }, {
      id: "home-ig-4",
      src: UP + "29_DRTZodOjsS__0.jpg",
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

// ui_kits/website/image-slot.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).
/* BEGIN USAGE */
/**
 * <image-slot> — user-fillable image placeholder.
 *
 * Drop this into a deck, mockup, or page wherever a design needs an image.
 * You control the slot's shape; it sizes to its container by default. When the search_stock_photos tool
 * is available, prefill the slot by default — write the photo's URL into
 * src (with credit/credit-href); the user can still fill or replace it
 * by dragging an image file onto it (or clicking to browse). The dropped
 * image persists across reloads via a .image-slots.state.json sidecar —
 * same read-via-fetch / write-via-window.omelette pattern as
 * design_canvas.jsx, so the filled slot shows on share links, downloaded
 * zips, and PPTX export. Outside the omelette runtime the slot is read-only.
 *
 * The sidecar is a SIBLING of the HTML file that uses this component: the
 * read is a document-relative fetch, and the host resolves the bridge's
 * sidecar writes into the previewed file's directory to match (same
 * contract as design_canvas.jsx). Pages in the same directory share one
 * sidecar; keep slot ids distinct across them.
 *
 * Attributes:
 *   id           Persistence key. REQUIRED for the drop to survive reload —
 *                every slot on the page needs a distinct id.
 *   shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
 *                'circle' applies 50% border-radius; on a non-square slot
 *                that's an ellipse — set equal width and height for a true
 *                circle.
 *   radius       Corner radius in px for 'rounded'.       (default 12)
 *   mask         Any CSS clip-path value. Overrides `shape` — use this for
 *                hexagons, blobs, arbitrary polygons.
 *   fit          Initial framing baseline: cover | contain.   (default 'cover')
 *                cover starts the image filling the frame (overflow cropped);
 *                contain starts it fully visible (letterboxed). Either way the
 *                user can always pan/scale from there — double-click, or the
 *                Edit control, enters reframe mode (drag to move, scroll or
 *                corner-handles to scale; Escape / click-out commits). The
 *                crop persists alongside the image in the sidecar.
 *   placeholder  Empty-state caption.                      (default 'Drop an image')
 *   src          Optional initial/fallback image URL. Prefill it with a real
 *                photo via search_stock_photos when that tool is available
 *                (set credit/credit-href from the result). A user drop
 *                overrides it; clearing the drop reveals src again.
 *   credit       Attribution text shown as a small overlay at the
 *                bottom-left of the filled slot. REQUIRED whenever src
 *                points at any Unsplash host (images.unsplash.com,
 *                plus.unsplash.com, …): an Unsplash src with no credit
 *                renders an error tile INSTEAD of the photo (Unsplash
 *                terms forbid showing their photos unattributed). Use the
 *                exact form 'Photo by {photographer name} on Unsplash' —
 *                the overlay then links the name to credit-href and
 *                'Unsplash' to the Unsplash homepage, and links back to
 *                unsplash.com automatically get the required utm referral
 *                params appended at render time. The credit belongs to
 *                the src image, so it only shows while src is what's
 *                displayed — a user-dropped image hides it.
 *   credit-href  Link for the photographer's name in the credit overlay
 *                (their Unsplash profile URL from the stock-photo search
 *                results). http(s) URLs only — anything else renders the
 *                name as plain text.
 *
 * Sizing: the slot fills its container by default (width/height 100%).
 * Put it in a sized wrapper — absolutely positioned, a grid cell, a fixed
 * frame — and it takes exactly that box. When the parent's height is
 * indefinite (ordinary flow), it falls back to full width at a 3:2 aspect
 * ratio instead of collapsing. In a shrink-to-fit parent (a float,
 * width:max-content, an unsized absolute wrapper), percentages have
 * nothing to resolve against — size the slot or its wrapper explicitly
 * there. For a fixed-size slot, set
 * width/height on the element itself (inline style), which overrides the
 * default. When
 * layering content above a slot (full-bleed layouts), make the overlay
 * click-through — pointer-events: none on scrims/text plates, re-enabled
 * on interactive children — so the slot's hover controls stay reachable.
 * Keep the slot's bottom-left corner visually clear as well: the credit
 * overlay renders there, and a dark fade or text plate covering it hides
 * the attribution Unsplash's terms require — end the fade above that
 * corner, or keep it nearly transparent where the credit sits.
 *
 * Usage:
 *   <div style="position:relative;width:100%;height:100%">      <!-- full-bleed: -->
 *     <image-slot id="bg" shape="rect"></image-slot>            <!-- fills the wrapper -->
 *   </div>
 *   <image-slot id="hero"   style="width:800px;height:450px" shape="rounded" radius="20"
 *               placeholder="Drop a hero image"></image-slot>
 *   <image-slot id="avatar" style="width:120px;height:120px" shape="circle"></image-slot>
 *   <image-slot id="kite"   style="width:300px;height:300px"
 *               mask="polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"></image-slot>
 */
/* END USAGE */

(() => {
  const STATE_FILE = '.image-slots.state.json';

  // Unsplash terms require visible attribution wherever their photos
  // display, and every link back to unsplash.com must carry utm referral
  // params. Two render-time rules enforce that here:
  //  - an Unsplash-src slot with NO credit attribute renders an error
  //    tile INSTEAD of the photo (an uncredited Unsplash photo on screen
  //    is itself the terms violation, so it never renders bare);
  //  - rendered credit links pointing at unsplash.com get the referral
  //    params appended when absent (credit-href values live in page
  //    content that can't be edited after the fact).
  // Keep the utm_source value in sync with UTM_SOURCE in
  // platform/web-agent/unsplash.ts — this file is a project-local
  // artifact and cannot import it (equality is pinned by tests).
  const UNSPLASH_HOMEPAGE_HREF = 'https://unsplash.com/?utm_source=claude_design&utm_medium=referral';
  // Host rule mirrors the hotlink validator that admits Unsplash srcs into
  // pages in the first place (cdn$ in unsplash.ts: apex or any subdomain)
  // — Unsplash+ results serve from plus.unsplash.com, not just images.*,
  // and an admitted-but-uncredited photo must error whatever unsplash
  // host it rides on.
  // Trailing-dot FQDNs (images.unsplash.com.) are the same host to the
  // browser but would miss the regex — strip one dot so the check fails
  // CLOSED (unrecognized-but-real Unsplash srcs must error, not render).
  const isUnsplashHost = u => {
    try {
      return /(^|\.)unsplash\.com$/.test(new URL(u, document.baseURI).hostname.replace(/\.$/, ''));
    } catch {
      return false;
    }
  };
  // Render-time referral normalization for links back to Unsplash:
  // appends utm_source/utm_medium when absent, preserves every existing
  // query param, never overwrites an existing utm_source, and passes
  // non-Unsplash URLs through untouched. Input is an ABSOLUTE validated
  // http(s) URL (the credit render funnel resolves + validates first).
  const withReferral = href => {
    try {
      const u = new URL(href);
      if (!/(^|\.)unsplash\.com$/.test(u.hostname.replace(/\.$/, ''))) {
        return href;
      }
      if (!u.searchParams.has('utm_source')) {
        u.searchParams.set('utm_source', 'claude_design');
      }
      if (!u.searchParams.has('utm_medium')) {
        u.searchParams.set('utm_medium', 'referral');
      }
      return u.toString();
    } catch (e) {
      return href;
    }
  };
  // 2× a ~600px slot in a 1920-wide deck — retina-sharp without making the
  // sidecar enormous. A 1200px WebP at q=0.85 is ~150-300KB.
  const MAX_DIM = 1200;
  // Raster formats only. SVG is excluded (can carry script; createImageBitmap
  // on SVG blobs is inconsistent). GIF is excluded because the canvas
  // re-encode keeps only the first frame, so an animated GIF would silently
  // go still — better to reject than surprise.
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

  // ── Shared sidecar store ────────────────────────────────────────────────
  // One fetch + immediate write-on-change for every <image-slot> on the
  // page. Reads via fetch() so viewing works anywhere the HTML and sidecar
  // are served together; writes go through window.omelette.writeFile, which
  // the host allowlists to *.state.json basenames only.
  const subs = new Set();
  let slots = {};
  // ids explicitly cleared before the sidecar fetch resolved — otherwise
  // the merge below can't tell "never set" from "just deleted" and would
  // resurrect the sidecar's stale value.
  const tombstones = new Set();
  let loaded = false;
  let loadP = null;
  function load() {
    if (loadP) return loadP;
    loadP = fetch(STATE_FILE).then(r => r.ok ? r.json() : null).then(j => {
      // Merge: sidecar loses to any in-memory change that raced ahead of
      // the fetch (drop or clear) so neither is clobbered by hydration.
      if (j && typeof j === 'object') {
        const merged = Object.assign({}, j, slots);
        // A framing-only write that raced ahead of hydration must not
        // drop a user image that's only on disk — inherit u from the
        // sidecar for any in-memory entry that lacks one.
        for (const k in slots) {
          if (merged[k] && !merged[k].u && j[k]) {
            merged[k].u = typeof j[k] === 'string' ? j[k] : j[k].u;
          }
        }
        for (const id of tombstones) delete merged[id];
        slots = merged;
      }
      tombstones.clear();
    }).catch(() => {}).then(() => {
      loaded = true;
      subs.forEach(fn => fn());
    });
    return loadP;
  }

  // Serialize writes so two near-simultaneous drops on different slots
  // can't reorder at the backend and leave the sidecar with only the
  // first. A save requested mid-flight just marks dirty and re-fires on
  // completion with the then-current slots.
  let saving = false;
  let saveDirty = false;
  // Unload-time flush: save()'s serialization defers a mid-RTT re-fire to a
  // .then that never runs in an unloading document, silently dropping a
  // pagehide commit. Post the current slots immediately instead — content
  // is a superset snapshot of any in-flight save's, the write is a
  // whole-file last-writer-wins replace, and postMessage FIFO delivers it
  // to the host after the in-flight one, so a backend-side reorder at
  // worst reproduces the dropped-commit outcome this flush improves on.
  // Guarded on the initial sidecar read: pre-hydration slots can miss
  // other slots' persisted entries, and flushing it would clobber them —
  // that narrow case stays best-effort (the in-memory merge in load()
  // cannot happen in an unloading document anyway).
  function flushNow() {
    if (!loaded) return;
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    try {
      Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {});
    } catch (e) {}
  }
  function save() {
    if (saving) {
      saveDirty = true;
      return;
    }
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    saving = true;
    Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {}).then(() => {
      saving = false;
      if (saveDirty) {
        saveDirty = false;
        save();
      }
    });
  }
  const S_MAX = 5;
  const clampS = s => Math.max(1, Math.min(S_MAX, s));

  // Normalize a stored slot value. Pre-reframe sidecars stored a bare
  // data-URL string; newer ones store {u, s, x, y}. Either shape is valid.
  function getSlot(id) {
    const v = slots[id];
    if (!v) return null;
    return typeof v === 'string' ? {
      u: v,
      s: 1,
      x: 0,
      y: 0
    } : v;
  }
  function setSlot(id, val) {
    if (!id) return;
    if (val) {
      slots[id] = val;
      tombstones.delete(id);
    } else {
      delete slots[id];
      if (!loaded) tombstones.add(id);
    }
    subs.forEach(fn => fn());
    // A drop is rare + high-value — write immediately so nav-away can't lose
    // it. Gate on the initial read so we don't overwrite a sidecar we haven't
    // merged yet; the merge in load() keeps this change once the read lands.
    if (loaded) save();else load().then(save);
  }

  // ── Image downscale ─────────────────────────────────────────────────────
  // Encode through a canvas so the sidecar carries resized bytes, not the
  // raw upload. Longest side is capped at 2× the slot's rendered width
  // (retina) and at MAX_DIM. WebP keeps alpha and is ~10× smaller than PNG
  // for photos, so there's no need for per-image format picking.
  async function toDataUrl(file, targetW) {
    const bitmap = await createImageBitmap(file);
    try {
      const cap = Math.min(MAX_DIM, Math.max(1, Math.round(targetW * 2)) || MAX_DIM);
      const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL('image/webp', 0.85);
    } finally {
      bitmap.close && bitmap.close();
    }
  }

  // ── Custom element ──────────────────────────────────────────────────────
  const stylesheet =
  // Fill the container by default: slots are usually placed inside a
  // sized wrapper (a hero frame, a grid cell, an inset:0 layer) and are
  // expected to take that box — a fixed intrinsic size would render as
  // a small tile in the corner of a full-bleed wrapper instead.
  // aspect-ratio is the companion fallback that keeps a bare slot
  // visible when the parent's height is indefinite: height:100%
  // resolves to auto there, and the ratio then derives height from
  // width instead of letting the slot collapse to zero height.
  // Explicit width/height on the element override all of this.
  // color:inherit (not a fixed near-black): the placeholder chrome —
  // empty-state icon/caption (currentColor) and the dashed ring — must
  // read on dark decks too, and the slide's own text color is the one
  // color guaranteed to contrast with the slide background. The soft
  // look comes from opacity on those parts, not from a baked-in alpha.
  ':host{display:block;position:relative;' + '  font:13px/1.3 system-ui,-apple-system,sans-serif;' + '  width:100%;height:100%;aspect-ratio:3/2}' + '.empty .cap,.empty .sub{opacity:.75}' + '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(127,127,127,.08)}' +
  // .frame img (clipped) and .spill (unclipped ghost + handles) share the
  // same left/top/width/height in frame-%, computed by _applyView(), so the
  // inside-mask crop and the outside-mask spill stay pixel-aligned.
  '.frame img{position:absolute;max-width:none;transform:translate(-50%,-50%);' + '  -webkit-user-drag:none;user-select:none;touch-action:none}' +
  // Reframe mode (double-click): the full image spills past the mask. The
  // spill layer is sized to the IMAGE bounds so its corners are where the
  // resize handles belong. The ghost <img> inside is translucent; the real
  // clipped <img> underneath shows the opaque in-mask crop.
  // popover=manual promotes the spill to the top layer on reframe, so it is
  // not clipped by any overflow:hidden / clip-path / scroll-container
  // ancestor (a plain z-index can't escape overflow clipping). UA popover
  // defaults (inset:0;margin:auto) are reset; _applyView sets viewport px.
  '.spill{position:fixed;margin:0;inset:auto;border:0;padding:0;background:transparent;' + '  overflow:visible;transform:translate(-50%,-50%);z-index:1;cursor:grab;touch-action:none}' + ':host([data-panning]) .spill{cursor:grabbing}' + '.spill .ghost{position:absolute;inset:0;width:100%;height:100%;opacity:.35;' + '  pointer-events:none;-webkit-user-drag:none;user-select:none;' + '  box-shadow:0 0 0 1px rgba(0,0,0,.2),0 12px 32px rgba(0,0,0,.2)}' + '.spill .handle{position:absolute;width:12px;height:12px;border-radius:50%;' + '  background:#fff;box-shadow:0 0 0 1.5px #c96442,0 1px 3px rgba(0,0,0,.3);' + '  transform:translate(-50%,-50%)}' + '.spill .handle[data-c=nw]{left:0;top:0;cursor:nwse-resize}' + '.spill .handle[data-c=ne]{left:100%;top:0;cursor:nesw-resize}' + '.spill .handle[data-c=sw]{left:0;top:100%;cursor:nesw-resize}' + '.spill .handle[data-c=se]{left:100%;top:100%;cursor:nwse-resize}' + ':host([data-reframe]){z-index:10}' + ':host([data-reframe]) .frame{box-shadow:0 0 0 2px #c96442}' + '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  cursor:pointer;user-select:none}' + '.empty svg{opacity:.45}' + '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' + '.empty .sub{font-size:11px}' + '.empty .sub u{text-underline-offset:2px}' + '.empty:hover .sub{opacity:1}' + ':host([data-over]) .frame{outline:2px solid #c96442;outline-offset:-2px;' + '  background:rgba(201,100,66,.10)}' + '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed currentColor;' + '  opacity:.35;transition:border-color .12s,opacity .12s}' + ':host([data-over]) .ring{border-color:#c96442;opacity:1}' + ':host([data-filled]) .ring{display:none}' +
  // Controls overlay INSIDE the frame, pinned to the top-right corner, so
  // a full-bleed slot in an overflow:hidden container still shows them
  // (the old below-mask placement got clipped). Credit sits bottom-left,
  // so top-right avoids collision. The blurred pill background keeps them
  // legible over the image.
  // The UA [popover] base rule styles the element in EVERY state (only
  // display:none is gated on :not(:popover-open), and the display:flex
  // below overrides that) — so the UA resets live HERE, like .spill's,
  // or the ordinary hover-state strip renders as a bordered Canvas box
  // centered by margin:auto. inset:auto precedes top/right (shorthand).
  '.ctl{position:absolute;inset:auto;top:8px;right:8px;margin:0;border:0;padding:0;' + '  background:transparent;overflow:visible;' + '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;' + '  white-space:nowrap}' +
  // While reframing, the spill owns the top layer and would swallow every
  // click on the in-frame controls. Promoting .ctl into the top layer
  // ABOVE the spill (shown after it — later popovers stack higher) keeps
  // Edit-as-toggle and Replace clickable mid-reframe. _applyView pins it
  // to the frame's top-right in viewport px (translateX(-100%)
  // right-aligns against the computed left edge); inset:auto clears the
  // base rule's top/right so the inline left/top position it alone.
  '.ctl:popover-open{position:fixed;inset:auto;transform:translateX(-100%)}' + ':host([data-filled][data-editable]:hover) .ctl,:host([data-reframe]) .ctl' + '  {opacity:1;pointer-events:auto}' + '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' + '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif;' + '  backdrop-filter:blur(6px)}' + '.ctl button:hover{background:rgba(0,0,0,.8)}' + '.err{position:absolute;left:8px;bottom:8px;right:8px;color:#b3261e;font-size:11px;' + '  background:rgba(255,255,255,.85);padding:4px 6px;border-radius:5px;pointer-events:none}' +
  // Replacement in flight: after a src swap the browser keeps painting
  // the PREVIOUS image until the new one decodes, so a Replace would
  // flash the old photo and then pop. Hide the stale frame (visibility,
  // not display — _applyView geometry still applies) and spin until the
  // new image reports in (load/error clears data-swapping).
  ':host([data-swapping]) .frame img{visibility:hidden}' + '.loading{position:absolute;inset:0;display:none;align-items:center;' + '  justify-content:center;pointer-events:none}' + ':host([data-swapping]) .loading{display:flex}' + '.loading::after{content:"";width:22px;height:22px;border-radius:50%;' + '  border:2px solid rgba(127,127,127,.25);border-top-color:currentColor;' + '  animation:om-slot-spin .7s linear infinite}' + '@keyframes om-slot-spin{to{transform:rotate(360deg)}}' +
  // Reduced motion: the static two-tone ring still reads as "working".
  '@media (prefers-reduced-motion:reduce){.loading::after{animation:none}}' + '.credit{position:absolute;left:6px;bottom:6px;max-width:calc(100% - 12px);display:none;' + '  padding:3px 7px;border-radius:5px;background:rgba(0,0,0,.55);color:#fff;' + '  font:10px/1.2 system-ui,-apple-system,sans-serif;text-decoration:none;' + '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(6px)}' +
  // The credit is a SPAN holding one or two <a>s (Unsplash's prescribed
  // form links the photographer AND Unsplash) — anchors style inline so
  // the overlay reads as one line of text.
  '.credit a{color:inherit;text-decoration:none}' + '.credit a:hover,.credit a:focus-visible{text-decoration:underline}' + ':host([data-filled][data-credit]) .credit{display:block}' +
  // Exports must ship JUST the image — no hover controls, no credit chip
  // (the host marks <html data-om-exporting> for the capture window; the
  // page-level hide script can't reach shadow DOM, this rule can).
  ':host-context([data-om-exporting]) .ctl,' + ':host-context([data-om-exporting]) .credit{display:none !important}' +
  // Print must ship just the image too: the hover-gated controls can be
  // mid-hover when print() fires, and the credit chip is screen chrome —
  // the same rule the capture window gets, keyed on print media instead
  // of the host's data-om-exporting mark (the print path sets no mark).
  '@media print{.ctl,.credit{display:none !important}}' +
  // No export-window mask rules here on purpose: the export capture
  // releases the replacement mask by REMOVING data-swapping (the
  // shadow-root pass in pages/export/shared.ts HIDE_EXPORT_CHROME_SCRIPT)
  // — attribute removal works in every engine (:host-context is
  // Chromium-only), is scoped by construction to slots actually
  // mid-swap, and hides the spinner through the same gate. A masked img
  // would otherwise be silently dropped from PPTX decks (the capture
  // walk skips visibility:hidden imgs).
  // Attribution error tile: REPLACES the photo when an Unsplash src has
  // no credit attribute — rendering the photo uncredited is the terms
  // violation, so the photo must not appear at all.
  // Calm and neutral on purpose (review feedback): the tile informs the
  // user; the fix instructions are machine-facing (usage docblock, tool
  // description, and the turn-end scan's bounce copy name the attributes
  // for the agent).
  '.attr-error{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  background:#f2f1ef;color:#6e6c66;user-select:none;' + '  font:13px/1.45 system-ui,-apple-system,sans-serif}' + '.attr-error svg{opacity:.55}' + '.attr-error .cap{max-width:92%;font-weight:500;letter-spacing:.01em}' + ':host([data-attribution-error]) .attr-error{display:flex}' + ':host([data-attribution-error]) .ring{display:none}';
  const icon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' + '<path d="m21 15-5-5L5 21"/></svg>';
  const warnIcon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>' + '<path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'mask', 'fit', 'placeholder', 'src', 'id', 'credit', 'credit-href'];
    }

    /** Duplicate-slide hook (called by deck-stage, see its
     *  _remintDuplicateIds): copy this id's stored image, if any, under a
     *  freshly minted key and return that key — so a duplicated slide's
     *  slot keeps its dropped photo instead of reverting to the
     *  placeholder. 'isFree' is the caller's uniqueness check (document
     *  ids); candidates must ALSO be unused in the sidecar, which can
     *  hold keys from other pages sharing the project root. (An EMPTY
     *  slot on another page leaves no sidecar entry, so its id is not
     *  detectable here — a minted key can collide with it and that slot
     *  would show this photo. Same blast radius as two pages reusing an
     *  id by hand, which the shared sidecar already permits.) Returns null
     *  when no id could be minted (caller strips the id, today's
     *  behavior). */
    static cloneSlot(fromId, isFree) {
      if (typeof fromId !== 'string' || !fromId) return null;
      // Pre-hydration the store can't veto candidates or source the copy
      // — degrade to the strip (today's behavior) rather than mint
      // against keys we can't see yet. Any rendered (= droppable) slot
      // means load() has already settled.
      if (!loaded) return null;
      const stem = fromId.replace(/-\d+$/, '') || fromId;
      for (let n = 2; n < 100; n++) {
        const toId = stem + '-' + n;
        if (toId === fromId) continue;
        if (slots[toId] !== undefined) {
          // Reuse a key holding this exact value (bytes AND crop) if no
          // live element here owns it — a duplicate op the host refused
          // after minting leaves such a key behind, and reusing keeps
          // refused retries from accumulating one orphaned copy per
          // attempt. Full equality (not just bytes) so a byte-identical
          // key another PAGE owns with its own crop is stepped past, not
          // adopted or rewritten. (Entries without .u never match.)
          const prev = getSlot(toId);
          const cur = getSlot(fromId);
          if (!(prev && cur && prev.u && prev.u === cur.u && prev.s === cur.s && prev.x === cur.x && prev.y === cur.y && (typeof isFree !== 'function' || isFree(toId)))) continue;
          return toId;
        }
        if (typeof isFree === 'function' && !isFree(toId)) continue;
        const v = getSlot(fromId);
        if (v) setSlot(toId, Object.assign({}, v));
        return toId;
      }
      return null;
    }
    constructor() {
      super();
      // clonable: rail thumbnails deep-clone slides and carry this shadow
      // along; reuse an already-cloned root so upgrade-after-clone works.
      // (Deliberately NOT serializable — a getHTML consumer would embed
      // multi-MB sidecar data-URLs into serialized page HTML.)
      const root = this.shadowRoot || this.attachShadow({
        mode: 'open',
        clonable: true
      });
      // .spill and .ctl sit OUTSIDE .frame so overflow:hidden + border-radius
      // on the frame (circle, pill, rounded) can't clip them.
      root.innerHTML = '<style>' + stylesheet + '</style>' + '<div class="frame" part="frame">' + '  <img part="image" alt="" draggable="false" style="display:none">' + '  <div class="empty" part="empty">' + icon + '    <div class="cap"></div>' + '    <div class="sub">or <u>browse files</u></div></div>' + '  <div class="attr-error" part="attribution-error">' + warnIcon + '    <div class="cap">This photo needs attribution</div></div>' + '  <div class="loading" part="loading"></div>' + '  <div class="ring" part="ring"></div>' + '</div>' +
      // Outside .frame, like .spill/.ctl — the frame's overflow:hidden +
      // border-radius/clip-path would cut the credit off on circle/pill/mask.
      // A SPAN, not an <a>: the prescribed Unsplash credit holds two links
      // (photographer + Unsplash), built per-render in _render().
      '<span class="credit" part="credit"></span>' + '<div class="spill" popover="manual" data-dc-edit-transparent>' + '  <img class="ghost" alt="" draggable="false">' + '  <div class="handle" data-c="nw"></div><div class="handle" data-c="ne"></div>' + '  <div class="handle" data-c="sw"></div><div class="handle" data-c="se"></div>' + '</div>' +
      // data-dc-edit-transparent: the DC editor's edit-mode picker lets
      // clicks through for chrome marked with it (EDIT_TRANSPARENT_SEL)
      // — without it, Replace/Edit clicks in Edit mode are swallowed by
      // element selection and the controls look dead.
      '<div class="ctl" popover="manual" data-dc-edit-transparent><button data-act="replace" title="Replace image">Replace</button>' + '  <button data-act="edit" title="Reframe image">Edit</button></div>' + '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._sub = root.querySelector('.sub');
      this._spill = root.querySelector('.spill');
      this._ctl = root.querySelector('.ctl');
      this._credit = root.querySelector('.credit');
      this._attrError = root.querySelector('.attr-error');
      // Credit clicks open the link, not browse/reframe.
      this._credit.addEventListener('click', e => e.stopPropagation());
      this._credit.addEventListener('dblclick', e => e.stopPropagation());
      this._ghost = root.querySelector('.ghost');
      this._err = null;
      this._input = root.querySelector('input');
      this._depth = 0;
      this._gen = 0;
      // Encode-in-flight marker (the owning _ingest generation): while set,
      // the same-src "nothing in flight" clear in _render must not fire —
      // the stored value still points at the OLD image until the encode
      // lands, so that clear would unmask the stale image mid-replace.
      this._swapGen = 0;
      // Render-owned swap in flight: set when _render assigns a new src,
      // cleared only by the img's own load/error (or the empty branch).
      // img.complete CANNOT stand in for this — setting src only QUEUES
      // the current-request swap (a microtask), so synchronously after an
      // assignment, complete still reports the OLD settled request. The
      // pick path does exactly that: the host sets src, credit, and
      // credit-href back-to-back in one task, and renders #2/#3 would
      // read the stale complete === true and drop the mask one render
      // after it was set.
      this._loadPending = false;
      // See _render's empty branch: a transient attribution-error wipe of a
      // showing image must make the follow-up render a replacement (spinner),
      // not a first fill (blank frame).
      this._hidShowing = false;
      this._view = {
        s: 1,
        x: 0,
        y: 0
      };
      this._subFn = () => this._render();
      // Shadow-DOM listeners live with the shadow DOM — bound once here so
      // disconnect/reconnect (e.g. React remount) doesn't stack handlers.
      this._empty.addEventListener('click', () => this._input.click());
      root.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (!act) return;
        // The hidden controls are opacity-0 but still tabbable — without
        // this gate a keyboard user could drive them on a read-only share
        // link (mirrors the dblclick handler's editable gate).
        if (!this.hasAttribute('data-editable')) return;
        if (act === 'replace') {
          this._exitReframe(true);
          // Host-owned picker (Unsplash modal; it also offers local import).
          this.dispatchEvent(new CustomEvent('image-slot:pick', {
            bubbles: true,
            composed: true,
            detail: {
              id: this.id || null
            }
          }));
        }
        if (act === 'edit') {
          if (!this._reframes()) return;
          if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
        }
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
      // naturalWidth/Height aren't known until load — re-apply so the cover
      // baseline is computed from real dimensions, not the 100%×100% fallback.
      // load/error also release the replacement-in-flight mask (via the
      // single discipline in _releaseMask): the swap is only revealed once
      // the new image can actually paint (on error the frame shows its
      // background, same as a fresh slot with a broken src).
      this._img.addEventListener('load', () => {
        this._loadPending = false;
        this._releaseMask(true);
        this._applyView();
      });
      this._img.addEventListener('error', () => {
        this._loadPending = false;
        this._releaseMask(true);
      });
      // Gated only on editable — any filled slot can be repositioned/scaled,
      // regardless of fit. Share links (no writeFile) stay static.
      this.addEventListener('dblclick', e => {
        if (!this.hasAttribute('data-editable') || !this._reframes()) return;
        e.preventDefault();
        if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
      });
      // Pan + resize both originate on the spill layer. A handle pointerdown
      // drives an aspect-locked resize anchored at the opposite corner; any
      // other pointerdown on the spill pans. Offsets are frame-% so a
      // reframed slot survives responsive resize / PPTX export.
      this._spill.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        e.stopPropagation();
        this._spill.setPointerCapture(e.pointerId);
        const rect = this.getBoundingClientRect();
        const fw = rect.width || 1,
          fh = rect.height || 1;
        const corner = e.target.getAttribute && e.target.getAttribute('data-c');
        let move;
        if (corner) {
          // Resize about the OPPOSITE corner. Viewport-px throughout (rect
          // fw/fh, not clientWidth) so the math survives a transform:scale()
          // ancestor — deck_stage renders slides scaled-to-fit.
          const iw = this._img.naturalWidth || 1,
            ih = this._img.naturalHeight || 1;
          const contain = (this.getAttribute('fit') || 'cover').toLowerCase() === 'contain';
          const base = contain ? Math.min(fw / iw, fh / ih) : Math.max(fw / iw, fh / ih);
          const sx = corner.includes('e') ? 1 : -1;
          const sy = corner.includes('s') ? 1 : -1;
          const s0 = this._view.s;
          const w0 = iw * base * s0,
            h0 = ih * base * s0;
          const cx0 = (50 + this._view.x) / 100 * fw;
          const cy0 = (50 + this._view.y) / 100 * fh;
          const ox = cx0 - sx * w0 / 2,
            oy = cy0 - sy * h0 / 2;
          const diag0 = Math.hypot(w0, h0);
          const ux = sx * w0 / diag0,
            uy = sy * h0 / diag0;
          move = ev => {
            const proj = (ev.clientX - rect.left - ox) * ux + (ev.clientY - rect.top - oy) * uy;
            const s = clampS(s0 * proj / diag0);
            const d = diag0 * s / s0;
            this._view.s = s;
            this._view.x = (ox + ux * d / 2) / fw * 100 - 50;
            this._view.y = (oy + uy * d / 2) / fh * 100 - 50;
            this._clampView();
            this._applyView();
          };
        } else {
          this.setAttribute('data-panning', '');
          const start = {
            px: e.clientX,
            py: e.clientY,
            x: this._view.x,
            y: this._view.y
          };
          move = ev => {
            this._view.x = start.x + (ev.clientX - start.px) / fw * 100;
            this._view.y = start.y + (ev.clientY - start.py) / fh * 100;
            this._clampView();
            this._applyView();
          };
        }
        const up = () => {
          try {
            this._spill.releasePointerCapture(e.pointerId);
          } catch {}
          this._spill.removeEventListener('pointermove', move);
          this._spill.removeEventListener('pointerup', up);
          this._spill.removeEventListener('pointercancel', up);
          this.removeAttribute('data-panning');
          this._dragUp = null;
        };
        // Stashed so _exitReframe (Escape / outside-click mid-drag) can
        // tear the capture + listeners down synchronously.
        this._dragUp = up;
        this._spill.addEventListener('pointermove', move);
        this._spill.addEventListener('pointerup', up);
        this._spill.addEventListener('pointercancel', up);
      });
      // Wheel zoom stays available inside reframe mode as a trackpad nicety —
      // zooms toward the cursor (offset' = cursor·(1-k) + offset·k).
      this.addEventListener('wheel', e => {
        if (!this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        const r = this.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width * 100 - 50;
        const cy = (e.clientY - r.top) / r.height * 100 - 50;
        const prev = this._view.s;
        const next = clampS(prev * Math.pow(1.0015, -e.deltaY));
        if (next === prev) return;
        const k = next / prev;
        this._view.s = next;
        this._view.x = cx * (1 - k) + this._view.x * k;
        this._view.y = cy * (1 - k) + this._view.y * k;
        this._clampView();
        this._applyView();
      }, {
        passive: false
      });
    }
    connectedCallback() {
      // Warn once per page — an id-less slot works for the session but
      // cannot persist, and two id-less slots would share nothing.
      if (!this.id && !ImageSlot._warned) {
        ImageSlot._warned = true;
        console.warn('<image-slot> without an id will not persist its dropped image.');
      }
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      subs.add(this._subFn);
      // The host may inject window.omelette.writeFile AFTER the first render;
      // re-render on hover so the editable-gated controls reliably appear.
      this.addEventListener('pointerenter', this._subFn);
      // width%/height% in _applyView encode the frame aspect at call time —
      // a host resize (responsive grid, pane divider) would stretch the
      // image until the next _render. Re-render on size change: _render()
      // re-seeds _view from stored before clamp/apply, so a shrink→grow
      // cycle round-trips instead of ratcheting x/y toward the narrower
      // frame's clamp range.
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this);
      load();
      this._render();
    }
    disconnectedCallback() {
      subs.delete(this._subFn);
      this.removeEventListener('pointerenter', this._subFn);
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
      if (this._ro) {
        this._ro.disconnect();
        this._ro = null;
      }
      // commit=false: a disconnect is not a user intent — committing here
      // would persist whatever half-finished drag a React remount or DOM
      // splice happened to interrupt. Deliberate exits commit on their own
      // paths (Escape/click-out/toggle), and unloads commit via pagehide.
      this._exitReframe(false);
    }
    _enterReframe() {
      if (this.hasAttribute('data-reframe')) return;
      this.setAttribute('data-reframe', '');
      this._signalReframe(true);
      // Best-effort commit when the document unloads mid-reframe (a host
      // navigation racing the enter signal, a manual reload, tab close):
      // the sidecar write rides the host bridge, which outlives this
      // document, so the crop survives even though the mode dies with the
      // DOM. Held on the instance so _exitReframe detaches exactly what
      // was attached.
      this._pagehide = () => {
        this._exitReframe(true);
        flushNow();
      };
      window.addEventListener('pagehide', this._pagehide);
      // Promote spill to the top layer, then keep it pinned over the frame:
      // scroll/resize cover the common cases, and a per-frame rect check
      // catches layout shifts that fire neither (an image above finishing
      // load, streamed DOM pushing the slot down, an ancestor transform
      // change) so the overlay can't detach from the frame.
      try {
        this._spill.showPopover();
      } catch {}
      // After the spill, so the controls stack above it in the top layer.
      try {
        this._ctl.showPopover();
      } catch {}
      this._reposition = () => {
        if (this.hasAttribute('data-reframe')) this._applyView();
      };
      window.addEventListener('scroll', this._reposition, true);
      window.addEventListener('resize', this._reposition);
      this._lastRect = '';
      this._watch = () => {
        if (!this.hasAttribute('data-reframe')) return;
        const r = this.getBoundingClientRect();
        const key = r.left + ',' + r.top + ',' + r.width + ',' + r.height;
        if (key !== this._lastRect) {
          this._lastRect = key;
          this._applyView();
        }
        this._watchId = requestAnimationFrame(this._watch);
      };
      this._watchId = requestAnimationFrame(this._watch);
      this._applyView();
      // Close on click outside (the spill handler stopPropagation()s so
      // in-image drags don't reach this) and on Escape. Listeners are held
      // on the instance so _exitReframe / disconnectedCallback can detach
      // exactly what was attached.
      this._outside = e => {
        if (e.composedPath && e.composedPath().includes(this)) return;
        this._exitReframe(true);
      };
      this._esc = e => {
        if (e.key === 'Escape') this._exitReframe(true);
      };
      document.addEventListener('pointerdown', this._outside, true);
      document.addEventListener('keydown', this._esc, true);
    }
    _exitReframe(commit) {
      if (!this.hasAttribute('data-reframe')) return;
      if (this._dragUp) this._dragUp();
      this.removeAttribute('data-reframe');
      this.removeAttribute('data-panning');
      if (this._outside) document.removeEventListener('pointerdown', this._outside, true);
      if (this._esc) document.removeEventListener('keydown', this._esc, true);
      this._outside = this._esc = null;
      if (this._reposition) {
        window.removeEventListener('scroll', this._reposition, true);
        window.removeEventListener('resize', this._reposition);
        this._reposition = null;
      }
      if (this._watchId) {
        cancelAnimationFrame(this._watchId);
        this._watchId = 0;
      }
      if (this._pagehide) {
        window.removeEventListener('pagehide', this._pagehide);
        this._pagehide = null;
      }
      try {
        this._spill.hidePopover();
      } catch {}
      try {
        this._ctl.hidePopover();
      } catch {}
      this._ctl.style.left = '';
      this._ctl.style.top = '';
      if (commit) this._commitView();
      this._signalReframe(false);
    }

    // Reframe state lives only in this DOM until commit, invisible to the
    // host's dirty signals — announce enter/exit so the host can hold
    // auto-reloads for exactly the gesture (the guest bundle forwards
    // image-slot:reframe to the host as imageSlotReframe). Dispatched on
    // the element (composed, so it escapes shadow roots) while connected;
    // a disconnected exit (disconnectedCallback) falls back to document so
    // the host still hears it.
    _signalReframe(active) {
      const target = this.isConnected ? this : document;
      target.dispatchEvent(new CustomEvent('image-slot:reframe', {
        bubbles: true,
        composed: true,
        detail: {
          active: active,
          id: this.id || null
        }
      }));
    }

    // Public: host's "Import from computer" calls this to run local browse.
    openFilePicker() {
      this._exitReframe(true);
      this._input.click();
    }
    attributeChangedCallback() {
      if (this.shadowRoot) this._render();
    }

    // handleEvent — one listener object for all four drag events keeps the
    // add/remove symmetric and the depth counter correct.
    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        // Without preventDefault the browser never fires 'drop'.
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        // dragenter/leave fire for every descendant crossing — count depth
        // so hovering the icon inside the empty state doesn't flicker.
        if (--this._depth <= 0) {
          this._depth = 0;
          this.removeAttribute('data-over');
        }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }
    async _ingest(file) {
      this._setError(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        this._setError('Drop a PNG, JPEG, WebP, or AVIF image.');
        return;
      }
      // toDataUrl can take hundreds of ms on a large photo. A Clear or a
      // newer drop during that window would be clobbered when this await
      // resumes — bump + capture a generation so stale encodes bail.
      const gen = ++this._gen;
      // Replacing a shown image: surface the swap through the encode too,
      // not just the decode — otherwise the old photo sits there with no
      // feedback while the canvas re-encode runs. An empty slot keeps its
      // placeholder (no spinner) until the encode lands, as before.
      // _swapGen guards the mask against re-renders DURING the encode
      // (pointerenter, ResizeObserver, another slot's store write): the
      // stored value still resolves to the old image there, so _render's
      // same-src clear would otherwise unmask it mid-replace.
      if (this.hasAttribute('data-filled')) {
        this.setAttribute('data-swapping', '');
        this._swapGen = gen;
      }
      try {
        const w = this.clientWidth || this.offsetWidth || MAX_DIM;
        const url = await toDataUrl(file, w);
        if (gen !== this._gen) return;
        // Only exit reframe once the new image is in hand — a rejected type
        // or decode failure leaves the in-progress crop untouched.
        this._exitReframe(false);
        // Clear BEFORE setSlot: its synchronous re-render must see no
        // pending encode, so a byte-identical re-upload (same data URL, no
        // load event coming) still clears the mask via the complete branch.
        this._swapGen = 0;
        const val = {
          u: url,
          s: 1,
          x: 0,
          y: 0
        };
        setSlot(this.id || '', val);
        // Keep a session-local copy for id-less slots so the drop still
        // shows, even though it cannot persist.
        if (!this.id) {
          this._local = val;
          this._render();
        }
      } catch (err) {
        if (gen !== this._gen) return;
        this._swapGen = 0;
        // Reveal the kept old image — unless another replacement (a
        // remote pick's src swap) is still in flight, in which case the
        // mask stays until THAT image settles (its load/error releases).
        this._releaseMask();
        this._setError('Could not read that image.');
        console.warn('<image-slot> ingest failed:', err);
      }
    }
    _setError(msg) {
      if (this._err) {
        this._err.remove();
        this._err = null;
      }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => {
        if (this._err === d) {
          d.remove();
          this._err = null;
        }
      }, 3000);
    }

    // Reframing (pan/resize) is available on any filled slot — the user can
    // always reposition/scale. `fit` only sets the initial baseline (see
    // _geom): contain starts fully-visible, cover starts frame-filling.
    _reframes() {
      return this.hasAttribute('data-filled');
    }

    // The single release discipline for the replacement-in-flight mask
    // (data-swapping). The mask comes off only when BOTH hold:
    //  - no encode is pending (_swapGen) — mid-encode the stored value
    //    still resolves to the old image, so any reveal paints it;
    //  - the frame img has settled on its current src — an unsettled src
    //    means some replacement is still in flight (e.g. a remote pick),
    //    whoever started it, and revealing would paint the previous
    //    frame. The load/error listeners pass settled=true (the event IS
    //    the settlement signal, per spec complete is true by then);
    //    other callers rely on the complete flag (covers loaded AND
    //    failed).
    // Every release path funnels through here EXCEPT _render's empty
    // branch (the img is being cleared — nothing will ever settle).
    _releaseMask(settled) {
      if (!this._swapGen && !this._loadPending && (settled || this._img.complete)) {
        this.removeAttribute('data-swapping');
      }
    }

    // Baseline geometry, shared by clamp/apply/resize. `base` is the scale at
    // view-scale s=1: cover = fill the frame (overflow on the looser axis),
    // contain = fit fully inside (letterboxed). Zooming a contain image past
    // s where it overflows naturally becomes a crop. Null until the img has
    // loaded (naturalWidth is 0 before that) or when the slot has no layout
    // box — ResizeObserver fires with a 0×0 rect under display:none, and
    // clamping against a degenerate 1×1 frame would silently pull the stored
    // pan toward zero.
    _geom() {
      const iw = this._img.naturalWidth,
        ih = this._img.naturalHeight;
      const fw = this.clientWidth,
        fh = this.clientHeight;
      if (!iw || !ih || !fw || !fh) return null;
      const contain = (this.getAttribute('fit') || 'cover').toLowerCase() === 'contain';
      const base = contain ? Math.min(fw / iw, fh / ih) : Math.max(fw / iw, fh / ih);
      return {
        iw,
        ih,
        fw,
        fh,
        base
      };
    }
    _clampView() {
      // Pan range on each axis is half the overflow past the frame edge.
      const g = this._geom();
      if (!g) return;
      const mx = Math.max(0, (g.iw * g.base * this._view.s / g.fw - 1) * 50);
      const my = Math.max(0, (g.ih * g.base * this._view.s / g.fh - 1) * 50);
      this._view.x = Math.max(-mx, Math.min(mx, this._view.x));
      this._view.y = Math.max(-my, Math.min(my, this._view.y));
    }
    _applyView() {
      const g = this._geom();
      // Top-layer controls: pin to the frame's top-right in viewport px
      // (the same 8px inset as the in-frame layout; unscaled — top-layer UI
      // reads as chrome, not page content). BEFORE the geometry branch:
      // placement needs only the frame rect, and a not-yet-loaded or broken
      // src must not leave the promoted strip floating unpositioned. Gated
      // on the popover actually being open: without the Popover API,
      // showPopover() threw (swallowed in _enterReframe), .ctl stays in
      // its in-frame absolute layout, and viewport-px coordinates would
      // shove it off-frame — and matches(':popover-open') itself throws
      // there (unknown pseudo-class), hence the try/catch.
      if (this.hasAttribute('data-reframe')) {
        let onTop = false;
        try {
          onTop = this._ctl.matches(':popover-open');
        } catch {}
        if (onTop) {
          const r = this.getBoundingClientRect();
          this._ctl.style.left = r.right - 8 + 'px';
          this._ctl.style.top = r.top + 8 + 'px';
        }
      }
      if (!g) {
        // Dimensions not known yet (before img load) — centered fit so there
        // is no flash of an unpositioned image before the geometry lands.
        const contain = (this.getAttribute('fit') || 'cover').toLowerCase() === 'contain';
        this._img.style.width = '100%';
        this._img.style.height = '100%';
        this._img.style.left = '50%';
        this._img.style.top = '50%';
        this._img.style.objectFit = contain ? 'contain' : 'cover';
        return;
      }
      // Baseline (cover-fill or contain-fit) × view scale. Width/height and
      // left/top are all frame-% — depends only on the frame aspect ratio, so
      // a responsive resize keeps the same crop. The spill layer mirrors the
      // same box so its corners = image corners.
      const k = g.base * this._view.s;
      const w = g.iw * k / g.fw * 100 + '%';
      const h = g.ih * k / g.fh * 100 + '%';
      const l = 50 + this._view.x + '%';
      const t = 50 + this._view.y + '%';
      this._img.style.width = w;
      this._img.style.height = h;
      this._img.style.left = l;
      this._img.style.top = t;
      this._img.style.objectFit = '';
      if (this.hasAttribute('data-reframe')) {
        // Top-layer spill: position in viewport px over the frame. The top
        // layer escapes ancestor transforms entirely, so EVERY term must be
        // in viewport units: getBoundingClientRect gives the frame's scaled
        // origin AND size, and the rect/layout ratio rescales the ghost —
        // sizing from layout px alone renders it 1/scale too large under a
        // scaled deck slide. Inner ghost + handles stay box-relative.
        const r = this.getBoundingClientRect();
        const sx = g.fw ? r.width / g.fw : 1;
        const sy = g.fh ? r.height / g.fh : 1;
        this._spill.style.width = g.iw * k * sx + 'px';
        this._spill.style.height = g.ih * k * sy + 'px';
        this._spill.style.left = r.left + (50 + this._view.x) / 100 * r.width + 'px';
        this._spill.style.top = r.top + (50 + this._view.y) / 100 * r.height + 'px';
      }
    }
    _commitView() {
      const v = {
        s: this._view.s,
        x: this._view.x,
        y: this._view.y
      };
      if (this._userUrl) v.u = this._userUrl;
      // Framing-only (no u) persists too so an author-src slot remembers its
      // crop; clearing the sidecar still falls through to src=.
      if (this.id) setSlot(this.id, v);else {
        this._local = v;
      }
    }
    _render() {
      // Shape / mask. Presets use border-radius so the dashed ring can
      // follow the rounded outline; clip-path is only applied for an
      // explicit `mask` (the ring is hidden there since a rectangle
      // dashed border chopped by an arbitrary polygon looks broken).
      const mask = this.getAttribute('mask');
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';else if (shape === 'pill') radius = '9999px';else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = mask ? '' : radius;
      this._frame.style.clipPath = mask || '';
      this._ring.style.borderRadius = mask ? '' : radius;
      this._ring.style.display = mask ? 'none' : '';

      // Controls and reframe entry gate on this so share links stay read-only.
      const editable = !!(window.omelette && window.omelette.writeFile);
      this.toggleAttribute('data-editable', editable);
      this._sub.style.display = editable ? '' : 'none';

      // Content. The sidecar is also writable by the agent's write_file
      // tool, so its value isn't guaranteed canvas-originated — only accept
      // data:image/ URLs from it. The `src` attribute is author-controlled
      // (Claude wrote it into the HTML) so it passes through unchanged.
      let stored = this.id ? getSlot(this.id) : this._local;
      if (stored && stored.u && !/^data:image\//i.test(stored.u)) stored = null;
      const srcAttr = this.getAttribute('src') || '';
      this._userUrl = stored && stored.u || null;
      const url = this._userUrl || srcAttr;
      // Don't clobber an in-flight reframe with a store-triggered re-render.
      if (!this.hasAttribute('data-reframe')) {
        this._view = {
          s: stored && Number.isFinite(stored.s) ? clampS(stored.s) : 1,
          x: stored && Number.isFinite(stored.x) ? stored.x : 0,
          y: stored && Number.isFinite(stored.y) ? stored.y : 0
        };
      }
      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';
      // Toggle via style.display — the [hidden] attribute alone loses to
      // the display:flex / display:block rules in the stylesheet above.
      // An Unsplash src with no credit attribute must NOT render — showing
      // the photo uncredited is the Unsplash-terms violation itself. The
      // error tile replaces the photo until the credit is written. A
      // user-dropped image is the user's own content and always renders.
      // Trimmed: credit is agent/user-editable content, and a whitespace-
      // only value must count as missing — otherwise it would suppress the
      // error tile AND render an empty credit box (no text, no links),
      // exactly the unattributed state this gate exists to prevent.
      const credit = (this.getAttribute('credit') || '').trim();
      const attrError = !!(!credit && !this._userUrl && srcAttr && isUnsplashHost(srcAttr));
      this.toggleAttribute('data-attribution-error', attrError);
      if (url && !attrError) {
        const prev = this._img.getAttribute('src');
        if (prev !== url) {
          // Replacing an already-shown image: mark the swap BEFORE setting
          // src so the stale frame is never revealed (see the data-swapping
          // stylesheet rules). First fill (prev empty) keeps the existing
          // placeholder-until-load behavior — no spinner. _hidShowing
          // covers the pick path's transient attribution-error wipe: prev
          // is gone, but an image WAS showing, so this is a replacement.
          if (prev || this._hidShowing) this.setAttribute('data-swapping', '');
          // Mark the swap BEFORE assigning src: complete keeps reporting
          // the old settled request until the browser's
          // update-the-image-data microtask runs, so same-task re-renders
          // (the pick path's credit/credit-href setAttributes) need this
          // flag, not complete, to know a load is in flight.
          this._loadPending = true;
          this._img.src = url;
          this._ghost.src = url;
        } else {
          // Same-src re-render — release if settled, so an ingest-set
          // spinner can't stick after a byte-identical re-upload (same
          // data URL, no further load event ever fires).
          this._releaseMask();
        }
        this._hidShowing = false;
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
        this._clampView();
        this._applyView();
      } else {
        this.removeAttribute('data-swapping');
        // The src is being removed — no load/error will ever fire for it.
        this._loadPending = false;
        // A transient attribution-error wipe of a showing image happens on
        // the pick path: the host sets src one setAttribute before credit,
        // so render N hides the old image (attrError) and render N+1
        // restores a URL. Remember the wipe so that restore renders as a
        // replacement (spinner), not a first fill (blank frame).
        this._hidShowing = attrError && !!this._img.getAttribute('src');
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._ghost.removeAttribute('src');
        // The error tile owns the blocked-photo state; .empty stays for
        // the genuinely-empty slot.
        this._empty.style.display = attrError ? 'none' : 'flex';
        this.removeAttribute('data-filled');
      }

      // Credit belongs to the author src, so a user drop hides it.
      // textContent + the http(s)-only funnel keep external strings inert.
      const showCredit = !!(url && credit && !this._userUrl && !attrError);
      this._credit.textContent = '';
      if (showCredit) {
        // Validate once (resolved against the document, http(s) only),
        // then append the terms-required utm referral params to links
        // that point back at unsplash.com.
        let href = '';
        const rawHref = this.getAttribute('credit-href') || '';
        if (rawHref) {
          try {
            const u = new URL(rawHref, document.baseURI);
            if (u.protocol === 'http:' || u.protocol === 'https:') {
              href = withReferral(u.href);
            }
          } catch {}
        }
        const mkLink = (text, linkHref) => {
          const a = document.createElement('a');
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
          a.setAttribute('href', linkHref);
          a.textContent = text;
          return a;
        };
        // Unsplash's prescribed credit is TWO links — the photographer's
        // name to their profile (credit-href) and 'Unsplash' to the
        // homepage. Render that split whenever the text has the canonical
        // shape; other text keeps the legacy single-link rendering.
        const m = /^Photo by (.+) on Unsplash$/.exec(credit);
        if (m) {
          this._credit.appendChild(document.createTextNode('Photo by '));
          this._credit.appendChild(href ? mkLink(m[1], href) : document.createTextNode(m[1]));
          this._credit.appendChild(document.createTextNode(' on '));
          this._credit.appendChild(mkLink('Unsplash', UNSPLASH_HOMEPAGE_HREF));
        } else if (href) {
          this._credit.appendChild(mkLink(credit, href));
        } else {
          this._credit.textContent = credit;
        }
      }
      this.toggleAttribute('data-credit', showCredit);
    }
  }
  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/image-slot.js", error: String((e && e.message) || e) }); }

__ds_ns.EventCard = __ds_scope.EventCard;

__ds_ns.GalleryGrid = __ds_scope.GalleryGrid;

__ds_ns.Hero = __ds_scope.Hero;

__ds_ns.OfficerCard = __ds_scope.OfficerCard;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.TextArea = __ds_scope.TextArea;

__ds_ns.Footer = __ds_scope.Footer;

__ds_ns.NavBar = __ds_scope.NavBar;

__ds_ns.AboutPage = __ds_scope.AboutPage;

__ds_ns.ContactPage = __ds_scope.ContactPage;

__ds_ns.EventsPage = __ds_scope.EventsPage;

__ds_ns.GalleryPage = __ds_scope.GalleryPage;

__ds_ns.HomePage = __ds_scope.HomePage;

__ds_ns.JoinPage = __ds_scope.JoinPage;

__ds_ns.Section = __ds_scope.Section;

__ds_ns.WebsiteApp = __ds_scope.WebsiteApp;

})();
