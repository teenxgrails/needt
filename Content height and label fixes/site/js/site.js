/* THE INNER PAGES' BEHAVIOUR — the reveal, and the fitted frames.
 *
 * Both are small enough that a framework would be the larger part of the page,
 * and both must run immediately after first paint, so they are here as one
 * file with no dependencies.
 *
 * WHAT USED TO BE HERE AND IS NOT: a clock that banded the hour onto <html>
 * and toggled the app's `dark` class at night. It went for two reasons, and
 * the second is the one that matters.
 *
 * The first is the landing's own decision, taken deliberately: a canvas that
 * changes colour under a reader makes the same page look wrong at seven in the
 * evening, and drift belongs to the PRODUCT — where it is a property of the
 * person's day — not to a marketing page they visit once.
 *
 * The second is that the class was still being written after the daylight
 * language arrived. These pages are painted light by land.css and pages.css,
 * so a `dark` scope underneath them meant every design-system token the markup
 * fell through to resolved to its dark value on a light ground: the accent
 * came out #71B2FF at 2.16:1 against a bone card, and `--text-primary` came
 * out near-white. Worse, it flipped itself at nine in the evening, so the page
 * was correct in the morning and broken at night — an intermittent fault is
 * the expensive kind.
 */

/* ARMED ONLY WHEN SOMETHING CAN UNDO IT.
 *
 * Hiding the content is a promise that an observer will give it back, and a
 * document loaded while hidden receives no intersections at all — so the
 * promise is made and never kept, and the reader arrives at empty frames. The
 * arming therefore waits for the page to actually be visible: loaded in a
 * background tab it simply shows the content, which is the honest outcome,
 * and animates it only if it was there to watch.
 *
 * Written before first paint in the visible case, so nothing flashes in and
 * then hides itself. */
(function () {
  var root = document.documentElement;
  function arm() {
    if (document.hidden) return;
    root.classList.add("js-reveal");
    document.removeEventListener("visibilitychange", arm);
  }
  arm();
  if (document.hidden) document.addEventListener("visibilitychange", arm);
})();

document.addEventListener("DOMContentLoaded", function () {
  /* ── THE EVENING'S TWO EXTRA LAYERS ───────────────────────────────────
   * The sky and the stars are pseudo-elements on <body>, which is two; the
   * evening star and the light under the cursor need two more, and a
   * pseudo-element cannot be given a third. They are injected here rather
   * than typed into eleven files: a decorative layer that has to be
   * remembered in markup is a layer that will be missing from page twelve.
   *
   * THE METEOR IS GONE, not merely unstyled: you cannot see one against a sky
   * that still has light in it, and an injected element with no rules is a
   * layer the next reader has to go and disprove. */
  var dusk = document.body.classList.contains("s-dusk");
  if (dusk) {
    /* Two layers, two clocks, and each owns its own opacity: a breathing
       layer that also carried a one-shot event would multiply the event's
       alpha by its own breath. */
    ["s-twinkle", "s-glow"].forEach(function (cls) {
      if (document.querySelector("." + cls)) return;
      var el = document.createElement("span");
      el.className = cls;
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
    });

    /* THE LIGHT FOLLOWS THE HAND, ONE FRAME AT A TIME.
     *
     * The pointer reports at the display's rate and the browser paints once a
     * frame, so the other reports are work nobody can see. The handler stores
     * two numbers; a single rAF writes them. Nothing else on these pages runs
     * per frame, and this stops entirely the moment the pointer leaves.
     *
     * Skipped on touch: there is no hovering hand to follow, and a glow that
     * jumps to wherever you last tapped is a glow that looks broken. */
    if (!window.matchMedia("(pointer: coarse)").matches
        && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      var gx = 0, gy = 0, queued = false;
      var root = document.documentElement;
      window.addEventListener("pointermove", function (e) {
        gx = e.clientX; gy = e.clientY;
        if (!document.body.classList.contains("is-lit")) document.body.classList.add("is-lit");
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () {
          queued = false;
          root.style.setProperty("--gx", gx + "px");
          root.style.setProperty("--gy", gy + "px");
        });
      }, { passive: true });
      /* The light belongs to the hand, so it goes out when the hand does. */
      document.addEventListener("pointerleave", function () { document.body.classList.remove("is-lit"); });
      window.addEventListener("blur", function () { document.body.classList.remove("is-lit"); });
    }
  }

  /* ── CLOSING AN ANSWER ─────────────────────────────────────────────────
   * Opening is the browser's and the CSS grid's job and this does not touch
   * it. Closing is the half native <details> cannot animate: the instant the
   * attribute goes, the content stops being rendered and there is nothing
   * left to shrink. (::details-content looks like the answer and is not: in
   * the closed state its `block-size: auto` resolves against skipped content,
   * so the transition runs 0 → 0 and the panel never opens at all.)
   *
   * So the default action is cancelled for the closing click only, the row is
   * run down to 0fr, and the attribute is dropped when it arrives. The
   * element stays a real <details> throughout — keyboard, find-in-page and
   * no-JS behaviour are untouched.
   *
   * The timeout is the escape: a transition that never fires must not leave a
   * panel stuck open with its answer already faded out. */
  (function () {
    var items = document.querySelectorAll(".s-faq details, .l-faq details");
    if (!items.length) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    Array.prototype.forEach.call(items, function (d) {
      var summary = d.querySelector("summary");
      var body = d.querySelector(".s-faq-body, .l-faq-body");
      if (!summary || !body) return;
      summary.addEventListener("click", function (e) {
        if (!d.open || reduce) return;
        e.preventDefault();
        if (d.classList.contains("is-closing")) return;
        d.classList.add("is-closing");
        var done = false, timer = 0;
        var finish = function () {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          body.removeEventListener("transitionend", onEnd);
          d.classList.remove("is-closing");
          d.open = false;
        };
        var onEnd = function (ev) {
          if (ev.target === body && ev.propertyName === "grid-template-rows") finish();
        };
        body.addEventListener("transitionend", onEnd);
        timer = window.setTimeout(finish, 900);
      });
    });
  })();

  /* THE REVEAL. Once per element, then the observer lets it go — a section
     that re-animates every time it scrolls past is a section that never
     finishes. */
  var items = document.querySelectorAll(".s-reveal");
  if (items.length && !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("is-in"); });
  } else if (items.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });
    items.forEach(function (el) { io.observe(el); });
    /* A document loaded while hidden delivers no intersections at all, so a
       tab opened in the background and read later would arrive at a page of
       empty frames. Re-observing on the way back costs nothing and closes
       the one case the observer cannot see. */
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) return;
      document.querySelectorAll(".s-reveal:not(.is-in)").forEach(function (el) { io.observe(el); });
    });
  }

  /* MINIATURES. A real app screen in an iframe, rendered at app size and
     scaled as a whole — so every measurement inside it is the product's, not a
     re-typed approximation. The scale is computed from the frame's own width,
     which is the only number the page knows and the iframe does not. */
  function fitMinis() {
    document.querySelectorAll("[data-mini]").forEach(function (box) {
      var frame = box.querySelector("iframe");
      if (!frame) return;
      var w = +frame.getAttribute("width") || 1440;
      var h = +frame.getAttribute("height") || 1000;
      var k = box.clientWidth / w;
      frame.style.transform = "scale(" + k + ")";
      box.style.height = Math.round(h * k) + "px";
    });
  }
  fitMinis();
  window.addEventListener("resize", fitMinis);
  /* The frames load lazily, so refit when one arrives. */
  document.querySelectorAll("[data-mini] iframe").forEach(function (f) {
    f.addEventListener("load", fitMinis);
  });
});

