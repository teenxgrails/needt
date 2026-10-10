/* THE LANDING'S BEHAVIOUR — one frame, three scrubs, and a hand.
 *
 * Three rules this file is built to, and each one was a defect before it was a
 * rule:
 *
 *   1 · MOTION MUST MEAN SOMETHING. The page claims that something always
 *       moves, that Needt rebuilds the day, and that you see it before you
 *       keep it. Every behaviour below serves one of those three. Six that did
 *       not — word-by-word headings, pointer glow, card tilt, a magnetised
 *       button, a drifting ground colour, and a second marquee saying what the
 *       first already said — were removed rather than tuned. Decoration costs
 *       the same frames as meaning.
 *
 *   2 · ONE FRAME FOR THE WHOLE PAGE. Not a listener per card: one scheduler,
 *       one handle, one callback that runs every job. The handle is cancelled
 *       and replaced rather than gated by a boolean, because a flag set before
 *       a frame and cleared inside it strands the handler for good when that
 *       frame never arrives — which is what a background tab does to the first
 *       frame of every load.
 *
 *   3 · GEOMETRY IS MEASURED WHEN IT CHANGES, NOT WHEN YOU SCROLL. No
 *       getBoundingClientRect inside a scroll or pointer handler: it forces
 *       layout before it can answer. Offsets are read once per resize and the
 *       jobs work from scrollY, and every position is written straight to the
 *       element — never through state that would re-render a tree to move one
 *       transform.
 */
