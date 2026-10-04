/* AUTH + ONBOARDING — as one import.
 *
 * Exported for whoever eventually mounts sign-in and setup; nothing in this
 * app does yet (see the file headers on `AuthScreen.tsx` and
 * `OnboardingScreen.tsx` — this is a design port, not an auth wiring).
 */
export { AuthScreen } from "./AuthScreen";
export type {
  AuthMode,
  AuthRefusalReason,
  AuthResult,
  AuthScreenProps,
  AuthScreenSeed,
} from "./AuthScreen";

export { OnboardingScreen } from "./OnboardingScreen";
export type { OnboardingScreenProps } from "./OnboardingScreen";

export { LivePlate } from "./LivePlate";
export type { LivePlateProps } from "./LivePlate";

export { THEME_OPTIONS, ThemeThumb } from "./ThemeThumb";
export type { ThemeThumbProps } from "./ThemeThumb";

export { Group, Row, Select, Toggle } from "./form";
export type { SelectOption } from "./form";

export {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_IDS,
  ONBOARDING_VIEWS,
  ONBOARDING_VIEW_KIND,
  canAdvanceOnboardingStep,
  clampOnboardingStep,
  defaultOnboardingAnswers,
  initialOnboardingState,
  onboardingCapturedCount,
  onboardingReducer,
} from "./onboarding-steps";
export type {
  OnboardingAction,
  OnboardingAnswers,
  OnboardingDefaultView,
  OnboardingState,
  OnboardingStepDef,
  OnboardingStepId,
  OnboardingViewOption,
} from "./onboarding-steps";
