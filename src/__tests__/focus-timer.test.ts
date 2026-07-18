import {
  effectiveElapsedSeconds,
  focusedMinutes,
  formatClock,
  isSessionComplete,
  projectedEndsAt,
  remainingSeconds,
} from "@/lib/focus-timer";
import { newDate } from "@/lib/date-utils";

const START = newDate("2026-07-17T10:00:00.000Z");

function at(secondsAfterStart: number): Date {
  return newDate(START.getTime() + secondsAfterStart * 1000);
}

describe("focus-timer math", () => {
  describe("effectiveElapsedSeconds", () => {
    it("counts wall time when never paused", () => {
      const timing = {
        startedAt: START,
        plannedMinutes: 25,
        pausedTotalSeconds: 0,
        pausedAt: null,
      };
      expect(effectiveElapsedSeconds(timing, at(90))).toBe(90);
    });

    it("subtracts completed pause spans", () => {
      const timing = {
        startedAt: START,
        plannedMinutes: 25,
        pausedTotalSeconds: 60,
        pausedAt: null,
      };
      // 120s of wall time, 60s of it was paused -> 60s focused.
      expect(effectiveElapsedSeconds(timing, at(120))).toBe(60);
    });

    it("subtracts an in-progress pause on top of completed spans", () => {
      const timing = {
        startedAt: START,
        plannedMinutes: 25,
        pausedTotalSeconds: 30,
        pausedAt: at(100), // paused 100s in, still paused
      };
      // at 150s: 150 wall - 30 prior pause - 50 current pause = 70 focused.
      expect(effectiveElapsedSeconds(timing, at(150))).toBe(70);
    });

    it("never goes negative", () => {
      const timing = {
        startedAt: START,
        plannedMinutes: 25,
        pausedTotalSeconds: 999,
        pausedAt: null,
      };
      expect(effectiveElapsedSeconds(timing, at(10))).toBe(0);
    });
  });

  describe("remainingSeconds", () => {
    it("counts down from the planned length", () => {
      const timing = {
        startedAt: START,
        plannedMinutes: 25,
        pausedTotalSeconds: 0,
        pausedAt: null,
      };
      expect(remainingSeconds(timing, at(60))).toBe(25 * 60 - 60);
    });

    it("freezes while paused", () => {
      const timing = {
        startedAt: START,
        plannedMinutes: 25,
        pausedTotalSeconds: 0,
        pausedAt: at(300), // paused 5 min in
      };
      // remaining stays at 20:00 regardless of how long we stay paused.
      expect(remainingSeconds(timing, at(300))).toBe(20 * 60);
      expect(remainingSeconds(timing, at(900))).toBe(20 * 60);
    });

    it("clamps at zero when the planned time is exceeded", () => {
      const timing = {
        startedAt: START,
        plannedMinutes: 1,
        pausedTotalSeconds: 0,
        pausedAt: null,
      };
      expect(remainingSeconds(timing, at(120))).toBe(0);
    });

    it("returns null for a free/flow session", () => {
      const timing = {
        startedAt: START,
        plannedMinutes: null,
        pausedTotalSeconds: 0,
        pausedAt: null,
      };
      expect(remainingSeconds(timing, at(120))).toBeNull();
    });
  });

  describe("isSessionComplete", () => {
    it("is true once a countdown reaches zero", () => {
      const timing = {
        startedAt: START,
        plannedMinutes: 1,
        pausedTotalSeconds: 0,
        pausedAt: null,
      };
      expect(isSessionComplete(timing, at(59))).toBe(false);
      expect(isSessionComplete(timing, at(60))).toBe(true);
    });

    it("is never complete for a free session", () => {
      const timing = {
        startedAt: START,
        plannedMinutes: null,
        pausedTotalSeconds: 0,
        pausedAt: null,
      };
      expect(isSessionComplete(timing, at(100000))).toBe(false);
    });

    it("accounts for pauses when deciding completion", () => {
      const timing = {
        startedAt: START,
        plannedMinutes: 1,
        pausedTotalSeconds: 30,
        pausedAt: null,
      };
      // 60s planned, 30s were paused -> not done until 90s wall time.
      expect(isSessionComplete(timing, at(80))).toBe(false);
      expect(isSessionComplete(timing, at(90))).toBe(true);
    });
  });

  describe("projectedEndsAt", () => {
    it("projects the finish time for a running countdown", () => {
      const timing = {
        startedAt: START,
        plannedMinutes: 25,
        pausedTotalSeconds: 0,
        pausedAt: null,
      };
      const ends = projectedEndsAt(timing, at(0));
      expect(ends?.toISOString()).toBe(at(25 * 60).toISOString());
    });

    it("is null for a free session", () => {
      const timing = {
        startedAt: START,
        plannedMinutes: null,
        pausedTotalSeconds: 0,
        pausedAt: null,
      };
      expect(projectedEndsAt(timing, at(0))).toBeNull();
    });
  });

  describe("focusedMinutes", () => {
    it("rounds effective elapsed seconds to whole minutes", () => {
      const timing = {
        startedAt: START,
        plannedMinutes: 25,
        pausedTotalSeconds: 40,
        pausedAt: null,
      };
      // 25:00 wall + ... : 1540s wall - 40 paused = 1500s = 25 min.
      expect(focusedMinutes(timing, at(1540))).toBe(25);
    });
  });

  describe("formatClock", () => {
    it("formats mm:ss and clamps negatives", () => {
      expect(formatClock(0)).toBe("00:00");
      expect(formatClock(65)).toBe("01:05");
      expect(formatClock(-10)).toBe("00:00");
      expect(formatClock(25 * 60)).toBe("25:00");
    });
  });
});
