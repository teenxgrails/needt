/* THE SCRAPS' TORN EDGES — written once, seeded, so every scrap tears in its
 * own way and the same way on every visit.
 *
 * data-tear names the torn sides ("trbl", any subset). data-tear="perf" makes
 * the perforated strip: a row of slanted tabs along the top edge, the way a
 * page looks when it is pulled out of a spiral pad.
 */
(function () {
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
  function perf(seed) {
    var r = rand(seed), pts = [[0, 100]], tabs = 22, i, x, w = 100 / tabs;
    for (i = 0; i < tabs; i++) {
      x = i * w;
      var lean = 0.9 + r() * 0.5, h = 2 + r() * 4;
      pts.push([x, 30], [x + w * 0.18, h], [x + w * (0.6 + r() * 0.12), h + lean], [x + w * 0.74, 30]);
    }
    pts.push([100, 30], [100, 100]);
    return "polygon(" + pts.map(function (p) { return p[0].toFixed(2) + "% " + p[1].toFixed(2) + "%"; }).join(",") + ")";
  }
  function run() {
    var els = document.querySelectorAll("[data-tear]");
    for (var k = 0; k < els.length; k++) {
      var s = els[k].getAttribute("data-tear");
      els[k].style.clipPath = s === "perf" ? perf(311 + k * 97) : torn(s, 541 + k * 173);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
