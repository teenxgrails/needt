"use client";

/* THE DRIFT HOOK — the day's own light, as three inline overrides.
 *
 * Ported from `Drift.jsx`'s `useDrift`. PORT.md is explicit that drift is "a
 * toggle over any theme, never a theme in the list" (§3) and that the
 * vendored CSS "is driven by `data-drift=\"on\"` on the `.needt-v2` element,
 * with `data-drift-quiet=\"1\"` slowing the named loops. Write only
 * `--background`, `--surface-raised` and `--text-primary` inline on the
 * shell; never the ladder." That is exactly what `vars` returns and nothing
 * more — the crossfade, the quiet loops and the accent's own immunity all
 * already live in `needt-themes.css`'s `[data-drift="on"]` rules; this hook
 * only ever writes the three declarations that comment names.
 *
 * ONE DIFFERENCE FROM THE PROTOTYPE, DELIBERATE: the classic-script original
 * also re-derived "system means light or dark" from `matchMedia` inside this
 * hook, because it had nowhere else to put that logic. The port already has
 * a home for it — `resolveThemeMode` in `@/lib/theme`, the same function the
 * anti-FOUC script and every settings surface use — so `theme` here is
 * expected to already be a *resolved* theme (never `"system"`), and this
 * hook's only remaining job is the one the prototype's name promised: decide
 * whether the night nudges that resolved theme toward the dark half of its
 * pair.
 */
import * as React from "react";

import { newDate } from "@/lib/date-utils";
import { DEFAULT_SYSTEM_THEME_PAIR } from "@/lib/theme";

import type { ResolvedThemeMode, SystemThemePair } from "@/types/settings";

import { DRIFT_STOPS, mixHex } from "./palette";
import { type DriftPlace, type SunTimes, driftAt, sunTimes } from "./sun";

type WithVars = React.CSSProperties & Record<`--${string}`, string>;

/** Re-render once a minute while drift is on and no fixed `now` was given —
 *  the same cadence the prototype polled at. */
const POLL_MS = 60_000;

export interface UseDriftOptions {
  /** The theme already resolved — the person's own choice, or what
   *  `resolveThemeMode` picked for "system". Drift never decides this; it
   *  only decides whether to nudge it toward the dark half of `pair` as the
   *  night deepens. */
  theme: ResolvedThemeMode;
  /** The toggle. Off: `themeClass` echoes `theme` unchanged and `vars`
   *  carries nothing to override. */
  on: boolean;
  /** Which theme fills each half of "system" — also which theme a chosen
   *  LIGHT theme flips toward at night. Defaults to the product default
   *  (paper / dark). */
  pair?: SystemThemePair;
  place?: DriftPlace;
  /** Reference instant. Defaults to `newDate()`; a settings preview passes a
   *  fixed one so the whole day can be scrubbed without waiting for it. */
  now?: Date;
  /** Overrides the hour read from `now`, in local fractional hours — how a
   *  preview asks "what would 20:00 look like" without lying about `now`. */
  at?: number | null;
}

export interface DriftResult {
  /** The theme actually showing, after a possible night flip. Feed this to
   *  the shell's `data-theme`, not the `theme` that was passed in. */
  readonly themeClass: ResolvedThemeMode;
  readonly warm: number;
  readonly night: number;
  /** `"1"` past half a night — the value `data-drift-quiet` wants. */
  readonly quiet: "0" | "1";
  readonly times: SunTimes;
  /** Spread onto the shell's `style`. `{ background: "var(--background)" }`
   *  when `on` is false — nothing to override, and nothing that fights the
   *  chosen theme's own declaration. */
  readonly vars: WithVars;
}

/** Berlin, until onboarding asks — the prototype's own placeholder. A place
 *  is required, not optional: the sun is the schedule. */
const DEFAULT_PLACE: DriftPlace = { lat: 52.52, lon: 13.405 };

export function useDrift({
  theme,
  on,
  pair = DEFAULT_SYSTEM_THEME_PAIR,
  place = DEFAULT_PLACE,
  now,
  at = null,
}: UseDriftOptions): DriftResult {
  const [, forceTick] = React.useState(0);

  React.useEffect(() => {
    if (!on || now) return undefined;
    const id = window.setInterval(() => forceTick((n) => n + 1), POLL_MS);
    return () => window.clearInterval(id);
  }, [on, now]);

  const reference = now ?? newDate();
  const hour = at ?? reference.getHours() + reference.getMinutes() / 60;
  const times = sunTimes(reference, place.lat, place.lon);
  const levels = driftAt(hour, times);

  /* Drift may flip a chosen LIGHT theme to the dark half of the pair once the
     night is more than half in; it never touches a theme already dark — the
     prototype's own `wasLight` guard. */
  const wasLight = theme === "paper" || theme === "warm";
  const themeClass = on && wasLight && levels.night > 0.5 ? pair.dark : theme;
  const stop = DRIFT_STOPS[themeClass];

  const warm = on ? levels.warm : 0;
  /* Evening softens the TOP of the text ladder only — 1 → 0.92 — because full
     contrast under a lamp is louder than it needs to be. It stops at the
     top: the five levels below it already sit near the guide's 4.5:1 floor,
     and that floor does not move for a mood. */
  const ink = (1 - (on ? 0.08 * levels.warm : 0)).toFixed(3);

  const vars: WithVars = on
    ? {
        background: mixHex(stop.bg, stop.bgWarm, warm),
        "--background": mixHex(stop.bg, stop.bgWarm, warm),
        "--surface-raised": mixHex(stop.raised, stop.raisedWarm, warm),
        "--text-primary": `rgba(${stop.foregroundRgb}, ${ink})`,
      }
    : { background: "var(--background)" };

  return {
    themeClass,
    warm,
    night: levels.night,
    quiet: on && levels.night > 0.5 ? "1" : "0",
    times,
    vars,
  };
}
