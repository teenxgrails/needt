import {
  SETTINGS_SECTIONS,
  filterSettingsSections,
  settingsSection,
} from "../sections";

describe("the section registry", () => {
  it("has exactly the nine sections the spec names", () => {
    expect(SETTINGS_SECTIONS).toHaveLength(9);
    expect(SETTINGS_SECTIONS.map((s) => s.id)).toEqual([
      "appearance",
      "day",
      "calendars",
      "tasks",
      "focus",
      "alerts",
      "keys",
      "account",
      "data",
    ]);
  });

  it("every id is unique", () => {
    const ids = SETTINGS_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("filterSettingsSections", () => {
  it("returns every section for an empty or whitespace query", () => {
    expect(filterSettingsSections("")).toEqual(SETTINGS_SECTIONS);
    expect(filterSettingsSections("   ")).toEqual(SETTINGS_SECTIONS);
  });

  it("matches a section's own label", () => {
    const hits = filterSettingsSections("appear");
    expect(hits.map((s) => s.id)).toEqual(["appearance"]);
  });

  it("matches a word from a section's keywords, not just its label", () => {
    // "buffer" only appears in the day section's keyword list.
    const hits = filterSettingsSections("buffer");
    expect(hits.map((s) => s.id)).toEqual(["day"]);
  });

  it("keeps billing and AI settings discoverable inside the nine sections", () => {
    expect(filterSettingsSections("billing").map((s) => s.id)).toEqual([
      "account",
    ]);
    expect(filterSettingsSections("AI provider").map((s) => s.id)).toEqual([
      "data",
    ]);
  });

  it("is case-insensitive", () => {
    expect(filterSettingsSections("RAIL").map((s) => s.id)).toEqual([
      "appearance",
    ]);
  });

  it("returns nothing rather than guessing for a word in no section", () => {
    expect(filterSettingsSections("xyzzy-not-a-real-word")).toEqual([]);
  });

  it("trims surrounding whitespace before matching", () => {
    expect(filterSettingsSections("  shortcuts  ").map((s) => s.id)).toEqual([
      "keys",
    ]);
  });
});

describe("settingsSection", () => {
  it("resolves a known id", () => {
    expect(settingsSection("focus").id).toBe("focus");
  });

  it("falls back to the first section for an id outside the given list", () => {
    const narrowed = filterSettingsSections("appear");
    expect(settingsSection("data" as never, narrowed).id).toBe("appearance");
  });
});
