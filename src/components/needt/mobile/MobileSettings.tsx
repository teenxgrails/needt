"use client";

/* SETTINGS — the desktop's own sections, as a phone list that opens in
 * place.
 *
 * Ported from `Mobile.jsx`'s `MbSettings`. A phone cannot hold a two-pane
 * settings screen, so each section becomes a row that expands rather than a
 * page of its own — but the values inside are the same objects, not a
 * second setting that happens to read the same: the theme pick reuses
 * `ThemeThumb` (`../auth`) so a theme is still chosen by looking at a real
 * running miniature, never a colour swatch; "Shortcuts" opens the shared
 * `KeySheet` (`../shell`) — the one table that drives the handler and the
 * printed sheet, per PORT.md §5 — rather than a second, phone-only list of
 * the same keys.
 */
import * as React from "react";

import type { IconType } from "react-icons";
import {
  LuCalendarDays,
  LuChevronRight,
  LuClock,
  LuCommand,
  LuFlag,
  LuLogOut,
  LuSun,
  LuUser,
} from "react-icons/lu";

import { calendars as fixtureCalendars } from "@/lib/needt/fixture";

import type { ResolvedThemeMode, SystemThemePair } from "@/types/settings";

import { ThemeThumb, Toggle } from "../auth";
import { KeySheet } from "../shell/KeySheet";
import { Glyph } from "../shell/chrome";
import { SETTINGS_ROW_MIN_HEIGHT } from "./mobile-logic";

export type MobileRailLanguage = "movability" | "urgency";

/** "System" resolves for neither light nor dark preference on this screen —
 * the phone appearance grid only offers the four fixed themes, matching
 * `Mobile.jsx`'s own `["paper", "warm", "dim", "dark"]`. */
const NO_SYSTEM_PAIR: SystemThemePair = { light: "paper", dark: "dark" };

interface SettingsSectionDef {
  id: string;
  label: string;
  glyph: IconType;
  note: string;
}

const SECTIONS: readonly SettingsSectionDef[] = [
  {
    id: "appearance",
    label: "Appearance",
    glyph: LuSun,
    note: "Theme, drift, density",
  },
  {
    id: "day",
    label: "Your day",
    glyph: LuClock,
    note: "Working hours, buffers",
  },
  {
    id: "rail",
    label: "Rail language",
    glyph: LuFlag,
    note: "What the coloured edge means",
  },
  {
    id: "calendars",
    label: "Calendars",
    glyph: LuCalendarDays,
    note: "What already owns your time",
  },
  {
    id: "keys",
    label: "Shortcuts",
    glyph: LuCommand,
    note: "Every key, on one page",
  },
  { id: "account", label: "Account", glyph: LuUser, note: "Sign out" },
];

const RAIL_OPTIONS: readonly {
  id: MobileRailLanguage;
  label: string;
  note: string;
}[] = [
  {
    id: "movability",
    label: "Movability",
    note: "Grey is fixed; the project's colour means the scheduler placed it and can move it again.",
  },
  {
    id: "urgency",
    label: "Urgency",
    note: "Red is overdue, then amber, then the accent — how much room is left before the deadline.",
  },
];

export interface MobileSettingsProps {
  theme: ResolvedThemeMode;
  onTheme: (theme: ResolvedThemeMode) => void;
  drift: boolean;
  onDrift: (on: boolean) => void;
  rail: MobileRailLanguage;
  onRail: (rail: MobileRailLanguage) => void;
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <span
      style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 36 }}
    >
      <span
        style={{
          flex: 1,
          font: "var(--type-ui)",
          color: "var(--text-primary)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          font: "var(--type-meta-medium)",
          color: "var(--text-secondary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </span>
  );
}

