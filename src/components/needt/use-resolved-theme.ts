"use client";

/* WHICH GROUND WE ARE ON.
 *
 * Every ported route wraps itself in `.needt-v2` with a `data-theme`, because
 * that pair is the only scope where the design's tokens resolve. A route that
 * forgets it renders the design against the application's own variables and
 * the result is a form with white fields on a dark page.
 *
 * `system` is the only mode that needs watching: the others are a fixed
 * answer, and subscribing to the media query for them would re-render on a
 * change that cannot affect the result.
 */
import * as React from "react";

import { useTheme } from "@/components/providers/ThemeProvider";

import { resolveThemeMode } from "@/lib/theme";

import type { ResolvedThemeMode } from "@/types/settings";

//todo: the four older routes (Today, Calendar, Workspace, Settings) each
// carry their own copy of this hook. They are identical; fold them into this
// one the next time any of them is touched for another reason.
export function useResolvedTheme(): ResolvedThemeMode {
  const { theme, systemTheme } = useTheme();
  /* First paint has no media query yet, so it assumes light and the layout
     effect below corrects it before the browser shows anything. */
  const [resolved, setResolved] = React.useState<ResolvedThemeMode>(() =>
    resolveThemeMode(theme, false, systemTheme)
  );

  React.useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () =>
      setResolved(resolveThemeMode(theme, media.matches, systemTheme));
    sync();
    if (theme !== "system") return undefined;
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [systemTheme, theme]);

  return resolved;
}
