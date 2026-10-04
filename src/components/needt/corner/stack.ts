/* THE STACK'S ARITHMETIC — kept out of the component so it can be checked.
 *
 * Three decisions live here, and all three are the difference between a stack
 * and a column of equals:
 *
 *   FOLD    each step back loses a little size and a little light. Five
 *           arrivals then cost the screen of about three.
 *   DROP    past four, a notice is not shown at all. A list that grows without
 *           limit is a list that covers the work.
 *   CLOCK   the wait is a clock you can stop by reaching for the card. It does
 *           not restart when the hand leaves — it resumes, because the reading
 *           you interrupted it for already happened.
 */

/** How many cards are drawn. The fifth is kept but not shown. */
export const STACK_SHOWN = 4;

/** How many are kept at all: one spare, so a dismissal reveals rather than
 *  empties. */
export const STACK_KEPT = 5;

/** Depth past this earns no further fold — three steps is already the whole
 *  readable range, and a fourth is indistinguishable from the third. */
export const FOLD_DEPTH = 3;

/** Per step of depth. */
export const FOLD_SCALE = 0.035;
export const FOLD_DIM = 0.22;

/** Long enough to read two lines and reach a button. */
export const DISMISS_MS = 7000;

/** While the hand is over the stack, ask again after this rather than firing. */
export const HELD_RECHECK_MS = 1200;

/** The leaving animation's length: `needt-nf-out` is 0.22s. */
export const LEAVE_MS = 220;

/** How one card sits, given how far back in the stack it is. */
export interface Fold {
  scale: number;
  opacity: number;
  /** Cards more than two deep are scenery: the pointer goes through them. */
  interactive: boolean;
}

/** The fold at a depth. Depth 0 is the newest, nearest the pill. */
export function foldAt(depth: number): Fold {
  const back = Math.min(Math.max(depth, 0), FOLD_DEPTH);
  return {
    scale: 1 - back * FOLD_SCALE,
    opacity: 1 - back * FOLD_DIM,
    interactive: back <= 2,
  };
}

/** `scale(...)`, ready for a style. */
export function foldTransform(depth: number): string {
  return `scale(${foldAt(depth).scale})`;
}

/** What is kept after one more arrives: the newest `STACK_KEPT`. */
export function keep<T>(list: readonly T[], arriving: T): T[] {
  return list.concat([arriving]).slice(-STACK_KEPT);
}

/** What is drawn: the newest `STACK_SHOWN`, oldest first. */
export function shown<T>(list: readonly T[]): readonly T[] {
  return list.slice(-STACK_SHOWN);
}

/** A running dismiss clock. */
export interface DismissClock {
  cancel: () => void;
}

export interface DismissClockOptions {
  /** How long to wait before firing. */
  delay: number;
  /** Asked at every wake: true while a hand is over the stack. */
  held: () => boolean;
  onDismiss: () => void;
}

/**
 * Start the clock.
 *
 * Held is checked when the clock wakes rather than watched, so leaving the
 * stack does not need to restart anything — the next wake simply finds the
 * hand gone and fires.
 */
export function startDismissClock({
  delay,
  held,
  onDismiss,
}: DismissClockOptions): DismissClock {
  let timer: ReturnType<typeof setTimeout> = setTimeout(function tick() {
    if (held()) {
      timer = setTimeout(tick, HELD_RECHECK_MS);
      return;
    }
    onDismiss();
  }, delay);

  return {
    cancel() {
      clearTimeout(timer);
    },
  };
}
