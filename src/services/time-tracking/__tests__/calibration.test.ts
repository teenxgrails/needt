import { buildCalibrationContext } from "../calibration";

describe("buildCalibrationContext", () => {
  it("computes median correction factors by context tag after five samples", () => {
    const context = buildCalibrationContext([
      task("beats", 50, 80),
      task("beats", 60, 90),
      task("beats", 40, 64),
      task("beats", 30, 48),
      task("beats", 100, 160),
      task("admin", 20, 40),
    ]);

    expect(context.factors.beats).toBeCloseTo(1.6);
    expect(context.factors.admin).toBeUndefined();
    expect(context.contexts[0]).toMatchObject({
      contextTag: "beats",
      completedCount: 5,
      overUnderPercent: 60,
    });
  });

  it("marks the report ready after twenty completed tasks with actuals", () => {
    const context = buildCalibrationContext(
      Array.from({ length: 20 }, (_, index) =>
        task(index < 10 ? "deep-work" : "admin", 30, 45)
      )
    );

    expect(context.reportReady).toBe(true);
    expect(context.totalCompletedWithActuals).toBe(20);
    expect(context.factors["deep-work"]).toBeCloseTo(1.5);
    expect(context.factors.admin).toBeCloseTo(1.5);
  });
});

function task(contextTag: string, estLikely: number, actualMinutes: number) {
  return {
    contextTag,
    estLikely,
    estimatedMinutes: estLikely,
    actualMinutes,
    completedAt: new Date("2026-07-07T12:00:00.000Z"),
  };
}
