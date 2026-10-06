/* THE DOCK. Lays three tiles on an arc in each gutter beside the window, wires
   each to the window's nearest edge, and deals a fresh set of services each
   time the hero comes back into view. Re-laid only on resize and re-entry. */
(function () {
  var hero = document.querySelector(".hx"), dock = document.querySelector("[data-dock]");
  var works = document.querySelector("[data-works]"), win = document.querySelector(".hx-win");
  if (!hero || !dock || !win) return;
  var svg = dock.querySelector("svg"), NS = "http://www.w3.org/2000/svg";
  var POOL = [["chatgpt",1],["claude"],["google"],["notion"],["slack",0,"webp"],["github"],["figma"],["apple"],
    ["gemini"],["perplexity"],["meta"],["microsoft"],["cursor"]];
  var STILL = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function shuffled() { var b = POOL.slice(); for (var i = b.length - 1; i > 0; i--) { var k = Math.random() * (i + 1) | 0; var t = b[i]; b[i] = b[k]; b[k] = t; } return b; }
  function src(p) { return "img/logos/" + p[0] + "." + (p[2] || "svg"); }
  function build() {
    dock.querySelectorAll(".hx-tile").forEach(function (t) { t.remove(); });
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var bag = shuffled();
    var SW = dock.clientWidth, wl = win.offsetLeft - win.offsetWidth / 2 * 0 , wr;
    var wb = win.getBoundingClientRect(), db = dock.getBoundingClientRect();
    wl = wb.left - db.left; wr = wb.right - db.left;
    var gut = wl, sz = 58, M = 20;
    var narrow = gut < sz + 2 * M + 30;
    hero.classList.toggle("is-narrow", narrow);
    dock.classList.toggle("is-off", narrow);
    if (works) {
      works.innerHTML = "";
      bag.slice(0, 7).forEach(function (p) { var i = new Image(); i.src = src(p); i.alt = p[0]; works.appendChild(i); });
    }
    if (narrow) return;
    var ARC = [[0.62, 0.08], [0.22, 0.38], [0.58, 0.68]];
    var H = Math.min(wb.height, 520);
    [0, 1].forEach(function (side) {
      ARC.forEach(function (a, i) {
        var p = bag[side * 3 + i];
        var room = gut - sz - 2 * M;
        var x = side ? wr + M + room * (1 - a[0]) : M + room * a[0];
        var y = a[1] * H;
        var t = document.createElement("span");
        t.className = "hx-tile" + (p[1] ? " is-dark" : "");
        t.style.left = x + "px"; t.style.top = y + "px";
        t.style.setProperty("--d", (-(side * 3 + i) * 1.15) + "s");
        t.innerHTML = '<span><img alt="" src="' + src(p) + '"></span>';
        dock.appendChild(t);
        var cx = x + sz / 2, cy = y + sz / 2;
        var ex = side ? wr : wl, ey = Math.min(Math.max(cy + 20, 40), wb.height - 40);
        var mx = (cx + ex) / 2, d = "M" + cx + "," + cy + " C" + mx + "," + cy + " " + mx + "," + ey + " " + ex + "," + ey;
        var path = document.createElementNS(NS, "path"); path.setAttribute("d", d); path.setAttribute("class", "hx-wire");
        svg.appendChild(path);
        if (!STILL) {
          var dot = document.createElementNS(NS, "circle"); dot.setAttribute("r", "2.6"); dot.setAttribute("class", "hx-pulse");
          var m = document.createElementNS(NS, "animateMotion");
          m.setAttribute("dur", (3.2 + i * 0.7) + "s"); m.setAttribute("repeatCount", "indefinite");
          m.setAttribute("begin", (-(side + i) * 0.9) + "s"); m.setAttribute("path", d);
          dot.appendChild(m); svg.appendChild(dot);
        }
      });
    });
  }
  function boot() { build(); }
  if (document.readyState === "complete") boot(); else addEventListener("load", boot);
  var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(build, 150); });
  if ("IntersectionObserver" in window) {
    var seen = true;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting) seen = false; else if (!seen) { seen = true; build(); } });
    }).observe(hero);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) build(); });
})();
