/* THE SITE HEADER — one object, eleven pages.
 *
 * It was copied into every page's markup, which is why Pricing sat on the left
 * on all of them and adding one Download button would have meant eleven
 * edits. It is now built here and mounted into whatever `.s-nav` the page
 * already has, so the next change to it is one change.
 *
 * TWO MENUS, NOT FOUR. Motion's four-column mega menu is built for twenty
 * destinations; this site has eleven, and half the cells would be empty or
 * invented. Product and Resources hold what exists; Pricing and Download are
 * direct links, because a menu over a single destination is a click that buys
 * nothing.
 *
 * THE MENUS ARE DARK ON PURPOSE. The header floats on a pale sky, and a pale
 * panel on a pale ground needs a border to exist. A dark panel is its own
 * boundary — the same reason the primary button is near-black on this site:
 * on an airy page the dense object is the one you can find.
 */
(function () {
  var NAV = {
    product: {
      label: "Product",
      cols: [
        {
          head: "The day",
          items: [
            { href: "index.html#week", glyph: "calendar-days", title: "Calendar and tasks",
              note: "One grid, so a task has to fit in real hours" },
            { href: "index.html#focus", glyph: "target", title: "Habits and focus",
              note: "A standing frame, and a session that changes the room" }
          ]
        },
        {
          head: "The agent",
          items: [
            { href: "agent.html", glyph: "sparkles", title: "The agent",
              note: "It shows you its own hand doing the work" },
            { href: "security.html", glyph: "lock", title: "Security",
              note: "Desktop first; sync is a switch you flick" }
          ]
        },
        {
          head: "Get it",
          items: [
            { href: "download.html", glyph: "download", title: "Download",
              note: "macOS, Windows, and the web" },
            { href: "compare.html", glyph: "git-compare", title: "Compared",
              note: "Against the tools you are probably using" }
          ]
        }
      ]
    },
    resources: {
      label: "Resources",
      cols: [
        {
          head: "Reading",
          items: [
            { href: "blog.html", glyph: "book-open", title: "Blog",
              note: "How the day is planned, and why it usually is not" },
            { href: "blog-day-does-not-fit.html", glyph: "triangle-alert", title: "When a day does not fit",
              note: "What a planner owes you when the hours run out" },
            { href: "blog-time-blocking.html", glyph: "calendar-check", title: "Time blocking, honestly",
              note: "What it is good at, and where it falls apart" },
            { href: "blog-two-minute-entry.html", glyph: "arrow-right", title: "The two-minute entry",
              note: "Why a stuck task needs a smaller door, not a plan" }
          ]
        }
      ]
    }
  };

  var LINKS = [
    { href: "pricing.html", label: "Pricing" },
    { href: "download.html", label: "Download" }
  ];

  /* One glyph set, inline: the pages do not load the app's icon registry, and
     a menu that renders eight empty boxes while a module resolves is worse
     than one that ships its own marks. Stroke 1.75, currentColor, 24×24 — the
     system's geometry. */
  var GLYPH = {
    "calendar-days": '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18M7.5 13.5h.01M12 13.5h.01M16.5 13.5h.01M7.5 17h.01M12 17h.01"/>',
    "target": '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    "sparkles": '<path d="M12 3.5l1.9 4.6L18.5 10l-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9z"/><path d="M18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"/>',
    "lock": '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    "download": '<path d="M12 3.5v11M7.5 10l4.5 4.5L16.5 10M4.5 19.5h15"/>',
    "git-compare": '<circle cx="6" cy="17.5" r="2.8"/><circle cx="18" cy="6.5" r="2.8"/><path d="M6 14.7V9.5a3 3 0 0 1 3-3h3M18 9.3v5.2a3 3 0 0 1-3 3h-3"/><path d="M13.5 4.5 12 6.5l1.5 2M10.5 15.5 12 17.5l-1.5 2"/>',
    "book-open": '<path d="M12 6.5S10 4.5 4.5 4.5v13C10 17.5 12 19.5 12 19.5s2-2 7.5-2v-13C14 4.5 12 6.5 12 6.5z"/><path d="M12 6.5v13"/>',
    "triangle-alert": '<path d="M10.3 4.4 2.9 17.2a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>',
    "calendar-check": '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18M8.8 14.6l2.2 2.2 4.2-4.4"/>',
    "arrow-right": '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>'
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (GLYPH[name] || "") + "</svg>";
  }

  function menuHTML(key, def) {
    var cols = def.cols.map(function (col) {
      var items = col.items.map(function (it) {
        return '<a class="nv-item" href="' + it.href + '">' +
          '<span class="nv-glyph">' + icon(it.glyph) + "</span>" +
          '<span class="nv-text"><span class="nv-title">' + it.title + "</span>" +
          '<span class="nv-note">' + it.note + "</span></span></a>";
      }).join("");
      return '<div class="nv-col"><span class="nv-head">' + col.head + "</span>" + items + "</div>";
    }).join("");
    return '<div class="nv-panel" id="nv-' + key + '" data-menu-panel="' + key + '" hidden>' +
      '<div class="nv-cols nv-cols-' + def.cols.length + '">' + cols + "</div></div>";
  }

  function build(nav) {
    var current = (location.pathname.split("/").pop() || "index.html");
    var buttons = Object.keys(NAV).map(function (key) {
      return '<button type="button" class="s-navlink nv-trigger" data-menu="' + key + '" ' +
        'aria-expanded="false" aria-controls="nv-' + key + '">' + NAV[key].label +
        '<span class="nv-caret" aria-hidden="true"></span></button>';
    }).join("");
    var links = LINKS.map(function (l) {
      return '<a class="s-navlink" href="' + l.href + '"' +
        (l.href === current ? ' aria-current="page"' : "") + ">" + l.label + "</a>";
    }).join("");
    var panels = Object.keys(NAV).map(function (key) { return menuHTML(key, NAV[key]); }).join("");

    nav.classList.add("nv-nav");
    if (!nav.classList.contains("s-nav")) nav.classList.add("s-nav");
    nav.innerHTML =
      '<div class="nv-shell">' +
        '<div class="s-nav-inner nv-inner">' +
          '<a class="s-mark" href="index.html" aria-label="Needt"><span class="nv-expo" data-expo data-expo-max="0">Needt</span></a>' +
          '<div class="s-navlinks nv-links">' + buttons + links + "</div>" +
          '<a class="s-btn s-btn-sm nv-login" href="../needt-app/auth.html" data-auth="out">Log in</a>' +
          '<span class="s-avatar" data-auth="in" hidden title="Maksym">MB</span>' +
        "</div>" + panels +
      "</div>";
    return nav;
  }

  function wire(nav) {
    var open = null;
    var shut = 0;

    function show(key) {
      if (open === key) return;
      hide();
      open = key;
      var panel = nav.querySelector('[data-menu-panel="' + key + '"]');
      var trigger = nav.querySelector('[data-menu="' + key + '"]');
      if (!panel) return;
      panel.hidden = false;
      /* Read once after unhiding so the transition has a frame to start from;
         a panel revealed and classed in the same frame does not animate. */
      window.requestAnimationFrame(function () { panel.classList.add("is-open"); });
      if (trigger) { trigger.setAttribute("aria-expanded", "true"); trigger.classList.add("is-on"); }
      nav.querySelector(".nv-shell").classList.add("has-menu");
    }

    function hide() {
      if (!open) return;
      var panel = nav.querySelector('[data-menu-panel="' + open + '"]');
      var trigger = nav.querySelector('[data-menu="' + open + '"]');
      if (panel) {
        panel.classList.remove("is-open");
        /* Hidden only after it has finished leaving, so the exit is seen. */
        window.setTimeout(function () { if (!panel.classList.contains("is-open")) panel.hidden = true; }, 200);
      }
      if (trigger) { trigger.setAttribute("aria-expanded", "false"); trigger.classList.remove("is-on"); }
      nav.querySelector(".nv-shell").classList.remove("has-menu");
      open = null;
    }

    nav.addEventListener("click", function (e) {
      var t = e.target.closest("[data-menu]");
      if (!t) return;
      e.preventDefault();
      if (open === t.dataset.menu) hide(); else show(t.dataset.menu);
    });

    /* Hover opens it, because that is what a menu in a header does — but only
       on a device with a real pointer. On touch, hover fires on the tap that
       was meant to follow the link. */
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      nav.addEventListener("pointerover", function (e) {
        var t = e.target.closest("[data-menu]");
        if (t) { window.clearTimeout(shut); show(t.dataset.menu); return; }
        if (e.target.closest(".nv-panel")) window.clearTimeout(shut);
      });
      nav.addEventListener("pointerleave", function () {
        /* A grace period: the pointer crosses a gap between the trigger and
           the panel, and a menu that closes in that gap cannot be used. */
        shut = window.setTimeout(hide, 160);
      });
    }

    document.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
    document.addEventListener("click", function (e) { if (!nav.contains(e.target)) hide(); });
  }

  function init() {
    var nav = document.querySelector(".s-nav");
    if (!nav) return;
    wire(build(nav));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
