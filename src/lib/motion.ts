export const springSoft = {
  type: "spring",
  stiffness: 400,
  damping: 32,
  mass: 0.8,
} as const;

export const springSnappy = {
  type: "spring",
  stiffness: 600,
  damping: 30,
} as const;

export const quickEase = {
  duration: 0.18,
  ease: [0.2, 0.8, 0.2, 1],
} as const;
