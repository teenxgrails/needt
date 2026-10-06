/* THE HERO'S BEHAVIOUR — one frame loop for everything that moves.
 *
 * Scroll drives the window (rises and flattens) and the paper (sinks a little
 * slower, so it sits behind). The pointer drives the floating services, each
 * at its own depth. Time drives their gentle bob. All of it is written once a
 * frame, and the loop sleeps when the hero is off screen or the tab is hidden.
 */
(function () {
  var hero = document.querySelector("[data-hx]");
  if (!hero) return;
  var STILL = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var win = hero.querySelector(".hx-win");
  var tears = Array.prototype.slice.call(hero.querySelectorAll(".hx-tear"));
  var logos = Array.prototype.slice.call(hero.querySelectorAll(".hx-logo"));

  /* ── Torn edges, generated once: a jagged line along the named sides, small
     teeth on top of a slow wander, so no two scraps tear the same way. ── */
  function rand(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function torn(sides, seed) {
    var r = rand(seed), pts = [], n = 46, i, t, wob;
    function edge(fn) { var w = 0; for (i = 0; i <= n; i++) { t = i / n; w += (r() - 0.5) * 2.2; w *= 0.86; wob = w + (r() - 0.5) * 2.6; pts.push(fn(t, wob)); } }
    var top = sides.indexOf("t") >= 0, right = sides.indexOf("r") >= 0, bottom = sides.indexOf("b") >= 0, left = sides.indexOf("l") >= 0;
    edge(function (t, w) { return [t * 100, top ? 6 + w : 0]; });
    edge(function (t, w) { return [right ? 94 + w : 100, t * 100]; });
    edge(function (t, w) { return [100 - t * 100, bottom ? 94 + w : 100]; });
    edge(function (t, w) { return [left ? 6 + w : 0, 100 - t * 100]; });
    return "polygon(" + pts.map(function (p) { return p[0].toFixed(2) + "% " + p[1].toFixed(2) + "%"; }).join(",") + ")";
  }
  var SIDES = { "hx-tear-l": "tr", "hx-tear-w": "trbl", "hx-tear-r": "tl", "hx-tear-k": "trbl", "hx-tear-g": "tlb" };
  tears.forEach(function (el, k) {
    var cls = Array.prototype.find.call(el.classList, function (c) { return SIDES[c]; });
    el.style.clipPath = torn(SIDES[cls] || "t", 97 + k * 131);
  });


  /* ── Logos: where they sit, how deep they are, how they bob. ── */
  var seats = logos.map(function (el, i) {
    return { el: el, x: 0, y: 0, vx: 0, vy: 0, s: 1, vs: 0, tilt: 0, cx: 0, cy: 0,
      depth: +el.dataset.depth || 0.5, phase: i * 1.37, rot: +el.dataset.rot || 0 };
  });

  /* ── A new hand every time you come back. The seats stay where the layout
     put them; which service sits in each, and at what angle, is dealt again
     whenever the hero has been scrolled out of view — so the change has
     already happened when it returns and is never watched happening. ── */
  var POOL = [
    ["chatgpt", 1], ["claude", 0], ["google", 0], ["notion", 0], ["slack", 0, "webp"], ["github", 0],
    ["figma", 0], ["apple", 0], ["gemini", 0], ["perplexity", 0], ["meta", 0], ["microsoft", 0],
    ["grok", 0], ["cursor", 0], ["hermes", 0]
  ];
  function deal() {
    var bag = POOL.slice();
    for (var i = bag.length - 1; i > 0; i--) { var k = Math.floor(Math.random() * (i + 1)); var t = bag[i]; bag[i] = bag[k]; bag[k] = t; }
    seats.forEach(function (s, i) {
      var pick = bag[i % bag.length];
      var img = s.el.querySelector("img");
      if (img) img.src = "img/logos/" + pick[0] + "." + (pick[2] || "svg");
      s.el.classList.toggle("is-dark", !!pick[1]);
      s.rot = Math.round((Math.random() * 2 - 1) * 9);
      s.el.style.setProperty("--r", s.rot + "deg");
    });
  }
  deal();

  /* ── Pointer, read into a variable; used on the frame. ── */
  var mx = 0, my = 0, ex = 0, ey = 0, px = -9999, py = -9999, rests = true;
  /* Each seat's resting centre, read only when layout can have moved — never
     inside pointermove. The live offset is subtracted so a seat that is
     already dodging is measured where it would be at rest. */
  /* ── WHERE THE SERVICES SIT, COMPUTED FROM THE LAYOUT ─────────────────
     The seats used to be hand-placed percentages, which meant some always
     fell off the edge of the screen, two could land on top of each other, and
     at narrower widths they slid under the window. Now they are laid out from
     what is actually there: a column in each gutter beside the window when
     the gutter is wide enough to hold one, otherwise a small cluster on each
     side of the headline, clear of the text. Whatever does not fit is hidden
     rather than squeezed. Every seat stays fully on screen. */
  var stage = hero.querySelector(".hx-stage");
  var sub = hero.querySelector(".hx-sub"), cta = hero.querySelector(".hx-cta");
  /* Loose patterns, as fractions of the room each side has: x across the
     gutter, y down the stage. No two spots share a row or a column. */
  var WIDE = [[0.30, -0.95], [0.72, -0.20], [0.22, 0.55], [0.66, 1.30]];
  var NARROW = [[0.2, -2.7], [0.75, -1.05]];
  var jit = [];
  function rejitter() { jit = seats.map(function () { return [Math.random() - 0.5, Math.random() - 0.5]; }); }
  rejitter();
  function layout() {
    if (!stage || !win) return;
    var SW = stage.clientWidth, sz = seats.length ? seats[0].el.offsetWidth : 60;
    var gut = (SW - win.offsetWidth) / 2, M = 18;
    var spots = [];
    if (gut >= sz + 2 * M) {
      var room = gut - sz - 2 * M;
      WIDE.forEach(function (p, i) {
        var a = jit[i * 2] || [0, 0], b = jit[i * 2 + 1] || [0, 0];
        spots.push({ x: M + room * Math.min(1, Math.max(0, p[0] + a[0] * 0.3)), y: p[1] * (sz + 40) + a[1] * 24 });
        spots.push({ x: SW - sz - M - room * Math.min(1, Math.max(0, (1 - p[0]) + b[0] * 0.3)), y: (p[1] + 0.4) * (sz + 40) + b[1] * 24 });
      });
    } else {
      var half = Math.max(sub ? sub.getBoundingClientRect().width : 0, cta ? cta.getBoundingClientRect().width : 0) / 2;
      var side = SW / 2 - half - 24 - M - sz;
      if (side > 0) NARROW.forEach(function (p, i) {
        var a = jit[i * 2] || [0, 0], b = jit[i * 2 + 1] || [0, 0];
        spots.push({ x: M + side * Math.min(1, Math.max(0, p[0] + a[0] * 0.3)), y: p[1] * (sz + 30) + a[1] * 16 });
        spots.push({ x: SW - sz - M - side * Math.min(1, Math.max(0, (1 - p[0]) + b[0] * 0.3)), y: (p[1] + 0.5) * (sz + 30) + b[1] * 16 });
      });
    }
    seats.forEach(function (s, i) {
      var p = spots[i];
      s.el.style.visibility = p ? "" : "hidden";
      if (!p) return;
      s.el.style.left = p.x.toFixed(1) + "px";
      s.el.style.top = p.y.toFixed(1) + "px";
    });
  }

  function measure() {
    layout();
    seats.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      s.cx = r.left + r.width / 2 - s.x;
      s.cy = r.top + r.height / 2 - s.y;
    });
    rests = false;
  }
  window.addEventListener("scroll", function () { rests = true; }, { passive: true });
  window.addEventListener("resize", function () { rests = true; });
  hero.addEventListener("pointermove", function (e) {
    var b = hero.getBoundingClientRect();
    mx = (e.clientX - b.left) / b.width - 0.5;
    my = (e.clientY - b.top) / b.height - 0.5;
    px = e.clientX; py = e.clientY;
  }, { passive: true });
  hero.addEventListener("pointerleave", function () { mx = 0; my = 0; px = -9999; py = -9999; });

  /* ── Once the window has risen, Needt's cursor places a task: it comes in
     from the corner, takes the unplaced card, carries it into the open slot
     on today, and leaves. Human-reach timing, one curve per trip. ── */
  var app = hero.querySelector(".hc");
  var placed = false;
  function ease(t) { return t * t * t * (10 + t * (-15 + 6 * t)); }
  function trip(el, from, to, ms, done) {
    var t0 = 0;
    function f(now) {
      if (!t0) t0 = now;
      var p = Math.min((now - t0) / ms, 1), e = ease(p);
      el.style.transform = "translate3d(" + (from.x + (to.x - from.x) * e) + "px," + (from.y + (to.y - from.y) * e - Math.sin(Math.PI * e) * 24) + "px,0)";
      if (p < 1) requestAnimationFrame(f); else if (done) done();
    }
    requestAnimationFrame(f);
  }
  function place() {
    if (placed || !app) return;
    var src = app.querySelector("[data-hc-src]"), dst = app.querySelector("[data-hc-dst]"), cur = app.querySelector(".hc-cursor");
    if (!src || !dst || !cur) return;
    placed = true;
    var A = app.getBoundingClientRect();
    var s = src.getBoundingClientRect(), d = dst.getBoundingClientRect();
    var home = { x: A.width - 40, y: A.height - 20 };
    var grab = { x: s.left - A.left + s.width * 0.6, y: s.top - A.top + s.height * 0.55 };
    cur.style.opacity = "1";
    trip(cur, home, grab, 620, function () {
      dst.classList.add("is-aim");
      /* Lift the card out of the queue and carry it. */
      var fly = src.cloneNode(true);
      fly.removeAttribute("data-hc-src");
      fly.classList.add("is-flying");
      fly.style.width = s.width + "px"; fly.style.left = "0"; fly.style.top = "0";
      src.style.visibility = "hidden";
      app.appendChild(fly);
      var c0 = { x: s.left - A.left, y: s.top - A.top }, c1 = { x: d.left - A.left, y: d.top - A.top };
      fly.style.transform = "translate3d(" + c0.x + "px," + c0.y + "px,0)";
      var off = { x: grab.x - c0.x, y: grab.y - c0.y };
      trip(fly, c0, c1, 760);
      trip(cur, grab, { x: c1.x + off.x, y: c1.y + off.y }, 760, function () {
        /* Drop: the card becomes part of the day, the queue counts down. */
        fly.classList.remove("is-flying"); fly.style.cssText = "";
        fly.querySelector("em").textContent = "11:00 › 12:30";
        dst.replaceWith(fly);
        src.remove();
        /* The count is what is left, never a literal: and when nothing is left the
           queue says so rather than leaving a heading over an empty gap. */
        var q = app.querySelector(".ha-queue");
        var left = q ? q.querySelectorAll(".ha-card").length : 0;
        var n = app.querySelector("[data-hc-count]"); if (n) n.textContent = String(left);
        if (q && !left) q.innerHTML = '<span class="ha-empty">Everything has a time.</span>';
        var plan = app.querySelector(".hc-plan");
        trip(cur, { x: c1.x + off.x, y: c1.y + off.y }, home, 620, function () { cur.style.opacity = "0"; });
        if (plan) { plan.classList.add("is-press"); setTimeout(function () { plan.classList.remove("is-press"); }, 160); }
      });
    });
  }

  var running = false, t0 = 0;
  function tick(now) {
    if (!running) return;
    if (!t0) t0 = now;
    var h = hero.offsetHeight || 1;
    var p = STILL ? 1 : Math.max(0, Math.min(window.scrollY / (h * 0.55), 1));
    var e = 1 - Math.pow(1 - p, 3);
    if (win && !STILL) {
      win.style.setProperty("--hx-y", (70 * (1 - e)).toFixed(1) + "px");
      win.style.setProperty("--hx-rx", (16 * (1 - e)).toFixed(2) + "deg");
      win.style.setProperty("--hx-s", (0.93 + 0.07 * e).toFixed(4));
    }
    tears.forEach(function (el, i) { el.style.setProperty("--hx-ty", (-(18 + i * 6) * e).toFixed(1) + "px"); });
    /* Ease the pointer so the services drift after it rather than snapping. */
    ex += (mx - ex) * 0.08; ey += (my - ey) * 0.08;
    var tt = (now - t0) / 1000;
    if (rests) measure();
    /* Each service shies from the hand: near the pointer it slides away along
       the line between them, grows a little and leans toward where the hand
       came from — then springs home. A whole-field drift underneath keeps the
       depth. Springs, not easing, so a fast pass overshoots and settles the
       way a light object knocked on a desk does. */
    seats.forEach(function (s) {
      var tx = -ex * 40 * s.depth, ty = -ey * 26 * s.depth;
      s.x += (tx - s.x) * 0.12; s.y += (ty - s.y) * 0.12;
      s.el.style.setProperty("--px", s.x.toFixed(1) + "px");
      s.el.style.setProperty("--py", s.y.toFixed(1) + "px");
      s.el.style.setProperty("--fy", STILL ? "0px" : (Math.sin(tt * 0.9 + s.phase) * 6 * s.depth).toFixed(1) + "px");
    });
    if (p > 0.5) place();
    window.requestAnimationFrame(tick);
  }
  function start() { if (running) return; running = true; t0 = 0; window.requestAnimationFrame(tick); }
  function stop() { running = false; }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        if (x.isIntersecting && !document.hidden) { rests = true; start(); }
        else { stop(); if (!x.isIntersecting) { deal(); rejitter(); rests = true; } }
      });
    }).observe(hero);
  } else start();
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
})();
