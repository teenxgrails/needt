import {
  getThemeClassNames,
  normalizeThemeMode,
  resolveThemeMode,
} from "@/lib/theme";

describe("theme modes", () => {
  it("migrates the legacy gray value to graphite", () => {
    expect(normalizeThemeMode("gray")).toBe("graphite");
  });

  it("keeps Graphite on the graphite dark-variant palette", () => {
    expect(resolveThemeMode("graphite", false)).toBe("graphite");
    expect(getThemeClassNames("graphite")).toEqual([
      "dark",
      "theme-graphite",
    ]);
  });

  it("resolves stored Dark and System dark to true Dark", () => {
    expect(resolveThemeMode("dark", false)).toBe("dark");
    expect(resolveThemeMode("system", true)).toBe("dark");
    expect(getThemeClassNames("dark")).toEqual(["dark", "theme-dark"]);
  });

  it("resolves System light without dark variant classes", () => {
    expect(resolveThemeMode("system", false)).toBe("light");
    expect(getThemeClassNames("light")).toEqual([]);
  });
});
