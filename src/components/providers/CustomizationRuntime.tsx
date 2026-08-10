"use client";

import { PropsWithChildren, useEffect } from "react";

import {
  DESIGN_TOKENS_EVENT,
  DesignTokens,
  applyDesignTokens,
  parseDesignTokens,
} from "@/lib/design-tokens";

type CustomizationPayload = {
  accentColor?: unknown;
  radius?: unknown;
  designTokens?: unknown;
};

function applyCustomization(payload: CustomizationPayload) {
  const tokens = parseDesignTokens(payload.designTokens);
  if (tokens) {
    applyDesignTokens(document.documentElement, tokens);
    return;
  }

  if (typeof payload.accentColor === "string") {
    document.documentElement.style.setProperty(
      "--color-accent",
      payload.accentColor
    );
  }
  if (typeof payload.radius === "number") {
    document.documentElement.style.setProperty("--radius", `${payload.radius}px`);
  }
}

export function CustomizationRuntime({ children }: PropsWithChildren) {
  useEffect(() => {
    let cancelled = false;
    const handleTokens = (event: Event) => {
      const tokens = (event as CustomEvent<DesignTokens>).detail;
      if (parseDesignTokens(tokens)) applyDesignTokens(document.documentElement, tokens);
    };

    window.addEventListener(DESIGN_TOKENS_EVENT, handleTokens);
    fetch("/api/customization")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: CustomizationPayload | null) => {
        if (!cancelled && payload) applyCustomization(payload);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      window.removeEventListener(DESIGN_TOKENS_EVENT, handleTokens);
    };
  }, []);

  return children;
}