(function () {
  var STILL = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── THE PAGE'S ONE FRAME ───────────────────────────────────────────────*/
  var jobs = [];
  var running = false;
  var lastY = -1;
  var lastH = -1;
  function frame() {
    for (var i = 0; i < jobs.length; i++) jobs[i]();
  }
  /* The ticker: awake while the page is, asleep when it is hidden — a page
     nobody is looking at should not be recomputing a timeline. */
  function tick() {
    if (!running) return;
    var y = window.scrollY;
    var h = window.innerHeight;
    /* Nothing moved: the cheapest possible frame. */
    if (y !== lastY || h !== lastH) {
      lastY = y;
      lastH = h;
      frame();
    }
    window.requestAnimationFrame(tick);
  }
  function start() {
    if (running) return;
    running = true;
    lastY = -1;
    window.requestAnimationFrame(tick);
  }
  function stop() { running = false; }
  /* Kept as a name because the scenes and the recovery paths call it; it now
     just forces the next frame to do its work. */
  function ask() { lastY = -1; }
  /* Idempotent measurements, so running them outright is free — and it is the
     only recovery a dropped first frame needs. */
  /* Waking re-measures rather than only re-drawing: a tab hidden at first
     paint is exactly the case where the measurements are what is missing. */
  function wake() { remeasure(); }

  /* Layout metrics, re-read only when layout can have changed. */
  var measures = [];
  function remeasure() {
    for (var i = 0; i < measures.length; i++) measures[i]();
    lastY = -1;
    frame();
  }

  document.addEventListener("DOMContentLoaded", function () {
  /* ── CLOUDS ON THE SEAMS ─────────────────────────────────────────────
   * Each cloud is pinned to the gap between two sections, at the page edge,
   * alternating sides — measured, because section heights change with the
   * viewport and a cloud placed by percentage lands on a paragraph. Re-run on
   * resize and once fonts settle. */
  (function () {
    var layer = document.querySelector(".l-clouds");
    if (!layer) return;
    var clouds = Array.prototype.slice.call(layer.querySelectorAll(".l-cloud"));
    function seams() {
      var secs = Array.prototype.slice.call(document.querySelectorAll("body > section, body > header, body > footer"))
        .filter(function (s) { return s.offsetHeight > 120; });
      var out = [];
      for (var k = 0; k + 1 < secs.length; k++) {
        var a = secs[k].getBoundingClientRect(), b = secs[k + 1].getBoundingClientRect();
        out.push((a.bottom + b.top) / 2 + window.scrollY);
      }
      return out;
    }
    function place() {
      var ys = seams();
      clouds.forEach(function (el, i) {
        var y = ys[i];
        if (y == null) { el.style.display = "none"; return; }
        el.style.display = "";
        el.style.top = Math.round(y - el.offsetHeight / 2) + "px";
        var right = i % 2 === 1;
        el.style.left = right ? "auto" : "-" + Math.round(el.offsetWidth * 0.34) + "px";
        el.style.right = right ? "-" + Math.round(el.offsetWidth * 0.34) + "px" : "auto";
      });
    }
    place();
    /* On the same wake path as every other layout measurement: a tab hidden
       at first paint measures every section as zero and hides every cloud. */
    measures.push(place);
    window.addEventListener("resize", place);
    window.addEventListener("load", place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  })();


    /* ── INERTIAL SCROLL ──────────────────────────────────────────────────
     *
     * The wheel's own behaviour is a jump: a notch of the wheel is a step of
     * about 100px delivered instantly, which is why a page with big type and
     * long sections feels like it is being shoved rather than moved. What
     * "expensive" scrolling actually is, is mass — the page keeps arriving for
     * a quarter of a second after your hand has stopped.
     *
     * THE ONE DECISION THAT MATTERS: it drives the REAL scroll position with
     * scrollTo, rather than transforming a wrapper. Transforming is how most
     * smooth-scroll libraries do it and it would break everything this page is
     * built on — position: sticky stops sticking, the pinned scenes lose their
     * anchor, and the scroll-driven timeline reads a scrollY that no longer
     * corresponds to what is on screen. Driving the real position costs one
     * scrollTo a frame and every one of those keeps working untouched.
     *
     * It is also switched off wherever it would be wrong rather than tuned to
     * compensate: a touch screen already has inertia in the compositor and
     * hijacking it makes the page feel laggy; an element with its own overflow
     * owns its wheel; and reduced motion means the wheel is the wheel.
     */
    (function () {
      if (STILL) return;
      /* Coarse pointer means touch or pen: the platform's own inertia is
         better than anything reimplemented in script, and it runs off the main
         thread. */
      if (window.matchMedia("(pointer: coarse)").matches) return;

      var target = window.scrollY;
      var current = target;
      var gliding = false;
      var handle = 0;
      /* The last position this glide wrote, so the next frame can tell its own
         movement apart from anyone else's. */
      var wrote = null;
      /* 0.11 of the remaining distance a frame: the page settles in about
         320ms, which is long enough to feel weight and short enough that a
         second flick is never waiting on the first. */
      var EASE = 0.11;

      function limit() {
        return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      }

      /* One way to stop, so no caller can forget the frame. */
      function stop() {
        if (handle) window.cancelAnimationFrame(handle);
        handle = 0;
        gliding = false;
        wrote = null;
      }

      function glide() {
        /* Abandoned by a later gesture: stop, and do not schedule another. */
        if (!gliding) { handle = 0; return; }
        /* SOMEONE ELSE MAY HAVE MOVED THE PAGE. The glide writes a position
           every frame, so if anything else scrolls while it runs — a scrollbar
           drag, the keyboard, find-on-page, an anchor, or the trackpad's own
           momentum — the next frame drags the page back to where the glide
           thought it was. That is what a broken scroll feels like: you move
           the page and it refuses. So each frame checks the position it wrote
           last against where the page actually is, and hands control back the
           moment they disagree by more than a rounding error. */
        if (wrote !== null && Math.abs(window.scrollY - wrote) > 2) {
          stop();
          return;
        }
        var d = target - current;
        /* Under a pixel there is nothing left to animate, and continuing to
           call scrollTo would pin the page against whatever the user does
           next — including a native anchor jump or a keyboard page-down. */
        if (Math.abs(d) < 0.4) {
          current = target;
          window.scrollTo(0, current);
          stop();
          return;
        }
        current += d * EASE;
        window.scrollTo(0, current);
        wrote = window.scrollY;
        handle = window.requestAnimationFrame(glide);
      }

      function push(by) {
        /* The target is taken from the live position whenever the glide is not
           running, so a scroll made any other way — a keyboard, a drag of the
           scrollbar, an anchor — is never fought over. */
        if (!gliding) { current = window.scrollY; wrote = null; }
        target = Math.max(0, Math.min((gliding ? target : current) + by, limit()));
        if (!gliding) {
          gliding = true;
          handle = window.requestAnimationFrame(glide);
        }
      }

      window.addEventListener("wheel", function (e) {
        if (e.ctrlKey || e.metaKey) return;          /* a zoom gesture */
        if (e.deltaMode === 2) return;                /* a page-at-a-time wheel */
        /* Anything with its own overflow keeps its wheel: the sidebar rails
           inside the app embeds, the FAQ, a code block. Walking up from the
           target is a handful of reads on a real gesture and none on a frame. */
        var n = e.target;
        while (n && n !== document.body && n.nodeType === 1) {
          if (n.scrollHeight - n.clientHeight > 2) {
            var cs = getComputedStyle(n).overflowY;
            if (cs === "auto" || cs === "scroll") return;
          }
          n = n.parentNode;
        }
        /* Under 40px in pixel mode is a trackpad or a precision wheel: the
           platform has already smoothed and thrown it, so it is left alone. */
        if (e.deltaMode === 0 && Math.abs(e.deltaY) < 40) {
          if (gliding) stop();
          return;
        }
        e.preventDefault();
        /* A line-mode wheel reports 3 lines rather than pixels. */
        push(e.deltaMode === 1 ? e.deltaY * 18 : e.deltaY);
      }, { passive: false });

      /* An anchor is the same movement with a known destination, so it goes
         through the same glide — two easing systems on one page would show
         their difference the moment you used both. */
      document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute("href").slice(1);
        if (!id) return;
        var to = document.getElementById(id);
        if (!to) return;
        e.preventDefault();
        if (!gliding) current = window.scrollY;
        target = Math.max(0, Math.min(window.scrollY + to.getBoundingClientRect().top, limit()));
        if (!gliding) { gliding = true; handle = window.requestAnimationFrame(glide); }
      });

      /* A tab that goes away mid-glide comes back to a stopped page rather
         than to a frame's worth of leftover momentum. */
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stop();
      });
    })();

    /* ── THE FAQ OPENS AND CLOSES ON ITS OWN BOX ──────────────────────────
     * Every CSS route failed for one reason: the answer lives inside a closed
     * <details>, which the browser does not render, so no transition has a
     * starting value to leave from. What does work is animating the <details>
     * element ITSELF, which is always rendered: set it open first so the
     * answer exists, read both heights, and run one Web Animation between
     * them. Closing reverses it and only drops `open` when the box is shut.
     * It is still a real <details> — keyboard, find-in-page and no-JS keep
     * working — and a second click mid-motion reverses from where it is. */
    (function () {
      if (STILL) return;
      var ease = "cubic-bezier(0.16, 0.84, 0.28, 1)";
      document.querySelectorAll(".l-faq details").forEach(function (d) {
        var sum = d.querySelector("summary");
        var body = d.querySelector(".l-faq-body");
        if (!sum) return;
        var anim = null;
        sum.addEventListener("click", function (e) {
          e.preventDefault();
          var from = d.offsetHeight;
          var opening = !d.open || d.classList.contains("is-closing");
          if (anim) { anim.cancel(); anim = null; }
          d.classList.remove("is-closing");
          d.style.overflow = "hidden";
          var to;
          if (opening) { d.open = true; to = d.offsetHeight; }
          else { d.classList.add("is-closing"); to = sum.offsetHeight; }
          anim = d.animate({ height: [from + "px", to + "px"] },
            { duration: opening ? 460 : 340, easing: ease });
          if (body && opening) body.animate({ opacity: [0, 1], transform: ["translateY(-6px)", "none"] },
            { duration: 420, delay: 60, easing: ease, fill: "backwards" });
          anim.onfinish = function () {
            if (!opening) d.open = false;
            d.classList.remove("is-closing");
            d.style.overflow = "";
            anim = null;
          };
        });
      });
    })();

    /* Earlier attempt, kept for the record: the FAQ needed no script and the panel opened natively.
     *
     * A closing animation would need one, because <details> drops its content
     * the instant the attribute goes — but there is no box animation left to
     * hold the panel open for. `::details-content` will not resolve
     * `height: auto` while any transition is declared on it, measured four
     * ways, so the height cannot be animated at all; see the note above
     * .l-faq in land.css. The version of this that survived the removal was
     * waiting on a `transitionend` for `grid-template-rows` that no element
     * fires any more, and it left every panel stuck open — a worse defect
     * than closing without a flourish. */

    /* ── THE COMPARISON TABLE'S SET CHANGE ───────────────────────────────
     * The table is visible without this — CSS animates the cells only while
     * .is-swap is on the wrapper, which is exactly as long as one arrival.
     * Authored visible, armed by script: the rule this project has re-learned
     * the hard way, because an animation that holds its own from-state leaves
     * a blank table in any tab whose animation clock is not running.
     *
     * The class is removed and re-added across a forced reflow, or a second
     * swap inside the first one's 0.45s would not restart anything. */
    (function () {
      var wrap = document.querySelector(".sp-wrap");
      if (!wrap) return;
      var radios = wrap.querySelectorAll('input[type="radio"]');
      if (!radios.length) return;
      var t = 0;
      Array.prototype.forEach.call(radios, function (r) {
        r.addEventListener("change", function () {
          if (!r.checked) return;
          wrap.classList.remove("is-swap");
          void wrap.offsetWidth;
          wrap.classList.add("is-swap");
          window.clearTimeout(t);
          t = window.setTimeout(function () { wrap.classList.remove("is-swap"); }, 500);
        });
      });
    })();

    /* ── MINIATURES ──────────────────────────────────────────────────────
       A real app screen in an iframe, rendered at app size and scaled whole,
       so every measurement inside it is the product's rather than a re-typed
       approximation. */
    function fitMinis() {
      document.querySelectorAll("[data-mini]").forEach(function (box) {
        var f = box.querySelector("iframe");
        if (!f) return;
        var w = +f.getAttribute("width") || 1440;
        var h = +f.getAttribute("height") || 1000;
        /* HOW BIG THE APP IS INSIDE THE FRAME IS AUTHORED DIRECTLY, not as a
           multiplier. `data-scale` is the effective scale of the app itself —
           0.75 means the product renders at three quarters of life size, so its
           13px chrome lands near 10px and is actually readable. A zoom
           multiplier could not promise that: it multiplied a fit-to-box scale,
           so the same authored 2.1 was legible in a wide tile and 4px type in
           a narrow one. Fitting the whole app is the special case now, not the
           default: no `data-scale` means fit. */
        var scale = +box.dataset.scale || 0;
        var focus = (box.dataset.focus || "50,50").split(",");
        var k = scale || box.clientWidth / w;
        /* Before layout clientWidth is 0, and a zero written here is a frame
           scaled to nothing — indistinguishable from a broken embed. */
        if (!k) return;
        var boxH = box.clientHeight || Math.round(h * (box.clientWidth / w));
        /* Where the focus point lands once scaled, and the offset that brings
           it to the middle of the frame — clamped so the app's own edges never
           come inside it, which would show the page behind. */
        var fx = (+focus[0] || 50) / 100 * w * k;
        var fy = (+focus[1] || 50) / 100 * h * k;
        var dx = Math.min(0, Math.max(box.clientWidth - w * k, box.clientWidth / 2 - fx));
        var dy = Math.min(0, Math.max(boxH - h * k, boxH / 2 - fy));
        f.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(" + k + ")";
        /* A framed shot's height is the tile's business, not the app's ratio:
           the whole point is that only part of the app is inside it. Only the
           fit-whole embeds still take their height from the scale. */
        if (!scale) box.style.height = Math.round(h * k) + "px";
      });
    }
    measures.push(fitMinis);
    fitMinis();

    /* ── THE EMBEDS MOUNT WHEN THEY ARE NEEDED ───────────────────────────
     * Each of these frames is a whole React app: its own rAF loops, drag
     * handlers, focus timers and observers. Four booting at page load is the
     * lag — `loading="lazy"` does not help, because the frames are inside the
     * viewport's root margin almost immediately on a page this tall, and it
     * says nothing about when the app inside starts working.
     *
     * So the src is held in `data-src` and written only when the tile comes
     * within a screen of view, and written once. Nothing above the fold waits
     * on an app boot, and an app that is never scrolled to never boots. */
    (function () {
      var boxes = document.querySelectorAll("[data-mini][data-src]");
      if (!boxes.length) return;

      /* ONE BOOT AT A TIME. The old rootMargin was a full screen, so on the
         way down to the week section all three frames crossed the line inside
         a few hundred milliseconds and three React apps mounted, laid out and
         started their loops in the same handful of frames. That is the stall
         the page had on the way into that section: not the scrolling, the
         booting. The queue lets one app finish before the next starts, so the
         cost is spread along the scroll instead of landing in one frame. */
      var queue = [], booting = false;
      function pump() {
        if (booting || !queue.length) return;
        var box = queue.shift();
        var f = box.querySelector("iframe");
        if (!f || f.src) return pump();
        booting = true;
        var done = false;
        var next = function () {
          if (done) return;
          done = true;
          remeasure();
          booting = false;
          /* A beat of air after each app before the next one starts, so the
             one that just mounted gets its first frames to itself. */
          setTimeout(pump, 240);
        };
        f.addEventListener("load", next);
        /* A frame that never fires load must not hold the queue for ever. */
        setTimeout(next, 4000);
        f.src = box.dataset.src;
      }
      function mount(box) {
        var f = box.querySelector("iframe");
        if (!f || f.src || queue.indexOf(box) > -1) return;
        queue.push(box);
        pump();
      }

      if (!("IntersectionObserver" in window)) {
        Array.prototype.forEach.call(boxes, mount);
        return;
      }
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          mount(e.target);
        });
      }, { rootMargin: "60% 0px" });
      Array.prototype.forEach.call(boxes, function (box) { io.observe(box); });

      /* ── AN OFF-SCREEN APP STANDS STILL ─────────────────────────────────
       * Mounting was deferred; STOPPING was not, so every app that had ever
       * been scrolled past kept running for the rest of the visit — agent
       * cursor, flame, clocks, breathing, one rAF loop each — and they all
       * animated while the reader was somewhere else entirely. By the week
       * section three of them were live at once, on top of that section's own
       * scroll work.
       *
       * display:none is the lever, and it is a specification-level one: an
       * animation frame callback is only run for a document that is rendered,
       * and an unrendered iframe document is not. The loops inside pause
       * without the app knowing anything about it, and without unloading — the
       * document keeps its state, so coming back is a repaint and not a boot.
       *
       * The gate is generous — half a screen past the edge — so a tile parked
       * at the boundary cannot flicker between the two states. */
      var idle = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var f = e.target.querySelector("iframe");
          if (!f || !f.src) return;
          if (e.isIntersecting) {
            if (f.style.display === "none") f.style.display = "";
          } else if (f.style.display !== "none") {
            f.style.display = "none";
          }
        });
      }, { rootMargin: "50% 0px" });
      Array.prototype.forEach.call(boxes, function (box) { idle.observe(box); });
    })();

    /* How far the product rises into the first screen. */
    var peekHost = document.querySelector("#day");
    var peekFrame = peekHost && peekHost.querySelector(".l-frame");
    function setPeek() {
      if (!peekHost || !peekFrame) return;
      var fh = peekFrame.getBoundingClientRect().height;
      if (!fh) return;
      var want = Math.max(120, Math.min(fh * 0.32, 240));
      var pad = parseFloat(getComputedStyle(peekHost).paddingTop) || 0;
      peekHost.style.marginTop = -(want + pad) + "px";
    }
    measures.push(setPeek);
    setPeek();
    document.querySelectorAll("[data-mini] iframe").forEach(function (f) {
      f.addEventListener("load", remeasure);
    });

    /* ── THE NOW-LINE IS A CLOCK ─────────────────────────────────────────
       Real time, at the real position for it. A planner whose landing page
       shows a fictional clock makes its first claim a false one — so this one
       runs even under reduced motion: it is a value, not an animation. */
    var nows = document.querySelectorAll("[data-now]");
    if (nows.length) {
      var tickNow = function () {
        var d = new Date();
        var label = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
        nows.forEach(function (n) {
          var t = n.querySelector(".o-now-time");
          if (t) t.textContent = label;
          var from = +n.dataset.from || 8, to = +n.dataset.to || 20;
          var h = d.getHours() + d.getMinutes() / 60;
          n.style.top = (Math.max(0.04, Math.min((h - from) / (to - from), 0.96)) * 100).toFixed(2) + "%";
        });
      };
      tickNow();
      window.setInterval(tickNow, 20000);
    }

    /* Under reduced motion nothing below runs at all: no scrub, no drift, no
       hand. The stylesheet puts every animated element in its finished state,
       so the page is complete and still. */
    if (STILL) {
      document.querySelectorAll(".o-slot[data-fx]").forEach(function (el) {
        el.style.transform = "none";
        el.style.opacity = "1";
      });
      document.querySelectorAll(".o-ghost").forEach(function (el) { el.style.opacity = "0"; });
      return;
    }

    /* ── THE FLOOR'S CROP IS MEASURED, NOT AUTHORED ──────────────────────
     * The word is pulled up by exactly the air the FONT puts above its
     * capitals — `fontBoundingBoxAscent − actualBoundingBoxAscent` — so the
     * letters start flush with the top of their crop box and every overflowing
     * pixel lands on the bottom edge, where the crop is the effect. Written as
     * a CSS variable and registered as a measurement, so it survives a resize
     * and re-runs once the variable face has actually loaded: before that the
     * metrics belong to a fallback serif with different proportions. */
    (function () {
      var floor = document.querySelector(".l-floor");
      var word = floor && floor.querySelector(".l-floor-word");
      if (!word) return;
      var probe = document.createElement("canvas").getContext("2d");
      function pull() {
        var cs = getComputedStyle(word);
        var size = parseFloat(cs.fontSize);
        if (!size) return;
        probe.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
        var m = probe.measureText(word.textContent || "Needt");
        var air = m.fontBoundingBoxAscent - m.actualBoundingBoxAscent;
        if (!(air > 0)) return;
        /* One pixel of clearance, so a rounding difference between the canvas
           and the layout engine cannot put the ink back over the edge. */
        word.style.setProperty("--floor-pull", "-" + Math.max(0, air - 1).toFixed(1) + "px");
      }
      measures.push(pull);
      pull();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(pull);
    })();

    /* ── THE CLOSING LINE HAS WEIGHT ─────────────────────────────────────
     *
     * He described it exactly: it scrolls heavily and is then pulled back. So
     * the line lags the page by up to 60px while the scroll is moving and
     * springs home when it stops — mass, not a parallax. The difference
     * matters: parallax is a fixed ratio to position and never catches up,
     * while this is a function of VELOCITY, so a stationary page always shows
     * the line where it belongs.
     *
     * It writes a transform straight to its own wrapper, and the breath lives
     * on a second element inside it. Two motions on one element would be one
     * transform, and the per-frame write would erase the keyframe every
     * frame — which looks like the breath simply not working.
     */
    (function () {
      var hosts = document.querySelectorAll("[data-heavy]");
      if (!hosts.length) return;
      Array.prototype.forEach.call(hosts, function (host) {
        var el = host.querySelector(".l-heavy") || host;
        var MAX = +host.dataset.heavy || 60;
        /* Some of these are clipped by their own container — the name at the
           floor is cropped by the bottom edge — and for those the lag has to
           be one-directional. Letting it travel upward would lift the glyph
           tops above the crop and cut them, which is the exact defect the
           floor's metrics were derived to avoid. */
        var DOWN = host.hasAttribute("data-heavy-down");
        var lag = 0, vel = 0, prev = window.scrollY, seen = false, handle = 0;

        function step() {
          var y = window.scrollY;
          /* The scroll's own velocity, smoothed: a raw per-frame delta is
             spiky enough that the line would jitter rather than drag. */
          vel = vel * 0.72 + (y - prev) * 0.28;
          prev = y;
          var target = vel * 2.4;
          target = DOWN ? Math.max(0, Math.min(target, MAX)) : Math.max(-MAX, Math.min(target, MAX));
          /* And the spring home. 0.14 of the remaining distance a frame puts
             it back in about a quarter of a second after the hand stops. */
          lag += (target - lag) * 0.14;
          el.style.transform = "translate3d(0, " + lag.toFixed(2) + "px, 0)";
          /* Asleep once it is home and nothing is moving: a permanent rAF for
             an element that is not moving is the cost this page refuses. */
          if (!seen || (Math.abs(lag) < 0.15 && Math.abs(vel) < 0.15)) {
            el.style.transform = "none";
            lag = 0; vel = 0; handle = 0;
            return;
          }
          handle = window.requestAnimationFrame(step);
        }
        function nudge() {
          if (!seen || handle) return;
          prev = window.scrollY;
          handle = window.requestAnimationFrame(step);
        }
        if ("IntersectionObserver" in window) {
          new IntersectionObserver(function (es) {
            es.forEach(function (e) { seen = e.isIntersecting; if (seen) nudge(); });
          }, { threshold: 0 }).observe(host);
        } else { seen = true; }
        window.addEventListener("scroll", nudge, { passive: true });
      });
    })();

    /* ── THE WASH CHANGES COLOUR EACH TIME YOU COME BACK ─────────────────
     *
     * The hues are the product's project colours, not a sixth palette: the
     * colour on the landing then means what colour means in the app. Five of
     * them, advanced on the way OUT rather than on the way in — so the change
     * has already happened by the time it is on screen, and you never watch a
     * highlight recolour itself under the sentence you are reading. */
    (function () {
      var el = document.querySelector("[data-cycle]");
      if (!el) return;
      var WASH = [
        ["#D8F7E8", "#B6EFD4"],   /* resale green  */
        ["#DCEBFF", "#C2DDFF"],   /* design blue   */
        ["#FFF3D0", "#FFE7A6"],   /* life yellow   */
        ["#FFE6DA", "#FFD2BD"],   /* operations    */
        ["#EFE4FF", "#E0CEFF"]    /* german violet */
      ];
      var i = 0;
      /* Seeded false, and this is load-bearing: the observer's FIRST callback
         at load reports not-intersecting, because the element is nine
         thousand pixels down the page. With `was` seeded true that counted as
         a departure and advanced the index for free — so the first view was
         the second colour and the green was never seen at all. */
      var was = false;
      if (!("IntersectionObserver" in window)) return;
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (was && !e.isIntersecting) {
            i = (i + 1) % WASH.length;
            el.style.setProperty("--wash-a", WASH[i][0]);
            el.style.setProperty("--wash-b", WASH[i][1]);
          }
          was = e.isIntersecting;
        });
      }, { threshold: 0 }).observe(el);
    })();

    /* ── THE HEADER'S MARK ARRIVES WHEN THE WORDMARK LEAVES ──────────────
       The name is absent from the cluster while it is on screen at six times
       the size, and grows into it once that is gone. Driven from the same
       frame as everything else, so it is one class write and no new loop. */
    var root = document.documentElement;
    var markAt = 240;
    var floorAt = Infinity;
    measures.push(function () {
      var hero = document.querySelector("[data-parallax]");
      markAt = hero ? Math.max(hero.offsetHeight * 0.42, 180) : 240;
      /* Document offset of the floor's name, from offsetTop so the answer does
         not depend on the scroll position it is measured at. */
      var floor = document.querySelector(".l-floor");
      var y = 0;
      for (var n = floor; n; n = n.offsetParent) y += n.offsetTop;
      floorAt = floor ? y + floor.offsetHeight * 0.25 : Infinity;
    });
    jobs.push(function () {
      var on = window.scrollY > markAt && window.scrollY + window.innerHeight < floorAt;
      if (on !== root.classList.contains("is-scrolled")) root.classList.toggle("is-scrolled", on);
    });

    /* ── THE HIGHLIGHTS TAKE THE POINTER'S LIGHT ─────────────────────────
       Read from the event's own offset rather than from a measured rect: no
       layout is forced, and with two elements on the page there is nothing to
       gain from routing it through the page's frame. */
    if (!STILL) {
      document.querySelectorAll(".l-em").forEach(function (el) {
        var sheen = document.createElement("span");
        sheen.className = "l-em-sheen";
        sheen.setAttribute("aria-hidden", "true");
        el.appendChild(sheen);
        el.addEventListener("pointermove", function (e) {
          sheen.style.setProperty("--hx", ((e.offsetX / el.offsetWidth) * 100).toFixed(1) + "%");
          sheen.style.setProperty("--hy", ((e.offsetY / el.offsetHeight) * 100).toFixed(1) + "%");
        }, { passive: true });
      });
    }

    /* ── THE ROTATING SUBJECT ────────────────────────────────────────────*/
    document.querySelectorAll(".l-rot-slot[data-items]").forEach(function (slot, slotIndex) {
      var spec = [];
      try { spec = JSON.parse(slot.getAttribute("data-items")); } catch (e) { spec = []; }
      if (spec.length) {
        slot.textContent = "";
        var items = spec.map(function (pair, i) {
          var s = document.createElement("span");
          s.className = "l-rot-item" + (i === 0 ? " is-on" : "");
          if (i !== 0) s.setAttribute("aria-hidden", "true");
          if (Array.isArray(pair) && pair[1]) s.style.setProperty("--rot-hue", pair[1]);
          /* The app's own block, at the height of a capital: a rail in the
             subject's colour and a line of text beside it. */
          /* Two shapes of item. A SUBJECT is a word with the app's own block
             beside it, because the chip carries which thing is in question. A
             PHRASE is a line with one highlighted span inside it, because the
             part that sells a claim is never the whole sentence. */
          var isPhrase = pair && typeof pair === "object" && !Array.isArray(pair);
          if (isPhrase) s.classList.add("is-phrase");
          if (!isPhrase && pair[1]) {
            var chip = document.createElement("span");
            chip.className = "l-rot-chip";
            chip.setAttribute("aria-hidden", "true");
            chip.style.setProperty("--rot-hue", pair[1]);
            var rail = document.createElement("i");
            var face = document.createElement("span");
            chip.appendChild(rail);
            chip.appendChild(face);
            s.appendChild(chip);
          }
          if (isPhrase) {
            /* Whatever punctuation the tail opens with belongs to the phrase
               inside the pill, not to the space after it. */
            var hl = pair.hl || "";
            var tail = pair.b || "";
            var lead = tail.match(/^[.,;:!?…]+/);
            if (lead && hl) { hl += lead[0]; tail = tail.slice(lead[0].length); }
            if (pair.a) s.appendChild(document.createTextNode(pair.a));
            if (hl) {
              var mark = document.createElement("span");
              mark.className = "l-em " + (pair.cls || "l-hl-wash l-hl-time");
              mark.textContent = hl;
              s.appendChild(mark);
              if (!STILL) {
                var sh = document.createElement("span");
                sh.className = "l-em-sheen";
                sh.setAttribute("aria-hidden", "true");
                mark.appendChild(sh);
                mark.addEventListener("pointermove", function (e) {
                  sh.style.setProperty("--hx", ((e.offsetX / mark.offsetWidth) * 100).toFixed(1) + "%");
                  sh.style.setProperty("--hy", ((e.offsetY / mark.offsetHeight) * 100).toFixed(1) + "%");
                }, { passive: true });
              }
            }
            if (tail) s.appendChild(document.createTextNode(tail));
          } else {
            var word = document.createElement("span");
            word.textContent = pair[0];
            s.appendChild(word);
          }
          slot.appendChild(s);
          return s;
        });
        /* Measured once: the slot then animates between known widths instead
           of reading layout mid-transition. */
        var block = slot.hasAttribute("data-block");
        if (block) slot.classList.add("is-block");
        var widths = items.map(function (s) { return s.getBoundingClientRect().width; });
        var at = 0;
        /* Same rule: a slot pinned to 0 leaves its absolutely-positioned item
           running out of dead centre — the sentence visibly off by half its
           own width. */
        function sizeSlot() {
          if (block) {
            /* Every sentence is measured at the column's width and the slot
               keeps the tallest, so a longer line arriving never pushes the
               rest of the page down. */
            var tall = 0;
            items.forEach(function (s) { tall = Math.max(tall, s.getBoundingClientRect().height); });
            if (tall) slot.style.minHeight = Math.ceil(tall) + "px";
            return;
          }
          items.forEach(function (s, i) {
            var w = s.getBoundingClientRect().width;
            if (w) widths[i] = w;
          });
          var want = widths[at] || widths[0];
          if (want) slot.style.width = Math.ceil(want) + "px";
        }
        measures.push(sizeSlot);
        sizeSlot();
        if (!STILL && items.length > 1) {
          var every = +slot.getAttribute("data-every") || 3200;
          window.setInterval(function () {
            if (document.hidden) return;
            var prev = items[at];
            at = (at + 1) % items.length;
            prev.classList.remove("is-on");
            prev.classList.add("is-out");
            /* Removed from the tree only once it has finished leaving, so a
               reader never lands on an empty slot mid-swap. */
            window.setTimeout(function () {
              prev.classList.remove("is-out");
              prev.setAttribute("aria-hidden", "true");
            }, 520);
            items[at].removeAttribute("aria-hidden");
            items[at].classList.add("is-on");
            if (!block && widths[at]) slot.style.width = Math.ceil(widths[at]) + "px";
          }, every + slotIndex * 700);
        }
      }
    });

    /* ── 1 · THE HERO PARALLAX ───────────────────────────────────────────
       The sky recedes slower than the page and the words leave faster, which
       is what gives a flat plate depth — and depth is what makes the sky a
       place rather than a picture. */
    var host = document.querySelector("[data-parallax]");
    if (host) {
      var sky = host.querySelector(".l-sky-par");
      var body = host.querySelector(".l-sky-body");
      var heroH = 1;
      measures.push(function () { heroH = host.offsetHeight || 1; });
      heroH = host.offsetHeight || 1;
      jobs.push(function () {
        var p = Math.max(0, Math.min(window.scrollY / heroH, 1));
        if (sky) sky.style.transform = "translate3d(0," + (p * 70).toFixed(1) + "px,0)";
        if (body) {
          body.style.transform = "translate3d(0," + (p * -110).toFixed(1) + "px,0)";
          body.style.opacity = String(Math.max(0, 1 - p * 1.35));
        }
      });
    }

    /* ── 2 · THE DAY ASSEMBLES ───────────────────────────────────────────
       The page's central claim, performed. Four tasks with nowhere to be leave
       the air and land in the hours that are free; the two things already
       agreed to are in place from the first frame, because they were never
       ours to move.
       Scrubbed rather than keyed: a keyframe timeline does not reverse the
       same way everywhere, and this must run backwards when you scroll back. */
    var scene = document.querySelector("[data-assemble]");
    if (scene) {
      var slots = Array.prototype.slice.call(scene.querySelectorAll(".o-slot[data-fx]"));
      var ghosts = Array.prototype.slice.call(scene.querySelectorAll(".o-ghost"));
      var caption = scene.querySelector("[data-assemble-say]");
      var says = ["Three tasks with nowhere to be.", "Needt takes the free hours.", "A day you can keep."];
      var sceneTop = 0, sceneSpan = 1;
      var metaScene = function () {
        var t = 0, el = scene;
        while (el) { t += el.offsetTop; el = el.offsetParent; }
        sceneTop = t;
        sceneSpan = Math.max(scene.offsetHeight - window.innerHeight, 1);
      };
      measures.push(metaScene);
      metaScene();

      var WIN = 0.46;
      /* Spread so the first opens at 0 and the last CLOSES at 1, whatever the
         count — the section's last act is reachable by definition rather than
         by arithmetic that happened to suit four blocks. */
      var step = slots.length > 1 ? (1 - WIN) / (slots.length - 1) : 0;
      function ease(t) { return t * t * t * (10 + t * (-15 + 6 * t)); }

      jobs.push(function () {
        var p = Math.max(0, Math.min((window.scrollY - sceneTop) / sceneSpan, 1));
        for (var i = 0; i < slots.length; i++) {
          var el = slots[i];
          var t = ease(Math.max(0, Math.min((p - i * step) / WIN, 1)));
          var fx = +el.dataset.fx || 0, fy = +el.dataset.fy || 0, fr = +el.dataset.fr || 0;
          el.style.transform =
            "translate3d(" + (fx * (1 - t)).toFixed(1) + "px," + (fy * (1 - t)).toFixed(1) + "px,0)" +
            " rotate(" + (fr * (1 - t)).toFixed(2) + "deg)" +
            " scale(" + (1 - 0.08 * (1 - t)).toFixed(3) + ")";
          el.style.opacity = (0.25 + 0.75 * t).toFixed(2);
          if (ghosts[i]) ghosts[i].style.opacity = (0.9 * (1 - t)).toFixed(2);
        }
        if (caption) {
          var say = says[p < 0.3 ? 0 : p < 0.78 ? 1 : 2];
          if (caption.textContent !== say) caption.textContent = say;
        }
      });
    }

    /* ── 3 · READING ALONG ───────────────────────────────────────────────
       One statement, lit word by word as it crosses the screen. It is here
       because it makes you read the page's thesis instead of scrolling past
       it — the only decorative-looking motion that survived the audit, and it
       survived on that ground. Once on the page: as an effect it is
       memorable, as a habit it would make every paragraph a performance. */
    var read = document.querySelector("[data-read]");
    if (read) {
      var spans = [];
      /* Only text nodes are replaced; anything already in the sentence — an
         emphasis mark and its treatment — survives and gets its words split
         in place. */
      function splitInto(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var parts = n.textContent.split(/(\s+)/);
            var frag = document.createDocumentFragment();
            parts.forEach(function (p) {
              if (!p) return;
              if (/^\s+$/.test(p)) return frag.appendChild(document.createTextNode(p));
              var s = document.createElement("span");
              s.className = "o-w";
              s.textContent = p;
              frag.appendChild(s);
              spans.push(s);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1 && !n.classList.contains("l-em-sheen")) {
            splitInto(n);
          }
        });
      }
      splitInto(read);

      var readTop = 0, readH = 1;
      var metaRead = function () {
        var t = 0, el = read;
        while (el) { t += el.offsetTop; el = el.offsetParent; }
        readTop = t;
        readH = read.offsetHeight || 1;
      };
      measures.push(metaRead);
      metaRead();
      if (STILL) {
        spans.forEach(function (s) { s.classList.add("is-lit"); });
      } else {
        var lastLit = -1;
        jobs.push(function () {
          /* From the moment its top reaches three quarters down the screen
             until its bottom passes the middle: the sentence is fully lit by
             the time it is centred, which is when it is being read. */
          var top = readTop - window.scrollY;
          var p = (window.innerHeight * 0.78 - top) / (readH + window.innerHeight * 0.5);
          var n = Math.round(Math.max(0, Math.min(p, 1)) * spans.length);
          if (n === lastLit) return;
          lastLit = n;
          for (var i = 0; i < spans.length; i++) spans[i].classList.toggle("is-lit", i < n);
        });
      }
    }

    /* ── THE HAZE FOLLOWS THE NAME ───────────────────────────────────────
       Both veils were fractions of the hero, which knows nothing about where
       the wordmark sits — so they covered the claim as well, and two white
       layers pushed the most important sentence on the site toward grey. The
       band is written from the wordmark's own measured box instead: air in
       front of the name, clean ground under the sentence, at any viewport. */
    (function () {
      var heroEl = document.querySelector("[data-parallax]");
      var nameEl = document.querySelector("[data-expo]");
      if (!heroEl || !nameEl) return;
      function bandHaze() {
        var heroH = heroEl.offsetHeight;
        var nameH = nameEl.offsetHeight;
        if (!heroH || !nameH) return;
        var pct = function (v) { return (v / heroH * 100).toFixed(2) + "%"; };
        /* OFFSET GEOMETRY, NOT TWO RECTS. The name sits inside .l-sky-body,
           which the parallax translates by up to -110px — so a rect-minus-rect
           subtraction across that ancestor is only true at scrollY 0, and any
           remeasure triggered mid-scroll (an iframe load, a font, a resize)
           wrote a band displaced by exactly the parallax and left the veil
           painting over empty sky. offsetTop ignores transforms by definition,
           so this answer is the same at every scroll position. */
        var nameTop = 0;
        for (var n = nameEl; n && n !== heroEl; n = n.offsetParent) nameTop += n.offsetTop;
        /* Half a letter-height above the name and a third below — where air in
           front of a word actually sits. */
        heroEl.style.setProperty("--haze-top", pct(nameTop - nameH * 0.45));
        heroEl.style.setProperty("--haze-h", pct(nameH * 1.35));
        /* The wisp crosses the strokes themselves, which is the part that
           reads as movement rather than as a wash over the plate. */
        heroEl.style.setProperty("--wisp-top", pct(nameTop + nameH * 0.14));
        heroEl.style.setProperty("--wisp-h", pct(nameH * 0.7));
      }
      measures.push(bandHaze);
      bandHaze();
    })();

    /* ── LIVE TYPE ───────────────────────────────────────────────────────*/
    var live = document.querySelector("[data-live]");
    if (live && !STILL) {
      var lts = [];
      /* Split text nodes only: the highlighted spans, the battery and the
         emphasis sheens keep their identity, and an element marked
         data-no-split is left whole — the battery and its word are one
         object and must not be cut between them. */
      (function split(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            /* One space per run, and none at the paragraph's own edges —
               exactly what the browser rendered before this ran. */
            var raw = n.textContent.replace(/\s+/g, " ");
            if (!n.previousSibling) raw = raw.replace(/^ /, "");
            if (!n.nextSibling) raw = raw.replace(/ $/, "");
            if (!raw) return node.removeChild(n);
            var frag = document.createDocumentFragment();
            raw.split(" ").forEach(function (word, wi) {
              if (wi) {
                var sp = document.createElement("span");
                sp.className = "lt-sp";
                sp.textContent = " ";
                frag.appendChild(sp);
              }
              if (!word) return;
              /* The word is the unit a line may break between. */
              var wrap = document.createElement("span");
              wrap.className = "lt-w";
              word.split("").forEach(function (ch) {
                var s = document.createElement("span");
                s.className = "lt";
                s.textContent = ch;
                wrap.appendChild(s);
                lts.push({ el: s, x: 0, y: 0, v: 0, k: 0 });
              });
              frag.appendChild(wrap);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1 && !n.hasAttribute("data-no-split") && !n.classList.contains("l-em-sheen") && !n.classList.contains("bat")) {
            split(n);
          }
        });
      })(live);

      var liveBox = { x: 0, y: 0 };
      measures.push(function () {
        var r = live.getBoundingClientRect();
        liveBox = { x: r.left + window.scrollX, y: r.top + window.scrollY };
        lts.forEach(function (o) {
          var b = o.el.getBoundingClientRect();
          o.x = b.left + b.width / 2 + window.scrollX;
          o.y = b.top + b.height / 2 + window.scrollY;
        });
      });

      var lp = null;
      live.addEventListener("pointermove", function (e) {
        lp = { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY };
      }, { passive: true });
      live.addEventListener("pointerleave", function () { lp = null; }, { passive: true });

      var REACH = 130;
      /* Its own ticker: the page's frame only runs when the scroll or the
         viewport changed, and this has to keep settling after the pointer
         stops — a spring that is only stepped on scroll never comes to rest. */
      (function settle() {
        var moved = false;
        for (var i = 0; i < lts.length; i++) {
          var o = lts[i];
          var target = 0;
          if (lp) {
            var dx = (lp.x - o.x) / REACH, dy = (lp.y - o.y) / (REACH * 0.9);
            var d = Math.min(Math.sqrt(dx * dx + dy * dy), 1);
            target = 1 - d * d * (3 - 2 * d);
          }
          /* Spring: stiff enough to follow a moving hand, damped enough that
             it does not ring after it leaves. */
          o.v = (o.v + (target - o.k) * 0.24) * 0.72;
          o.k += o.v;
          if (Math.abs(o.v) > 0.0004 || Math.abs(target - o.k) > 0.0008) moved = true;
          o.el.style.transform = o.k > 0.001
            ? "translate3d(0," + (-11 * o.k).toFixed(2) + "px,0) scale(" + (1 + 0.13 * o.k).toFixed(3) + ")"
            : "";
        }
        if (moved || lp) window.requestAnimationFrame(settle);
        else window.setTimeout(function () { window.requestAnimationFrame(settle); }, 180);
      })();
    }

    /* ── THE PINNED SCENES ───────────────────────────────────────────────*/
    var pins = [];
    document.querySelectorAll("[data-pin]").forEach(function (host) {
      var n = parseFloat(host.getAttribute("data-pin")) || 1;
      var stage = host.querySelector(".pin-stage");
      var p = { host: host, stage: stage, n: n, top: 0, span: 1 };
      pins.push(p);
    });

    function measurePins() {
      /* Fifth instance of the same rule on this page: a zero measurement is
         not a measurement. A viewport reporting 0 here would write 0 into
         every spacer and cost the page 4.2 viewports of scroll, collapsing all
         three scenes — and the CSS fallback height is what an unmeasured pin
         should keep, so writing nothing is strictly better than writing this. */
      if (!window.innerHeight) return;
      pins.forEach(function (p) {
        /* The spacer carries the hold: one viewport for the frame itself plus
           n viewports of scroll for the scene to be driven by. This is the
           only thing written here — where the pin sits is read per frame. */
        p.host.style.height = Math.round(window.innerHeight * (1 + p.n)) + "px";
      });
    }
    if (!STILL && pins.length) {
      measures.push(measurePins);
      measurePins();
    }

    /* One eased progress per pin, read from the live box. */
    function pinAt(host) {
      var n = parseFloat(host.getAttribute("data-pin")) || 1;
      var span = Math.max(window.innerHeight * n, 1);
      /* While the pin holds, its own top is exactly how far it has travelled
         past the top of the screen — negative, and growing. */
      return Math.max(0, Math.min(-host.getBoundingClientRect().top / span, 1));
    }
    function glide(t) { return t * t * t * (10 + t * (-15 + 6 * t)); }
    /* A slice of the whole: gives a scene's step its own window inside the
       pin, so the parts happen in order instead of together. */
    function slice(p, from, to) {
      return glide(Math.max(0, Math.min((p - from) / (to - from), 1)));
    }

    /* ── THE STEPS DEAL LIKE A DECK ──────────────────────────────────────
     * Three cards in a column is a list that happens to scroll. These are
     * three steps in sequence, so the scroll performs the sequence: each
     * sticks in turn, the next slides over it, and exactly one is live.
     *
     * Everything here is a function of where the card is, not of a timer —
     * so scrolling back up is the same animation in reverse, for free. */
    (function () {
      var deck = document.querySelector("[data-deck]");
      if (!deck) return;
      var cards = Array.prototype.slice.call(deck.querySelectorAll("article"));
      if (!cards.length) return;
      cards.forEach(function (el, i) { el.style.setProperty("--deck-i", i); });
      if (STILL) { cards.forEach(function (el) { el.classList.add("is-live"); }); return; }

      jobs.push(function () {
        var vh = window.innerHeight;
        cards.forEach(function (el, i) {
          var r = el.getBoundingClientRect();
          /* The same 148 as land-motion.css's sticky top. Read one number
             from two places and the live card is decided from a line the card
             is not standing on. */
          var stickTop = 148 + i * 22;
          /* How far the NEXT card has come over this one: the only honest
             measure of "how finished is this step". */
          var next = cards[i + 1];
          var covered = 0;
          if (next) {
            var nr = next.getBoundingClientRect();
            covered = Math.max(0, Math.min(1, (vh - nr.top) / (vh - stickTop + r.height * 0.4)));
          }
          /* Live = stuck at its top and not yet handed over. */
          var live = r.top <= stickTop + 4 && covered < 0.5;
          /* And the recede is what is LEFT after the hand-over: zero until
             0.5, then ramping to one. Both read from the same number, so a
             card can never be live and fading at the same time. */
          var back = Math.max(0, (covered - 0.5) * 2);
          el.style.setProperty("--deck-s", (1 - back * 0.055).toFixed(4));
          el.style.setProperty("--deck-y", (-back * 14).toFixed(1) + "px");
          el.style.setProperty("--deck-o", (1 - back * 0.42).toFixed(3));
          if (live !== el.classList.contains("is-live")) el.classList.toggle("is-live", live);
        });
      });
    })();

    /* ── SCENE 2 · the four come into the queue ──────────────────────────*/
    var s2 = document.querySelector("[data-s2]");
    if (s2 && !STILL) {
      var s2Blocks = Array.prototype.slice.call(s2.querySelectorAll(".s2-block"));
      var s2Queue = s2.querySelector("[data-s2-queue]");
      var s2Say = document.querySelector("[data-s2-say]");
      var s2Pin = s2.closest("[data-pin]");
      var s2Label = s2.querySelector("[data-s2-label]");
      var s2Title = document.querySelector(".s2-title");
      var s2Last = "";
      /* One measurement, written once: the queue's height and the stack's
         pitch are functions of how many blocks there are. A literal here is
         what made six items overflow a box built for four. */
      var s2Pitch = 54;
      var s2Count = s2Blocks.length;
      if (s2) s2.style.setProperty("--s2-h", (s2Count * s2Pitch + 22) + "px");
      jobs.push(function () {
        if (!s2Pin) return;
        var p = pinAt(s2Pin);
        s2Blocks.forEach(function (el, i) {
          /* Each one has its own quarter of the hold, opening a fifth behind
             the last: they arrive in order, which is what makes it read as
             being gathered rather than as a group fading. */
          /* Gathering takes the first two thirds; the last third is the
             placing, so the queue is seen as a queue before it resolves. */
          var t = slice(p, i * 0.085, i * 0.085 + 0.34);
          var fx = +el.dataset.fx || 0, fy = +el.dataset.fy || 0, fr = +el.dataset.fr || 0;
          /* Centred on the stack, whatever its length. */
          var ly = (i - (s2Count - 1) / 2) * s2Pitch;
          el.style.transform =
            "translate(-50%, -50%) translate3d(" + (fx * (1 - t)).toFixed(1) + "px," +
            (fy * (1 - t) + ly * t).toFixed(1) + "px,0) rotate(" + (fr * (1 - t)).toFixed(2) + "deg)";
          /* THE THIRD BEAT. Each task is given a time, in the order they
             arrived — not a tick: the claim is that the work gets placed, and
             a checkmark would say it got finished. Events are already placed
             and are left alone. */
          var placed = p > 0.6 + i * 0.075;
          if (placed !== el.classList.contains("is-placed")) el.classList.toggle("is-placed", placed);
        });
        if (s2Queue) s2Queue.style.opacity = (Math.max(0, Math.min((p - 0.14) / 0.24, 1)) * 0.95).toFixed(2);
        /* The label arrives with the queue and does NOT leave with it: it is
           the scene's one word, and it was disappearing only because it lived
           inside the scaffolding. */
        if (s2Title) {
          var done = p > 0.62;
          if (done !== s2Title.classList.contains("is-done")) s2Title.classList.toggle("is-done", done);
        }
        if (s2Label) {
          s2Label.style.opacity = Math.max(0, Math.min((p - 0.1) / 0.2, 1)).toFixed(2);
          var lab = p > 0.62 ? "Has a time" : "No time yet";
          if (s2Label.textContent !== lab) s2Label.textContent = lab;
        }
        if (s2Say) {
          var say = p < 0.36
            ? "Everything you wrote down, and no hour that owns it."
            : p < 0.6
            ? "One queue, and nothing in it has a time yet."
            : "Now each of them has an hour.";
          if (say !== s2Last) { s2Say.textContent = say; s2Last = say; }
        }
      });
    }

    /* ── SCENE 4 · the day assembles, then reflows ───────────────────────*/
    var s4 = document.querySelector("[data-s4]");
    if (s4 && !STILL) {
      var s4Slots = Array.prototype.slice.call(s4.querySelectorAll(".s4-slot"));
      var s4Meet = s4.querySelector("[data-s4-meet]");
      var s4Ask = s4.querySelector("[data-s4-ask]");
      var s4Say = document.querySelector("[data-s4-say]");
      var s4Pin = s4.closest("[data-pin]");
      var s4Last = "";
      jobs.push(function () {
        if (!s4Pin) return;
        var p = pinAt(s4Pin);
        /* First half: the four land, one after another. */
        s4Slots.forEach(function (el, i) {
          var t = slice(p, i * 0.08, i * 0.08 + 0.3);
          var fx = +el.dataset.fx || 0, fy = +el.dataset.fy || 0, fr = +el.dataset.fr || 0;
          /* Second half: the meeting arrives at 0.58 and the two blocks below
             it move down by its height — the reflow, shown while it is still
             reversible. */
          var shove = i >= 1 ? slice(p, 0.58, 0.76) * 52 : 0;
          el.style.transform =
            "translate3d(" + (fx * (1 - t)).toFixed(1) + "px," + (fy * (1 - t) + shove).toFixed(1) + "px,0)" +
            " rotate(" + (fr * (1 - t)).toFixed(2) + "deg)";
          el.style.opacity = (0.25 + 0.75 * t).toFixed(2);
        });
        if (s4Meet) {
          var m = slice(p, 0.5, 0.66);
          s4Meet.style.transform = "translate3d(0," + (-70 * (1 - m)).toFixed(1) + "px,0)";
          s4Meet.style.opacity = m.toFixed(2);
        }
        if (s4Ask) s4Ask.classList.toggle("is-on", p > 0.66);
        if (s4Say) {
          var say = p < 0.42 ? "Needt takes the free hours."
            : p < 0.66 ? "Something you agreed to arrives."
            : "The day reflows — and you see it before you keep it.";
          if (say !== s4Last) { s4Say.textContent = say; s4Last = say; }
        }
      });
    }


    /* ── THE COMPARISON TABLE ADVANCES ITS OWN SET ───────────────────────
     * A reader who does not know there is a second set never presses
     * anything, so the table shows them. It advances only while it is on
     * screen — a table rotating in a tab nobody is looking at is a timer
     * burning for nothing — and it stops FOR GOOD the moment the reader
     * presses a tab themselves: their choice outranks the demonstration.
     *
     * The radios are the state, exactly as they are for a click, so this
     * adds no second source of truth and the CSS is unchanged. */
    (function () {
      var wrap = document.querySelector(".sp-wrap");
      if (!wrap || STILL) return;
      var sets = Array.prototype.slice.call(wrap.querySelectorAll('input[name="sp-set"]'));
      if (sets.length < 2) return;
      var stopped = false, timer = null, seen = false;

      function stop() {
        stopped = true;
        if (timer) { clearInterval(timer); timer = null; }
      }
      /* Pointer and keyboard both, and on the label as well as the input:
         clicking a label fires on the input, but a reader who tabs to the
         radios and arrows through them never clicks anything. */
      wrap.addEventListener("pointerdown", stop);
      wrap.addEventListener("keydown", stop);

      function tick() {
        if (stopped) return;
        var at = 0;
        for (var i = 0; i < sets.length; i++) if (sets[i].checked) at = i;
        sets[(at + 1) % sets.length].checked = true;
      }
      function run(on) {
        if (stopped) return;
        if (on && !timer) timer = setInterval(tick, 9000);
        if (!on && timer) { clearInterval(timer); timer = null; }
      }
      if (!("IntersectionObserver" in window)) return;
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          /* The first turn waits a beat after it comes into view, so the set
             on screen is the one being read rather than one that changed
             while the reader was still arriving. */
          if (e.isIntersecting && !seen) { seen = true; setTimeout(function () { run(true); }, 2600); return; }
          run(e.isIntersecting);
        });
      }, { threshold: 0.2 }).observe(wrap);
    })();

    /* ── SCENE 6 · what the rail means ──────────────────────────────────*/
    var s6 = document.querySelector("[data-s6]");
    if (s6 && !STILL) {
      var s6Rails = Array.prototype.slice.call(s6.querySelectorAll("[data-s6-rail]"));
      var s6Lock = s6.querySelector("[data-s6-lock]");
      var s6Note = document.querySelector("[data-s6-note]");
      var s6Pin = s6.closest("[data-pin]");
      var s6Last = "";
      jobs.push(function () {
        if (!s6Pin) return;
        var p = pinAt(s6Pin);
        /* The rails state one dimension at a time: everything grey, then the
           movable ones take their project's colour. Two meanings on one mark
           at once is what the product refuses, so the scene refuses it too. */
        var lit = p > 0.42;
        s6Rails.forEach(function (el, i) {
          var move = el.getAttribute("data-s6-rail") === "move";
          el.style.background = !move ? "rgba(10,13,18,0.22)"
            : lit ? (i === 1 ? "#FF7A45" : "#2FD08A") : "rgba(10,13,18,0.22)";
        });
        if (s6Lock) s6Lock.style.opacity = p > 0.2 ? "1" : "0";
        if (s6Note) {
          var note = p < 0.42
            ? "Grey edge: you fixed the time, and Needt may not move it."
            : p < 0.74
            ? "Coloured edge: Needt chose the time, and can choose again."
            : "One mark, one meaning — so a glance at the day is enough.";
          if (note !== s6Last) { s6Note.textContent = note; s6Last = note; }
        }
      });
    }

    /* ── THE AGENT'S CURSOR ──────────────────────────────────────────────
     * The page claims the app does the placing, so the hero shows the app's
     * own hand doing it — the same object and the same physics as in the
     * product.
     *
     * A damped spring is the obvious model and the wrong one: given a sideways
     * push it returns to line by oscillating, so it sways on every trip.
     * People do not sway. A human reach is a ballistic launch and a short
     * corrective approach, and its velocity profile is the minimum-jerk curve
     * 10t³ − 15t⁴ + 6t⁵. The path is one quadratic bezier whose control point
     * is fixed before the first frame — a bow recomputed per frame from the
     * remaining distance is what makes a cursor wobble on arrival.
     */
    var cursor = document.querySelector(".l-cursor");
    var stage = document.querySelector("[data-cursor-stage]");
    if (cursor && stage) {
      var target = stage.querySelector("[data-cursor-target]");
      var busy = false;
      var place = function (x, y) { cursor.style.transform = "translate3d(" + x + "px," + y + "px,0)"; };
      var glide = function (t) { return t * t * t * (10 + t * (-15 + 6 * t)); };
      /* Fitts, in the shape that matters: a fixed cost to start moving plus a
         term that grows with distance far slower than distance does. */
      var span = function (d) { return Math.max(320, Math.min(820, 230 + 200 * Math.log2(d / 90 + 1))); };

      function reach(from, to, side, done) {
        var dx = to.x - from.x, dy = to.y - from.y;
        var len = Math.hypot(dx, dy) || 1;
        var bow = Math.min(len * 0.12, 54) * side;
        var cx = from.x + dx / 2 + (-dy / len) * bow;
        var cy = from.y + dy / 2 + (dx / len) * bow;
        var ms = span(len), t0 = 0;
        function stepFn(now) {
          if (!t0) t0 = now;
          var p = Math.min((now - t0) / ms, 1);
          var e = glide(p), u = 1 - e;
          place(u * u * from.x + 2 * u * e * cx + e * e * to.x,
                u * u * from.y + 2 * u * e * cy + e * e * to.y);
          if (p < 1) return window.requestAnimationFrame(stepFn);
          done();
        }
        window.requestAnimationFrame(stepFn);
      }

      function run() {
        if (busy || !target) return;
        var s = stage.getBoundingClientRect();
        if (s.bottom < 0 || s.top > window.innerHeight) return;
        busy = true;
        var t = target.getBoundingClientRect();
        var home = { x: s.width + 60, y: s.height * 0.86 };
        var hit = { x: t.left - s.left + t.width * 0.62, y: t.top - s.top + t.height * 0.52 };
        place(home.x, home.y);
        cursor.style.opacity = "1";
        reach(home, hit, 1, function () {
          cursor.classList.add("is-press");
          target.classList.add("is-hot");
          window.setTimeout(function () {
            cursor.classList.remove("is-press");
            window.setTimeout(function () {
              target.classList.remove("is-hot");
              reach(hit, home, -1, function () {
                cursor.style.opacity = "0";
                busy = false;
              });
            }, 420);
          }, 150);
        });
      }
      window.setTimeout(run, 2600);
      window.setInterval(run, 21000);
    }

    /* The ticker replaces the listener as the driver; scroll and resize only
       invalidate, they no longer have to be the thing that delivers. */
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", remeasure);
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    start();
    /* The load event may already have fired before this handler subscribed —
       the third time this project has been bitten by recovery that waits for
       an event which is already gone. So the state is checked instead of
       waited for, and the faces settle after it either way. */
    if (document.readyState === "loading") window.addEventListener("load", remeasure);
    else window.setTimeout(remeasure, 0);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) wake(); });
    window.addEventListener("pageshow", wake);
    frame();
  });
})();
