"use client";

/* THE THEME SWATCH — a theme chosen by looking at it.
 *
 * Ported from `ThemeThumb` in
 * `Content height and label fixes/needt-app/SettingsScreen.jsx`, which the
 * prototype's Auth screen also imports for onboarding's first step. Settings
 * itself has not been built in this app yet (§10's order runs Home, Columns,
 * Workspace, Documents, *then* Settings), so this is a local copy scoped to
 * `auth/` rather than a shared export — Settings will draw its own when its
 * turn comes, the same way `Miniature.tsx` says Settings and Auth each
 * import IT directly rather than one drawing through the other.
 *
 * Each swatch is the real screen at 1/8 scale via `Miniature`, inside the
 * theme's own `.needt-v2` scope — never a coloured rectangle standing in for
 * one. "System" is not a theme; its thumbnail is one screen cut down the
 * middle via `Miniature`'s `half` prop, showing the two themes it resolves
 * to.
 */
import * as React from "react";

import { LuCheck } from "react-icons/lu";

import type {
  ResolvedThemeMode,
  SystemThemePair,
  ThemeMode,
} from "@/types/settings";

import { Miniature } from "../home/Miniature";
import { Glyph } from "../shell/chrome";

export const THEME_OPTIONS: readonly { id: ThemeMode; label: string }[] = [
  { id: "paper", label: "Paper" },
  { id: "warm", label: "Warm" },
  { id: "dim", label: "Dim" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

const THUMB_WIDTH = 96;

export interface ThemeThumbProps {
  id: ThemeMode;
  label: string;
  active: boolean;
  onPick: (id: ThemeMode) => void;
  /** Which theme "system" resolves to for each side of the OS preference. */
  pair: SystemThemePair;
}

export function ThemeThumb({
  id,
  label,
  active,
  onPick,
  pair,
}: ThemeThumbProps) {
  return (
    <button
      type="button"
      className="thumb"
      aria-pressed={active}
      onClick={() => onPick(id)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: 0,
        border: 0,
        background: "none",
        cursor: "default",
        textAlign: "left",
      }}
    >
      <span
        style={{
          display: "block",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: active ? "var(--shadow-focus)" : "var(--shadow-ring)",
          transition: "box-shadow var(--transition-hover)",
        }}
      >
        {id === "system" ? (
          <Miniature
            kind="day"
            width={THUMB_WIDTH}
            half={[pair.light, pair.dark]}
          />
        ) : (
          <Miniature
            kind="day"
            width={THUMB_WIDTH}
            theme={id as ResolvedThemeMode}
          />
        )}
      </span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          font: "var(--type-meta)",
          color: active ? "var(--text-primary)" : "var(--text-tertiary)",
        }}
      >
        {active ? <Glyph of={LuCheck} size={13} /> : null}
        {label}
      </span>
    </button>
  );
}
