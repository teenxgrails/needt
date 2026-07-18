import { formatToLocalISOString } from "@/lib/date-utils";

describe("formatToLocalISOString", () => {
  it("preserves local wall-clock fields for datetime-local inputs", () => {
    const localDate = new Date(2026, 6, 18, 10, 45, 0, 0);

    expect(formatToLocalISOString(localDate)).toBe("2026-07-18T10:45");
  });
});
