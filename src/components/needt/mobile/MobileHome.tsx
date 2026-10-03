"use client";

/* HOME — Overdue as a line you tap, Today as the list under it.
 *
 * Ported from `Mobile.jsx`'s `MbHome`. The desktop's `TodayForm` (`../home`)
 * parks Overdue and Tomorrow as walls off either edge of the day, reachable
 * on hover; a phone has no hover and no edge to spare, so Overdue collapses
 * to a single row that opens in place, and Tomorrow is dropped entirely —
 * PORT.md's mobile brief keeps only what "the queue into Home" names, and
 * the prototype does not carry a Tomorrow shelf on the phone either.
 *
 * The task object is unchanged: `rbShape` + `RichBlock` at `weight="open"`,
 * the same pair every other surface calls — this file only decides which
 * tasks to hand it and in what order, via `mobileDayLists`/`homeParted`.
 */
import * as React from "react";

import { LuChevronRight, LuPlus } from "react-icons/lu";

import type { NeedtTask } from "@/lib/needt/types";

import { RichBlock } from "../RichBlock";
import { homeParted } from "../home";
import { type RbInput, rbShape } from "../rb-shape";
import { Glyph, SidebarHint } from "../shell/chrome";
import { mobileDayLists } from "./mobile-logic";

export interface MobileHomeProps {
  tasks: readonly NeedtTask[];
  now: Date;
  onOpenTask?: (task: NeedtTask) => void;
  onToggleTask?: (id: string) => void;
  onAddTask?: () => void;
}

function MobileTaskCard({
  task,
  atRisk,
  onOpen,
  onToggle,
}: {
  task: NeedtTask;
  atRisk?: boolean;
  onOpen?: () => void;
  onToggle?: () => void;
}) {
  const input: RbInput = atRisk ? { ...task, priority: "now" } : task;
  return (
    <RichBlock
      touch
      block={rbShape(input, { layout: "card" })}
      weight="open"
      fit
      onOpen={onOpen}
      onToggle={onToggle}
    />
  );
}

export function MobileHome({
  tasks,
  now,
  onOpenTask,
  onToggleTask,
  onAddTask,
}: MobileHomeProps) {
  const { debt, today } = React.useMemo(
    () => mobileDayLists(tasks, now),
    [tasks, now]
  );
  const rows = React.useMemo(() => homeParted(today), [today]);
  const [debtOpen, setDebtOpen] = React.useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "0 16px 16px",
      }}
    >
      {debt.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={() => setDebtOpen((open) => !open)}
            aria-expanded={debtOpen}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              height: 44,
              padding: "0 12px",
              border: 0,
              cursor: "default",
              borderRadius: "var(--radius-lg)",
              background:
                "color-mix(in oklab, var(--destructive) 10%, var(--surface-raised))",
              boxShadow: "var(--shadow-ring)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flex: "none",
                width: 7,
                height: 7,
                borderRadius: 4,
                background: "var(--destructive)",
              }}
            />
            <span
              style={{
                font: "var(--type-ui-medium)",
                color: "var(--text-primary)",
              }}
            >
              Overdue
            </span>
            <span
              style={{
                font: "var(--type-meta)",
                color: "var(--text-muted)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {debt.length}
            </span>
            <span
              aria-hidden="true"
              style={{
                marginLeft: "auto",
                display: "flex",
                color: "var(--text-tertiary)",
                transform: debtOpen ? "rotate(90deg)" : "none",
                transition: "transform 0.18s ease",
              }}
            >
              <Glyph of={LuChevronRight} size={16} />
            </span>
          </button>
          {debtOpen
            ? debt.map((task) => (
                <MobileTaskCard
                  key={task.id}
                  task={task}
                  atRisk
                  onOpen={onOpenTask ? () => onOpenTask(task) : undefined}
                  onToggle={
                    onToggleTask ? () => onToggleTask(task.id) : undefined
                  }
                />
              ))
            : null}
        </div>
      ) : null}

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              font: "var(--type-card-title)",
              fontSize: 15,
              color: "var(--accent)",
            }}
          >
            Today
          </span>
          <span
            style={{
              font: "var(--type-meta)",
              color: "var(--text-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {today.length}
          </span>
        </span>
        {rows.length === 0 ? (
          <SidebarHint>Nothing is due today.</SidebarHint>
        ) : (
          rows.map((row) =>
            row.kind === "header" ? (
              <span
                key={row.part}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  paddingTop: row.first ? 0 : 6,
                }}
              >
                <span
                  style={{
                    flex: "none",
                    font: "var(--type-meta-medium)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--text-quaternary)",
                  }}
                >
                  {row.part}
                </span>
                <span
                  aria-hidden="true"
                  style={{ flex: 1, borderTop: "1px solid var(--border)" }}
                />
              </span>
            ) : (
              <MobileTaskCard
                key={row.task.id}
                task={row.task}
                onOpen={onOpenTask ? () => onOpenTask(row.task) : undefined}
                onToggle={
                  onToggleTask ? () => onToggleTask(row.task.id) : undefined
                }
              />
            )
          )
        )}
        {onAddTask ? (
          <button
            type="button"
            onClick={onAddTask}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minHeight: 44,
              padding: "0 10px",
              border: 0,
              borderRadius: "var(--radius-lg)",
              background: "transparent",
              color: "var(--text-muted)",
              font: "var(--type-ui)",
            }}
          >
            <Glyph of={LuPlus} size={16} />
            Add task
          </button>
        ) : null}
      </section>
    </div>
  );
}
