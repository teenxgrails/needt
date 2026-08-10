import { getThemeClassNames } from "@/lib/theme";

export type DesignTokens = {
  name: string;
  mode: "light" | "graphite" | "dark";
  canvas: string;
  control: string;
  controlHover: string;
  hover: string;
  borderSubtle: string;
  border: string;
  text: string;
  textSecondary: string;
  muted: string;
  accent: string;
  radius: number;
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const DESIGN_TOKEN_VARIABLES = [
  "--surface-canvas",
  "--surface-panel",
  "--surface-raised",
  "--surface-control",
  "--surface-control-hover",
  "--surface-input",
  "--surface-hover",
  "--border-subtle",
  "--border-control",
  "--text-primary",
  "--text-secondary",
  "--text-muted",
  "--color-accent",
  "--button-primary-bg",
  "--button-primary-bg-hover",
  "--button-primary-border",
  "--switch-on-bg",
  "--control-radius",
  "--radius",
] as const;

export const DESIGN_TOKENS_EVENT = "needt:design-tokens";

export function parseDesignTokens(value: unknown): DesignTokens | null {
  if (typeof value !== "object" || value === null) return null;
  const tokens = value as Partial<DesignTokens>;
  const colors = [
    tokens.canvas,
    tokens.control,
    tokens.controlHover,
    tokens.hover,
    tokens.borderSubtle,
    tokens.border,
    tokens.text,
    tokens.textSecondary,
    tokens.muted,
    tokens.accent,
  ];

  if (
    typeof tokens.name !== "string" ||
    tokens.name.trim().length === 0 ||
    tokens.name.length > 80 ||
    !["light", "graphite", "dark"].includes(tokens.mode ?? "") ||
    !colors.every(
      (color): color is string =>
        typeof color === "string" && HEX_COLOR.test(color)
    ) ||
    typeof tokens.radius !== "number" ||
    !Number.isFinite(tokens.radius) ||
    tokens.radius < 2 ||
    tokens.radius > 18
  ) {
    return null;
  }

  return tokens as DesignTokens;
}

export function applyDesignTokens(root: HTMLElement, tokens: DesignTokens) {
  root.classList.remove(
    "light",
    "dark",
    "theme-gray",
    "theme-graphite",
    "theme-dark"
  );
  root.classList.add(...getThemeClassNames(tokens.mode));
  root.dataset.theme = tokens.mode;

  const values: Record<(typeof DESIGN_TOKEN_VARIABLES)[number], string> = {
    "--surface-canvas": tokens.canvas,
    "--surface-panel": tokens.canvas,
    "--surface-raised": tokens.canvas,
    "--surface-control": tokens.control,
    "--surface-control-hover": tokens.controlHover,
    "--surface-input": tokens.canvas,
    "--surface-hover": tokens.hover,
    "--border-subtle": tokens.borderSubtle,
    "--border-control": tokens.border,
    "--text-primary": tokens.text,
    "--text-secondary": tokens.textSecondary,
    "--text-muted": tokens.muted,
    "--color-accent": tokens.accent,
    "--button-primary-bg": tokens.accent,
    "--button-primary-bg-hover": tokens.accent,
    "--button-primary-border": tokens.accent,
    "--switch-on-bg": tokens.accent,
    "--control-radius": `${tokens.radius}px`,
    "--radius": `${tokens.radius}px`,
  };

  DESIGN_TOKEN_VARIABLES.forEach((variable) => {
    root.style.setProperty(variable, values[variable]);
  });
}
