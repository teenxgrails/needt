/* Needt icon registry — react-icons, the library the product already depends on.
 *
 * This file is HOST code, not system code: it satisfies the contract that
 * components/core/Icon.jsx declares. Load it as a module in any static page
 * that renders Needt components:
 *
 *   <script type="module" src="assets/icons/needt-icons.js"></script>
 *
 * In the application, do not load this file — import the icons from
 * `react-icons` directly and either register them the same way at boot or pass
 * them to <Icon glyph={...} />.
 *
 * Collection: react-icons/lu. Swapping to another react-icons collection is a
 * one-line change to the import below plus the name prefixes; every name used
 * across this design system is resolved here, with fallbacks, so a renamed
 * upstream glyph degrades to an empty box instead of a crash.
 */
/* Resolved at runtime, not statically imported: this file is host code for
   static pages, and must stay invisible to any bundler that scans the design
   system's sources. In the application, import from "react-icons/lu" normally. */
const REACT_ICONS = "react-icons@5.5.0";
const COLLECTION = "lu";

/* Wrapped in an async IIFE rather than using top-level await: this file gets
   scanned alongside the system's sources, and a top-level await is a syntax
   error outside a module context. */
(async function () {
const Lu = await import("https://esm.sh/" + REACT_ICONS + "/" + COLLECTION + "?deps=react@18.3.1");
const pick = (...names) => names.map((n) => Lu[n]).find(Boolean) || null;

/* Brand marks — Google, Apple, GitHub — do not exist as outline glyphs, so the
   sign-in buttons take them from the simple-icons collection. It is the same
   library, a second collection: an account button without its mark is not a
   button anyone trusts. Failure is tolerated: if the collection does not load,
   pickBrand returns null and Icon reserves the box. */
let Si = {};
try { Si = await import("https://esm.sh/" + REACT_ICONS + "/si?deps=react@18.3.1"); } catch (e) { Si = {}; }
const pickBrand = (...names) => names.map((n) => Si[n]).find(Boolean) || null;

/* Merge, never assign. The design-system bundle carries its own snapshot of
   this registry and assigns window.NeedtIcons outright when its own async
   import resolves; whichever lands last used to win, and the older snapshot
   silently dropped every name added since. Merging — plus a re-install when
   the event fires and our names are gone — makes the race harmless. */
const NAMES = {
  "plus": pick("LuPlus"),
  "minus": pick("LuMinus"),
  "check": pick("LuCheck"),
  "x": pick("LuX"),
  "search": pick("LuSearch"),
  "ellipsis": pick("LuEllipsis", "LuMoreHorizontal"),
  "chevron-down": pick("LuChevronDown"),
  "chevron-left": pick("LuChevronLeft"),
  "chevron-right": pick("LuChevronRight"),
  "arrow-right": pick("LuArrowRight"),
  "arrow-left": pick("LuArrowLeft"),
  "arrow-up-down": pick("LuArrowUpDown", "LuArrowDownUp"),
  "arrow-up-right": pick("LuArrowUpRight"),
  "arrow-down": pick("LuArrowDown"),
  "calendar": pick("LuCalendar"),
  "calendar-days": pick("LuCalendarDays"),
  "calendar-off": pick("LuCalendarOff", "LuCalendarX"),
  "clock": pick("LuClock", "LuClock3"),
  "inbox": pick("LuInbox"),
  "file-text": pick("LuFileText"),
  "folder": pick("LuFolder"),
  "folder-kanban": pick("LuFolderKanban", "LuKanban", "LuFolder"),
  "folder-open": pick("LuFolderOpen", "LuFolder"),
  "layout-template": pick("LuLayoutTemplate", "LuLayoutDashboard"),
  "lock": pick("LuLock"),
  "eye-off": pick("LuEyeOff"),
  "rotate-ccw": pick("LuRotateCcw", "LuRotateCw"),
  "save": pick("LuSave", "LuDownload"),
  "archive": pick("LuArchive"),
  "star": pick("LuStar"),
  "settings": pick("LuSettings"),
  "grip-vertical": pick("LuGripVertical", "LuGrip"),
  "globe": pick("LuGlobe"),
  "type": pick("LuType"),
  "list-checks": pick("LuListChecks", "LuList"),
  "image": pick("LuImage"),
  "pen-line": pick("LuPenLine", "LuPencilLine", "LuPencil"),
  "hash": pick("LuHash"),
  "mail": pick("LuMail"),
  "quote": pick("LuQuote"),
  "user": pick("LuUser"),
  "code": pick("LuCode"),
  "message-circle": pick("LuMessageCircle", "LuMessageSquare"),
  "arrow-up": pick("LuArrowUp"),
  "audio-lines": pick("LuAudioLines", "LuActivity"),
  "circle-check": pick("LuCircleCheck", "LuCheckCircle2"),
  "hourglass": pick("LuHourglass", "LuTimer"),
  "calendar-clock": pick("LuCalendarClock", "LuCalendar"),
  "align-left": pick("LuAlignLeft"),
  "flag": pick("LuFlag"),
  "repeat": pick("LuRepeat", "LuRefreshCw"),
  "users": pick("LuUsers"),
  "sunrise": pick("LuSunrise", "LuSunMedium"),
  "sunset": pick("LuSunset", "LuSunDim"),
  "ban": pick("LuBan", "LuCircleSlash"),
  "keyboard": pick("LuKeyboard"),
  "circle-help": pick("LuCircleHelp", "LuHelpCircle"),
  "log-out": pick("LuLogOut"),
  "circle": pick("LuCircle"),
  "target": pick("LuTarget"),
  "trash-2": pick("LuTrash2", "LuTrash"),
  "copy": pick("LuCopy"),
  "pencil": pick("LuPencil", "LuPen"),
  "external-link": pick("LuExternalLink", "LuSquareArrowOutUpRight"),
  "upload": pick("LuUpload"),
  "eye": pick("LuEye"),
  "unlock": pick("LuLockOpen", "LuUnlock"),
  "sliders-horizontal": pick("LuSlidersHorizontal", "LuSliders"),
  "sparkles": pick("LuSparkles"),
  "palette": pick("LuPalette", "LuSwatchBook"),
  "alert-circle": pick("LuCircleAlert", "LuAlertCircle"),
  "keyboard": pick("LuKeyboard"),
  "bell": pick("LuBell"),
  "command": pick("LuCommand"),
  "database": pick("LuDatabase"),
  "download": pick("LuDownload"),
  "refresh-cw": pick("LuRefreshCw", "LuRotateCw"),
  "unlink": pick("LuUnlink", "LuLink2Off", "LuLinkSlash"),
  "loader": pick("LuLoaderCircle", "LuLoader2", "LuLoader"),
  "list-plus": pick("LuListPlus"),
  "apple": pickBrand("SiApple") || pick("LuApple"),
  "chrome": pickBrand("SiGoogle") || pick("LuChrome"),
  "github": pickBrand("SiGithub") || pick("LuGithub"),
  "wand-sparkles": pick("LuWandSparkles", "LuWand2", "LuWand"),
  "bold": pick("LuBold"),
  "italic": pick("LuItalic"),
  "link": pick("LuLink"),
  "list": pick("LuList"),
  "code": pick("LuCode"),
  "highlighter": pick("LuHighlighter"),
  "strikethrough": pick("LuStrikethrough"),
  "eraser": pick("LuEraser", "LuRemoveFormatting"),
  "message-square": pick("LuMessageSquare", "LuMessageCircle"),
  "layers": pick("LuLayers", "LuLayers2"),
  "corner-down-right": pick("LuCornerDownRight", "LuArrowDownRight"),
  "flame": pick("LuFlame"),
  "home": pick("LuHouse", "LuHome"),
  "calendar-check": pick("LuCalendarCheck", "LuCalendar"),
  "move-right": pick("LuMoveRight", "LuArrowRight"),
  "triangle-alert": pick("LuTriangleAlert", "LuAlertTriangle"),
  "briefcase": pick("LuBriefcase"),
  "component": pick("LuComponent", "LuBox"),
  "graduation-cap": pick("LuGraduationCap", "LuBookOpen"),
  "package": pick("LuPackage", "LuBox"),
  "heart": pick("LuHeart"),
  "map-pin": pick("LuMapPin"),
  "paperclip": pick("LuPaperclip"),
  "tag": pick("LuTag"),
  "bug": pick("LuBug", "LuTriangleAlert"),
  "trending-up": pick("LuTrendingUp", "LuChartLine"),
  "sun": pick("LuSun", "LuSunrise"),
  "house": pick("LuHouse", "LuHome"),
  "heading": pick("LuHeading", "LuHeading1", "LuType")
};

function install() {
  window.NeedtIcons = Object.assign({}, window.NeedtIcons, NAMES);
  window.dispatchEvent(new Event("needt-icons"));
}
install();
window.addEventListener("needt-icons", function () {
  if (!window.NeedtIcons || !window.NeedtIcons["grip-vertical"]) install();
});
})();
