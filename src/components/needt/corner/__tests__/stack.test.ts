/* The three decisions that make a stack a stack, checked.
 *
 * They are tested here rather than through a render because none of them is a
 * rendering question: the fold is arithmetic, the drop is a slice, and the
 * clock is a timer that asks one question when it wakes.
 */
import {
  DISMISS_MS,
  FOLD_DEPTH,
  FOLD_DIM,
  FOLD_SCALE,
  HELD_RECHECK_MS,
  STACK_KEPT,
  STACK_SHOWN,
  foldAt,
  foldTransform,
  keep,
  shown,
  startDismissClock,
} from "../stack";

describe("the fold", () => {
  it("leaves the newest card untouched", () => {
    expect(foldAt(0)).toEqual({ scale: 1, opacity: 1, interactive: true });
  });

  it("loses one step of size and light per step of depth", () => {
    for (let depth = 0; depth <= FOLD_DEPTH; depth += 1) {
      expect(foldAt(depth).scale).toBeCloseTo(1 - depth * FOLD_SCALE, 10);
      expect(foldAt(depth).opacity).toBeCloseTo(1 - depth * FOLD_DIM, 10);
    }
  });

  it("holds at the third step, because a fourth cannot be told from it", () => {
    expect(foldAt(4)).toEqual(foldAt(FOLD_DEPTH));
    expect(foldAt(9)).toEqual(foldAt(FOLD_DEPTH));
  });

  it("makes cards more than two deep scenery", () => {
    expect(foldAt(2).interactive).toBe(true);
    expect(foldAt(3).interactive).toBe(false);
  });

  it("writes the scale as a transform", () => {
    expect(foldTransform(0)).toBe("scale(1)");
    expect(foldTransform(1)).toBe(`scale(${1 - FOLD_SCALE})`);
  });

  it("treats a negative depth as the front", () => {
    expect(foldAt(-1)).toEqual(foldAt(0));
  });
});

describe("the drop past four", () => {
  const five = ["a", "b", "c", "d", "e"];

  it("draws only the newest four, oldest first", () => {
    expect(shown(five)).toEqual(["b", "c", "d", "e"]);
    expect(shown(five)).toHaveLength(STACK_SHOWN);
  });

  it("draws everything while there are four or fewer", () => {
    expect(shown(["a", "b"])).toEqual(["a", "b"]);
  });

  it("keeps one spare beyond what it draws", () => {
    expect(keep(five, "f")).toEqual(["b", "c", "d", "e", "f"]);
    expect(keep(five, "f")).toHaveLength(STACK_KEPT);
  });

  it("never grows past what it keeps, however many arrive", () => {
    let list: string[] = [];
    for (let i = 0; i < 40; i += 1) list = keep(list, `n${i}`);
    expect(list).toHaveLength(STACK_KEPT);
    expect(list[STACK_KEPT - 1]).toBe("n39");
  });
});

describe("the dismiss clock", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("fires once the wait is over", () => {
    const onDismiss = jest.fn();
    startDismissClock({ delay: DISMISS_MS, held: () => false, onDismiss });

    jest.advanceTimersByTime(DISMISS_MS - 1);
    expect(onDismiss).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not fire while a hand is over the stack", () => {
    const onDismiss = jest.fn();
    let held = true;
    startDismissClock({ delay: DISMISS_MS, held: () => held, onDismiss });

    jest.advanceTimersByTime(DISMISS_MS + HELD_RECHECK_MS * 20);
    expect(onDismiss).not.toHaveBeenCalled();

    /* Reaching for a card stops the clock; letting go lets the next wake find
       the hand gone. */
    held = false;
    jest.advanceTimersByTime(HELD_RECHECK_MS);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("asks again rather than restarting, so leaving costs one recheck", () => {
    const onDismiss = jest.fn();
    let held = true;
    startDismissClock({ delay: DISMISS_MS, held: () => held, onDismiss });

    jest.advanceTimersByTime(DISMISS_MS);
    held = false;

    jest.advanceTimersByTime(HELD_RECHECK_MS - 1);
    expect(onDismiss).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("stops for good when it is cancelled", () => {
    const onDismiss = jest.fn();
    const clock = startDismissClock({
      delay: DISMISS_MS,
      held: () => false,
      onDismiss,
    });

    clock.cancel();
    jest.advanceTimersByTime(DISMISS_MS * 4);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("can be cancelled mid-hold", () => {
    const onDismiss = jest.fn();
    const clock = startDismissClock({
      delay: DISMISS_MS,
      held: () => true,
      onDismiss,
    });

    jest.advanceTimersByTime(DISMISS_MS + HELD_RECHECK_MS);
    clock.cancel();
    jest.advanceTimersByTime(HELD_RECHECK_MS * 10);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
