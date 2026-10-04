/* THE STEP MACHINE — pure, framework-free state for the five setup steps.
 *
 * Ported from `OnboardingScreen`'s inline `useState` calls in
 * `Content height and label fixes/needt-app/AuthScreen.jsx`. Kept separate
 * from `OnboardingScreen.tsx` so the order, each step's own requirement, and
 * the "going back keeps what was entered" guarantee are each one small pure
 * function — testable without mounting anything (PORT.md's own verify step
 * asks for exactly this).
 *
 * The prototype's Next button was never actually gated — it advanced
 * unconditionally. This module gates it, because a "step machine" with no
 * requirement is not one, and PORT.md's build brief asks for the order, the
 * per-step requirement, AND the back-preserves-answers guarantee to be
 * unit-tested. Skip is untouched: it still bypasses every requirement, on
 * every step, exactly as authored.
 */
import type { MiniatureKind } from "../home/Miniature";

export const ONBOARDING_STEP_IDS = [
  "you",
  "hours",
  "view",
  "calendars",
  "first",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export interface OnboardingStepDef {
  readonly id: OnboardingStepId;
  readonly title: string;
  readonly sub: string;
}

/** Order is the contract. STEPS[i] is step i — nothing reorders these. */
export const ONBOARDING_STEPS: readonly OnboardingStepDef[] = [
  { id: "you", title: "You", sub: "Name and time zone" },
  {
    id: "hours",
    title: "Your hours",
    sub: "When the scheduler may place work",
  },
  {
    id: "view",
    title: "How you work",
    sub: "The shape you want the day in",
  },
  {
    id: "calendars",
    title: "Calendars",
    sub: "What already owns your time",
  },
  {
    id: "first",
    title: "First tasks",
    sub: "Three things, and Needt places them",
  },
];

export type OnboardingDefaultView = "today" | "columns" | "grid";

export interface OnboardingViewOption {
  readonly id: OnboardingDefaultView;
  readonly label: string;
  readonly note: string;
}

/** Recognised by shape, not by name — PORT.md §3. Each id is the ground the
 * miniature actually draws, not a label a person has to read. */
export const ONBOARDING_VIEWS: readonly OnboardingViewOption[] = [
  {
    id: "today",
    label: "Day",
    note: "Today's work as a list, with what is overdue beside it.",
  },
  {
    id: "columns",
    label: "Columns",
    note: "Seven days side by side, each a stack of cards.",
  },
  {
    id: "grid",
    label: "Hours",
    note: "The clock, with everything placed on it.",
  },
];

export const ONBOARDING_VIEW_KIND: Readonly<
  Record<OnboardingDefaultView, MiniatureKind>
> = {
  today: "day",
  columns: "columns",
  grid: "grid",
};

export interface OnboardingAnswers {
  readonly name: string;
  readonly timeZone: string;
  readonly hoursStart: string;
  readonly hoursEnd: string;
  readonly weekStart: "mon" | "sun";
  readonly weekends: boolean;
  readonly view: OnboardingDefaultView;
  readonly appleConnected: boolean;
  readonly googleConnected: boolean;
  /** Three captures, one per row — never a fourth. */
  readonly captured: readonly [string, string, string];
}

export function defaultOnboardingAnswers(): OnboardingAnswers {
  return {
    name: "",
    timeZone: "cet",
    hoursStart: "09:00",
    hoursEnd: "18:00",
    weekStart: "mon",
    weekends: false,
    view: "today",
    appleConnected: false,
    googleConnected: false,
    captured: ["", "", ""],
  };
}

export function clampOnboardingStep(index: number): number {
  return Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, index));
}

function isChronological(start: string, end: string): boolean {
  return start.length > 0 && end.length > 0 && start < end;
}

/**
 * Whether a step's own requirement is met, before it may advance.
 *
 * "view" is always satisfied — a default view is always selected.
 * "calendars" and "first" are never required: Skip exists precisely because
 * connecting a calendar and capturing a first task are optional.
 */
export function canAdvanceOnboardingStep(
  id: OnboardingStepId,
  answers: OnboardingAnswers
): boolean {
  switch (id) {
    case "you":
      return answers.name.trim().length > 0;
    case "hours":
      return isChronological(answers.hoursStart, answers.hoursEnd);
    case "view":
      return ONBOARDING_VIEWS.some((option) => option.id === answers.view);
    case "calendars":
    case "first":
      return true;
  }
}

/** "N of 3 captured" — blank rows do not count. */
export function onboardingCapturedCount(captured: readonly string[]): number {
  return captured.filter((task) => task.trim().length > 0).length;
}

export interface OnboardingState {
  readonly index: number;
  readonly answers: OnboardingAnswers;
}

export function initialOnboardingState(step = 0): OnboardingState {
  return {
    index: clampOnboardingStep(step),
    answers: defaultOnboardingAnswers(),
  };
}

export type OnboardingAction =
  | { readonly type: "patch"; readonly partial: Partial<OnboardingAnswers> }
  | { readonly type: "advance" }
  | { readonly type: "back" }
  | { readonly type: "goto"; readonly index: number };

/**
 * The whole step machine, as one reducer.
 *
 * - Order lives in `ONBOARDING_STEPS`.
 * - The per-step requirement lives in `canAdvanceOnboardingStep` — `advance`
 *   is a no-op while it is unmet.
 * - "Going back keeps what was entered" falls out of the shape rather than
 *   needing its own case: `back` and `goto` only ever touch `index`, never
 *   `answers`, so nothing is there to lose.
 */
export function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction
): OnboardingState {
  switch (action.type) {
    case "patch":
      return { ...state, answers: { ...state.answers, ...action.partial } };
    case "advance": {
      const step = ONBOARDING_STEPS[state.index];
      if (!step || !canAdvanceOnboardingStep(step.id, state.answers)) {
        return state;
      }
      return { ...state, index: clampOnboardingStep(state.index + 1) };
    }
    case "back":
      return { ...state, index: clampOnboardingStep(state.index - 1) };
    case "goto":
      return { ...state, index: clampOnboardingStep(action.index) };
  }
}
