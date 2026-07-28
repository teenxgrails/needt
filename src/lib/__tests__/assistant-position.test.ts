import {
  clampPoint,
  companionBounds,
  fromNormalized,
  isNormalizedAssistantPosition,
  toNormalized,
} from "@/lib/assistant-position";

describe("assistant position", () => {
  const bounds = {
    minX: 264,
    maxX: 1112,
    minY: 20,
    maxY: 692,
  };

  it("keeps the companion clear of the desktop sidebar", () => {
    expect(
      companionBounds({
        viewportWidth: 1220,
        viewportHeight: 800,
        size: 88,
        sidebarWidth: 244,
        mobileDockHeight: 68,
      })
    ).toEqual(bounds);
  });

  it("keeps the companion above the mobile dock and safe area", () => {
    expect(
      companionBounds({
        viewportWidth: 360,
        viewportHeight: 780,
        size: 64,
        sidebarWidth: 244,
        mobileDockHeight: 68,
        safeBottom: 20,
      })
    ).toEqual({
      minX: 12,
      maxX: 284,
      minY: 12,
      maxY: 616,
    });
  });

  it("round-trips normalized coordinates across a resize", () => {
    const normalized = toNormalized({ x: 688, y: 356 }, bounds);
    expect(normalized).toEqual({ x: 0.5, y: 0.5 });
    expect(fromNormalized(normalized, bounds)).toEqual({ x: 688, y: 356 });
  });

  it("clamps invalid pixels and rejects malformed persisted data", () => {
    expect(clampPoint({ x: 0, y: 900 }, bounds)).toEqual({
      x: 264,
      y: 692,
    });
    expect(isNormalizedAssistantPosition({ x: 0.2, y: 0.9 })).toBe(true);
    expect(isNormalizedAssistantPosition({ x: -1, y: 2 })).toBe(false);
    expect(isNormalizedAssistantPosition("0.5,0.5")).toBe(false);
  });
});
