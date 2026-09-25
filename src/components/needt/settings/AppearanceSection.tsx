"use client";

/* APPEARANCE — the one section with a picker instead of a row.
 *
 * PORT.md's own spec for this port: "The theme picker uses live `Miniature`s,
 * not coloured swatches — a real reduced screen. The System thumbnail is one
 * day cut down the middle... `Miniature` already supports this via its `half`
 * prop." `Miniature` is imported, not re-implemented — PORT.md §3 names it as
 * already built and says to import it.
 *
 * "Drift is a toggle over any theme, never a theme in the list. Theme is the
 * person's choice; drift is a property of the day. Put them in one list and
 * someone picks 'evening' at 9am." So drift lives in its own `Group`, below
 * the theme grid, never as a sixth thumbnail.
 *
 * `DriftPreview` below — six sun-timed readings of the paper — reads the real
 * `sunTimes`/`driftAt`/`DRIFT_STOPS`/`mixHex` from
 * `../interaction/drift/{sun,palette}.ts`, ported there from `Drift.jsx`
 * ahead of this file. It draws its own swatches rather than calling
 * `useDrift` per mark: that hook nudges one live shell to one instant, and a
 * preview strip wants six instants at once, none of them "now".
 */
import * as React from "react";

import { LuCheck } from "react-icons/lu";

import { newDate } from "@/lib/date-utils";

import type { ResolvedThemeMode } from "@/types/settings";

import { Miniature } from "../home/Miniature";
import { DRIFT_STOPS, mixHex } from "../interaction/drift/palette";
import { type SunTimes, driftAt, sunTimes } from "../interaction/drift/sun";
import { Glyph } from "../shell/chrome";
import { Group, Row, SSwitch } from "./fields";

export type SettingsThemeChoice = ResolvedThemeMode | "system";

export interface SystemThemePair {
  light: ResolvedThemeMode;
  dark: ResolvedThemeMode;
}

