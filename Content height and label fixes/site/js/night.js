/* The header follows the paper: over a night band it goes dark.
   Re-checked every frame while the page moves (land.js glides the scroll),
   and after load/fonts, since layout settles late (pins, hero, webfonts). */
(function () {
  var bands = [], lastY = -1;
  function check() {
    var y = 40, on = false;
    for (var i = 0; i < bands.length; i++) {
      var r = bands[i].getBoundingClientRect();
      if (r.height && r.top - 56 <= y && r.bottom + 56 >= y) { on = true; break; }
    }
    if (on !== document.body.classList.contains("is-night")) document.body.classList.toggle("is-night", on);
  }
  function loop() {
    var y = window.scrollY;
    if (y !== lastY) { lastY = y; check(); }
    requestAnimationFrame(loop);
  }
  function init() {
    bands = Array.prototype.slice.call(document.querySelectorAll(".l-dark"));
    document.body.classList.remove("is-night");
    window.addEventListener("resize", check);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("load", check);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(check);
    setTimeout(check, 300);
    requestAnimationFrame(loop);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
