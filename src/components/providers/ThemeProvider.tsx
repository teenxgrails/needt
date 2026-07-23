"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
} from "react";

import { animateThemeTransition } from "@/components/ui/animated-theme-toggler";

import { getThemeClassNames, resolveThemeMode } from "@/lib/theme";

import { useSettingsStore } from "@/store/settings";

import { ThemeMode } from "@/types/settings";

type ThemeContextType = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
};

type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: string;
  forcedTheme?: ThemeMode;
  enableSystem?: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeProvider({
  children,
  attribute = "class",
  forcedTheme,
  enableSystem = true,
}: ThemeProviderProps) {
  const { user, updateUserSettings } = useSettingsStore();

  // Use forcedTheme if provided, otherwise use user theme
  const currentTheme = forcedTheme || user.theme;

  // Function to apply theme to the DOM
  const applyTheme = useCallback(
    (theme: ThemeMode) => {
      const root = window.document.documentElement;

      root.classList.remove("light", "dark", "theme-gray", "theme-dark");

      if (attribute !== "class") {
        root.removeAttribute(attribute);
      }

      const resolvedTheme = resolveThemeMode(
        theme,
        enableSystem &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
      );

      // Gray and Dark both use Tailwind's dark variants. Semantic classes
      // select the palette without duplicating component styles.
      root.classList.add(...getThemeClassNames(resolvedTheme));

      if (attribute !== "class") {
        root.setAttribute(attribute, resolvedTheme);
      }
    },
    [attribute, enableSystem]
  );

  // Apply theme when it changes
  useEffect(() => {
    if (forcedTheme) {
      applyTheme(forcedTheme);
    } else {
      applyTheme(user.theme);
    }
  }, [user.theme, forcedTheme, applyTheme]);

  // Listen for system theme changes if system preference is enabled
  useEffect(() => {
    if (
      forcedTheme ||
      !enableSystem ||
      (forcedTheme ? forcedTheme : user.theme) !== "system"
    )
      return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      applyTheme("system");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [user.theme, forcedTheme, enableSystem, applyTheme]);

  const setTheme = (theme: ThemeMode) => {
    if (theme === currentTheme) return;
    animateThemeTransition(() => {
      updateUserSettings({ theme });
      if (!forcedTheme) applyTheme(theme);
    });
  };

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
