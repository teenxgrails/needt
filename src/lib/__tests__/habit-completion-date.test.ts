import { newDate } from "@/lib/date-utils";
import {
  habitDateFromKey,
  habitDateKey,
  habitDayKey,
  habitDayWindow,
  normalizeUserTimeZone,
} from "@/lib/habit-completion-date";

describe("habit completion dates", () => {
  const instant = newDate("2026-09-19T22:30:00.000Z");

  it("uses the user's calendar day at timezone boundaries", () => {
    expect(habitDayKey(instant, "Europe/Zurich")).toBe("2026-09-20");
    expect(habitDayKey(instant, "America/Los_Angeles")).toBe("2026-09-19");
  });

  it("falls back to UTC for an invalid timezone", () => {
    expect(normalizeUserTimeZone("Not/AZone")).toBe("UTC");
    expect(habitDayKey(instant, "Not/AZone")).toBe("2026-09-19");
  });

  it("stores and reads database dates as canonical UTC midnight", () => {
    const date = habitDateFromKey("2026-09-20");
    expect(date.toISOString()).toBe("2026-09-20T00:00:00.000Z");
    expect(habitDateKey(date)).toBe("2026-09-20");
  });

  it("builds a fourteen-day window ending on today", () => {
    const window = habitDayWindow(instant, "Europe/Zurich");
    expect(window).toHaveLength(14);
    expect(window[0]).toBe("2026-09-07");
    expect(window[13]).toBe("2026-09-20");
  });
});
