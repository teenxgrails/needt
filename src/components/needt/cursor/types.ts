/* THE CURSOR'S CONTRACT — and where a real model will one day arrive.
 *
 * The prototype reached the cursor through `window.__agent`, which was an
 * artefact of classic scripts: there was no other way for one file to reach
 * another. The SHAPE survives — a run is a script of steps, each naming a
 * target and an act — and the global does not.
 *
 * Nothing here decides what the agent should do. A run is handed in already
 * decided; this file only says what a decision looks like by the time the hand
 * can act on it. `src/components/needt/cursor/scripted.ts` is today's stand-in
 * author, and it satisfies `AgentRunSource` exactly as a model will.
 */

/** What the hand does once it arrives. */
export type AgentAct =
  /** Press it. `click` and `tick` are the same gesture. */
  | { readonly kind: "click" }
  /** Pick the target up and carry it to the next step. */
  | { readonly kind: "hold"; readonly title?: string }
  /** Put down whatever is being carried, here. */
  | { readonly kind: "drop" }
  /** Type into it, a character at a time. */
  | { readonly kind: "type"; readonly text: string }
  /** Arrive, and do nothing — for a step that only needs to be looked at. */
  | { readonly kind: "rest" };

/**
 * The receipt. The animation is the verb — it says what is happening while it
 * happens — and a verb is gone the moment it finishes. So the change leaves a
 * mark in the margin beside the row it touched, and the day can be READ by
 * scanning for marks instead of re-read line by line.
 */
export interface AgentMarkSpec {
  /** One line, plain. It is what the mark says when it is asked. */
  readonly note: string;
  /**
   * The row the mark belongs beside, when that is not the step's own target.
   * A drop lands on a day cell but what CHANGED is the task, so the receipt
   * goes in the task's margin — a mark beside the thing the hand touched last
   * would be a record of the gesture rather than of the change.
   */
  readonly on?: string;
}

/** One step of a run. */
export interface AgentStep {
  /**
   * A CSS selector for the target, resolved when the step begins — not when
   * the run was authored, because by then the screen has moved. A target that
   * is not there is SKIPPED: a hand that mimes an action on nothing is worse
   * than a hand that does not go.
   */
  readonly target: string;
  readonly act: AgentAct;
  /** What the hand says on its way there. */
  readonly say?: string;
  /** The mark left beside the target once the act has landed. */
  readonly mark?: AgentMarkSpec;
  /** A pause after the act, before the next reach. */
  readonly afterMs?: number;
}

/** A whole run: what the agent is about to do, in order. */
export interface AgentRun {
  /** For the transcript, and for a caller that wants to name what it asked. */
  readonly label: string;
  readonly steps: readonly AgentStep[];
}

/**
 * WHERE THE MODEL ARRIVES. Today a scripted author reads the fixture and
 * returns a run; tomorrow something in `src/components/ai/` answers the same
 * call. The cursor knows only this, so replacing one does not touch the other.
 */
export interface AgentRunSource {
  /** Turn a line of intent into a run, or refuse by returning null. */
  plan: (prompt: string) => AgentRun | null;
}

/** A receipt, once it has been left. */
export interface AgentMark extends AgentMarkSpec {
  readonly id: string;
  /** The row it belongs to, re-resolved on every measure. */
  readonly target: string;
  /** When it was left. */
  readonly at: Date;
}

/**
 * What the corner's agent seam can do to the hand. Three verbs and two
 * questions — a run is handed over whole, because a half-done run is a worse
 * state than either end of it.
 */
export interface AgentCursorHandle {
  /** True from the first frame of a run to the moment the hand is home. */
  busy: () => boolean;
  /**
   * Play a run to its end. Resolves when the hand is back in the corner —
   * including when it was cut short, so a caller can always await it once.
   * A call made while another run is in flight is refused, and resolves
   * immediately: the hand finishes what it started.
   */
  run: (run: AgentRun) => Promise<void>;
  /** Cut the run short. The hand still goes home; the marks still stand. */
  stop: () => void;
  /** The receipts, newest last. */
  marks: () => readonly AgentMark[];
  /** Clear them. They are a record of a session, not of a database. */
  clearMarks: () => void;
}
