"use client";

/* THE BLOCK, JUDGED — every weight, both grounds, and the height ladder shown
 * as a ladder so the collapse order can be read off a still.
 *
 * Everything here renders inside `.needt-v2`, which is the only scope where the
 * new design's tokens exist. Nothing on this page reaches for a shadcn
 * primitive: they read a different token set, and mixing the two is the failure
 * this port exists to end.
 */
import * as React from "react";

import { RichBlock } from "./RichBlock";
import { RB_HEADER, type RbWeight, rbLayout } from "./rb-layout";
import { type RbInput, rbFactSource, rbShape } from "./rb-shape";

type Theme = "paper" | "dark";

const CASES: {
  label: string;
  task: RbInput;
  weight: RbWeight;
  height: number | null;
}[] = [
  {
    label: "Open · now. Place, the scheduler's reason, a note.",
    weight: "open",
    height: null,
    task: {
      id: 1,
      title: "Anna's birthday — get the gift",
      done: false,
      project: "life",
      from: "12:35",
      to: "13:40",
      place: "Cedar",
      parts: [
        { title: "Pick the set", done: true },
        { title: "Wrap it", done: false },
        { title: "Write the card", done: false },
      ],
      reason: "Moved up: the shop shuts at six and the party is tomorrow",
      note: "She mentioned the ceramic set twice.",
    },
  },
  {
    label: "Open · a link, a preview, and the two-minute entry.",
    weight: "open",
    height: null,
    task: {
      id: 2,
      title: "Upgrade Slack",
      done: false,
      project: "ops",
      from: "15:00",
      to: "16:40",
      source: "slack",
      link: "app.slack.com/plans",
      entry: "Open the billing page",
      og: {
        site: "slack.com",
        mark: "slack",
        title: "Slack brings the team together",
      },
    },
  },
  {
    label: "Open · fixed, so it wears a 1.5px edge and a lock.",
    weight: "open",
    height: null,
    task: {
      id: 3,
      title: "Team meeting",
      done: false,
      project: "ops",
      from: "10:00",
      to: "11:40",
      movable: false,
      source: "google",
      place: "Pelican 21",
      reserve: { state: "ok", text: "You put this here" },
    },
  },
  {
    label: "Open · you placed it, so it states its reserve.",
    weight: "open",
    height: null,
    task: {
      id: 4,
      title: "German — B2 unit 4",
      done: false,
      project: "german",
      from: "19:00",
      to: "20:00",
      movable: false,
      reserve: { state: "tight", text: "2 h 30 min of slack before Friday" },
    },
  },
  {
    label: "Open · overdue. Red, and the line says it is late.",
    weight: "open",
    height: null,
    task: {
      id: 5,
      title: "Reply to counsel",
      done: false,
      project: "ops",
      from: "11:00",
      to: "11:30",
      overdue: true,
      risk: "Three days late",
    },
  },
  {
    label: "Open · a money task. Listed, and what came in.",
    weight: "open",
    height: null,
    task: {
      id: 6,
      title: "Ship the camera body",
      done: false,
      project: "resale",
      from: "20:15",
      to: "21:00",
      value: 1200,
      earned: 400,
      movedFrom: "Tuesday",
    },
  },
  {
    label: "Compressed · 44px. One line, then the time.",
    weight: "compressed",
    height: 44,
    task: {
      id: 7,
      title: "Hubstaff broadcast",
      done: false,
      project: "ds",
      from: "17:30",
      to: "18:40",
      source: "linear",
    },
  },
  {
    label: "Compressed · fixed, and closed.",
    weight: "compressed",
    height: 44,
    task: {
      id: 8,
      title: "German — B2 unit 4",
      done: true,
      project: "german",
      from: "19:00",
      to: "20:00",
      movable: false,
    },
  },
  {
    label: "Declined · it keeps the slot and says nothing.",
    weight: "declined",
    height: 38,
    task: { id: 9, title: "Declined", done: false, from: "16:25", to: "17:00" },
  },
  {
    label: "Open · no project. A state with a colour of its own.",
    weight: "open",
    height: null,
    task: {
      id: 10,
      title: "Something nobody filed",
      done: false,
      age: 46,
      noSlot: true,
      est: 45,
      note: "Untouched for seven weeks, so the title steps down the ladder.",
    },
  },
  {
    label: "Open · a group. Its tasks are the block, so they scroll.",
    weight: "open",
    height: RB_HEADER + 6 * 33 + 15,
    task: {
      id: 11,
      title: "Resale",
      done: false,
      project: "resale",
      from: "20:15",
      to: "22:25",
      group: [
        { title: "Photograph the shell", est: 40, done: true },
        { title: "List the boots", est: 45, done: false },
        { title: "Ship the camera body", est: 45, done: false },
        { title: "Measure the Margiela coat", est: 20, done: false },
        { title: "Reply to the Berlin buyer", est: 15, done: false },
        { title: "Print two labels", est: 10, done: false },
        { title: "Drop the parcels at the post office", est: 30, done: false },
      ],
    },
  },
];

