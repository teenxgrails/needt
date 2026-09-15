"use client";

/* THE MINIATURE — a real screen of the product, drawn small.
 *
 * Ported from `Content height and label fixes/needt-app/Miniature.jsx`. Every
 * thumbnail in the kit used to be a grey bar diagram: a rail, three dashes,
 * two rounded rectangles. It read as a wireframe of something, and a person
 * choosing a theme or a default view is not choosing a wireframe.
 *
 * So this draws the actual screen — the rail with its wordmark and nav rows,
 * a header with its own toggle, real cards with project tiles, an hour grid
 * with a now-line — at FULL SIZE (320×206) and then scales it down with
 * `transform: scale(width / 320)`. Text at 10px scaled to 0.41 is 4px:
 * unreadable, but shaped exactly like type, which is what a screenshot looks
 * like at thumbnail size. Grey bars never look like that.
 *
 * ONE COMPONENT FOR EVERY THUMBNAIL IN THE PRODUCT — the themes in Settings,
 * the default-view step in setup, the brief's three forms. Five
 * implementations of "a small picture of a screen" is five chances to look
 * like five different products, which is exactly the failure this component
 * exists to end. Settings and Auth import this directly; its props are the
 * whole contract.
 */
import * as React from "react";

import { project } from "@/lib/needt/derive";
import { projects as fixtureProjects } from "@/lib/needt/fixture";
import type { ResolvedThemeMode } from "@/types/settings";

/** The screen's own canvas. Everything inside is authored at these sizes;
 * only the frame around it scales. */
export const MINIATURE_WIDTH = 320;
export const MINIATURE_HEIGHT = 206;

/** The five grounds this component knows how to draw. */
export type MiniatureKind = "day" | "columns" | "grid" | "prose" | "canvas";

export interface MiniatureProps {
  /** Which ground to draw. */
  kind: MiniatureKind;
  /** A theme to pin this instance to, independent of the page around it.
   * Omit to inherit whatever `.needt-v2` scope it is mounted inside. */
  theme?: ResolvedThemeMode;
  /** Rendered width in px. Defaults to 112 — the size the settings list uses. */
  width?: number;
  /** Defaults to the aspect ratio of the real screen. */
  height?: number;
  /** Two themes, one screen, cut down the middle by `clip-path` — two
   * full-width layers so the rail and the blocks continue across the cut
   * instead of being drawn twice from the left edge. */
  half?: readonly [ResolvedThemeMode, ResolvedThemeMode];
}

function miHue(name: string): string {
  return project(name, fixtureProjects)?.hue ?? "var(--text-disabled)";
}

/** A line of type. Real text is drawn where the screen has text — at this
 * scale it renders as the grey rhythm of a sentence, which is what the eye
 * is actually matching against. */
function MiText({
  children,
  size,
  weight,
  ink,
  width,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: number;
  ink?: string;
  width?: number;
}) {
  return (
    <span
      style={{
        display: "block",
        maxWidth: width,
        font: `${weight ?? 400} ${size ?? 10}px/1.35 var(--font-sans)`,
        color: ink ?? "var(--text-primary)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/** The project tile at miniature scale: the same squircle, the same one step
 * of lift, because it is the single most recognisable object here. */
function MiTile({ hue, size }: { hue: string; size?: number }) {
  const s = size ?? 14;
  return (
    <span
      aria-hidden="true"
      style={{
        flex: "none",
        width: s,
        height: s,
        borderRadius: Math.round(s * 0.3),
        background: `linear-gradient(180deg, color-mix(in oklab, ${hue} 90%, white), color-mix(in oklab, ${hue} 96%, black))`,
        boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.14)",
      }}
    />
  );
}

function MiCard({
  title,
  meta,
  hue,
  wide,
}: {
  title: string;
  meta?: string;
  hue: string;
  wide?: number;
}) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 7px",
        borderRadius: 7,
        background: "var(--surface-raised)",
        boxShadow: "var(--shadow-ring)",
        minWidth: 0,
        width: wide,
      }}
    >
      <MiTile hue={hue} size={13} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <MiText size={9.5} weight={500}>
          {title}
        </MiText>
      </span>
      {meta ? (
        <MiText size={9} ink="var(--text-quaternary)">
          {meta}
        </MiText>
      ) : null}
    </span>
  );
}