export function MobileSettings({
  theme,
  onTheme,
  drift,
  onDrift,
  rail,
  onRail,
}: MobileSettingsProps) {
  const [openId, setOpenId] = React.useState<string | null>("appearance");
  const [keysOpen, setKeysOpen] = React.useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "11px 16px 24px",
      }}
    >
      {SECTIONS.map((section) => {
        const open = openId === section.id;
        return (
          <section
            key={section.id}
            style={{
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-raised)",
              boxShadow: "var(--shadow-ring)",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() =>
                section.id === "keys"
                  ? setKeysOpen(true)
                  : setOpenId(open ? null : section.id)
              }
              aria-expanded={section.id === "keys" ? undefined : open}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                width: "100%",
                minHeight: SETTINGS_ROW_MIN_HEIGHT,
                padding: "0 13px",
                border: 0,
                cursor: "default",
                background: "transparent",
                textAlign: "left",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flex: "none",
                  display: "grid",
                  placeItems: "center",
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius-md)",
                  background: "var(--fill-2)",
                  color: "var(--text-secondary)",
                }}
              >
                <Glyph of={section.glyph} size={15} />
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span
                  style={{
                    font: "var(--type-ui-medium)",
                    color: "var(--text-primary)",
                  }}
                >
                  {section.label}
                </span>
                <span
                  style={{
                    font: "var(--type-meta)",
                    color: "var(--text-muted)",
                  }}
                >
                  {section.note}
                </span>
              </span>
              <span
                aria-hidden="true"
                style={{
                  flex: "none",
                  color: "var(--text-quaternary)",
                  transform: open ? "rotate(90deg)" : "none",
                  transition: "transform 0.2s ease",
                }}
              >
                <Glyph of={LuChevronRight} size={16} />
              </span>
            </button>

            {open ? (
              <div
                style={{
                  padding: "0 13px 13px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 11,
                }}
              >
                {section.id === "appearance" ? (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, minmax(0,1fr))",
                        gap: 6,
                      }}
                    >
                      {(["paper", "warm", "dim", "dark"] as const).map((id) => (
                        <ThemeThumb
                          key={id}
                          id={id}
                          label={id}
                          active={theme === id}
                          onPick={(picked) =>
                            onTheme(picked as ResolvedThemeMode)
                          }
                          pair={NO_SYSTEM_PAIR}
                        />
                      ))}
                    </div>
                    <span
                      onClick={() => onDrift(!drift)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 11,
                        minHeight: 40,
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <span
                          style={{
                            font: "var(--type-ui)",
                            color: "var(--text-primary)",
                          }}
                        >
                          Drift with the day
                        </span>
                        <span
                          style={{
                            font: "var(--type-meta)",
                            color: "var(--text-muted)",
                            textWrap: "pretty",
                          }}
                        >
                          Ground and contrast follow the sun. The accent never
                          moves.
                        </span>
                      </span>
                      <Toggle
                        checked={drift}
                        onChange={onDrift}
                        label="Drift with the day"
                      />
                    </span>
                  </>
                ) : null}

                {section.id === "rail" ? (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {RAIL_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onRail(option.id)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 9,
                          minHeight: 44,
                          padding: 9,
                          border: 0,
                          cursor: "default",
                          textAlign: "left",
                          borderRadius: "var(--radius-md)",
                          background:
                            rail === option.id
                              ? "var(--fill-accent)"
                              : "var(--fill-2)",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            flex: "none",
                            width: 3,
                            alignSelf: "stretch",
                            borderRadius: 2,
                            background:
                              rail === option.id
                                ? "var(--accent)"
                                : "var(--text-disabled)",
                          }}
                        />
                        <span
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              font: "var(--type-ui-medium)",
                              color:
                                rail === option.id
                                  ? "var(--accent)"
                                  : "var(--text-primary)",
                            }}
                          >
                            {option.label}
                          </span>
                          <span
                            style={{
                              font: "var(--type-meta)",
                              color: "var(--text-muted)",
                              textWrap: "pretty",
                            }}
                          >
                            {option.note}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {section.id === "day" ? (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <ValueRow label="Working hours" value="09:00 – 18:00" />
                    <ValueRow label="Buffer between blocks" value="10 min" />
                    <span
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 11,
                        minHeight: 40,
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          font: "var(--type-ui)",
                          color: "var(--text-primary)",
                        }}
                      >
                        Protect focus
                      </span>
                      <Toggle
                        checked
                        onChange={() => {}}
                        label="Protect focus"
                      />
                    </span>
                  </div>
                ) : null}

                {section.id === "calendars" ? (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {Object.entries(fixtureCalendars).map(([id, calendar]) => (
                      <span
                        key={id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          minHeight: 36,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            background: calendar.color,
                          }}
                        />
                        <span
                          style={{
                            flex: 1,
                            font: "var(--type-ui)",
                            color: "var(--text-primary)",
                          }}
                        >
                          {calendar.name}
                        </span>
                        <span
                          style={{
                            font: "var(--type-meta)",
                            color: "var(--text-muted)",
                          }}
                        >
                          connected
                        </span>
                      </span>
                    ))}
                  </div>
                ) : null}

                {section.id === "account" ? (
                  <button
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minHeight: 44,
                      padding: "0 11px",
                      border: 0,
                      cursor: "default",
                      borderRadius: "var(--radius-lg)",
                      background: "var(--fill-2)",
                      color: "var(--text-primary)",
                      font: "var(--type-ui-medium)",
                    }}
                  >
                    <Glyph of={LuLogOut} size={15} />
                    Sign out
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}

      <KeySheet open={keysOpen} onClose={() => setKeysOpen(false)} />
    </div>
  );
}
