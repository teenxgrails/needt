import type {
  ResolvedThemeMode,
  SystemThemePair,
  ThemeMode,
} from "@/types/settings";

export type ThemeInitInput = {
  /** The persisted preference. Any legacy or junk value is migrated here. */
  theme?: unknown;
  /** Which pair "system" resolves to. Junk falls back to paper/dark. */
  systemTheme?: unknown;
  /**
   * The `prefers-color-scheme` answer. Required, and passed in rather than read
   * here: see the DCE warning on `applyThemeToRoot`.
   */
  systemPrefersDark: boolean;
};

/**
 * THE ONLY implementation of "apply a theme to a root element".
 *
 * `THEME_INIT_SCRIPT` below is this function serialised, so the pre-paint
 * script in `src/app/layout.tsx` and the runtime `ThemeProvider` run the same
 * code by construction. The previous arrangement copied the class resolution
 * into the layout by hand and the two drifted apart silently — the script never
 * learned to set `data-theme`, which `ThemeProvider` had been setting for a
 * while.
 *
 * Because it is serialised with `Function.prototype.toString`, the body MUST
 * stay self-contained: no imports, no module-scope references, no helpers
 * defined outside it. Type annotations are fine — they are erased before the
 * function ever reaches `toString`.
 *
 * It must also contain NO reference to `window`. This module is imported by a
 * server component, so the function is serialised from the SERVER build, where
 * SWC knows `window` is undefined and folds any branch guarded on it away.
 * A `typeof window !== "undefined" ? window.matchMedia(...) : false` fallback
 * shipped to the browser as the literal `false` — the script silently resolved
 * every System preference to its light half. Anything environmental is an
 * argument, not something this function reads.
 *
 * Returns the theme it resolved to.
 */
export function applyThemeToRoot(
  root: HTMLElement,
  input: ThemeInitInput
): ResolvedThemeMode {
  const isTheme = (value: unknown): value is ResolvedThemeMode =>
    value === "paper" ||
    value === "warm" ||
    value === "dim" ||
    value === "dark";

  /**
   * Legacy persisted values. "light" was the only light theme, so it becomes
   * Paper; "gray"/"graphite" were the softer of the two dark palettes, which is
   * now Dim; "dark" keeps its name.
   */
  const migrate = (value: unknown): ResolvedThemeMode | null => {
    if (isTheme(value)) return value;
    if (value === "light") return "paper";
    if (value === "gray" || value === "graphite") return "dim";
    return null;
  };

  const stored = input.theme;
  const mode: ThemeMode =
    stored === "system" ? "system" : (migrate(stored) ?? "dark");

  const rawPair =
    typeof input.systemTheme === "object" && input.systemTheme !== null
      ? (input.systemTheme as { light?: unknown; dark?: unknown })
      : {};
  const pair: SystemThemePair = {
    light: migrate(rawPair.light) ?? "paper",
    dark: migrate(rawPair.dark) ?? "dark",
  };

  const resolved: ResolvedThemeMode =
    mode === "system"
      ? input.systemPrefersDark
        ? pair.dark
        : pair.light
      : mode;

  // The un-ported chrome still runs on the old classes, and Tailwind's `dark`
  // variant keys off `dark` (plus `[data-theme='dark']`). Dim inherits the
  // graphite palette it replaces; Warm renders on the light chrome until the
  // screens are ported.
  root.classList.remove(
    "light",
    "dark",
    "theme-gray",
    "theme-graphite",
    "theme-dark"
  );
  if (resolved === "dim") root.classList.add("dark", "theme-graphite");
  else if (resolved === "dark") root.classList.add("dark", "theme-dark");

  root.setAttribute("data-theme", resolved);

  // The new tokens are scoped to `.needt-v2` and select their theme from a
  // `data-theme` on that same element, so a ported shell cannot read the
  // attribute off <html>. Mirror it down. A shell that deliberately pins a
  // theme (a Paper thumbnail inside a Dark app) opts out with
  // `data-theme-pinned`.
  const scoped = root.querySelectorAll(".needt-v2:not([data-theme-pinned])");
  for (let index = 0; index < scoped.length; index += 1) {
    scoped[index].setAttribute("data-theme", resolved);
  }

  return resolved;
}

/**
 * Runs before paint, from `<head>`, so the persisted preference is on the root
 * element before the first frame. The <html> element SSRs with a static "dark"
 * class; without this, anyone whose preference differs sees a flash of the
 * wrong theme until ThemeProvider's effect runs after hydration.
 *
 * Everything but the localStorage read is `applyThemeToRoot` itself.
 */
export const THEME_INIT_SCRIPT = `(function () {
  try {
    var apply = ${applyThemeToRoot.toString()};
    var raw = window.localStorage.getItem("calendar-settings");
    var user = raw ? (JSON.parse(raw) || {}).state : null;
    user = user ? user.user : null;
    apply(document.documentElement, {
      theme: user ? user.theme : undefined,
      systemTheme: user ? user.systemTheme : undefined,
      systemPrefersDark: window.matchMedia("(prefers-color-scheme: dark)")
        .matches,
    });
  } catch (error) {
    /* A blocked or corrupt localStorage must not stop the page rendering. */
  }
})();`;
