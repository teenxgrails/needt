import {
  DEFAULT_SYSTEM_THEME_PAIR,
  getThemeClassNames,
  normalizeSystemThemePair,
  normalizeThemeMode,
  resolveThemeMode,
} from "@/lib/theme";
import { THEME_INIT_SCRIPT, applyThemeToRoot } from "@/lib/theme-init";

describe("theme modes", () => {
  it("migrates the legacy values onto the five-theme union", () => {
    expect(normalizeThemeMode("light")).toBe("paper");
    expect(normalizeThemeMode("gray")).toBe("dim");
    expect(normalizeThemeMode("graphite")).toBe("dim");
    expect(normalizeThemeMode("dark")).toBe("dark");
    expect(normalizeThemeMode("system")).toBe("system");
    expect(normalizeThemeMode("nonsense")).toBe("dark");
    expect(normalizeThemeMode(undefined)).toBe("dark");
  });

  it("keeps the new values", () => {
    expect(normalizeThemeMode("paper")).toBe("paper");
    expect(normalizeThemeMode("warm")).toBe("warm");
    expect(normalizeThemeMode("dim")).toBe("dim");
  });

  it("keeps Dim on the graphite dark-variant palette during the port", () => {
    expect(resolveThemeMode("dim", false)).toBe("dim");
    expect(getThemeClassNames("dim")).toEqual(["dark", "theme-graphite"]);
    expect(getThemeClassNames("dark")).toEqual(["dark", "theme-dark"]);
    expect(getThemeClassNames("paper")).toEqual([]);
    expect(getThemeClassNames("warm")).toEqual([]);
  });

  it("resolves System through its pair, not through a fixed light/dark", () => {
    expect(resolveThemeMode("system", false)).toBe(
      DEFAULT_SYSTEM_THEME_PAIR.light
    );
    expect(resolveThemeMode("system", true)).toBe(
      DEFAULT_SYSTEM_THEME_PAIR.dark
    );
    expect(
      resolveThemeMode("system", false, { light: "warm", dark: "dim" })
    ).toBe("warm");
    expect(
      resolveThemeMode("system", true, { light: "warm", dark: "dim" })
    ).toBe("dim");
    expect(resolveThemeMode("paper", true)).toBe("paper");
  });

  it("migrates a persisted System pair and falls back on junk", () => {
    expect(
      normalizeSystemThemePair({ light: "light", dark: "graphite" })
    ).toEqual({ light: "paper", dark: "dim" });
    expect(normalizeSystemThemePair(undefined)).toEqual(
      DEFAULT_SYSTEM_THEME_PAIR
    );
    expect(normalizeSystemThemePair({ light: 7 })).toEqual(
      DEFAULT_SYSTEM_THEME_PAIR
    );
  });
});

describe("theme init script", () => {
  it("is the serialised applyThemeToRoot, so the two cannot drift", () => {
    expect(THEME_INIT_SCRIPT).toContain(applyThemeToRoot.toString());
    expect(THEME_INIT_SCRIPT).toContain('"calendar-settings"');
    expect(THEME_INIT_SCRIPT).toContain("prefers-color-scheme");
  });

  it("never touches `window` inside the serialised function", () => {
    // The function is serialised from the SERVER build, where SWC folds away
    // any branch guarded on `typeof window`. A `window.matchMedia` fallback in
    // the body shipped to the browser as the literal `false`, which resolved
    // every System preference to its light half. Environment comes in as an
    // argument instead.
    expect(applyThemeToRoot.toString()).not.toContain("window");
  });

  it("applies classes, data-theme, and mirrors onto .needt-v2 shells", () => {
    const added: string[] = [];
    const attributes: Record<string, string> = {};
    const shellAttributes: Record<string, string> = {};
    const shell = {
      setAttribute: (name: string, value: string) => {
        shellAttributes[name] = value;
      },
    };
    const root = {
      classList: {
        add: (...names: string[]) => {
          added.push(...names);
        },
        remove: () => undefined,
      },
      setAttribute: (name: string, value: string) => {
        attributes[name] = value;
      },
      querySelectorAll: (selector: string) => {
        expect(selector).toBe(".needt-v2:not([data-theme-pinned])");
        return [shell] as unknown as Element[];
      },
    };

    const resolved = applyThemeToRoot(root as unknown as HTMLElement, {
      theme: "system",
      systemTheme: { light: "warm", dark: "dim" },
      systemPrefersDark: true,
    });

    expect(resolved).toBe("dim");
    expect(added).toEqual(["dark", "theme-graphite"]);
    expect(attributes["data-theme"]).toBe("dim");
    expect(shellAttributes["data-theme"]).toBe("dim");
  });
});
