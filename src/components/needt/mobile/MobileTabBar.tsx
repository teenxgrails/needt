"use client";

/* THE BOTTOM BAR — four destinations and nothing else.
 *
 * Ported from `Mobile.jsx`'s bottom `<nav>`. "The fifth would be the one
 * nobody can name" — the desktop rail's navigation job lands here whole,
 * with nothing added for the phone's sake.
 */
import * as React from "react";

import type { IconType } from "react-icons";
import {
  LuCalendarDays,
  LuFileText,
  LuFolderKanban,
  LuHouse,
} from "react-icons/lu";

import { Glyph } from "../shell/chrome";
import { MOBILE_TABS, type MobileTabId, TAB_ITEM_HEIGHT } from "./mobile-logic";

const TAB_ICONS: Readonly<Record<MobileTabId, IconType>> = {
  home: LuHouse,
  calendar: LuCalendarDays,
  workspace: LuFolderKanban,
  docs: LuFileText,
};

export interface MobileTabBarProps {
  /** `null` while Settings (reached from the header, not a tab) is open —
   * none of the four tabs is "current" then. */
  active: MobileTabId | null;
  onSelect: (id: MobileTabId) => void;
  /** The tab bar hides while the composer is open — the row underneath it
   * must not compete with the sheet for the thumb. */
  hidden: boolean;
  /** A dot on Home when something is still open for today. Quiet on a clear
   * day: a dot that is always lit is not a signal. */
  homeDueToday: number;
}

export function MobileTabBar({
  active,
  onSelect,
  hidden,
  homeDueToday,
}: MobileTabBarProps) {
  return (
    <nav
      aria-hidden={hidden}
      style={{
        flex: "none",
        display: "flex",
        alignItems: "stretch",
        padding: "6px 8px 22px",
        background: "var(--surface-raised)",
        boxShadow: "var(--border) 0 1px 0 0 inset",
        transform: hidden ? "translateY(100%)" : "none",
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? "none" : "auto",
        transition:
          "transform 0.28s cubic-bezier(0.2, 0.7, 0.2, 1), opacity 0.2s ease",
      }}
    >
      {MOBILE_TABS.map((tab) => {
        const on = active === tab.id;
        const mark = tab.id === "home" && homeDueToday > 0;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            aria-current={on ? "page" : undefined}
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              height: TAB_ITEM_HEIGHT,
              border: 0,
              cursor: "default",
              borderRadius: "var(--radius-lg)",
              background: "transparent",
            }}
          >
            <span
              style={{
                position: "relative",
                display: "flex",
                color: on ? "var(--accent)" : "var(--text-quaternary)",
              }}
            >
              <Glyph of={TAB_ICONS[tab.id]} size={20} filled={on} />
              {mark ? (
                <span
                  aria-label={`${homeDueToday} still open today`}
                  style={{
                    position: "absolute",
                    right: -3,
                    top: -1,
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    background: "var(--destructive)",
                    boxShadow: "0 0 0 2px var(--background)",
                  }}
                />
              ) : null}
            </span>
            <span
              style={{
                font: on ? "var(--type-meta-medium)" : "var(--type-meta)",
                color: on ? "var(--accent)" : "var(--text-quaternary)",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
