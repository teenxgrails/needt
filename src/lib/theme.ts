import { ThemeInitInput, applyThemeToRoot } from "@/lib/theme-init";

import {
  ResolvedThemeMode,
  SystemThemePair,
  ThemeMode,
} from "@/types/settings";

export type { ResolvedThemeMode };

export const THEME_MODES: ThemeMode[] = [
  "paper",
  "warm",
  "dim",
  "dark",
  "system",
];

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  paper: "Paper",
  warm: "Warm",
  dim: "Dim",
  dark: "Dark",
  system: "System",
};

export const DEFAULT_SYSTEM_THEME_PAIR: SystemThemePair = {
  light: "paper",
  dark: "dark",
};

/**
 * Every answer below comes out of `applyThemeToRoot` — the same function the
 * pre-paint script is built from — run against a throwaway root. Nothing here
 * re-implements migration or class resolution, so nothing here can disagree
 * with what the browser actually gets.
 */
function probe(input: ThemeInitInput): {
  resolved: ResolvedThemeMode;
  classNames: string[];
} {
  const classNames: string[] = [];
  const root = {
    classList: {
      add: (...names: string[]) => {
        classNames.push(...names);
      },
      remove: () => undefined,
    },
    setAttribute: () => undefined,
    querySelectorAll: () => [] as Element[],
  };

  const resolved = applyThemeToRoot(root as unknown as HTMLElement, input);
  return { resolved, classNames };
}

/** Migrates a persisted value onto the current union. "system" stays a pair. */
export function normalizeThemeMode(theme: unknown): ThemeMode {
  if (theme === "system") return "system";
  return probe({ theme, systemPrefersDark: false }).resolved;
}

export function normalizeSystemThemePair(value: unknown): SystemThemePair {
  return {
    light: probe({
      theme: "system",
      systemTheme: value,
      systemPrefersDark: false,
    }).resolved,
    dark: probe({
      theme: "system",
      systemTheme: value,
      systemPrefersDark: true,
    }).resolved,
  };
}

export function resolveThemeMode(
  theme: ThemeMode,
  systemPrefersDark: boolean,
  systemTheme: SystemThemePair = DEFAULT_SYSTEM_THEME_PAIR
): ResolvedThemeMode {
  return probe({ theme, systemTheme, systemPrefersDark }).resolved;
}

/** The legacy chrome classes a resolved theme still needs during the port. */
export function getThemeClassNames(theme: ResolvedThemeMode): string[] {
  return probe({ theme, systemPrefersDark: false }).classNames;
}