const THEMES: readonly { id: SettingsThemeChoice; label: string }[] = [
  { id: "paper", label: "Paper" },
  { id: "warm", label: "Warm" },
  { id: "dim", label: "Dim" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

const LIGHT_PAIR_OPTIONS: readonly ResolvedThemeMode[] = ["paper", "warm"];
const DARK_PAIR_OPTIONS: readonly ResolvedThemeMode[] = ["dim", "dark"];

/** Berlin, same as `useDrift`'s own placeholder — a preview needs *a* place
 *  before onboarding has asked for the real one, and the two should not
 *  quietly disagree. */
const PREVIEW_PLACE = { lat: 52.52, lon: 13.405 };

function fmt(hour: number): string {
  const h = Math.floor(((hour % 24) + 24) % 24);
  const m = Math.round((hour % 1) * 60);
  return `${String(h).padStart(2, "0")}:${String(Math.abs(m)).padStart(2, "0")}`;
}

/** A setting about the time of day cannot be judged in the moment it is
 *  switched on, so this shows the whole day at once: six readings of the
 *  same paper, taken at the hours the sun actually decides — not the clock's
 *  round numbers. */
function DriftPreview({
  theme,
  pair,
}: {
  theme: SettingsThemeChoice;
  pair: SystemThemePair;
}) {
  const t: SunTimes = sunTimes(newDate(), PREVIEW_PLACE.lat, PREVIEW_PLACE.lon);
  const dusk = t.dusk ?? t.sunset ?? 19;
  const marks: readonly [string, number][] = [
    ["dawn", t.dawn ?? t.sunrise ?? 6],
    ["sunrise", t.sunrise ?? 7],
    ["midday", t.noon],
    ["sunset", t.sunset ?? 18],
    ["dusk", dusk],
    ["night", dusk + 1.5],
  ];
  const base: ResolvedThemeMode = theme === "system" ? pair.light : theme;
  const wasLight = base === "paper" || base === "warm";

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 11 }}>
      {marks.map(([label, hour]) => {
        const levels = driftAt(hour, t);
        const shown = wasLight && levels.night > 0.5 ? pair.dark : base;
        const stop = DRIFT_STOPS[shown];
        const bg = mixHex(stop.bg, stop.bgWarm, levels.warm);
        const raised = mixHex(stop.raised, stop.raisedWarm, levels.warm);
        return (
          <span
            key={label}
            style={{ display: "flex", flexDirection: "column", gap: 5 }}
          >
            <span
              style={{
                display: "block",
                position: "relative",
                width: 76,
                height: 48,
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                background: bg,
                boxShadow: "var(--shadow-ring)",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 5,
                  top: 6,
                  right: 5,
                  height: 13,
                  borderRadius: 3,
                  background: raised,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: 5,
                  top: 6,
                  width: 2.5,
                  height: 13,
                  borderRadius: "2px 0 0 2px",
                  background: "var(--accent)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: 5,
                  top: 24,
                  right: 18,
                  height: 10,
                  borderRadius: 3,
                  background: raised,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: 5,
                  top: 38,
                  right: 30,
                  height: 5,
                  borderRadius: 3,
                  background: raised,
                  opacity: 0.7,
                }}
              />
            </span>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  font: "var(--type-meta)",
                  color: "var(--text-tertiary)",
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--text-disabled)",
                }}
              >
                {fmt(hour)}
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

function ThemeThumb({
  id,
  label,
  active,
  pair,
  onPick,
}: {
  id: SettingsThemeChoice;
  label: string;
  active: boolean;
  pair: SystemThemePair;
  onPick: (id: SettingsThemeChoice) => void;
}) {
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
          <Miniature kind="day" width={132} half={[pair.light, pair.dark]} />
        ) : (
          <Miniature kind="day" width={132} theme={id} />
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

/** The rail's one piece of colour language: what a coloured rail means. Shows
 *  both readings side by side rather than naming them in prose. */
function RailThumb({
  active,
  title,
  note,
  swatches,
  onPick,
}: {
  active: boolean;
  title: string;
  note: string;
  swatches: readonly [string, string][];
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className="card nt-card"
      data-interactive="true"
      aria-pressed={active}
      data-selected={active ? "true" : undefined}
      onClick={onPick}
      style={{
        flex: "1 1 0",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 11,
        textAlign: "left",
        cursor: "default",
        border: 0,
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {swatches.map(([color, name]) => (
          <span
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              height: 18,
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              background: "var(--fill-2)",
            }}
          >
            <span style={{ width: 3, height: "100%", background: color }} />
            <span
              style={{
                marginLeft: 6,
                font: "var(--type-meta)",
                color: "var(--text-quaternary)",
              }}
            >
              {name}
            </span>
          </span>
        ))}
      </span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          font: "var(--type-ui-medium)",
          color: "var(--text-primary)",
        }}
      >
        {active ? <Glyph of={LuCheck} size={13} /> : null}
        {title}
      </span>
      <span
        style={{
          font: "var(--type-meta)",
          color: "var(--text-muted)",
          textWrap: "pretty",
        }}
      >
        {note}
      </span>
    </button>
  );
}

function DensityThumb({
  active,
  label,
  rows,
  onPick,
}: {
  active: boolean;
  label: string;
  rows: readonly number[];
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className="thumb"
      aria-pressed={active}
      onClick={onPick}
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
        className="raised"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: rows.length > 4 ? 3 : 7,
          width: 96,
          height: 64,
          padding: "0 8px",
          boxShadow: active ? "var(--shadow-focus)" : "var(--shadow-raised)",
        }}
      >
        {rows.map((w, i) => (
          <span
            key={i}
            style={{
              height: 3,
              width: w,
              borderRadius: 2,
              background: i === 0 ? "var(--fill-6)" : "var(--fill-3)",
            }}
          />
        ))}
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

export type RailLanguage = "movability" | "urgency";
export type Density = "compact" | "standard";

export interface AppearanceValue {
  theme: SettingsThemeChoice;
  pair: SystemThemePair;
  drift: boolean;
  rail: RailLanguage;
  density: Density;
}

export interface AppearanceSectionProps {
  value: AppearanceValue;
  onChange: (next: Partial<AppearanceValue>) => void;
}

export function AppearanceSection({ value, onChange }: AppearanceSectionProps) {
  return (
    <>
      <Group title="Theme">
        <div style={{ display: "flex", gap: 11, flexWrap: "wrap" }}>
          {THEMES.map((t) => (
            <ThemeThumb
              key={t.id}
              id={t.id}
              label={t.label}
              active={value.theme === t.id}
              pair={value.pair}
              onPick={(theme) => onChange({ theme })}
            />
          ))}
        </div>
        {value.theme === "system" ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              paddingTop: 11,
            }}
          >
            <Row
              label="When light"
              hint="Which theme the OS's light mode uses."
            >
              <span style={{ display: "flex", gap: 8 }}>
                {LIGHT_PAIR_OPTIONS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={
                      value.pair.light === id
                        ? "chip nt-chip is-accent"
                        : "chip nt-chip"
                    }
                    aria-pressed={value.pair.light === id}
                    onClick={() =>
                      onChange({ pair: { ...value.pair, light: id } })
                    }
                  >
                    {id === "paper" ? "Paper" : "Warm"}
                  </button>
                ))}
              </span>
            </Row>
            <Row label="When dark" hint="And its dark mode.">
              <span style={{ display: "flex", gap: 8 }}>
                {DARK_PAIR_OPTIONS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={
                      value.pair.dark === id
                        ? "chip nt-chip is-accent"
                        : "chip nt-chip"
                    }
                    aria-pressed={value.pair.dark === id}
                    onClick={() =>
                      onChange({ pair: { ...value.pair, dark: id } })
                    }
                  >
                    {id === "dim" ? "Dim" : "Dark"}
                  </button>
                ))}
              </span>
            </Row>
          </div>
        ) : null}
      </Group>

      <Group title="Follow the day">
        <Row
          label="Follow the day"
          hint="The paper warms toward sunset and the dark side takes over after dusk. The accent never moves — a coloured rail means the same thing at 11:00 and at 21:00."
        >
          <SSwitch
            checked={value.drift}
            onChange={(drift) => onChange({ drift })}
          />
        </Row>
        {value.drift ? (
          <DriftPreview theme={value.theme} pair={value.pair} />
        ) : null}
      </Group>

      <Group title="Rail language">
        <div style={{ display: "flex", gap: 11 }}>
          <RailThumb
            active={value.rail === "movability"}
            title="Movability"
            note="Grey is fixed. Coloured means the scheduler placed it and can move it again."
            swatches={[
              ["var(--text-muted)", "Fixed"],
              ["var(--info)", "Placed by the scheduler"],
              ["var(--destructive)", "Overdue"],
            ]}
            onPick={() => onChange({ rail: "movability" })}
          />
          <RailThumb
            active={value.rail === "urgency"}
            title="Urgency"
            note="Red is overdue, blue is due today, grey is later. Movability moves to the block's weight."
            swatches={[
              ["var(--destructive)", "Overdue"],
              ["var(--info)", "Due today"],
              ["var(--text-muted)", "Later"],
            ]}
            onPick={() => onChange({ rail: "urgency" })}
          />
        </div>
      </Group>

      <Group title="Density">
        <div style={{ display: "flex", gap: 11 }}>
          <DensityThumb
            active={value.density === "compact"}
            label="Compact"
            rows={[54, 66, 44, 62, 50, 58]}
            onPick={() => onChange({ density: "compact" })}
          />
          <DensityThumb
            active={value.density === "standard"}
            label="Standard"
            rows={[54, 66, 44, 62]}
            onPick={() => onChange({ density: "standard" })}
          />
        </div>
      </Group>
    </>
  );
}
