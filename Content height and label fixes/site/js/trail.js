/* THE MASCOT TRAIL — Genie's cursor trail, with Needt's own cast.
 *
 * Over the pale ground only. The pale ground is not one element: it is
 * everything ABOVE the deep sheet's torn edge, plus the two pale tears laid
 * back over the deep sheet. So the test is geometric — the cursor point
 * against the clip-path polygons those layers already declare — rather than
 * a list of boxes that would drift from the shapes on screen. Over a card,
 * the price sheet or the header it does nothing: the trail belongs to the
 * paper, never to the content.
 *
 * The mascots are full animated components with their own cursor tracking,
 * far too heavy to spawn forty of. So each one is rendered once, its SVG read
 * out of its shadow root, and the trail spawns cheap images of that snapshot
 * on pastel discs that shrink away where they were dropped.
 *
 * One rAF for the pointer, nothing on touch, nothing under reduced motion.
 */
(function () {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var CAST = [
    ["needt-pop", "cheer"], ["needt-pop", "dance"],
    ["needt-cloud", "float"], ["needt-cloud", "rain"],
    ["needt-cloud-v2", "calm"], ["needt-cloud-v2", "hello"],
    ["needt-sun", "shine"], ["needt-sun", "nap"],
    ["needt-sprout", "grow"], ["needt-sprout", "wave"],
    ["needt-ember", "spark"], ["needt-ember", "calm"]
  ];
  var DISCS = ["#F1E6FF", "#D3F6E3", "#FFE6DA", "#CCE7FF", "#FFF3C4"];
  var sprites = [];

  function snapshot(tag, variant) {
    if (!customElements.get(tag)) return Promise.resolve(null);
    return customElements.whenDefined(tag).then(function () {
      var el = document.createElement(tag);
      el.setAttribute("variant", variant);
      el.setAttribute("size", "120");
      el.style.cssText = "position:fixed;left:-9999px;top:0;pointer-events:none";
      document.body.appendChild(el);
      return new Promise(function (res) {
        requestAnimationFrame(function () {
          var svg = el.shadowRoot && el.shadowRoot.querySelector("svg");
          var out = null;
          if (svg) {
            var c = svg.cloneNode(true);
            c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            /* The ground shadow gets its opacity only from the component's
               shadow-root CSS, which a bare clone does not carry — so it would
               paint as a solid black slab. A trail sprite has no ground to
               cast onto anyway. */
            Array.prototype.forEach.call(c.querySelectorAll(".shadow"), function (s) { s.remove(); });
            out = URL.createObjectURL(new Blob([c.outerHTML], { type: "image/svg+xml" }));
          }
          el.remove();
          res(out);
        });
      });
    }).catch(function () { return null; });
  }

  /* ── WHERE THE PAPER IS PALE ─────────────────────────────────────────────*/
  function parse(poly) {
    var m = /polygon\((.*)\)/.exec(poly || "");
    if (!m) return null;
    return m[1].split(",").map(function (p) {
      var a = p.trim().split(/\s+/);
      return [a[0], a[1]];
    });
  }
  function toPx(v, size) {
    var n = parseFloat(v);
    if (/svh|vh/.test(v)) return n * window.innerHeight / 100;
    if (/%/.test(v)) return n * size / 100;
    return n;
  }
  function inside(pts, x, y) {
    var hit = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  }
  function inLayer(clip, rect, x, y) {
    var raw = parse(clip);
    if (!raw) return false;
    var pts = raw.map(function (p) { return [rect.left + toPx(p[0], rect.width), rect.top + toPx(p[1], rect.height)]; });
    return inside(pts, x, y);
  }
  function onContent(x, y) {
    var n = document.elementFromPoint(x, y);
    while (n && n !== document.body && n !== document.documentElement) {
      var cs = getComputedStyle(n);
      if (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent") return true;
      if (/^(A|BUTTON|INPUT|NAV|SUMMARY)$/.test(n.tagName)) return true;
      n = n.parentElement;
    }
    return false;
  }
  function pale(x, y) {
    if (onContent(x, y)) return null;
    var tears = document.querySelectorAll(".p-tear");
    for (var i = tears.length - 1; i >= 0; i--) {
      if (inLayer(getComputedStyle(tears[i]).clipPath, tears[i].getBoundingClientRect(), x, y)) return tears[i];
    }
    /* Above the deep sheet's torn edge is pale too. */
    var deep = getComputedStyle(document.body, "::before").clipPath;
    return inLayer(deep, document.body.getBoundingClientRect(), x, y) ? null : "top";
  }

  /* THE TRAIL LIVES IN THE PAPER, not above the page. On the top zone the
     sprites sit beneath the deep sheet and the white price sheet, so both
     cover them where they meet; on a pale tear they are children of the tear
     itself and its own clip-path trims them to the torn shape. Either way the
     faces are under every layer that is in front of the pale paper. */
  var under = document.createElement("div");
  under.setAttribute("aria-hidden", "true");
  under.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;z-index:-2;pointer-events:none";
  function host(layer, x, y) {
    if (layer === "top") {
      if (!under.parentNode) document.body.appendChild(under);
      var b = document.body.getBoundingClientRect();
      return { el: under, x: x - b.left, y: y - b.top };
    }
    var r = layer.getBoundingClientRect();
    return { el: layer, x: x - r.left, y: y - r.top };
  }

  /* ── THE TRAIL ───────────────────────────────────────────────────────────*/
  function drop(at, img) {
    var x = at.x, y = at.y;
    var size = 54 + Math.random() * 18;
    var d = document.createElement("span");
    d.setAttribute("aria-hidden", "true");
    d.style.cssText = "position:absolute;pointer-events:none;border-radius:50%;display:grid;place-items:center;" +
      "left:" + (x - size / 2) + "px;top:" + (y - size / 2) + "px;width:" + size + "px;height:" + size + "px;" +
      "background:" + DISCS[(Math.random() * DISCS.length) | 0] + ";";
    var i = document.createElement("img");
    i.src = img; i.alt = "";
    i.style.cssText = "width:86%;height:86%;display:block;transform:rotate(" + ((Math.random() - 0.5) * 30) + "deg)";
    d.appendChild(i);
    at.el.appendChild(d);
    sprites.push(d);
    while (sprites.length > 36) sprites.shift().remove();
    var a = d.animate([
      { transform: "scale(0.55)", opacity: 0 },
      { transform: "scale(1)", opacity: 1, offset: 0.16, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      { transform: "scale(1)", opacity: 1, offset: 0.42, easing: "cubic-bezier(0.45, 0, 0.55, 1)" },
      { transform: "scale(0.04)", opacity: 0.9 }
    ], { duration: 2300, fill: "forwards" });
    a.onfinish = function () { d.remove(); var k = sprites.indexOf(d); if (k >= 0) sprites.splice(k, 1); };
  }

  function start(images) {
    images = images.filter(Boolean);
    window.NeedtCast = images;
    window.dispatchEvent(new Event("needt-cast"));
    if (!images.length) return;
    var px = 0, py = 0, lx = -999, ly = -999, queued = false, n = 0;
    window.addEventListener("pointermove", function (e) {
      px = e.clientX; py = e.clientY;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        /* A new face every 34px of travel — spaced like beads, not smeared. */
        if (Math.hypot(px - lx, py - ly) < 34) return;
        var layer = pale(px, py);
        if (!layer) { lx = -999; return; }
        lx = px; ly = py;
        drop(host(layer, px, py), images[n++ % images.length]);
      });
    }, { passive: true });
  }

  function boot() { Promise.all(CAST.map(function (c) { return snapshot(c[0], c[1]); })).then(start); }

  /* THE TRAIL BELONGS TO THE HAND, so a scroll clears it: every live face
     shrinks away in a quarter second instead of riding off with the page.
     Each face is cleared once — marked so the next scroll frame leaves its
     shrink alone — and the shrink starts from the size it already has, so a
     face halfway gone never jumps back to full before it disappears.
     Nothing spawns from scrolling — only from moving the pointer. */
  window.addEventListener("scroll", function () {
    sprites.forEach(function (d) {
      if (d.dataset.clearing) return;
      d.dataset.clearing = "1";
      var cs = getComputedStyle(d);
      var from = cs.transform && cs.transform !== "none" ? cs.transform : "scale(1)";
      var op = cs.opacity;
      d.getAnimations().forEach(function (a) { a.cancel(); });
      var a = d.animate([{ transform: from, opacity: op }, { transform: "scale(0.04)", opacity: 0 }],
        { duration: 260, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" });
      a.onfinish = function () { d.remove(); var k = sprites.indexOf(d); if (k >= 0) sprites.splice(k, 1); };
    });
  }, { passive: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
