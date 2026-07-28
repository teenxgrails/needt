import { ThemeMode } from "@/types/settings";

export type ResolvedThemeMode = Exclude<ThemeMode, "system">;

export function normalizeThemeMode(theme: unknown): ThemeMode {
  if (theme === "gray") return "graphite";
  if (
    theme === "light" ||
    theme === "graphite" ||
    theme === "dark" ||
    theme === "system"
  ) {
    return theme;
  }
  return "dark";
}

export function resolveThemeMode(
  theme: ThemeMode,
  systemPrefersDark: boolean
): ResolvedThemeMode {
  if (theme !== "system") return theme;
  return systemPrefersDark ? "dark" : "light";
}

export function getThemeClassNames(theme: ResolvedThemeMode): string[] {
  if (theme === "graphite") return ["dark", "theme-graphite"];
  if (theme === "dark") return ["dark", "theme-dark"];
  return [];
}
