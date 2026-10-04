/* THE PALETTE, CHECKED — mostly that it has not drifted from the tokens it
 * has to match at zero mix. */
import { DRIFT_STOPS, mixHex } from "../palette";

describe("mixHex", () => {
  it("returns the first colour at t=0 and the second at t=1", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
  });

  it("averages channel-wise at the midpoint", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("mixes each channel independently", () => {
    expect(mixHex("#ff0000", "#00ff00", 0.5)).toBe("#808000");
  });
});

describe("DRIFT_STOPS", () => {
  /* Pinned against `src/styles/needt-themes.css` (paper, warm) and
   * `src/styles/needt-ds-tokens.css` (dim, dark) as they stood at port time
   * — drift's zero-mix state must be pixel-identical to the theme with
   * drift off, and a change to either file should fail this rather than
   * silently drawing two different "paper"s. */
  it("matches the vendored theme sheet's background and surface", () => {
    expect(DRIFT_STOPS.paper.bg).toBe("#fcfdfe");
    expect(DRIFT_STOPS.paper.raised).toBe("#ffffff");
    expect(DRIFT_STOPS.warm.bg).toBe("#f7f1e4");
    expect(DRIFT_STOPS.warm.raised).toBe("#fffdf7");
    expect(DRIFT_STOPS.dim.bg).toBe("#1e2021");
    expect(DRIFT_STOPS.dim.raised).toBe("#292b2c");
    expect(DRIFT_STOPS.dark.bg).toBe("#121314");
    expect(DRIFT_STOPS.dark.raised).toBe("#1e1e1e");
  });

  it("carries a valid #rrggbb pair and an r, g, b triple for every theme", () => {
    for (const stop of Object.values(DRIFT_STOPS)) {
      expect(stop.bg).toMatch(/^#[0-9a-f]{6}$/);
      expect(stop.raised).toMatch(/^#[0-9a-f]{6}$/);
      expect(stop.bgWarm).toMatch(/^#[0-9a-f]{6}$/);
      expect(stop.raisedWarm).toMatch(/^#[0-9a-f]{6}$/);
      expect(stop.foregroundRgb).toMatch(/^\d{1,3}, \d{1,3}, \d{1,3}$/);
    }
  });
});
