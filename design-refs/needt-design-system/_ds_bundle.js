/* @ds-bundle: {"format":4,"namespace":"NeedtDesignSystem_053851","components":[{"name":"Avatar","sourcePath":"components/data-display/Avatar.jsx"},{"name":"CountBadge","sourcePath":"components/data-display/CountBadge.jsx"},{"name":"ProgressRing","sourcePath":"components/data-display/ProgressRing.jsx"},{"name":"StatusDot","sourcePath":"components/data-display/StatusDot.jsx"},{"name":"TagPill","sourcePath":"components/data-display/TagPill.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"SearchInput","sourcePath":"components/forms/SearchInput.jsx"},{"name":"Icon","sourcePath":"components/icons/Icon.jsx"},{"name":"Breadcrumb","sourcePath":"components/navigation/Breadcrumb.jsx"},{"name":"NavItem","sourcePath":"components/navigation/NavItem.jsx"},{"name":"SectionHeader","sourcePath":"components/navigation/SectionHeader.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"TeamSwitcher","sourcePath":"components/navigation/TeamSwitcher.jsx"},{"name":"Card","sourcePath":"components/surfaces/Card.jsx"},{"name":"ColumnHeader","sourcePath":"components/surfaces/ColumnHeader.jsx"},{"name":"TaskCard","sourcePath":"components/surfaces/TaskCard.jsx"}],"sourceHashes":{"components/data-display/Avatar.jsx":"31fe5dd91430","components/data-display/CountBadge.jsx":"2b2c8b7f6abd","components/data-display/ProgressRing.jsx":"b1d542bb90ee","components/data-display/StatusDot.jsx":"b51b598ed905","components/data-display/TagPill.jsx":"cc33f86322f8","components/forms/Button.jsx":"fbef340a2969","components/forms/IconButton.jsx":"87506825826d","components/forms/SearchInput.jsx":"e50862cd7cdc","components/icons/Icon.jsx":"be03763579e7","components/navigation/Breadcrumb.jsx":"ac7a1ff7ff49","components/navigation/NavItem.jsx":"d6bb84ba323b","components/navigation/SectionHeader.jsx":"75cd36ec2e0b","components/navigation/Tabs.jsx":"91cf05070af7","components/navigation/TeamSwitcher.jsx":"b8ec40429ee3","components/surfaces/Card.jsx":"2e3c5849547c","components/surfaces/ColumnHeader.jsx":"e3953f9dd9fb","components/surfaces/TaskCard.jsx":"952cce08c853","ui_kits/dashboard/KitApp.jsx":"ccee34286ee3","ui_kits/dashboard/KitBoard.jsx":"ff4df961b794","ui_kits/dashboard/KitHeader.jsx":"28ca1d55948e","ui_kits/dashboard/KitPlaceholder.jsx":"6c5d734314aa","ui_kits/dashboard/KitSidebar.jsx":"51b3d5dac6e6"},"inlinedExternals":[],"unexposedExports":[{"name":"iconNames","sourcePath":"components/icons/Icon.jsx"},{"name":"iconPaths","sourcePath":"components/icons/Icon.jsx"}]} */

