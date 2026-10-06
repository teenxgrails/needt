/* THE DRIFT ENGINE — the day's own light, read from the sun.
 *
 * Fixed clock hours lie: 19:00 is golden in June and long dark in December.
 * So the schedule comes from the sun at the person's own place — sunrise,
 * sunset and the civil twilight either side of them — computed here rather
 * than fetched, because a planner must not need the network to know it is
 * evening.
 *
 * The engine produces two scalars and nothing else:
 *
 *   warm  0…1  how far toward the evening paper. Peaks in the hour around
 *              sunset, and again more gently at sunrise, because that is when
 *              real light is warm.
 *   night 0…1  how far past dusk. At 1 the dark half of the pair is showing.
 *
 * Four things read them, all of them meaningless by design — paper
 * temperature, the top of the text ladder, which theme of the pair shows, and
 * the volume of the looping animations. The accent is not among them.
 *
 * It recomputes once a minute. Each step is a fraction of a degree and the
 * shell carries a 90s transition, so nothing is ever caught moving. */

/* Solar position, NOAA's low-precision approximation. Good to about a minute,
   which is three orders of magnitude better than this needs. */
function sunTimes(date, lat, lon) {
  const rad = Math.PI / 180;
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86400000);
  const frac = (date.getUTCHours() + date.getUTCMinutes() / 60) / 24;
  const g = (357.529 + 0.98560028 * (day + frac)) * rad;
  const q = 280.459 + 0.98564736 * (day + frac);
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * (day + frac)) * rad;
  /* Declination, and the equation of time in minutes. */
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  let eot = (q * rad - ra) * 4 / rad;
  while (eot > 20) eot -= 1440 / 4;
  while (eot < -20) eot += 1440 / 4;

  /* Hour angle for a given solar altitude, in hours either side of noon. */
  function ha(alt) {
    const c = (Math.sin(alt * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
    if (c >= 1) return null;   /* the sun never reaches it: polar night */
    if (c <= -1) return 12;    /* never sets */
    return Math.acos(c) / rad / 15;
  }
  /* The formula gives solar noon in UTC; everything downstream compares
     against a LOCAL clock hour, so it is converted here rather than at the
     call site — one frame of reference, established once. Without this the
     whole feature fires by the user's offset: in Berlin the paper warmed at
     four in the afternoon and night landed at ten past six. */
  const tz = -date.getTimezoneOffset() / 60;
  const noon = 12 - lon / 15 - eot / 60 + tz;   /* solar noon, local clock hours */
  const h0 = ha(-0.833);                    /* sunrise / sunset, with refraction */
  const h6 = ha(-6);                        /* civil twilight */
  return {
    noon: noon,
    sunrise: h0 === null ? null : noon - h0,
    sunset: h0 === null ? null : noon + h0,
    dawn: h6 === null ? null : noon - h6,
    dusk: h6 === null ? null : noon + h6
  };
}

function smooth(t) { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); }
function ramp(v, a, b) { return smooth((v - a) / (b - a)); }

/* The two scalars for a given local hour. */
function driftAt(hour, t) {
  if (t.sunset === null || t.sunrise === null) {
    /* Polar day or night: no sunset to follow, so lean on the clock rather
       than inventing one. */
    return { warm: 0, night: hour < 6 || hour >= 21 ? 1 : 0 };
  }
  /* WARM: a hump around each end of the day, tallest at sunset. */
  const evening = ramp(hour, t.sunset - 1.5, t.sunset) * (1 - ramp(hour, t.dusk, t.dusk + 0.75));
  const morning = ramp(hour, t.dawn, t.sunrise) * (1 - ramp(hour, t.sunrise, t.sunrise + 1.25)) * 0.55;
  /* NIGHT: from dusk to a quarter-hour past it, and back at dawn. */
  const night = hour > t.noon
    ? ramp(hour, t.dusk - 0.25, t.dusk + 0.5)
    : 1 - ramp(hour, t.dawn - 0.5, t.dawn + 0.25);
  return { warm: Math.max(evening, morning), night: Math.max(0, Math.min(1, night)) };
}

