import {
  formatCalendarHour,
  getCalendarBusinessHours,
} from "@/lib/calendar-display";

describe("calendar display helpers", () => {
  const onePm = new Date(2026, 6, 19, 13, 0);

  it("formats 12-hour labels with a space and uppercase period", () => {
    expect(formatCalendarHour(onePm, "12h")).toBe("1 PM");
  });

  it("keeps 24-hour labels zero-padded", () => {
    expect(formatCalendarHour(onePm, "24h")).toBe("13:00");
  });

  it("turns the non-working-hours overlay off with its display switch", () => {
    expect(
      getCalendarBusinessHours({
        enabled: false,
        days: [1, 2, 3, 4, 5],
        start: "09:00",
        end: "17:00",
      })
    ).toBe(false);
  });

  it("returns configured hours when the overlay is enabled", () => {
    expect(
      getCalendarBusinessHours({
        enabled: true,
        days: [1, 2, 3, 4, 5],
        start: "09:00",
        end: "17:00",
      })
    ).toEqual({
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: "09:00",
      endTime: "17:00",
    });
  });
});
