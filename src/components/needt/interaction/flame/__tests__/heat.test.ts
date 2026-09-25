/* THE CATEGORY'S IMPULSE, CHECKED — the one heat formula the prototype
 * actually defines. */
import type { NeedtTask } from "@/lib/needt/types";

import { IMPULSE_HORIZON, IMPULSE_TASK_WEIGHT, impulseOf } from "../heat";

function task(overrides: Partial<NeedtTask> = {}): NeedtTask {
  return { id: "1", title: "Task", done: false, ...overrides };
}

describe("impulseOf", () => {
  it("is 0 for an empty category — a cold category has no flame", () => {
    expect(impulseOf([])).toBe(0);
  });

  it("is 0 when nothing in the category has closed", () => {
    expect(impulseOf([task(), task({ id: "2" })])).toBe(0);
  });

  it("counts a closed part as one", () => {
    const items = [
      task({
        parts: [
          { title: "a", done: true },
          { title: "b", done: false },
        ],
      }),
    ];
    expect(impulseOf(items)).toBeCloseTo(1 / IMPULSE_HORIZON);
  });

  it("counts a closed task as two", () => {
    expect(impulseOf([task({ done: true })])).toBeCloseTo(
      IMPULSE_TASK_WEIGHT / IMPULSE_HORIZON
    );
  });

  it("sums parts and tasks across the whole category", () => {
    const items = [
      task({ done: true }), // +2
      task({ id: "2", parts: [{ title: "a", done: true }] }), // +1
      task({ id: "3" }), // +0
    ];
    expect(impulseOf(items)).toBeCloseTo(3 / IMPULSE_HORIZON);
  });

  it("clamps at 1 rather than reading past full heat", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      task({ id: String(i), done: true })
    );
    expect(impulseOf(items)).toBe(1);
  });

  it("ignores a `null` parts list rather than throwing on it", () => {
    expect(impulseOf([task({ parts: null })])).toBe(0);
  });
});