/* Each theme's paper, and the paper it drifts toward in the evening. The
   evening target is one small step of warmth, not a different theme —
   a theme is a choice, and drift may not overrule it. */
const DRIFT_PAPER = {
  paper:  { bg: "#fcfdfe", raised: "#ffffff", ink: "26, 28, 30", bgWarm: "#fdfaf4", raisedWarm: "#fffdf9" },
  warm:   { bg: "#f7f1e4", raised: "#fffdf7", ink: "34, 29, 22", bgWarm: "#f4ead6", raisedWarm: "#fffcf2" },
  dim:    { bg: "#1e2021", raised: "#292b2c", ink: "249, 249, 249", bgWarm: "#221f1d", raisedWarm: "#2d2926" },
  dark:   { bg: "#121314", raised: "#1e1e1e", ink: "249, 249, 249", bgWarm: "#151312", raisedWarm: "#201d1b" }
};

function mixHex(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const f = (s) => Math.round((((A >> s) & 255) * (1 - t)) + (((B >> s) & 255) * t));
  return "#" + [16, 8, 0].map((s) => f(s).toString(16).padStart(2, "0")).join("");
}

/* THE HOOK — returns what the shell needs: the theme class to wear, the three
   inline overrides, and the quiet flag. `at` is an override in local hours,
   used by the settings preview so the whole day can be seen at once. */
function useDrift(theme, on, pair, at) {
  const [now, setNow] = React.useState(() => new Date());
  const [os, setOs] = React.useState(() =>
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  React.useEffect(() => {
    if (!on && theme !== "system") return undefined;
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, [on, theme]);

  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const read = (e) => setOs(e.matches);
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  /* Berlin, until the onboarding asks. A place is required, not optional: the
     sun is the schedule. */
  const place = { lat: 52.52, lon: 13.405 };
  const hour = at != null ? at : now.getHours() + now.getMinutes() / 60;
  const times = sunTimes(now, place.lat, place.lon);
  const d = driftAt(hour, times);

  /* SYSTEM is a pair, not a theme: the OS says light or dark, and the person
     says which of their five is used for each side. */
  const pairing = pair || { light: "paper", dark: "dark" };
  let base = theme === "system" ? (os ? pairing.dark : pairing.light) : theme;

  /* Drift may flip a light theme to the dark side of the pair at night, but it
     never flips a theme the person already chose dark. */
  const wasLight = base === "paper" || base === "warm";
  if (on && wasLight && d.night > 0.5) base = pairing.dark === base ? "dark" : pairing.dark;

  const p = DRIFT_PAPER[base] || DRIFT_PAPER.paper;
  const w = on ? d.warm : 0;
  /* Evening softens the TOP of the text ladder only — 1 → 0.92 — because full
     contrast under a lamp is louder than it needs to be. It stops at the top:
     the five levels below it are already near the guide's 4.5:1 floor, and
     that floor is not negotiable for a mood. */
  const ink = (1 - (on ? 0.08 * d.warm : 0)).toFixed(3);

  return {
    themeClass: base,
    resolved: base,
    warm: w,
    night: d.night,
    quiet: on && d.night > 0.5 ? "1" : "0",
    times: times,
    vars: on ? {
      background: mixHex(p.bg, p.bgWarm, w),
      "--background": mixHex(p.bg, p.bgWarm, w),
      "--surface-raised": mixHex(p.raised, p.raisedWarm, w),
      "--text-primary": "rgba(" + p.ink + ", " + ink + ")"
    } : { background: "var(--background)" }
  };
}

Object.assign(window, { useDrift, sunTimes, driftAt, DRIFT_PAPER, mixHex, driftMix: mixHex });
