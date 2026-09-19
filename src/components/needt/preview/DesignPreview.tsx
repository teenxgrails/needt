"use client";

/* THE JUDGING SURFACE.
 *
 * The ported shell on the fixture, with no sign-in and no database, so it can
 * be opened next to the prototype and compared frame for frame. Anything wrong
 * here is the port, not the data.
 *
 * `data-theme-pinned` keeps the app's own theme from being mirrored onto this
 * scope, so the picker below is what decides the ground. `.needt-v2` is what
 * scopes the vendored tokens and the vendored motion layer. The shared
 * `NeedtPicker` is the deliberate exception to the otherwise separate UI
 * primitives: the product has one picker, and the port supplies its trigger
 * class inside this scope.
 *
 * A NOTE FOR ANYONE VERIFYING MOTION FROM AN AUTOMATED BROWSER: the Claude
 * Code preview pane injects `data-animations="off"` on <html>, and
 * `html[data-animations="off"] *` zeroes every animation. Nothing in this
 * repository writes that attribute and the server never sends it, so a
 * computed `animation-name: none` measured there proves nothing. Check that
 * the elements MATCH the motion rules' selectors instead, by walking
 * `document.styleSheets`.
 */
import * as React from "react";

import { fixtureToday } from "@/lib/needt/adapter";
import { people, projects, stages, tasks } from "@/lib/needt/fixture";
import type { NeedtTask } from "@/lib/needt/types";

import { CalendarScreen, type CalendarView } from "../calendar";
import { type CoDraft, Composer } from "../composer";
import { NeedtCorner } from "../corner";
import { AgentCursor, placeFirstUnplaced, startFocus } from "../cursor";
import type { AgentCursorHandle } from "../cursor";
import { CommandPalette, TaskDialog } from "../dialogs";
import { DocsScreen } from "../docs";
import { Home } from "../home";
import { MobileShell } from "../mobile";
import { SettingsScreen } from "../settings";
import { AppShell } from "../shell";
import type { PinnedDoc, ShellAccount } from "../shell";
import { WorkspaceScreen } from "../workspace";

/** The themes the new design ships. `system` resolves elsewhere; this picks one. */
const THEMES = ["paper", "warm", "dim", "dark"] as const;

/** Calendar's own modes. The shell knows screens; a screen knows its views. */
const CALENDAR_VIEWS = [
  "day",
  "week",
  "month",
  "columns",
  "sequence",
] as const satisfies readonly CalendarView[];
type PreviewTheme = (typeof THEMES)[number];

/** Documents pinned into the rail. Composition, not data — see `fixture.ts`. */
const PINNED: readonly PinnedDoc[] = [
  { id: "launch", title: "Launch brief — September" },
  { id: "rules", title: "Needt design rules" },
];

const ACCOUNT: ShellAccount = {
  name: "Maks",
  initials: "MK",
  email: "you@needt.app",
};