/** The rail. Present in every miniature, because it is present in every real
 * screen and it is the first thing the eye uses to recognise the product. */
function MiRail() {
  const rows: readonly [string, boolean][] = [
    ["Home", true],
    ["Calendar", false],
    ["Workspace", false],
    ["Docs", false],
  ];
  const projectRows = ["Operations", "Design system", "Resale"];
  return (
    <span
      style={{
        flex: "none",
        width: 74,
        display: "flex",
        flexDirection: "column",
        gap: 7,
        padding: "9px 7px",
        background: "var(--surface-raised)",
        boxShadow: "var(--border) -1px 0 0 0 inset",
      }}
    >
      <span style={{ display: "block", padding: "0 2px 2px" }}>
        <span
          style={{
            font: "600 13px/1 var(--font-sans)",
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}
        >
          Needt
        </span>
      </span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          height: 15,
          padding: "0 5px",
          borderRadius: 5,
          background: "var(--fill-2)",
          boxShadow: "var(--shadow-inset-ring)",
        }}
      >
        <MiText size={9} ink="var(--text-disabled)">
          Find
        </MiText>
      </span>
      {rows.map(([label, on]) => (
        <span
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            height: 15,
            padding: "0 5px",
            borderRadius: 5,
            background: on ? "var(--fill-accent)" : "transparent",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 2,
              background: on ? "var(--accent)" : "var(--fill-5)",
            }}
          />
          <MiText size={9} weight={on ? 500 : 400} ink={on ? "var(--accent)" : "var(--text-tertiary)"}>
            {label}
          </MiText>
        </span>
      ))}
      <span style={{ paddingTop: 3 }}>
        <MiText size={8} weight={500} ink="var(--text-quaternary)">
          PROJECTS
        </MiText>
      </span>
      {projectRows.map((name) => (
        <span
          key={name}
          style={{ display: "flex", alignItems: "center", gap: 5, height: 13, padding: "0 5px" }}
        >
          <span style={{ width: 5, height: 5, borderRadius: 3, background: miHue(name) }} />
          <MiText size={9} ink="var(--text-tertiary)">
            {name}
          </MiText>
        </span>
      ))}
    </span>
  );
}

