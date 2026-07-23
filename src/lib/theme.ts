import { ThemeMode } from "@/types/settings";

export type ResolvedThemeMode = Exclude<ThemeMode, "system">;

export function resolveThemeMode(
  theme: ThemeMode,
  systemPrefersDark: boolean
): ResolvedThemeMode {
  if (theme !== "system") return theme;
  return systemPrefersDark ? "dark" : "light";
}

export function getThemeClassNames(theme: ResolvedThemeMode): string[] {
  if (theme === "gray") return ["dark", "theme-gray"];
  if (theme === "dark") return ["dark", "theme-dark"];
  return [];
}
