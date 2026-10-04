/* THE SUN — read, not fetched.
 *
 * Ported from `Content height and label fixes/needt-app/Drift.jsx`. Fixed
 * clock hours lie: 19:00 is golden in June and long dark in December, so the
 * schedule comes from the sun at the person's own place instead of the
 * clock — NOAA's low-precision solar position, good to about a minute, which
 * is three orders of magnitude better than a paper's temperature needs.
 *
 * Everything here is a pure function of a `Date` and a place. PORT.md is
 * explicit about why: "the sun times need a reference date as an argument or
 * they cannot be tested" — so `date` is always the caller's own instant,
 * never `new Date()` reached for inside this file.
 */

export interface DriftPlace {
  readonly lat: number;
  readonly lon: number;
}

/** Local clock hours, fractional. `null` where the event does not happen
 *  that day — the poles, mostly. */
export interface SunTimes {
  readonly noon: number;
  readonly sunrise: number | null;
  readonly sunset: number | null;
  readonly dawn: number | null;
  readonly dusk: number | null;
}

/** How far toward the evening paper (`warm`) and how far past dusk
 *  (`night`), both 0–1. */
export interface DriftLevels {
  readonly warm: number;
  readonly night: number;
}

/**
 * Solar position for `date`, at `lat`/`lon`. Reads `date`'s own UTC fields
 * and the local timezone OFFSET — never the wall clock of wherever this
 * happens to run — which is what makes it exact for a fixed instant in a
 * test regardless of the machine's own zone.
 */
export function sunTimes(date: Date, lat: number, lon: number): SunTimes {
  const rad = Math.PI / 180;
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86400000);
  const frac = (date.getUTCHours() + date.getUTCMinutes() / 60) / 24;
  const g = (357.529 + 0.98560028 * (day + frac)) * rad;
  const q = 280.459 + 0.98564736 * (day + frac);
  const l = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * (day + frac)) * rad;
  /* Declination, and the equation of time in minutes. */
  const dec = Math.asin(Math.sin(e) * Math.sin(l));
  const ra = Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l));
  let eot = ((q * rad - ra) * 4) / rad;
  while (eot > 20) eot -= 1440 / 4;
  while (eot < -20) eot += 1440 / 4;

  /* Hour angle for a given solar altitude, in hours either side of noon. */
  function hourAngle(alt: number): number | null {
    const c =
      (Math.sin(alt * rad) - Math.sin(lat * rad) * Math.sin(dec)) /
      (Math.cos(lat * rad) * Math.cos(dec));
    if (c >= 1) return null; // the sun never reaches it: polar night
    if (c <= -1) return 12; // never sets
    return Math.acos(c) / rad / 15;
  }

  /* The formula gives solar noon in UTC; everything downstream compares
     against a LOCAL clock hour, so it is converted here rather than at the
     call site — one frame of reference, established once. Without this the
     whole feature fires by the caller's own offset instead of the place's. */
  const tz = -date.getTimezoneOffset() / 60;
  const noon = 12 - lon / 15 - eot / 60 + tz; // solar noon, local clock hours
  const h0 = hourAngle(-0.833); // sunrise / sunset, with refraction
  const h6 = hourAngle(-6); // civil twilight
  return {
    noon,
    sunrise: h0 === null ? null : noon - h0,
    sunset: h0 === null ? null : noon + h0,
    dawn: h6 === null ? null : noon - h6,
    dusk: h6 === null ? null : noon + h6,
  };
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function ramp(v: number, a: number, b: number): number {
  return smoothstep((v - a) / (b - a));
}

/**
 * The two scalars for a local `hour` (0–24, fractional). `warm` humps around
 * each end of the day, tallest at sunset, more gently again at sunrise;
 * `night` runs from dusk to a quarter-hour past it, and back at dawn.
 *
 * A note on `dusk`/`dawn`: at latitudes so far north or south that sunset
 * exists but true civil twilight never completes, the prototype's own
 * `t.dusk`/`t.dawn` can be `null` even though `t.sunset`/`t.sunrise` are not,
 * and its untyped arithmetic silently produces `NaN` there. This port falls
 * back to `sunset`/`sunrise` in that edge case — a defensive, type-forced
 * choice with no visible effect at any latitude the product actually seeds
 * (Berlin's own `driftAt`), documented here rather than left to reproduce a
 * latent `NaN`.
 */
export function driftAt(hour: number, times: SunTimes): DriftLevels {
  if (times.sunset === null || times.sunrise === null) {
    /* Polar day or night: no sunset to follow, so lean on the clock rather
       than inventing one. */
    return { warm: 0, night: hour < 6 || hour >= 21 ? 1 : 0 };
  }
  const dusk = times.dusk ?? times.sunset;
  const dawn = times.dawn ?? times.sunrise;

  /* WARM: a hump around each end of the day, tallest at sunset. */
  const evening =
    ramp(hour, times.sunset - 1.5, times.sunset) *
    (1 - ramp(hour, dusk, dusk + 0.75));
  const morning =
    ramp(hour, dawn, times.sunrise) *
    (1 - ramp(hour, times.sunrise, times.sunrise + 1.25)) *
    0.55;
  /* NIGHT: from dusk to a quarter-hour past it, and back at dawn. */
  const night =
    hour > times.noon
      ? ramp(hour, dusk - 0.25, dusk + 0.5)
      : 1 - ramp(hour, dawn - 0.5, dawn + 0.25);
  return {
    warm: Math.max(evening, morning),
    night: Math.max(0, Math.min(1, night)),
  };
}
