/* THE PAPER'S TWO STOPS — what drift mixes between.
 *
 * Ported from `Drift.jsx`'s `DRIFT_PAPER`. Each theme's `bg`/`raised`/
 * `foregroundRgb` is the same value the vendored token sheet declares for it
 * — `needt-themes.css` for `paper`/`warm`, `needt-ds-tokens.css` for
 * `dim`/`dark` — cross-checked at port time (and pinned by this module's own
 * test) so drift's zero-mix state is pixel-identical to the theme with drift
 * off. `bgWarm`/`raisedWarm` are the prototype's own evening targets — one
 * step of warmth, not a different theme — and nothing in the token sheet
 * defines them independently, so they are carried over unchanged.
 */
import type { ResolvedThemeMode } from "@/types/settings";

export interface DriftStop {
  readonly bg: string;
  readonly raised: string;
  /** The text ladder's foreground, as the token sheet's own "r, g, b"
   *  triple — matches `--foreground-rgb`. */
  readonly foregroundRgb: string;
  /** What `bg` warms toward as the evening deepens. */
  readonly bgWarm: string;
  /** What `raised` warms toward as the evening deepens. */
  readonly raisedWarm: string;
}

export const DRIFT_STOPS: Readonly<Record<ResolvedThemeMode, DriftStop>> =
  Object.freeze({
    paper: {
      bg: "#fcfdfe",
      raised: "#ffffff",
      foregroundRgb: "26, 28, 30",
      bgWarm: "#fdfaf4",
      raisedWarm: "#fffdf9",
    },
    warm: {
      bg: "#f7f1e4",
      raised: "#fffdf7",
      foregroundRgb: "34, 29, 22",
      bgWarm: "#f4ead6",
      raisedWarm: "#fffcf2",
    },
    dim: {
      bg: "#1e2021",
      raised: "#292b2c",
      foregroundRgb: "249, 249, 249",
      bgWarm: "#221f1d",
      raisedWarm: "#2d2926",
    },
    dark: {
      bg: "#121314",
      raised: "#1e1e1e",
      foregroundRgb: "249, 249, 249",
      bgWarm: "#151312",
      raisedWarm: "#201d1b",
    },
  });

/** Linear mix of two `#rrggbb` colours, `t` clamped implicitly by the caller
 *  (drift's own levels are already 0–1). */
export function mixHex(a: string, b: string, t: number): string {
  const from = parseInt(a.slice(1), 16);
  const to = parseInt(b.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((from >> shift) & 255) * (1 - t) + ((to >> shift) & 255) * t);
  return (
    "#" +
    [16, 8, 0]
      .map((shift) => channel(shift).toString(16).padStart(2, "0"))
      .join("")
  );
}