/* THE FLOOR'S CROP, MEASURED — the landing's rule, for pages that carry the
   floor without land.js: the word is pulled up by exactly the air the font
   puts above its capitals, so only the bottom edge crops it. */
(function () {
  function pull() {
    var word = document.querySelector(".l-floor-word");
    if (!word) return;
    var cs = getComputedStyle(word);
    if (!parseFloat(cs.fontSize)) return;
    var c = document.createElement("canvas").getContext("2d");
    c.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    var m = c.measureText(word.textContent || "Needt");
    var air = m.fontBoundingBoxAscent - m.actualBoundingBoxAscent;
    if (air > 0) word.style.setProperty("--floor-pull", "-" + Math.max(0, air - 1).toFixed(1) + "px");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pull); else pull();
  window.addEventListener("load", pull);
  window.addEventListener("resize", pull);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(pull);
  if ("ResizeObserver" in window) document.addEventListener("DOMContentLoaded", function () {
    var f = document.querySelector(".l-floor"); if (f) new ResizeObserver(pull).observe(f);
  });
})();

/* The gift ticket's ink changes each time you scroll back down to it: the
   colour moves on the way OUT of view, so the change has already happened
   when it comes back and you never watch it recolour under your eye. */
(function () {
  var tones = ["red", "green", "violet"];
  function next(b) {
    var cur = b.getAttribute("data-tone");
    var pick = tones.filter(function (t) { return t !== cur; });
    b.setAttribute("data-tone", pick[Math.floor(Math.random() * pick.length)]);
  }
  function boot() {
    var tickets = document.querySelectorAll(".tk-btn");
    tickets.forEach(next);
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target._seen = true; return; }
        if (e.target._seen) { e.target._seen = false; next(e.target); }
      });
    });
    tickets.forEach(function (b) { io.observe(b); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

/* THE MIDDLE TEAR SITS AGAINST A REAL SECTION, measured, so it lands beside
   the comparison sheet rather than at a guessed offset that drifts as rows
   are added. Re-measured on resize, load and when the tab becomes visible. */
(function (run) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})(function () {
  var b = document.querySelector(".p-tear-bot");
  var f = document.querySelector(".s-footer, footer");
  if (b && f) {
    var size = function () { b.style.setProperty("--tear-bot-h", (f.offsetHeight + 70) + "px"); };
    size();
    window.addEventListener("resize", size);
    window.addEventListener("load", size);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) size(); });
  }
});

(function (run) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})(function () {
  var tear = document.querySelector(".p-tear-mid");
  var anchor = document.querySelector(".pt-sheet") || document.querySelector("main section:nth-of-type(2)");
  if (!tear || !anchor) return;
  var bot = document.querySelector(".p-tear-bot");
  var foot = document.querySelector(".s-footer, footer");
  function place() {
    /* The bottom tear reaches from the page foot to just above the closing
       heading, so its high side climbs past "Your day, planned." */
    if (bot && foot) bot.style.setProperty("--tear-bot-h", (foot.offsetHeight + 70) + "px");
    var y = 0;
    for (var n = anchor; n; n = n.offsetParent) y += n.offsetTop;
    if (!y) return;
    tear.style.top = Math.max(0, y + anchor.offsetHeight * 0.22) + "px";
  }
  place();
  window.addEventListener("resize", place);
  window.addEventListener("load", place);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) place(); });
});
