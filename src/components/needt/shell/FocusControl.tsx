"use client";

/* FOCUS — not a screen. A button that knows whether a session is running, and
 * a popover that asks the one question a timer cannot: what for.
 *
 * The running state is drawn three ways at once, all of them legal under
 * PORT.md §0 rule 3: a 12% accent fill under a 24% progress bar, with the
 * accent as the TEXT — never as a solid fill on the control. The ring that
 * breathes around it is `.focus-live`, which the motion sheet drives at the
 * same 5.2s-family period as everything else alive.
 *
 * The popover hangs upward, because a control on the last row of the rail has
 * no room beneath it. `.pop-up` is how the motion sheet knows to grow it from
 * the edge it is attached to, and how the vendored sheet stretches it to the
 * rail's width — a panel wider than the rail loses its right edge.
 */
import * as React from "react";

import { LuTarget } from "react-icons/lu";

import type { NeedtTask } from "@/lib/needt/types";

import { RichBlock } from "../RichBlock";
import { rbShape } from "../rb-shape";
import { Glyph, Hung } from "./chrome";

/** A session in flight. `elapsed` is seconds; `planned` is minutes. */
export interface FocusSession {
  intention: string;
  planned: number;
  elapsed: number;
  taskId: number | null;
}

const LENGTHS = [25, 50, 90] as const;

function clock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export interface FocusControlProps {
  tasks: readonly NeedtTask[];
  focus: FocusSession | null;
  dark: boolean;
  onStart: (session: Omit<FocusSession, "elapsed">) => void;
  onStop: () => void;
}

export function FocusControl({
  tasks,
  focus,
  dark,
  onStart,
  onStop,
}: FocusControlProps) {
  const [open, setOpen] = React.useState(false);
  const [intention, setIntention] = React.useState("");
  const [minutes, setMinutes] = React.useState<number>(50);
  const open5 = React.useMemo(
    () => tasks.filter((task) => !task.done).slice(0, 5),
    [tasks]
  );
  const [taskId, setTaskId] = React.useState<number | null>(
    open5[0]?.id ?? null
  );

  const running = focus !== null;
  const total = running ? focus.planned * 60 : 0;
  const done = running ? Math.min(focus.elapsed / total, 1) : 0;
  const left = running ? Math.max(total - focus.elapsed, 0) : 0;

  const dismiss = React.useCallback(() => setOpen(false), []);

  const trigger = (
    <button
      type="button"
      className={running ? "focus-live" : undefined}
      onClick={(event) => {
        if (running) {
          event.stopPropagation();
          onStop();
          return;
        }
        setOpen((was) => !was);
      }}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        height: 40,
        padding: "0 11px",
        border: 0,
        cursor: "default",
        borderRadius: "var(--radius-floating)",
        overflow: "hidden",
        background: running ? "var(--fill-accent)" : "var(--surface-raised)",
        boxShadow: running ? "none" : "var(--shadow-raised)",
        transition:
          "box-shadow var(--transition-hover), background-color var(--transition-hover)",
      }}
    >
      {running ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${done * 100}%`,
            background: "var(--fill-accent-strong)",
            transition: "width 0.2s linear",
          }}
        />
      ) : null}
      <span style={{ position: "relative", display: "flex" }}>
        <Glyph of={LuTarget} size={16} />
      </span>
      <span
        style={{
          position: "relative",
          font: "var(--type-ui-medium)",
          color: running ? "var(--accent)" : "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {running ? focus.intention || "In focus" : "Focus"}
      </span>
      <span
        style={{
          position: "relative",
          marginLeft: "auto",
          font: "var(--type-meta)",
          fontFamily: "var(--font-mono)",
          color: running ? "var(--accent)" : "var(--text-muted)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {running ? clock(left) : "⌘⇧F"}
      </span>
    </button>
  );

  return (
    <Hung
      open={open && !running}
      up
      kind="popover"
      onDismiss={dismiss}
      trigger={trigger}
    >
      {/* 6px inside a group, 21px between groups. Six items on one flat stack
          is why nothing read as belonging to anything. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 21 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              font: "var(--type-meta-medium)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--text-quaternary)",
            }}
          >
            Start a session
          </span>
          <input
            className="nt-input"
            value={intention}
            placeholder="What is this session for?"
            onChange={(event) => setIntention(event.target.value)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}
          >
            Length
          </span>
          <div className="toggle-group" role="tablist" aria-label="Length">
            {LENGTHS.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                className="segment"
                aria-selected={minutes === value}
                onClick={() => setMinutes(value)}
                style={{ flex: 1, cursor: "default" }}
              >
                {value} min
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}
          >
            On
          </span>
          <div
            className="scroll-inner"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: 168,
              minWidth: 0,
              overflowX: "hidden",
              overflowY: "auto",
            }}
          >
            {open5.map((task) => (
              <article
                key={task.id}
                onClick={() => setTaskId(task.id)}
                style={{
                  borderRadius: "var(--radius-lg)",
                  boxShadow:
                    task.id === taskId ? "var(--shadow-focus)" : "none",
                }}
              >
                <RichBlock
                  block={rbShape(task, { layout: "card", dense: true })}
                  weight="compressed"
                  fit
                  dark={dark}
                />
              </article>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <button
            type="button"
            className="btn btn-accent"
            style={{ width: "100%" }}
            onClick={() => {
              onStart({ intention, planned: minutes, taskId });
              setOpen(false);
            }}
          >
            <Glyph of={LuTarget} size={16} />
            Start
          </button>
          <p
            style={{
              margin: 0,
              paddingTop: 11,
              boxShadow: "var(--border) 0 1px 0 0 inset",
              font: "var(--type-meta)",
              color: "var(--text-muted)",
              textWrap: "pretty",
            }}
          >
            The scheduler will not place anything inside the session, and the
            mark up there stops breathing until it ends.
          </p>
        </div>
      </div>
    </Hung>
  );
}