/* The block the two ladders are measured on: enough facts that the budget has
   something to give up, in the handoff's own order. */
const LADDER_TASK: RbInput = {
  id: 20,
  title: "Marketing course",
  done: false,
  project: "ds",
  from: "10:50",
  to: "12:30",
  place: "St Andrews Ln",
  reason: "The only 100 minutes free before the module closes on Thursday",
  entry: "Open the first module",
  link: "learn.example.com/module-1",
  attachment: "Brief.pdf",
  note: "Module 1 is the long one.",
  parts: [
    { title: "Watch the intro", done: true },
    { title: "Do the exercise", done: false },
  ],
};

const HEIGHTS = [20, 30, 50, 68, 90, 120, 160, 210, 300];
const WIDTHS = [240, 140, 110, 84, 56];

const ROW_COLS =
  "15px minmax(0, 1fr) minmax(0, 140px) 64px 64px minmax(0, 96px)";

const ROW_TASKS: RbInput[] = [
  {
    id: 30,
    title: "Sign the factory quote",
    done: false,
    project: "ops",
    due: "4 Sep",
    est: 45,
    priority: "now",
    risk: "The line is held until six today",
  },
  {
    id: 31,
    title: "List the boots",
    done: false,
    project: "resale",
    due: "5 Sep",
    est: 45,
    value: 1200,
    earned: 400,
    parts: [
      { title: "Photograph", done: true },
      { title: "Measure", done: true },
    ],
  },
  {
    id: 32,
    title: "Something nobody filed",
    done: false,
    noSlot: true,
    age: 46,
    movedFrom: "Tuesday",
  },
  {
    id: 33,
    title: "Wrap the gift",
    done: true,
    project: "life",
    due: "3 Sep",
    est: 20,
  },
];

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        font: "var(--type-meta)",
        color: "var(--text-muted)",
        textWrap: "pretty",
      }}
    >
      {children}
    </span>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        font: "var(--type-meta-medium)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: "var(--text-quaternary)",
      }}
    >
      {children}
    </span>
  );
}

function Ground({
  theme,
  children,
}: {
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <div
      className="needt-v2"
      data-theme={theme}
      /* This ground shows one theme on purpose, so it opts out of the mirror
         that pushes the app's theme down onto every `.needt-v2` shell. */
      data-theme-pinned=""
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 16,
        minWidth: 0,
        background: "var(--background)",
        color: "var(--text-primary)",
        borderRadius: "var(--radius-2xl)",
        boxShadow: "var(--shadow-ring)",
      }}
    >
      {children}
    </div>
  );
}

