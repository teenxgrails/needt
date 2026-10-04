"use client";

/* THE HEADER — who and when, focus, and the day strip.
 *
 * Ported from `Mobile.jsx`'s `MbHeader`. Two of the desktop rail's four jobs
 * land here: focus stays visible while the screen underneath changes, and
 * the mini month becomes a seven-day strip — the range a person actually
 * moves between, at the size a phone can spend on it.
 */
import * as React from "react";

import { LuInbox, LuSettings, LuTarget, LuX } from "react-icons/lu";

import { DOW, MONTHS } from "@/lib/needt/fixture";

import { Glyph } from "../shell/chrome";
import {
  DAY_STRIP_CELL,
  HEADER_BUTTON_SIZE,
  mobileDayStrip,
} from "./mobile-logic";

export interface MobileHeaderProps {
  today: Date;
  selectedDay: number;
  onSelectDay: (dayOfMonth: number) => void;
  focusOn: boolean;
  onToggleFocus: () => void;
  queueCount: number;
  onOpenQueue: () => void;
  settingsOn: boolean;
  onToggleSettings: () => void;
}

function HeaderButton({
  onClick,
  label,
  active,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: HEADER_BUTTON_SIZE,
        minWidth: HEADER_BUTTON_SIZE,
        padding: "0 12px",
        border: 0,
        cursor: "default",
        borderRadius: "var(--radius-floating)",
        background: active ? "var(--fill-accent)" : "var(--surface-raised)",
        boxShadow: active ? "none" : "var(--shadow-raised)",
        color: active ? "var(--accent)" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

export function MobileHeader({
  today,
  selectedDay,
  onSelectDay,
  focusOn,
  onToggleFocus,
  queueCount,
  onOpenQueue,
  settingsOn,
  onToggleSettings,
}: MobileHeaderProps) {
  const strip = mobileDayStrip(today);

  return (
    <header
      style={{
        flex: "none",
        display: "flex",
        flexDirection: "column",
        gap: 11,
        padding: "8px 16px 11px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        <span
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            className="display"
            style={{
              fontSize: 40,
              lineHeight: 0.85,
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {today.getDate()}
          </span>
          <span
            className="display"
            style={{
              fontSize: 17,
              lineHeight: 1.2,
              color: "var(--text-tertiary)",
            }}
          >
            {MONTHS[today.getMonth()]}
          </span>
        </span>

        {queueCount ? (
          <HeaderButton onClick={onOpenQueue} label={`${queueCount} unplaced`}>
            <Glyph of={LuInbox} size={16} />
            <span
              style={{
                font: "var(--type-ui-medium)",
                color: "var(--text-primary)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {queueCount}
            </span>
          </HeaderButton>
        ) : null}

        <HeaderButton
          onClick={onToggleSettings}
          label={settingsOn ? "Back" : "Settings"}
          active={settingsOn}
        >
          <Glyph of={settingsOn ? LuX : LuSettings} size={16} />
        </HeaderButton>

        {/* Focus lives in the header on a phone: the one control that must
            stay visible while the screen underneath changes. */}
        <HeaderButton onClick={onToggleFocus} label="Focus" active={focusOn}>
          <Glyph of={LuTarget} size={16} />
          <span style={{ font: "var(--type-ui-medium)" }}>
            {focusOn ? "47:56" : "Focus"}
          </span>
        </HeaderButton>
      </div>

      <div
        className="mb-strip"
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          margin: "0 -16px",
          padding: "0 16px",
        }}
      >
        {strip.map((day) => {
          const on = day.dayOfMonth === selectedDay;
          return (
            <button
              key={day.date.toISOString()}
              type="button"
              onClick={() => onSelectDay(day.dayOfMonth)}
              style={{
                flex: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                width: DAY_STRIP_CELL.width,
                height: DAY_STRIP_CELL.height,
                border: 0,
                cursor: "default",
                borderRadius: "var(--radius-lg)",
                background: on ? "var(--fill-accent)" : "transparent",
                boxShadow: on ? "none" : "var(--shadow-inset-ring)",
              }}
            >
              <span
                style={{
                  font: "var(--type-meta)",
                  color: on ? "var(--accent)" : "var(--text-quaternary)",
                }}
              >
                {DOW[day.date.getDay()]}
              </span>
              <span
                style={{
                  font: "var(--weight-medium) 15px / 18px var(--font-sans)",
                  fontVariantNumeric: "tabular-nums",
                  color: on
                    ? "var(--accent)"
                    : day.isToday
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                }}
              >
                {day.dayOfMonth}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
