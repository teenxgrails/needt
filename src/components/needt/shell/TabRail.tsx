"use client";

/* THE SCREEN SWITCH — the product's four places, across the top of the window
 * rather than down the left edge.
 *
 * Active is a fill plus the accent as the text: the same pair the segmented
 * control and the selected date cell use, and the only legal way to spend the
 * accent on a control. Never an underline, never a left bar.
 *
 * `.tab-bar` and `.tab-label` are the vendored sheet's hooks: under 1320px the
 * inactive tabs drop their labels and their icons carry them, so the tail of
 * the row is never clipped. The classes have to be here or that rule lands on
 * nothing.
 */
import * as React from "react";

import type { IconType } from "react-icons";
import {
  LuCalendarDays,
  LuFileText,
  LuFolderKanban,
  LuHouse,
  LuPlus,
} from "react-icons/lu";

import { Glyph } from "./chrome";
import { NEEDT_TAB_IDS, type NeedtScreenId, needtScreen } from "./screens";

/* The glyph lives with the thing that draws it. There is no name registry:
   the kit had one only because a classic script cannot import. */
const TAB_GLYPHS: Record<NeedtScreenId, IconType> = {
  today: LuHouse,
  workspace: LuFolderKanban,
  calendar: LuCalendarDays,
  docs: LuFileText,
  settings: LuHouse,
};

export interface TabRailProps {
  screen: NeedtScreenId;
  onScreen: (screen: NeedtScreenId) => void;
  /** One place to make anything. What kind comes out of the sentence. */
  onNew: () => void;
  /** Still open today — the one count worth a mark on a tab. */
  dueToday?: number;
  /** The screen's own controls, at the tail of the row. */
  right?: React.ReactNode;
}

export function TabRail({
  screen,
  onScreen,
  onNew,
  dueToday = 0,
  right,
}: TabRailProps) {
  return (
    <nav
      className="tab-bar"
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 2,
        height: 52,
        minWidth: 0,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          paddingRight: 11,
          marginRight: 5,
          boxShadow: "var(--border) -1px 0 0 0 inset",
        }}
      >
        <button type="button" className="btn" onClick={onNew}>
          <Glyph of={LuPlus} size={16} />
          New
        </button>
      </span>

      {NEEDT_TAB_IDS.map((id) => {
        const on = screen === id;
        const marked = id === "today" && dueToday > 0;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onScreen(id)}
            aria-current={on ? "page" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 32,
              padding: "0 11px",
              border: 0,
              cursor: "default",
              borderRadius: "var(--radius-lg)",
              background: on ? "var(--fill-accent)" : "transparent",
              color: on ? "var(--accent)" : "var(--text-secondary)",
              font: on ? "var(--type-ui-medium)" : "var(--type-ui)",
            }}
          >
            <span style={{ position: "relative", display: "flex" }}>
              <Glyph of={TAB_GLYPHS[id]} size={16} />
              {marked ? (
                <span
                  aria-label={`${dueToday} still open today`}
                  title={`${dueToday} still open today`}
                  style={{
                    position: "absolute",
                    right: -3,
                    top: -2,
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    background: "var(--destructive)",
                    boxShadow: "0 0 0 1.5px var(--background)",
                  }}
                />
              ) : null}
            </span>
            <span className={on ? undefined : "tab-label"}>
              {needtScreen(id).tab}
            </span>
          </button>
        );
      })}

      {right ? (
        <span
          style={{
            marginLeft: "auto",
            flex: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {right}
        </span>
      ) : null}
    </nav>
  );
}
