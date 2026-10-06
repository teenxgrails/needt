/* THE CAST AT HOME — one or two mascots per page, sitting where they belong.
 *
 * Each page names its guest: which mascot, what it sits on, which side, and
 * the one line it says when clicked. It sits on the TOP EDGE of the thing,
 * legs over, so it reads as perched on the paper rather than floating near it.
 * Hover hops (the components do that themselves); click shows the line in a
 * bubble for a moment. Four extras ride along: a face that peeks over Log in,
 * one that holds the gift ticket, a reader that travels the progress bar on
 * articles, and a burst of faces when the gift is opened.
 */
(function () {
  var STILL = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var page = (location.pathname.split("/").pop() || "index.html").replace(/\?.*$/, "");

  var GUESTS = {
    "agent.html":    [["needt-pop", "cheer", ".s-card", "right", "I'll find it an hour."]],
    "security.html": [["needt-cloud-v2", "calm", ".s-card", "left", "Your day stays yours."]],
    "download.html": [["needt-sprout", "grow", ".s-card, .s-wrap > h1", "right", "Fresh build, just sprouted."]],
    "compare.html":  [["needt-ember", "spark", ".s-card, table", "left", "No contest. Well, a small one."]],
    "blog.html":     [["needt-sun", "shine", ".s-card", "right", "Grab a coffee and read."]],
    "privacy.html":  [["needt-cloud", "float", ".s-card, .s-wrap > h2", "left", "We keep nothing we don't need."]],
    "terms.html":    [["needt-sun", "nap", ".s-card, .s-wrap > h2", "right", "Short version: be kind."]],
    "pricing.html":  [["needt-pop", "dance", ".lt", "left", "Cheaper than a coffee a week."]]
  };

  var CSS = `
  .mz { position: absolute; z-index: 6; width: 96px; height: 96px; pointer-events: auto; }
  .mz > * { --size: 96px; }
  /* The seat: a soft shadow pressed into the card's edge right under the body,
     so the weight reads as resting on the paper rather than hovering above it. */
  .mz-seat { position: absolute; left: 22%; right: 22%; top: 60px; height: 10px; border-radius: 50%;
    background: radial-gradient(closest-side, rgba(10,13,18,0.22), rgba(10,13,18,0)); pointer-events: none; z-index: -1; }

  .mz-bubble { position: absolute; bottom: 92%; left: 50%; transform: translate(-50%, 6px) scale(.9); opacity: 0;
    white-space: nowrap; padding: 8px 12px; border-radius: 14px; background: #fff; color: #0A0D12;
    font: 500 14px/1.2 "Figtree", var(--font-sans, system-ui); pointer-events: none;
    box-shadow: 0 0 0 1px rgba(10,13,18,.06), 0 10px 26px -12px rgba(10,13,18,.35);
    transition: opacity .2s ease, transform .3s cubic-bezier(.2,.8,.2,1); }
  .mz-bubble::after { content: ""; position: absolute; left: 50%; top: 100%; margin-left: -6px; border: 6px solid transparent; border-top-color: #fff; }
  .mz.is-talking .mz-bubble { opacity: 1; transform: translate(-50%, 0) scale(1); }
  .mz-peek { position: absolute; left: 50%; bottom: 62%; width: 46px; height: 46px; margin-left: -23px; z-index: -1;
    transform: translateY(26px); opacity: 0; transition: transform .35s cubic-bezier(.2,.8,.2,1), opacity .2s ease; pointer-events: none; }
  .mz-peek > * { --size: 46px; }
  .mz-peek-host:hover .mz-peek { transform: translateY(0); opacity: 1; }
  .mz-peek.from-below { bottom: auto; top: calc(100% - 16px); transform: translateY(-34px) rotate(180deg); }
  .mz-peek-host:hover .mz-peek.from-below { transform: translateY(0) rotate(180deg); opacity: 1; }
  .mz-ride { position: fixed; left: 0; top: 0; height: 3px; z-index: 70; width: 0; background: #0E2236; opacity: .5; }
  .mz-rider { position: fixed; top: -6px; left: 0; width: 34px; height: 34px; z-index: 71; pointer-events: none; }
  .mz-rider > * { --size: 34px; }
  @media (max-width: 760px) { .mz { width: 72px; height: 72px; } .mz > * { --size: 72px; } }
  @media (prefers-reduced-motion: reduce) { .mz-peek, .mz-bubble { transition: none; } }`;
  var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

  function make(tag, variant, size) {
    var el = document.createElement(tag);
    el.setAttribute("variant", variant);
    el.setAttribute("size", String(size));
    return el;
  }

  /* Perched on the top edge of `host`, a third of the way in from `side`,
     with the lower quarter dropped over the edge so the legs hang. */
  function perch(spec) {
    var host = document.querySelector(spec[2]);
    if (!host || !customElements.get(spec[0])) return;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    var wrap = document.createElement("span");
    wrap.className = "mz";
    wrap.style.top = "-60px";
    var sh = document.createElement("span"); sh.className = "mz-seat"; sh.setAttribute("aria-hidden", "true");
    wrap.appendChild(sh);
    wrap.style[spec[3] === "left" ? "left" : "right"] = "clamp(16px, 8%, 56px)";
    var guest = make(spec[0], spec[1], 96);
    /* Seated: the idle body loop stops inside the component; blink, the eyes
       and the hover hop stay. */
    guest.setAttribute("seated", "");
    wrap.appendChild(guest);
    var b = document.createElement("span"); b.className = "mz-bubble"; b.textContent = spec[4];
    wrap.appendChild(b);
    wrap.addEventListener("click", function () {
      wrap.classList.add("is-talking");
      clearTimeout(wrap._t); wrap._t = setTimeout(function () { wrap.classList.remove("is-talking"); }, 2200);
    });
    host.appendChild(wrap);
  }

  /* A face that peeks out from behind Log in on hover: a different one each
     time, sometimes over the top, sometimes hanging upside down from below —
     always tucked under the button, never in front of it. */
  function peekLogin() {
    var a = Array.prototype.find.call(document.querySelectorAll("nav a, header a"), function (x) { return /log in/i.test(x.textContent); });
    if (!a || a._peek) return;
    a._peek = true;
    a.classList.add("mz-peek-host");
    if (getComputedStyle(a).position === "static") a.style.position = "relative";
    var p = document.createElement("span"); p.className = "mz-peek"; p.setAttribute("aria-hidden", "true");
    a.appendChild(p);
    var CAST = [["needt-pop","cheer"],["needt-cloud","float"],["needt-cloud-v2","hello"],["needt-sun","shine"],["needt-sprout","grow"],["needt-ember","spark"]]
      .filter(function (c) { return customElements.get(c[0]); });
    a.addEventListener("pointerenter", function () {
      if (!CAST.length) return;
      var c = CAST[(Math.random() * CAST.length) | 0];
      p.innerHTML = "";
      p.appendChild(make(c[0], c[1], 46));
    });
  }

  /* One that holds the gift ticket, sitting on its right end. */
  function holdTicket() {
    document.querySelectorAll(".tk-btn").forEach(function (tk) {
      if (tk.parentNode.querySelector(".mz-hold") || !customElements.get("needt-sprout")) return;
      var host = tk.parentNode;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      var w = document.createElement("span"); w.className = "mz mz-hold"; w.setAttribute("aria-hidden", "true");
      w.style.width = w.style.height = "58px";
      var m = make("needt-sprout", "wave", 58); m.style.setProperty("--size", "58px"); w.appendChild(m);
      host.appendChild(w);
      /* On the stub, head over the top edge only, above the ticket — so it can
         never reach up into the heading above the button row. */
      w.style.zIndex = "8";
      function place() { w.style.left = (tk.offsetLeft + tk.offsetWidth - 46) + "px"; w.style.top = (tk.offsetTop - 30) + "px"; }
      place(); window.addEventListener("resize", place);
    });
  }

  /* On articles: a reading line along the top, a reader riding its end. */
  function rider() {
    if (!/^blog-/.test(page) || !customElements.get("needt-pop")) return;
    var bar = document.createElement("span"); bar.className = "mz-ride"; bar.setAttribute("aria-hidden", "true");
    var r = document.createElement("span"); r.className = "mz-rider"; r.setAttribute("aria-hidden", "true");
    r.appendChild(make("needt-pop", "dance", 34));
    document.body.appendChild(bar); document.body.appendChild(r);
    var q = false;
    function draw() {
      q = false;
      var max = document.documentElement.scrollHeight - innerHeight;
      var p = max > 0 ? Math.min(1, scrollY / max) : 0;
      var w = innerWidth * p;
      bar.style.width = w + "px";
      r.style.transform = "translate3d(" + Math.max(0, w - 34) + "px, 0, 0)";
    }
    addEventListener("scroll", function () { if (!q) { q = true; requestAnimationFrame(draw); } }, { passive: true });
    addEventListener("resize", draw); draw();
  }

  /* Opening the gift throws the whole cast. */
  function confetti(x, y) {
    var imgs = window.NeedtCast || [];
    if (!imgs.length || STILL) return;
    var DISCS = ["#F1E6FF", "#D3F6E3", "#FFE6DA", "#CCE7FF", "#FFF3C4"];
    for (var i = 0; i < 16; i++) {
      var d = document.createElement("span");
      var s = 40 + Math.random() * 22;
      d.setAttribute("aria-hidden", "true");
      d.style.cssText = "position:fixed;z-index:90;pointer-events:none;border-radius:50%;display:grid;place-items:center;left:" + (x - s / 2) + "px;top:" + (y - s / 2) + "px;width:" + s + "px;height:" + s + "px;background:" + DISCS[i % DISCS.length];
      var im = document.createElement("img"); im.src = imgs[i % imgs.length]; im.alt = ""; im.style.cssText = "width:86%;height:86%";
      d.appendChild(im); document.body.appendChild(d);
      var ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 160 + Math.random() * 220;
      var dx = Math.cos(ang) * sp, dy = Math.sin(ang) * sp;
      var a = d.animate([
        { transform: "translate(0,0) scale(.4) rotate(0deg)", opacity: 1 },
        { transform: "translate(" + dx + "px," + dy + "px) scale(1) rotate(" + (Math.random() * 120 - 60) + "deg)", opacity: 1, offset: .45 },
        { transform: "translate(" + dx * 1.15 + "px," + (dy + 260) + "px) scale(.5) rotate(" + (Math.random() * 240 - 120) + "deg)", opacity: 0 }
      ], { duration: 1400 + Math.random() * 400, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" });
      a.onfinish = (function (n) { return function () { n.remove(); }; })(d);
    }
  }
  document.addEventListener("click", function (e) {
    var tk = e.target.closest && e.target.closest(".tk-btn, [data-gift]");
    if (tk) confetti(e.clientX, e.clientY);
  });

  function boot() {
    (GUESTS[page] || []).forEach(perch);
    rider();
  }
  var tags = ["needt-pop", "needt-cloud", "needt-cloud-v2", "needt-sun", "needt-sprout", "needt-ember"];
  Promise.all(tags.map(function (t) { return customElements.get(t) ? Promise.resolve() : Promise.race([customElements.whenDefined(t), new Promise(function (r) { setTimeout(r, 1500); })]); }))
    .then(function () { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot(); });
})();