function Weights({ theme }: { theme: Theme }) {
  const dark = theme === "dark";
  const [done, setDone] = React.useState<Record<string, boolean>>({});
  return (
    <Ground theme={theme}>
      <Eyebrow>weights · {theme}</Eyebrow>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(268px, 1fr))",
          gap: 14,
          alignItems: "start",
        }}
      >
        {CASES.map((entry) => (
          <span
            key={entry.task.id}
            style={{ display: "flex", flexDirection: "column", gap: 6 }}
          >
            <RichBlock
              block={rbShape(entry.task, { layout: "block" })}
              weight={entry.weight}
              height={entry.height}
              dark={dark}
              onToggle={() =>
                setDone((state) => ({
                  ...state,
                  [entry.task.id]: !state[entry.task.id],
                }))
              }
              onToggleTask={() => undefined}
            />
            <Caption>{entry.label}</Caption>
          </span>
        ))}
      </div>
      <Eyebrow>weight · row</Eyebrow>
      <div
        style={{
          background: "var(--surface-raised)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-ring)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: ROW_COLS,
            alignItems: "center",
            gap: 8,
            height: 30,
            padding: "0 6px",
            font: "var(--type-meta-medium)",
            color: "var(--text-quaternary)",
            boxShadow: "var(--border) 0 -1px 0 0 inset",
          }}
        >
          <span />
          <span>Task</span>
          <span>Project</span>
          <span>Due</span>
          <span style={{ textAlign: "right" }}>Est</span>
          <span style={{ textAlign: "right" }}>Value</span>
        </div>
        {ROW_TASKS.map((row) => (
          <RichBlock
            key={row.id}
            block={rbShape(
              { ...row, done: done[row.id] ?? row.done },
              { layout: "row" }
            )}
            weight="row"
            cols={ROW_COLS}
            dark={dark}
            onToggle={() =>
              setDone((state) => ({
                ...state,
                [row.id]: !(state[row.id] ?? row.done),
              }))
            }
          />
        ))}
      </div>
      <Caption>
        The row shares every mark with the block above it — the tile, the risk
        ink, the age ladder, the money pair — so a task cannot look like two
        different things in two places.
      </Caption>
    </Ground>
  );
}

function HeightLadder({ theme }: { theme: Theme }) {
  const dark = theme === "dark";
  const shape = rbShape(LADDER_TASK, { layout: "block" });
  const source = rbFactSource(shape);
  return (
    <Ground theme={theme}>
      <Eyebrow>the height ladder · {theme}</Eyebrow>
      <Caption>
        One block, nine heights. The header ladder rations the block below the
        open threshold; above it the payload is spent down the ranked list —
        place, then the alarm and the reason, then the entry, the link, the
        attachment, the preview and the note. A fact is shown whole or not
        shown, and nothing wraps to a second line at any height.
      </Caption>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
          alignItems: "start",
        }}
      >
        {HEIGHTS.map((height) => {
          const plan = rbLayout({ weight: "open", height, source });
          return (
            <span
              key={height}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <RichBlock
                block={shape}
                weight="open"
                height={height}
                dark={dark}
              />
              <Caption>
                {height}px · {plan.open ? "open" : plan.heightTier} ·{" "}
                {plan.shown.length
                  ? plan.shown.map((fact) => fact.kind).join(" · ")
                  : "header only"}
              </Caption>
            </span>
          );
        })}
        <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <RichBlock block={shape} weight="open" dark={dark} />
          <Caption>fit · the block is as tall as what it has to say</Caption>
        </span>
      </div>
    </Ground>
  );
}

function WidthLadder({ theme }: { theme: Theme }) {
  const dark = theme === "dark";
  const shape = rbShape(LADDER_TASK, { layout: "block" });
  return (
    <Ground theme={theme}>
      <Eyebrow>the width ladder · {theme}</Eyebrow>
      <Caption>
        Under 120px the project dot goes. Under 90px the checkbox leaves the
        flow and overlays on hover, and the edge becomes a 5px rail. Under 64px
        the block stops splitting and becomes one chip.
      </Caption>
      {/* Twice: at 44px, where there is only a header, and at 90px, where the
          header can afford the meta line the project dot lives on — the dot
          step is invisible at a height with nowhere to draw it. */}
      {[44, 90].map((height) => (
        <div
          key={height}
          style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          {WIDTHS.map((width) => (
            <span
              key={width}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                width,
              }}
            >
              <RichBlock
                block={shape}
                weight="compressed"
                height={height}
                width={width}
                dark={dark}
                onToggle={() => undefined}
              />
              <Caption>
                {height}×{width}px ·{" "}
                {
                  rbLayout({ weight: "compressed", width, source: {} }).width
                    .tier
                }
              </Caption>
            </span>
          ))}
        </div>
      ))}
    </Ground>
  );
}

export function RichBlockLab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <Weights theme="dark" />
        <Weights theme="paper" />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <HeightLadder theme="dark" />
        <HeightLadder theme="paper" />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <WidthLadder theme="dark" />
        <WidthLadder theme="paper" />
      </div>
    </div>
  );
}
