/* THE SUN'S MATHS, CHECKED.
 *
 * NOAA's low-precision formula is good to about a minute, so these assert
 * ranges and relationships (sunset comes after sunrise, dusk after sunset, a
 * hump at the boundary it is supposed to hump at) rather than pinning a
 * single expected string, which would just be re-deriving the formula badly
 * a second time.
 */
import { type SunTimes, driftAt, sunTimes } from "../sun";

/** An equinox, when day and night split evenly everywhere but the poles. */
const EQUINOX = new Date("2026-03-20T12:00:00Z");
const SOLSTICE_JUNE = new Date("2026-06-21T12:00:00Z");
const SOLSTICE_DECEMBER = new Date("2026-12-21T12:00:00Z");

describe("sunTimes", () => {
  it("puts sunrise and sunset about twelve hours apart at the equator on an equinox", () => {
    const t = sunTimes(EQUINOX, 0, 0);
    expect(t.sunrise).not.toBeNull();
    expect(t.sunset).not.toBeNull();
    // `noon`'s own timezone shift cancels out of the DIFFERENCE, so this is
    // the one assertion here that does not depend on the test runner's own
    // local timezone (`sunTimes`'s "local hour" is local to whatever
    // `Date#getTimezoneOffset` says at run time — see the ported comment on
    // why, in `sun.ts`).
    expect((t.sunset as number) - (t.sunrise as number)).toBeCloseTo(12, 0);
  });

  it("orders the day: dawn before sunrise before noon before sunset before dusk", () => {
    const t = sunTimes(EQUINOX, 52.52, 13.405); // Berlin
    expect(t.dawn as number).toBeLessThan(t.sunrise as number);
    expect(t.sunrise as number).toBeLessThan(t.noon);
    expect(t.noon).toBeLessThan(t.sunset as number);
    expect(t.sunset as number).toBeLessThan(t.dusk as number);
  });

  it("gives a longer day in the June solstice than the December one, north of the equator", () => {
    const june = sunTimes(SOLSTICE_JUNE, 52.52, 13.405);
    const december = sunTimes(SOLSTICE_DECEMBER, 52.52, 13.405);
    const dayLength = (t: SunTimes) =>
      (t.sunset as number) - (t.sunrise as number);
    expect(dayLength(june)).toBeGreaterThan(dayLength(december));
  });

  it("reports polar night as no sunrise and no sunset", () => {
    // Deep into the Arctic Circle at the December solstice.
    const t = sunTimes(SOLSTICE_DECEMBER, 78, 15);
    expect(t.sunrise).toBeNull();
    expect(t.sunset).toBeNull();
  });

  it("reports the midnight sun as a sun that never sets", () => {
    // The same place, six months later.
    const t = sunTimes(SOLSTICE_JUNE, 78, 15);
    expect(t.sunset).not.toBeNull();
    expect(t.sunrise).not.toBeNull();
    // "Never sets" is encoded as a 12-hour half-angle either side of noon.
    expect((t.sunset as number) - t.noon).toBeCloseTo(12, 0);
  });
});

describe("driftAt", () => {
  const times = sunTimes(EQUINOX, 52.52, 13.405);

  it("is coldest and least warm at solar noon", () => {
    const noon = driftAt(times.noon, times);
    expect(noon.night).toBe(0);
    expect(noon.warm).toBeLessThan(0.1);
  });

  it("peaks warm right around sunset", () => {
    const atSunset = driftAt(times.sunset as number, times).warm;
    const midday = driftAt(times.noon, times).warm;
    // Twelve hours from solar noon, whatever local clock hour that lands on
    // in this run — far from both the dawn and dusk humps either way.
    const deepNight = driftAt(times.noon + 12, times).warm;
    expect(atSunset).toBeGreaterThan(midday);
    expect(atSunset).toBeGreaterThan(deepNight);
  });

  it("is fully night well past dusk and fully day well past dawn", () => {
    const deepNight = driftAt((times.dusk as number) + 2, times);
    expect(deepNight.night).toBe(1);
    const fullDay = driftAt(times.noon, times);
    expect(fullDay.night).toBe(0);
  });

  it("transitions night smoothly rather than as a step", () => {
    const before = driftAt((times.dusk as number) - 0.5, times).night;
    const at = driftAt(times.dusk as number, times).night;
    const after = driftAt((times.dusk as number) + 1, times).night;
    expect(before).toBeLessThan(at);
    expect(at).toBeLessThan(after);
  });

  it("leans on the clock instead of inventing a sun during polar night", () => {
    const polar = sunTimes(SOLSTICE_DECEMBER, 78, 15);
    expect(driftAt(2, polar)).toEqual({ warm: 0, night: 1 });
    expect(driftAt(12, polar)).toEqual({ warm: 0, night: 0 });
  });

  it("keeps both scalars within 0 and 1 across a full day", () => {
    for (let h = 0; h < 24; h += 0.5) {
      const levels = driftAt(h, times);
      expect(levels.warm).toBeGreaterThanOrEqual(0);
      expect(levels.warm).toBeLessThanOrEqual(1);
      expect(levels.night).toBeGreaterThanOrEqual(0);
      expect(levels.night).toBeLessThanOrEqual(1);
    }
  });
});
