import { pickWritableCalendar } from "@/lib/needt3/hooks/events";

describe("where a new event is written", () => {
  it("uses an enabled Needt (LOCAL) calendar", () => {
    expect(
      pickWritableCalendar([
        { id: "g", type: "GOOGLE", name: "Work" },
        { id: "l", type: "LOCAL", name: "Needt" },
      ])?.id
    ).toBe("l");
  });

  it("never writes into a synced provider calendar or a disabled one", () => {
    expect(
      pickWritableCalendar([
        { id: "g", type: "GOOGLE", name: "Work" },
        { id: "l", type: "LOCAL", name: "Old", enabled: false },
      ])
    ).toBeNull();
  });
});