(() => {

const __ds_ns = (window.NeedtDesignSystem_053851 = window.NeedtDesignSystem_053851 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/data-display/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Avatar({
  initials,
  size = 20,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--radius-full)",
      fontWeight: "var(--weight-semibold)",
      color: "rgba(255,255,255,0.9)",
      width: size,
      height: size,
      fontSize: size * 0.42,
      backgroundImage: "var(--avatar-gradient)",
      ...style
    }
  }, rest), initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data-display/CountBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function CountBadge({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: "theme-surface",
    style: {
      display: "inline-flex",
      alignItems: "center",
      borderRadius: "var(--radius-sm)",
      backgroundColor: "var(--surface-2)",
      padding: "0 var(--space-1-5)",
      fontSize: "var(--text-xxs)",
      color: "var(--text-muted)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { CountBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/CountBadge.jsx", error: String((e && e.message) || e) }); }

// components/data-display/ProgressRing.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ProgressRing({
  value,
  size = 15,
  stroke = 2,
  style,
  ...rest
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = clamped / 100 * c;
  const complete = clamped >= 100;
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    style: {
      flexShrink: 0,
      transform: "rotate(-90deg)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: "var(--border-strong)",
    strokeWidth: stroke
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: complete ? "var(--dot-done)" : "var(--text-2)",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeDasharray: `${dash} ${c}`
  }));
}
Object.assign(__ds_scope, { ProgressRing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/ProgressRing.jsx", error: String((e && e.message) || e) }); }

// components/data-display/StatusDot.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const statusColors = {
  todo: "var(--dot-todo)",
  progress: "var(--dot-progress)",
  review: "var(--dot-review)",
  done: "var(--dot-done)"
};
function StatusDot({
  status = "todo",
  size = 8,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-block",
      flexShrink: 0,
      width: size,
      height: size,
      borderRadius: "var(--radius-full)",
      backgroundColor: statusColors[status] || statusColors.todo,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { StatusDot });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/StatusDot.jsx", error: String((e && e.message) || e) }); }

// components/data-display/TagPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tagStyles = {
  blue: {
    bg: "var(--tag-blue-bg)",
    fg: "var(--tag-blue-fg)"
  },
  amber: {
    bg: "var(--tag-amber-bg)",
    fg: "var(--tag-amber-fg)"
  },
  purple: {
    bg: "var(--tag-purple-bg)",
    fg: "var(--tag-purple-fg)"
  }
};
function TagPill({
  label,
  color = "blue",
  style,
  ...rest
}) {
  const s = tagStyles[color] || tagStyles.blue;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: "theme-surface",
    style: {
      display: "inline-flex",
      alignItems: "center",
      borderRadius: "var(--radius-full)",
      padding: "2.5px 9px",
      fontSize: "var(--text-xxs)",
      fontWeight: "var(--weight-medium)",
      lineHeight: "var(--leading-none)",
      backgroundColor: s.bg,
      color: s.fg,
      ...style
    }
  }, rest), label);
}
Object.assign(__ds_scope, { TagPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/TagPill.jsx", error: String((e && e.message) || e) }); }

// components/icons/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Icon set copied verbatim from the Needt product source (src/components/Icon.tsx).
// 24×24 grid, stroke-only, currentColor, 1.6 stroke, round caps + joins.
const iconPaths = {
  home: ["M3 9.5 12 3l9 6.5", "M5 9v11h14V9", "M9 20v-6h6v6"],
  "check-square": [{
    rect: [3, 3, 18, 18, 3]
  }, "m8 12 3 3 5-6"],
  file: ["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 3v5h5"],
  folder: ["M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  calendar: [{
    rect: [3, 4.5, 18, 16, 2.5]
  }, "M3 9h18M8 2.5v4M16 2.5v4"],
  message: ["M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"],
  "credit-card": [{
    rect: [3, 5, 18, 14, 2.5]
  }, "M3 10h18M7 15h4"],
  zap: ["M13 2 4 14h7l-1 8 9-12h-7z"],
  users: [{
    circle: [9, 8, 3.2]
  }, "M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5", "M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20c0-2.4-1-4.2-2.5-5.2"],
  "user-cog": [{
    circle: [9, 8, 3.2]
  }, "M3 20c0-3.3 2.7-5.5 6-5.5c1 0 1.9.2 2.7.5", {
    circle: [17.5, 16.5, 2.2]
  }, "M17.5 13v1M17.5 19v1M20.5 16.5h-1M15.5 16.5h-1"],
  workflow: [{
    rect: [3, 4, 7, 6, 1.5]
  }, {
    rect: [14, 14, 7, 6, 1.5]
  }, "M6.5 10v4a3 3 0 0 0 3 3H14"],
  store: ["M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9", "M3 6h18l-1 4a3 3 0 0 1-6 0 3 3 0 0 1-6 0L3 6z"],
  building: [{
    rect: [5, 3, 14, 18, 1.5]
  }, "M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4"],
  id: [{
    rect: [3, 5, 18, 14, 2.5]
  }, {
    circle: [9, 11, 2]
  }, "M6 16c.5-1.4 1.7-2 3-2s2.5.6 3 2M14 9h4M14 13h3"],
  search: [{
    circle: [11, 11, 7]
  }, "m20 20-3.5-3.5"],
  "chevron-up-down": ["m8 9 4-4 4 4M8 15l4 4 4-4"],
  "chevron-right": ["m9 6 6 6-6 6"],
  "chevron-down": ["m6 9 6 6 6-6"],
  plus: ["M12 5v14M5 12h14"],
  more: [{
    circle: [5, 12, 1.4]
  }, {
    circle: [12, 12, 1.4]
  }, {
    circle: [19, 12, 1.4]
  }],
  filter: ["M3 5h18l-7 8v6l-4-2v-4L3 5z"],
  sort: ["M7 4v16M7 20l-3-3M7 4l3 3M17 20V4M17 4l-3 3M17 20l3-3"],
  paperclip: ["M20 11.5 12 19a4.5 4.5 0 0 1-6.4-6.4L14 4.3a3 3 0 0 1 4.2 4.2L9.8 17a1.5 1.5 0 0 1-2.1-2.1l7.4-7.4"],
  comment: ["M4 5h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"],
  clock: [{
    circle: [12, 12, 8.5]
  }, "M12 7.5V12l3 2"],
  sun: [{
    circle: [12, 12, 4]
  }, "M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"],
  moon: ["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"]
};
const iconNames = Object.keys(iconPaths);
function Icon({
  name,
  size = 16,
  strokeWidth = 1.6,
  color,
  style,
  className,
  ...rest
}) {
  const parts = iconPaths[name] || [];
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    className: className,
    style: {
      display: "block",
      flexShrink: 0,
      color: color || undefined,
      ...style
    }
  }, rest), parts.map((p, i) => typeof p === "string" ? /*#__PURE__*/React.createElement("path", {
    key: i,
    d: p
  }) : p.rect ? /*#__PURE__*/React.createElement("rect", {
    key: i,
    x: p.rect[0],
    y: p.rect[1],
    width: p.rect[2],
    height: p.rect[3],
    rx: p.rect[4]
  }) : /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: p.circle[0],
    cy: p.circle[1],
    r: p.circle[2]
  })));
}
Object.assign(__ds_scope, { iconPaths, iconNames, Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/icons/Icon.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  children,
  icon,
  variant = "secondary",
  disabled,
  style,
  ...rest
}) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-2)",
    borderRadius: "var(--radius-md)",
    padding: "6px var(--space-3)",
    fontSize: "var(--text-xs)",
    fontFamily: "var(--font-sans)",
    lineHeight: "var(--leading-snug)",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "var(--transition-surface)"
  };
  const variants = {
    secondary: {
      border: "1px solid var(--border)",
      background: "transparent",
      color: "var(--text-2)"
    },
    ghost: {
      border: "1px solid transparent",
      background: "transparent",
      color: "var(--text-muted)"
    },
    dashed: {
      border: "1px dashed var(--border)",
      background: "transparent",
      color: "var(--text-muted)",
      borderRadius: "var(--radius-xl)",
      justifyContent: "center",
      width: "100%",
      padding: "10px var(--space-3)",
      gap: "var(--space-1-5)"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    onMouseEnter: e => {
      if (!disabled) {
        e.currentTarget.style.background = "var(--surface-hover)";
        e.currentTarget.style.color = "var(--text)";
      }
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.color = variants[variant].color;
    },
    style: {
      ...base,
      ...variants[variant],
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 15
  }) : null, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function IconButton({
  icon,
  size = 34,
  iconSize = 16,
  bordered = true,
  label,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    onMouseEnter: e => {
      e.currentTarget.style.background = "var(--surface-hover)";
      e.currentTarget.style.color = "var(--text)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.color = bordered ? "var(--text-2)" : "var(--text-muted)";
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: "var(--radius-md)",
      border: bordered ? "1px solid var(--border)" : "1px solid transparent",
      background: "transparent",
      color: bordered ? "var(--text-2)" : "var(--text-muted)",
      cursor: "pointer",
      transition: "var(--transition-surface)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: iconSize
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchInput.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SearchInput({
  placeholder = "Search",
  value,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "theme-surface",
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      borderRadius: "var(--radius-xl)",
      border: "1px solid var(--border)",
      background: "var(--surface)",
      padding: "var(--space-2) var(--space-3)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 15,
    color: "var(--text-muted)"
  }), /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    style: {
      width: "100%",
      minWidth: 0,
      background: "transparent",
      border: "none",
      outline: "none",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      color: "var(--text)"
    }
  }));
}
Object.assign(__ds_scope, { SearchInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchInput.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Breadcrumb.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Breadcrumb({
  items,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-1-5)",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "home",
    size: 15
  }), items.map((item, i) => {
    const last = i === items.length - 1;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: item
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "chevron-right",
      size: 13
    }), last ? /*#__PURE__*/React.createElement("span", {
      className: "theme-surface",
      style: {
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-2)",
        padding: "2px var(--space-2)",
        color: "var(--text-2)"
      }
    }, item) : /*#__PURE__*/React.createElement("span", null, item));
  }));
}
Object.assign(__ds_scope, { Breadcrumb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Breadcrumb.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function NavItem({
  label,
  icon,
  active = false,
  onClick,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    className: "theme-surface",
    onMouseEnter: e => {
      if (!active) {
        e.currentTarget.style.background = "var(--surface-hover)";
        e.currentTarget.style.color = "var(--text)";
      }
    },
    onMouseLeave: e => {
      if (!active) {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-2)";
      }
    },
    style: {
      display: "flex",
      width: "100%",
      alignItems: "center",
      gap: "var(--space-3)",
      borderRadius: "var(--radius-lg)",
      border: "none",
      padding: "var(--space-2) var(--space-3)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      textAlign: "left",
      cursor: "pointer",
      background: active ? "var(--surface-2)" : "transparent",
      color: active ? "var(--text)" : "var(--text-2)",
      fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18,
    color: active ? "var(--text)" : "var(--text-muted)"
  }), label);
}
Object.assign(__ds_scope, { NavItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavItem.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SectionHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SectionHeader({
  label,
  expanded = true,
  onToggle,
  actions = true,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 var(--space-3) var(--space-1)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onToggle,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-1-5)",
      border: "none",
      background: "transparent",
      padding: 0,
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xxs)",
      fontWeight: "var(--weight-medium)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: expanded ? "chevron-down" : "chevron-right",
    size: 13
  }), label), actions ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-1)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "plus",
    bordered: false,
    size: 20,
    iconSize: 14,
    label: `Add to ${label}`
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "more",
    bordered: false,
    size: 20,
    iconSize: 14,
    label: `${label} options`
  })) : null);
}
Object.assign(__ds_scope, { SectionHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SectionHeader.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tabs({
  tabs,
  value,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-1)",
      ...style
    }
  }, rest), tabs.map(tab => {
    const active = tab === value;
    return /*#__PURE__*/React.createElement("button", {
      key: tab,
      type: "button",
      onClick: () => onChange && onChange(tab),
      className: "theme-surface",
      onMouseEnter: e => {
        if (!active) {
          e.currentTarget.style.background = "var(--surface-hover)";
          e.currentTarget.style.color = "var(--text)";
        }
      },
      onMouseLeave: e => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-muted)";
        }
      },
      style: {
        borderRadius: "var(--radius-md)",
        border: "none",
        padding: "6px var(--space-3)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-xs)",
        cursor: "pointer",
        background: active ? "var(--surface-2)" : "transparent",
        color: active ? "var(--text)" : "var(--text-muted)",
        fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)"
      }
    }, tab);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TeamSwitcher.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TeamSwitcher({
  team,
  initials,
  label = "Team",
  onClick,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    className: "theme-surface",
    onMouseEnter: e => {
      e.currentTarget.style.background = "var(--surface-hover)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "transparent";
    },
    style: {
      display: "flex",
      width: "100%",
      alignItems: "center",
      gap: "var(--space-2-5)",
      borderRadius: "var(--radius-xl)",
      border: "1px solid var(--border)",
      background: "transparent",
      padding: "var(--space-2)",
      textAlign: "left",
      cursor: "pointer",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    initials: initials,
    size: 34
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      minWidth: 0,
      flex: 1,
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xxs)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text)"
    }
  }, team)), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-up-down",
    size: 16,
    color: "var(--text-muted)"
  }));
}
Object.assign(__ds_scope, { TeamSwitcher });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TeamSwitcher.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  children,
  hoverable = false,
  padding = "var(--space-3-5)",
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "theme-surface",
    onMouseEnter: e => {
      if (hoverable) {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.boxShadow = "var(--shadow-card-hover)";
      }
    },
    onMouseLeave: e => {
      if (hoverable) {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }
    },
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      borderRadius: "var(--radius-xl)",
      border: "1px solid var(--border)",
      background: "var(--surface)",
      padding,
      cursor: hoverable ? "pointer" : "default",
      transition: "var(--transition-shadow)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Card.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/ColumnHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ColumnHeader({
  title,
  status = "todo",
  count,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.StatusDot, {
    status: status
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text)"
    }
  }, title), /*#__PURE__*/React.createElement(__ds_scope.CountBadge, null, count), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: "var(--space-1)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "plus",
    bordered: false,
    size: 22,
    iconSize: 15,
    label: `Add to ${title}`
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "more",
    bordered: false,
    size: 22,
    iconSize: 15,
    label: `${title} options`
  })));
}
Object.assign(__ds_scope, { ColumnHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/ColumnHeader.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/TaskCard.jsx
try { (() => {
const meta = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-1)"
};
function TaskCard({
  client,
  title,
  tags = [],
  assignee,
  attachments,
  progress,
  comments,
  due,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    hoverable: true,
    onClick: onClick,
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-1)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xxs)",
      color: "var(--text-muted)"
    }
  }, "Client: ", client), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      lineHeight: "var(--leading-snug)",
      color: "var(--text)"
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "var(--space-1-5)"
    }
  }, tags.map(t => /*#__PURE__*/React.createElement(__ds_scope.TagPill, {
    key: t.label,
    label: t.label,
    color: t.color
  })), assignee ? /*#__PURE__*/React.createElement("span", {
    className: "theme-surface",
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: "var(--space-1-5)",
      borderRadius: "var(--radius-full)",
      background: "var(--surface-2)",
      padding: "2px var(--space-2) 2px 2px"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    initials: assignee.initials,
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xxs)",
      color: "var(--text-2)"
    }
  }, assignee.name)) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3-5)",
      borderTop: "1px solid var(--border)",
      paddingTop: "var(--space-2-5)",
      fontSize: "var(--text-xxs)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: meta
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "paperclip",
    size: 13
  }), " ", attachments), /*#__PURE__*/React.createElement("span", {
    style: meta
  }, /*#__PURE__*/React.createElement(__ds_scope.ProgressRing, {
    value: progress
  }), " ", progress, "%"), /*#__PURE__*/React.createElement("span", {
    style: meta
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "comment",
    size: 13
  }), " ", comments), /*#__PURE__*/React.createElement("span", {
    style: {
      ...meta,
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: 13
  }), " ", due)));
}
Object.assign(__ds_scope, { TaskCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/TaskCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/KitApp.jsx
try { (() => {
function KitApp() {
  const [theme, setTheme] = React.useState("light");
  const [nav, setNav] = React.useState("Tasks");
  const [tab, setTab] = React.useState("Board");
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const showBoard = nav === "Tasks" && tab === "Board";
  return /*#__PURE__*/React.createElement("div", {
    className: "theme-surface",
    style: {
      display: "flex",
      height: "100%",
      width: "100%",
      overflow: "hidden",
      background: "var(--bg)",
      color: "var(--text)"
    }
  }, /*#__PURE__*/React.createElement(KitSidebar, {
    active: nav,
    onNavigate: setNav
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      display: "flex",
      minWidth: 0,
      flex: 1,
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(KitHeader, {
    title: nav === "Tasks" ? "Project UI/UX" : nav,
    tab: tab,
    onTab: setTab,
    theme: theme,
    onToggleTheme: () => setTheme(t => t === "light" ? "dark" : "light")
  }), showBoard ? /*#__PURE__*/React.createElement(KitBoard, null) : /*#__PURE__*/React.createElement(KitPlaceholder, {
    label: nav === "Tasks" ? tab : nav
  })));
}
Object.assign(window, {
  KitApp
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/KitApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/KitBoard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const P = {
  name: "Phoenix Baker",
  initials: "PB"
};
const web = {
  label: "Web",
  color: "blue"
};
const saas = {
  label: "Saas",
  color: "amber"
};
const mobile = {
  label: "Mobile",
  color: "purple"
};
const base = {
  assignee: P,
  attachments: 4,
  progress: 50,
  comments: 2,
  due: "4d"
};
const initialColumns = [{
  title: "To Do",
  status: "todo",
  tasks: [{
    ...base,
    client: "Stellar",
    title: "Change top CTA button text",
    tags: [web, saas]
  }, {
    ...base,
    client: "Stellar",
    title: "Redesign analytics dashboard",
    tags: [saas, mobile]
  }, {
    ...base,
    client: "Taskez",
    title: "Create landing page",
    tags: [web, saas]
  }]
}, {
  title: "In Progress",
  status: "todo",
  tasks: [{
    ...base,
    client: "Stellar",
    title: "Redesign news page",
    tags: [web]
  }, {
    ...base,
    client: "Taskez",
    title: "Copywrite",
    tags: [web]
  }]
}, {
  title: "In Review",
  status: "review",
  tasks: [{
    ...base,
    client: "Stellar",
    title: "UI Animation for the onboarding flow",
    tags: [web, saas]
  }, {
    ...base,
    client: "Stellar",
    title: "UI Dark mode improvements",
    tags: [saas, mobile]
  }, {
    ...base,
    client: "Taskez",
    title: "Mobile Redesign",
    tags: [mobile]
  }]
}, {
  title: "Completed",
  status: "done",
  tasks: [{
    ...base,
    client: "Taskez",
    title: "Navigation improvements",
    tags: [web],
    progress: 100
  }, {
    ...base,
    client: "Taskez",
    title: "Text Animation",
    tags: [web],
    progress: 100
  }, {
    ...base,
    client: "Stellar",
    title: "Visual Assets",
    tags: [saas],
    progress: 100
  }]
}];
function KitBoard() {
  const {
    TaskCard,
    ColumnHeader,
    Button
  } = window.NeedtDesignSystem_053851;
  const [columns, setColumns] = React.useState(initialColumns);
  const addTask = i => setColumns(cols => cols.map((c, idx) => idx === i ? {
    ...c,
    tasks: [...c.tasks, {
      ...base,
      client: "Stellar",
      title: "Untitled task",
      tags: [web],
      progress: 0
    }]
  } : c));
  return /*#__PURE__*/React.createElement("div", {
    className: "scroll-thin",
    style: {
      flex: 1,
      overflow: "auto",
      padding: "var(--space-5) var(--page-pad-x-lg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--board-gutter)"
    }
  }, columns.map((column, i) => /*#__PURE__*/React.createElement("section", {
    key: column.title,
    style: {
      display: "flex",
      width: "var(--column-width)",
      flexShrink: 0,
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(ColumnHeader, {
    title: column.title,
    status: column.status,
    count: column.tasks.length
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, column.tasks.map((task, j) => /*#__PURE__*/React.createElement(TaskCard, _extends({
    key: task.title + j
  }, task))), /*#__PURE__*/React.createElement(Button, {
    variant: "dashed",
    icon: "plus",
    onClick: () => addTask(i)
  }, "Add new"))))));
}
Object.assign(window, {
  KitBoard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/KitBoard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/KitHeader.jsx
try { (() => {
const tabs = ["Board", "List", "Timeline", "Due Tasks"];
function KitHeader({
  title,
  tab,
  onTab,
  theme,
  onToggleTheme
}) {
  const {
    Breadcrumb,
    Tabs,
    Button,
    IconButton
  } = window.NeedtDesignSystem_053851;
  return /*#__PURE__*/React.createElement("header", {
    className: "theme-surface",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
      borderBottom: "1px solid var(--border)",
      padding: "var(--space-4) var(--page-pad-x-lg) 0"
    }
  }, /*#__PURE__*/React.createElement(Breadcrumb, {
    items: ["Dashboard", "Overview"]
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: "var(--text-title)",
      fontWeight: "var(--weight-bold)",
      letterSpacing: "var(--tracking-tight)",
      color: "var(--text)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--space-3)",
      paddingBottom: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    tabs: tabs,
    value: tab,
    onChange: onTab
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "filter"
  }, "Filter"), /*#__PURE__*/React.createElement(Button, {
    icon: "sort"
  }, "Sort"), /*#__PURE__*/React.createElement(IconButton, {
    icon: theme === "light" ? "moon" : "sun",
    onClick: onToggleTheme,
    label: `Switch to ${theme === "light" ? "dark" : "light"} theme`
  }))));
}
Object.assign(window, {
  KitHeader
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/KitHeader.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/KitPlaceholder.jsx
try { (() => {
function KitPlaceholder({
  label
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "var(--space-8)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 420,
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-md)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      lineHeight: "var(--leading-normal)"
    }
  }, "Intentionally blank. The Needt source defines this destination in the navigation but ships no design for it \u2014 nothing has been invented here.")));
}
Object.assign(window, {
  KitPlaceholder
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/KitPlaceholder.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/KitSidebar.jsx
try { (() => {
const mainNav = [{
  label: "Home",
  icon: "home"
}, {
  label: "Tasks",
  icon: "check-square"
}, {
  label: "Docs",
  icon: "file"
}, {
  label: "Schedule",
  icon: "calendar"
}, {
  label: "Chat",
  icon: "message"
}, {
  label: "Payments",
  icon: "credit-card"
}, {
  label: "Automations",
  icon: "zap"
}, {
  label: "Customers",
  icon: "users"
}, {
  label: "User Management",
  icon: "user-cog"
}, {
  label: "Workflows",
  icon: "workflow"
}];
const fileNav = [{
  label: "Store",
  icon: "store"
}, {
  label: "Company",
  icon: "building"
}, {
  label: "Employee",
  icon: "id"
}];
function KitSidebar({
  active,
  onNavigate
}) {
  const {
    NavItem,
    SectionHeader,
    TeamSwitcher,
    SearchInput
  } = window.NeedtDesignSystem_053851;
  const [fileOpen, setFileOpen] = React.useState(true);
  const [appsOpen, setAppsOpen] = React.useState(false);
  return /*#__PURE__*/React.createElement("aside", {
    className: "theme-surface",
    style: {
      display: "flex",
      width: "var(--sidebar-width)",
      flexShrink: 0,
      flexDirection: "column",
      borderRight: "1px solid var(--border)",
      background: "var(--sidebar)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(TeamSwitcher, {
    team: "David Visuals",
    initials: "DV"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 var(--space-3) var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement(SearchInput, null)), /*#__PURE__*/React.createElement("nav", {
    className: "scroll-thin",
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "var(--space-2) var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("ul", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-0-5)",
      listStyle: "none",
      margin: 0,
      padding: 0
    }
  }, mainNav.map(item => /*#__PURE__*/React.createElement("li", {
    key: item.label
  }, /*#__PURE__*/React.createElement(NavItem, {
    label: item.label,
    icon: item.icon,
    active: item.label === active,
    onClick: () => onNavigate(item.label)
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    label: "File",
    expanded: fileOpen,
    onToggle: () => setFileOpen(v => !v)
  }), fileOpen ? /*#__PURE__*/React.createElement("ul", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-0-5)",
      listStyle: "none",
      margin: 0,
      padding: 0
    }
  }, fileNav.map(item => /*#__PURE__*/React.createElement("li", {
    key: item.label
  }, /*#__PURE__*/React.createElement(NavItem, {
    label: item.label,
    icon: item.icon,
    active: item.label === active,
    onClick: () => onNavigate(item.label)
  })))) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    label: "Apps",
    expanded: appsOpen,
    onToggle: () => setAppsOpen(v => !v)
  }))));
}
Object.assign(window, {
  KitSidebar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/KitSidebar.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.CountBadge = __ds_scope.CountBadge;

__ds_ns.ProgressRing = __ds_scope.ProgressRing;

__ds_ns.StatusDot = __ds_scope.StatusDot;

__ds_ns.TagPill = __ds_scope.TagPill;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.SearchInput = __ds_scope.SearchInput;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Breadcrumb = __ds_scope.Breadcrumb;

__ds_ns.NavItem = __ds_scope.NavItem;

__ds_ns.SectionHeader = __ds_scope.SectionHeader;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.TeamSwitcher = __ds_scope.TeamSwitcher;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ColumnHeader = __ds_scope.ColumnHeader;

__ds_ns.TaskCard = __ds_scope.TaskCard;

})();
