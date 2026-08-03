import type { Transition, Variants } from "motion/react";

export function resolveMotionPolicy(input: {
  animationsEnabled: boolean;
  documentVisible: boolean;
  prefersReducedMotion: boolean;
}) {
  const enabled =
    input.animationsEnabled &&
    input.documentVisible &&
    !input.prefersReducedMotion;
  return {
    enabled,
    datasetValue: enabled ? ("on" as const) : ("off" as const),
    reducedMotion: enabled ? ("user" as const) : ("always" as const),
  };
}

export const instantTransition = {
  duration: 0,
} satisfies Transition;

export const fastFadeTransition = {
  duration: 0.14,
  ease: [0.2, 0, 0, 1],
} satisfies Transition;

export const panelTransition = {
  duration: 0.18,
  ease: [0.16, 1, 0.3, 1],
} satisfies Transition;

export const layoutSpring = {
  type: "spring",
  stiffness: 420,
  damping: 36,
  mass: 0.8,
} satisfies Transition;

export const spatialSpring = {
  type: "spring",
  stiffness: 480,
  damping: 40,
  mass: 0.75,
} satisfies Transition;

export const dragSpring = {
  type: "spring",
  stiffness: 520,
  damping: 42,
  mass: 0.7,
} satisfies Transition;

export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
} satisfies Variants;

export const panelVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
} satisfies Variants;

export const staggerContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035 } },
  exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
} satisfies Variants;

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: fastFadeTransition },
  exit: { opacity: 0, y: 2, transition: fastFadeTransition },
} satisfies Variants;

export const reducedMotionVariants = {
  hidden: { opacity: 1, x: 0, y: 0, scale: 1 },
  visible: { opacity: 1, x: 0, y: 0, scale: 1 },
  exit: { opacity: 1, x: 0, y: 0, scale: 1 },
} satisfies Variants;

// Compatibility aliases for existing spatial calendar transitions.
export const springSoft = layoutSpring;
export const springSnappy = spatialSpring;
export const quickEase = fastFadeTransition;