function MiHeader({
  title,
  tabs,
  on,
}: {
  title: string;
  tabs?: readonly string[];
  on?: string;
}) {
  return (
    <span style={{ flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "9px 11px 7px" }}>
      <MiText size={13} weight={600}>
        {title}
      </MiText>
      {tabs ? (
        <span
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 2,
            padding: 2,
            borderRadius: 999,
            background: "var(--fill-2)",
          }}
        >
          {tabs.map((t) => (
            <span
              key={t}
              style={{
                padding: "2px 6px",
                borderRadius: 999,
                background: t === on ? "var(--fill-accent)" : "transparent",
              }}
            >
              <MiText size={8.5} weight={500} ink={t === on ? "var(--accent)" : "var(--text-muted)"}>
                {t}
              </MiText>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

/* ── The five grounds ─────────────────────────────────────────────────── */

function MiDay() {
  const habits: readonly [string, boolean][] = [
    ["German", true],
    ["Walk", true],
    ["Gym", false],
  ];
  return (
    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7, padding: "0 11px 11px" }}>
      <span style={{ display: "flex", gap: 4 }}>
        {habits.map(([n, on]) => (
          <span
            key={n}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              height: 17,
              padding: "0 7px 0 5px",
              borderRadius: 999,
              background: "var(--surface-raised)",
              boxShadow: "var(--shadow-ring)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                background: on ? "var(--accent)" : "transparent",
                boxShadow: on ? "none" : "inset 0 0 0 1px var(--text-disabled)",
              }}
            />
            <MiText size={9}>{n}</MiText>
          </span>
        ))}
      </span>
      <span style={{ flex: 1, minHeight: 0, display: "flex", gap: 9 }}>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
          <MiText size={9} weight={500} ink="var(--accent)">
            Today
          </MiText>
          <MiCard title="Draft the launch brief" meta="90m" hue={miHue("Operations")} />
          <MiCard title="Review the spec" meta="60m" hue={miHue("Design system")} />
          <MiCard title="German — unit 4" meta="60m" hue={miHue("German")} />
          <MiCard title="Ship the camera body" meta="45m" hue={miHue("Resale")} />
        </span>
      </span>
    </span>
  );
}

function MiColumns() {
  const cols: readonly [string, readonly [string, string][]][] = [
    ["Today", [["Draft the launch brief", "Operations"], ["Reply to the buyer", "Resale"]]],
    [
      "Tomorrow",
      [
        ["Sign the quote", "Operations"],
        ["Landing copy", "Design system"],
        ["Archive August", "Life"],
      ],
    ],
    ["Thursday", [["German — unit 5", "German"]]],
  ];
  return (
    <span style={{ flex: 1, minWidth: 0, display: "flex", gap: 7, padding: "0 11px 11px", overflow: "hidden" }}>
      {cols.map(([day, items]) => (
        <span key={day} style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
          <MiText size={9} weight={500} ink={day === "Today" ? "var(--accent)" : "var(--text-quaternary)"}>
            {day}
          </MiText>
          {items.map(([t, p]) => (
            <MiCard key={t} title={t} hue={miHue(p)} />
          ))}
        </span>
      ))}
    </span>
  );
}

function MiGrid() {
  const hours = [9, 10, 11, 12, 13];
  const blocks: readonly { at: number; h: number; title: string; p: string; event?: boolean }[] = [
    { at: 0.2, h: 26, title: "Draft the brief", p: "Operations" },
    { at: 1.6, h: 16, title: "1:1 Anna", p: "Design system", event: true },
    { at: 2.6, h: 30, title: "Print files", p: "Resale" },
  ];
  const row = 26;
  return (
    <span style={{ position: "relative", flex: 1, minWidth: 0, display: "block", padding: "0 11px 11px", overflow: "hidden" }}>
      {hours.map((h, i) => (
        <span key={h} style={{ position: "absolute", left: 11, right: 11, top: i * row, borderTop: "1px solid var(--border)" }}>
          <span style={{ position: "absolute", left: 0, top: -5 }}>
            <MiText size={8} ink="var(--text-disabled)">
              {h}:00
            </MiText>
          </span>
        </span>
      ))}
      {blocks.map((b) => (
        <span
          key={b.title}
          style={{
            position: "absolute",
            left: 36,
            right: 14,
            top: b.at * row + 2,
            height: b.h,
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "0 6px",
            borderRadius: 6,
            background: b.event
              ? `color-mix(in oklab, ${miHue(b.p)} 15%, var(--surface-raised))`
              : "var(--surface-raised)",
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${miHue(b.p)} 40%, transparent), var(--shadow-ring)`,
          }}
        >
          <MiTile hue={miHue(b.p)} size={11} />
          <MiText size={9} weight={500}>
            {b.title}
          </MiText>
        </span>
      ))}
      {/* The now-line: the one mark that says this is a live day. */}
      <span style={{ position: "absolute", left: 30, right: 11, top: 2.15 * row, borderTop: "1px solid var(--accent)" }}>
        <span style={{ position: "absolute", left: -2, top: -2.5, width: 5, height: 5, borderRadius: 3, background: "var(--accent)" }} />
      </span>
    </span>
  );
}

function MiProse() {
  const open: readonly [string, boolean][] = [
    ["Ask counsel for a date", true],
    ["Send the print files", false],
  ];
  return (
    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6, padding: "0 22px 11px" }}>
      <MiText size={14} weight={600}>
        Week 36 — the September batch
      </MiText>
      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <MiText size={9.5} ink="var(--text-secondary)">
          Legal sign-off is the only thing between us
        </MiText>
        <MiText size={9.5} ink="var(--text-secondary)">
          and the factory. Everything else is placed.
        </MiText>
        <MiText size={9.5} ink="var(--accent)">
          Three tasks are unplaced and 18 hours are open.
        </MiText>
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 2 }}>
        {open.map(([t, done]) => (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: done ? "var(--accent)" : "transparent",
                boxShadow: done ? "none" : "inset 0 0 0 1px var(--text-disabled)",
              }}
            />
            <MiText size={9.5} ink={done ? "var(--text-muted)" : "var(--text-primary)"}>
              {t}
            </MiText>
          </span>
        ))}
      </span>
    </span>
  );
}

function MiCanvas() {
  return (
    <span style={{ position: "relative", flex: 1, minWidth: 0, display: "block", padding: "0 11px 11px" }}>
      <span style={{ position: "absolute", left: 14, top: 2 }}>
        <MiText size={13} weight={600}>
          Week 36
        </MiText>
      </span>
      <span style={{ position: "absolute", left: 14, top: 22, width: 96 }}>
        <MiCard title="Print files" hue={miHue("Operations")} />
      </span>
      <span style={{ position: "absolute", left: 14, top: 46, width: 110 }}>
        <MiText size={9.5} ink="var(--text-secondary)">
          Legal sign-off is the only thing
        </MiText>
      </span>
      <span
        style={{
          position: "absolute",
          right: 16,
          top: 10,
          width: 62,
          height: 44,
          borderRadius: 6,
          background: "var(--fill-3)",
          boxShadow: "var(--shadow-ring)",
        }}
      />
      <span style={{ position: "absolute", right: 22, top: 62, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <span style={{ font: "400 22px/1 var(--font-display, var(--font-sans))", color: "var(--text-primary)" }}>18 h</span>
        <MiText size={8.5} ink="var(--text-muted)">
          free this week
        </MiText>
      </span>
      <svg style={{ position: "absolute", left: 18, top: 66 }} width="70" height="26" viewBox="0 0 260 130" fill="none">
        <path
          d="M20 100 C 60 24, 120 118, 168 60 S 230 20, 250 48"
          stroke="var(--text-quaternary)"
          strokeWidth="9"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

const MI_KINDS: Readonly<Record<MiniatureKind, React.ComponentType>> = {
  day: MiDay,
  columns: MiColumns,
  grid: MiGrid,
  prose: MiProse,
  canvas: MiCanvas,
};

const MI_TITLES: Readonly<Record<MiniatureKind, string>> = {
  day: "Home",
  columns: "Calendar",
  grid: "Calendar",
  prose: "Home",
  canvas: "Home",
};

const MI_TABS: Readonly<Record<MiniatureKind, readonly [readonly string[], string] | undefined>> = {
  day: [["Today", "Prose", "Canvas"], "Today"],
  prose: [["Today", "Prose", "Canvas"], "Prose"],
  canvas: [["Today", "Prose", "Canvas"], "Canvas"],
  columns: [["Columns", "Week", "Month"], "Columns"],
  grid: [["Columns", "Week", "Month"], "Week"],
};

/**
 * The screen at full size, then scaled to whatever the thumbnail is. The
 * scale is the whole trick: everything inside is authored at the real sizes
 * the product uses, so what shrinks is a screen rather than a diagram.
 *
 *   <Miniature kind="day" theme="dark" width={112} />
 */
export function Miniature({ kind, theme, width, height, half }: MiniatureProps) {
  const Body = MI_KINDS[kind] ?? MiDay;
  const w = width ?? 112;
  const h = height ?? Math.round(w * (MINIATURE_HEIGHT / MINIATURE_WIDTH));
  const tabs = MI_TABS[kind];

  const screen = (
    <span
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: MINIATURE_WIDTH,
        height: MINIATURE_HEIGHT,
        display: "flex",
        transform: `scale(${w / MINIATURE_WIDTH})`,
        transformOrigin: "0 0",
        background: "var(--background)",
      }}
    >
      <MiRail />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <MiHeader title={MI_TITLES[kind] ?? "Home"} tabs={tabs?.[0]} on={tabs?.[1]} />
        <Body />
      </span>
    </span>
  );

  /* A pair of themes in one frame: the same screen, cut down the middle, so
     the rail and the blocks continue across the cut instead of being drawn
     twice from the left edge. Two full-width layers, clipped. */
  if (half) {
    return (
      <span
        style={{
          position: "relative",
          display: "block",
          width: w,
          height: h,
          overflow: "hidden",
          borderRadius: "var(--radius-lg)",
        }}
      >
        {half.map((t, i) => (
          <span
            key={i}
            className="needt-v2"
            data-theme={t}
            data-theme-pinned=""
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--background)",
              clipPath: i === 0 ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)",
            }}
          >
            {screen}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span
      className={theme ? "needt-v2" : undefined}
      data-theme={theme}
      data-theme-pinned={theme ? "" : undefined}
      style={{
        position: "relative",
        display: "block",
        width: w,
        height: h,
        overflow: "hidden",
        borderRadius: "var(--radius-lg)",
        background: "var(--background)",
      }}
    >
      {screen}
    </span>
  );
}
