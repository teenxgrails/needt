import {
  extractOutlookDeltaToken,
  getOutlookSyncWindow,
} from "@/lib/outlook-sync";

describe("Outlook sync window", () => {
  it("is derived at call time instead of being frozen at module import", () => {
    const first = getOutlookSyncWindow(new Date(2025, 6, 1));
    const later = getOutlookSyncWindow(new Date(2027, 6, 1));

    expect(first.timeMin.getFullYear()).toBe(2024);
    expect(first.timeMax.getFullYear()).toBe(2026);
    expect(later.timeMin.getFullYear()).toBe(2026);
    expect(later.timeMax.getFullYear()).toBe(2028);
  });

  it("extracts an opaque encoded delta token without trailing parameters", () => {
    expect(
      extractOutlookDeltaToken(
        "https://graph.microsoft.com/v1.0/me/calendarView/delta?%24deltatoken=opaque%2Bvalue%3D&other=1"
      )
    ).toBe("opaque+value=");
  });

  it("returns undefined for a response without a delta token", () => {
    expect(
      extractOutlookDeltaToken(
        "https://graph.microsoft.com/v1.0/me/calendarView/delta?$skiptoken=next"
      )
    ).toBeUndefined();
  });
});
