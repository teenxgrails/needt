/* THE PANELS' BEHAVIOUR — two small jobs, no framework.
 *
 * 1. ARMING. A panel's cards animate only while the panel is on screen, and
 *    never under reduced motion or in a hidden tab. The content is authored in
 *    its finished state, so an unarmed panel — no script, background tab,
 *    reduced motion — is simply the finished picture.
 *
 * 2. LOGOS. Every connection tile carries `data-logo="<id>"`. If
 *    `site/logos/<id>.svg` exists it replaces the initial; if it does not, the
 *    initial stays and nothing looks broken. Dropping a file into that folder
 *    is the whole integration.
 */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", function () {
    var panels = document.querySelectorAll(".k-panel");

    if (!reduce && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          e.target.classList.toggle("k-armed", e.isIntersecting && !document.hidden);
        });
      }, { threshold: 0.25 });
      panels.forEach(function (p) { io.observe(p); });
      /* A hidden tab keeps its class otherwise, and its animations would run
         for nobody. */
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) panels.forEach(function (p) { p.classList.remove("k-armed"); });
      });
    }

    /* The sheen follows the hand, one frame at a time. */
    if (!reduce) {
      document.querySelectorAll(".k-panel").forEach(function (card) {
        var queued = false, x = 0, y = 0;
        card.addEventListener("pointermove", function (e) {
          x = e.clientX; y = e.clientY;
          if (queued) return;
          queued = true;
          requestAnimationFrame(function () {
            queued = false;
            var r = card.getBoundingClientRect();
            var px = (x - r.left) / r.width, py = (y - r.top) / r.height;
            card.style.setProperty("--hx", (px * 100).toFixed(1) + "%");
            card.style.setProperty("--hy", (py * 100).toFixed(1) + "%");
            /* The shadow gathers toward the hand, up to 22px on any side. */
            card.style.setProperty("--sx", ((px - 0.5) * 44).toFixed(1) + "px");
            card.style.setProperty("--sy", ((py - 0.5) * 44).toFixed(1) + "px");
          });
        }, { passive: true });
        /* Hand gone: the light returns overhead and the shadows settle under. */
        card.addEventListener("pointerleave", function () {
          card.style.setProperty("--sx", "0px");
          card.style.setProperty("--sy", "0px");
        });
      });
    }

    document.querySelectorAll(".k-logo[data-logo]").forEach(function (tile) {
      var img = new Image();
      img.alt = "";
      img.onload = function () { tile.textContent = ""; tile.appendChild(img); tile.classList.add("has-mark"); };
      img.src = "logos/" + tile.dataset.logo + ".svg";
    });
  });
})();
