/* THE WORDMARK, ALIVE — the product's own variable face on the landing.
 *
 * One axis: EXPO, −100 to +100, resting 0. At −100 the counters fill and the
 * letters fuse into a dark mass; at 0 it is a crisp Didone. The mark on this
 * page is the same object as the one in the app rail, at hero size — not a
 * picture of it and not a second face that resembles it.
 *
 * Three behaviours, and each one is a fact rather than an effect:
 *
 *   DEVELOP-IN  once, on load: the word comes up out of nothing the way a
 *               print comes up in a tray. easeOutCubic, not expo — expo
 *               front-loads the move and the last 300ms goes dead.
 *   BREATHE     a slow travelling wave, each letter a fifth of a second behind
 *               the last. The offset spread is what makes it a wave instead of
 *               a synchronised throb; synchronised, it reads as a pulsing
 *               graphic rather than as something alive.
 *   TORCH       the pointer inks the letters nearest it, on a spring. The lag
 *               behind the cursor is the whole effect: without it the mark
 *               reads as a slider, with it as a light source.
 *
 * The loop is paused when the mark is off screen or the tab is hidden — a
 * variable font re-rasterises every glyph on every frame, which is the most
 * expensive thing on this page if it is left running out of sight.
 */
(function () {
  var STILL = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", function () {
    var marks = document.querySelectorAll("[data-expo]");
    if (!marks.length) return;
    /* Every mark on the page, not the first: the hero's name and the giant one
       at the floor are the same object at two sizes, and a querySelector here
       animated one and left the other dead on the axis. */
    Array.prototype.forEach.call(marks, function (mark, index) { live(mark, index); });
  });

  function live(mark, index) {
    /* Split into letters. The markup keeps the word, so a crawler and a
       selection both read "Needt" whatever happens to this file. */
    var word = mark.textContent.trim();
    mark.textContent = "";
    mark.setAttribute("aria-label", word);
    var letters = word.split("").map(function (ch) {
      var s = document.createElement("span");
      s.className = "ew-letter";
      s.textContent = ch;
      mark.appendChild(s);
      return s;
    });

    /* The most light a mark may take. Display sizes use the full axis; the
       header's 24px mark is capped at 0, because the positive half thins its
       strokes until they disappear at that size. */
    var CAP = mark.hasAttribute("data-expo-max") ? +mark.getAttribute("data-expo-max") : 100;
    function write(el, v) { el.style.fontVariationSettings = '"EXPO" ' + Math.min(v, CAP).toFixed(1); }

    if (STILL) { letters.forEach(function (el) { write(el, 0); }); return; }

    /* ── Develop-in ─────────────────────────────────────────────────────── */
    var DEV = 620, LAG = 85;
    var t0 = 0;
    function develop(now) {
      if (!t0) t0 = now;
      var done = 0;
      letters.forEach(function (el, i) {
        var p = Math.max(0, Math.min((now - t0 - i * LAG) / DEV, 1));
        /* easeOutCubic */
        var e = 1 - Math.pow(1 - p, 3);
        write(el, -100 + 100 * e);
        if (p >= 1) done++;
      });
      if (done < letters.length) return window.requestAnimationFrame(develop);
      loop();
    }

    /* ── Breathe, plus the torch ────────────────────────────────────────── */
    var CYCLE = 5200, PHASE = 200, DEPTH = -30;
    var TORCH = 55, REACH = 190;
    var live = [], vel = [];
    letters.forEach(function () { live.push(0); vel.push(0); });
    var pointer = null;
    var amp = 1;
    var running = false;
    var start = 0;

    /* The pointer is read into a variable and used on the frame; a listener
       that writes styles is a listener that writes them more often than the
       browser can paint. */
    mark.addEventListener("pointermove", function (e) { pointer = e.clientX; amp = 0; }, { passive: true });
    mark.addEventListener("pointerleave", function () { pointer = null; amp = 1; }, { passive: true });

    function tick(now) {
      if (!running) return;
      if (!start) start = now;
      var t = now - start;
      for (var i = 0; i < letters.length; i++) {
        /* Breathe: negative, because ink is what a breath adds. Its amplitude
           falls to nothing while the torch is out, so two motions never run on
           one axis at once — that always reads as a fault, never as richness. */
        var ph = ((t + i * PHASE) % CYCLE) / CYCLE;
        var base = DEPTH * (0.5 - 0.5 * Math.cos(ph * Math.PI * 2)) * amp;

        /* Torch: distance from the pointer, smoothstepped, then sprung —
           stiffness 220, damping 26, mass 1. The spring is why it feels like
           light moving rather than a value being set. */
        var target = base;
        if (pointer !== null) {
          var r = letters[i].getBoundingClientRect();
          var d = Math.min(Math.abs(pointer - (r.left + r.width / 2)) / REACH, 1);
          var k = 1 - (d * d * (3 - 2 * d));
          target = base + TORCH * k;
        }
        var a = (target - live[i]) * 0.055 - vel[i] * 0.26;
        vel[i] += a;
        live[i] += vel[i];
        write(letters[i], Math.max(-100, Math.min(live[i], 100)));
      }
      window.requestAnimationFrame(tick);
    }

    function loop() {
      if (running) return;
      running = true;
      start = 0;
      window.requestAnimationFrame(tick);
    }
    function halt() { running = false; }

    /* Off screen or in a background tab it stops entirely: a variable face
       re-rasterises every glyph every frame, and doing that where nobody can
       see it is the most expensive nothing on the page. */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting && !document.hidden) loop(); else halt(); });
      }, { threshold: 0.05 }).observe(mark);
    }
    document.addEventListener("visibilitychange", function () { if (document.hidden) halt(); else loop(); });

    /* The face has to be in before the axis means anything, and font-display
       block means the first frame would otherwise animate a fallback serif
       that has no EXPO axis at all. */
    if (document.fonts && document.fonts.load) {
      document.fonts.load('1em "Exposure VAR"').then(function () { window.requestAnimationFrame(develop); },
        function () { window.requestAnimationFrame(develop); });
    } else {
      window.requestAnimationFrame(develop);
    }
  }
})();
