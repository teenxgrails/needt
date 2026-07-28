import { moveCalendarDate } from "@/lib/calendar-navigation";
import { computeCalendarScrollTop } from "@/lib/calendar-scroll-policy";
import { newDate } from "@/lib/date-utils";

describe("calendar horizontal navigation", () => {
  it.each([
    ["day", "2026-07-28T12:00:00", 1, "2026-07-29"],
    ["week", "2026-07-28T12:00:00", -1, "2026-07-21"],
    ["month", "2026-07-28T12:00:00", 1, "2026-08-28"],
    ["multiMonth", "2026-07-28T12:00:00", -1, "2025-07-28"],
  ] as const)(
    "moves a %s view by one period",
    (view, input, direction, expectedDate) => {
      const result = moveCalendarDate(newDate(input), view, direction);
      expect(result.toISOString().slice(0, 10)).toBe(expectedDate);
    }
  );
});

describe("calendar scroll policy", () => {
  it("places the current marker at thirty percent of the viewport", () => {
    const viewportHeight = 900;
    const markerTop = 1_200;
    const scrollTop = computeCalendarScrollTop({
      markerTop,
      viewportHeight,
      scrollHeight: 3_000,
    });

    expect((markerTop - scrollTop) / viewportHeight).toBeCloseTo(0.3);
  });

  it("clamps near the start and end of the day", () => {
    expect(
      computeCalendarScrollTop({
        markerTop: 100,
        viewportHeight: 900,
        scrollHeight: 3_000,
      })
    ).toBe(0);
    expect(
      computeCalendarScrollTop({
        markerTop: 2_950,
        viewportHeight: 900,
        scrollHeight: 3_000,
      })
    ).toBe(2_100);
  });
});
