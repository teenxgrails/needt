import { getThemeClassNames, resolveThemeMode } from "@/lib/theme";

describe("theme modes", () => {
  it("keeps Gray on the graphite dark-variant palette", () => {
    expect(resolveThemeMode("gray", false)).toBe("gray");
    expect(getThemeClassNames("gray")).toEqual(["dark", "theme-gray"]);
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