export function DesignPreview() {
  const [theme, setTheme] = React.useState<PreviewTheme>("paper");
  /* The preview has no store, so what the composer makes is reported rather
     than saved. A stub that pretended to save would be worse than a line of
     text that says what was parsed. */
  const [made, setMade] = React.useState<CoDraft | null>(null);

  const cycleTheme = React.useCallback(() => {
    setTheme(
      (current) => THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]
    );
  }, []);

  const dark = theme === "dark" || theme === "dim";

  /* Calendar holds its own view. The shell knows about screens, not about a
     screen's modes, which is why this lives here rather than in `AppShell`. */
  const [calendarView, setCalendarView] = React.useState<CalendarView>("week");

  /* The task editor is a surface, not a screen: it opens over whatever is
     showing. The preview has no store, so a save closes it and changes
     nothing — a stub that pretended to persist would be worse than nothing. */
  const [editing, setEditing] = React.useState<NeedtTask | null>(null);

  /* The phone is a second shell, not a screen inside the first, so it replaces
     the desktop rather than sitting in a slot. 402x874 is the design's own
     device, drawn at size. */
  const [phone, setPhone] = React.useState(false);

  /* THE HAND. No model is wired: these play scripted runs against the fixture
     so the reach, the press and the margin mark can be watched. The seam they
     go through is the one a model will use. */
  const hand = React.useRef<AgentCursorHandle | null>(null);
  const play = React.useCallback(
    (run: ReturnType<typeof startFocus> | null) => {
      if (run) void hand.current?.run(run);
    },
    []
  );

  return (
    <div
      className="needt-v2"
      data-theme={theme}
      data-theme-pinned=""
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--background)",
        color: "var(--text-primary)",
        font: "var(--type-ui)",
      }}
    >
      {/* The picker is the preview's own chrome, not the product's. It sits
          above the shell rather than inside it so it cannot be mistaken for
          part of the rail. */}
      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: 44,
          padding: "0 16px",
          boxShadow: "var(--border) 0 -1px 0 0 inset",
        }}
      >
        {THEMES.map((name) => (
          <button
            key={name}
            type="button"
            className={
              theme === name ? "chip nt-chip is-accent" : "chip nt-chip"
            }
            aria-pressed={theme === name}
            onClick={() => setTheme(name)}
            style={{ cursor: "default" }}
          >
            {name}
          </button>
        ))}
        <span style={{ display: "flex", gap: 6, marginLeft: 16 }}>
          <button
            type="button"
            className="chip nt-chip"
            onClick={() => play(placeFirstUnplaced(tasks, fixtureToday))}
            style={{ cursor: "default" }}
          >
            watch it place one
          </button>
          <button
            type="button"
            className="chip nt-chip"
            onClick={() => play(startFocus(tasks))}
            style={{ cursor: "default" }}
          >
            watch it start a session
          </button>
        </span>

        <button
          type="button"
          className={phone ? "chip nt-chip is-accent" : "chip nt-chip"}
          aria-pressed={phone}
          onClick={() => setPhone((on) => !on)}
          style={{ cursor: "default", marginLeft: 16 }}
        >
          phone
        </button>

        <span
          style={{
            marginLeft: "auto",
            font: "var(--type-meta)",
            color: "var(--text-muted)",
          }}
        >
          {made
            ? `Captured: ${made.kind} · ${made.title}`
            : "? for the keyboard · ⌘⇧L cycles the theme"}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: phone ? "grid" : "block",
          placeItems: phone ? "center" : undefined,
          overflow: phone ? "auto" : undefined,
          padding: phone ? 24 : 0,
        }}
      >
        {phone ? (
          <div
            style={{
              width: 402,
              height: 874,
              flex: "none",
              borderRadius: "var(--radius-4xl)",
              overflow: "hidden",
              boxShadow: "var(--shadow-sheet)",
            }}
          >
            <MobileShell tasks={tasks} now={fixtureToday} />
          </div>
        ) : (
          <AppShell
            today={fixtureToday}
            tasks={tasks}
            people={people}
            pinned={PINNED}
            account={ACCOUNT}
            dark={dark}
            onCycleTheme={cycleTheme}
            screenSlots={{
              today: <Home tasks={tasks} now={fixtureToday} />,
              workspace: (
                <WorkspaceScreen
                  tasks={tasks}
                  people={people}
                  projects={projects}
                  stages={stages}
                  dark={dark}
                />
              ),
              docs: <DocsScreen projects={projects} />,
              settings: (
                <SettingsScreen
                  accountName={ACCOUNT.name}
                  accountEmail={ACCOUNT.email}
                  accountInitials={ACCOUNT.initials}
                />
              ),
              calendar: (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    minHeight: 0,
                    flex: 1,
                  }}
                >
                  {/* `CalendarScreen` draws a view; choosing between them belongs
                    to whoever owns the screen's state. */}
                  <span style={{ flex: "none", display: "flex", gap: 4 }}>
                    {CALENDAR_VIEWS.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className={
                          calendarView === name
                            ? "chip nt-chip is-accent"
                            : "chip nt-chip"
                        }
                        aria-pressed={calendarView === name}
                        onClick={() => setCalendarView(name)}
                        style={{ cursor: "default" }}
                      >
                        {name}
                      </button>
                    ))}
                  </span>
                  <CalendarScreen
                    view={calendarView}
                    entries={tasks}
                    today={fixtureToday}
                    dark={dark}
                  />
                </div>
              ),
            }}
            cornerSlot={<NeedtCorner />}
            onOpenTask={setEditing}
            commandPaletteSlot={({ open, onClose }) => (
              <CommandPalette
                open={open}
                onClose={onClose}
                tasks={tasks}
                docs={PINNED}
                onAction={() => undefined}
                onSelectTask={setEditing}
              />
            )}
            agentCursorSlot={
              <AgentCursor
                onReady={(ready) => {
                  hand.current = ready;
                }}
              />
            }
            /* The prototype's own accelerated clock: a minute every fifth of a
             second, so the focus fill and the breathing ring can be judged
             without waiting out fifty real minutes. */
            focusTickMs={200}
            composerSlot={({ open, onClose }) => (
              <Composer
                open={open}
                onClose={onClose}
                now={fixtureToday}
                onCreate={setMade}
              />
            )}
          />
        )}
      </div>

      {editing ? (
        <TaskDialog
          open
          task={editing}
          projects={projects}
          people={people}
          onClose={() => setEditing(null)}
          onSave={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
