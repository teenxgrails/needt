"use client";

/* THE WORKSPACE TABLE — the row layout of the task, plus the things a table
 * needs that the task object does not carry on its own.
 *
 * PORT.md §4: `RichBlock` at `weight="row"` draws the row itself — the tile,
 * the risk line, the age ladder, the counter and the money pair are the same
 * marks the grid and the columns draw. This file must not fork that: it owns
 * the TABLE — column widths, the head, the indent — and the two things List
 * adds on top that a bare row does not carry: the face of whoever holds a
 * task, and, when it cannot move, the one line saying why (PORT.md §3
 * "List"). Both are rendered beside/beneath `RichBlock`, never inside it.
 *
 * The columns are declared once (`TASK_ROW_COLS`) and reused by the head,
 * the row and the part row, so nothing can drift out of alignment.
 */
import * as React from "react";

import { blockerOf } from "@/lib/needt/derive";
import type { NeedtPerson, NeedtProject, NeedtTask } from "@/lib/needt/types";

import { RichBlock } from "../RichBlock";
import { rbMoney, rbShape } from "../rb-shape";
import { RbGlyph } from "../ui";
import { BlockedChip, PersonFace } from "./TeamStrip";
import { blockedLine } from "./flow-path";

/** The shared column track. Declared once so the head, a row and a part row
 *  can never drift out of alignment with each other. */
export const TASK_ROW_COLS = "28px minmax(0,1fr) 148px 96px 76px 88px";

const HAIR = "var(--border) 0 -1px 0 0 inset";

export function TaskTableHead() {
  const cell: React.CSSProperties = {
    font: "var(--type-meta-medium)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "var(--text-quaternary)",
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: TASK_ROW_COLS,
        alignItems: "center",
        gap: 8,
        height: 28,
        padding: "0 6px",
        boxShadow: HAIR,
      }}
    >
      <span />
      <span style={cell}>Task</span>
      <span style={cell}>Project</span>
      <span style={cell}>Due</span>
      <span style={{ ...cell, textAlign: "right" }}>Est</span>
      <span style={{ ...cell, textAlign: "right" }}>Value</span>
    </div>
  );
}

/**
 * A group's header, in the table's sense: the project it names, how many
 * rows sit under it, and — when the tasks in it carry money — what the
 * group is worth once every task in it is closed.
 */
export function TaskGroupHeader({
  name,
  count,
  sum,
}: {
  name: string;
  count: number;
  sum: number;
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: 28,
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 28,
        padding: "0 6px",
        background: "var(--background)",
      }}
    >
      <span
        style={{
          font: "var(--type-meta-medium)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--text-quaternary)",
        }}
      >
        {name}
      </span>
      <span
        style={{
          font: "var(--type-meta)",
          color: "var(--text-muted)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {count}
      </span>
      {sum ? (
        <span
          title="What this group is worth with every task closed"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginLeft: 5,
          }}
        >
          <span
            style={{ font: "var(--type-meta)", color: "var(--text-disabled)" }}
          >
            all closed
          </span>
          <span
            style={{
              font: "var(--type-meta-medium)",
              color: "var(--text-secondary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {rbMoney(sum)}
          </span>
        </span>
      ) : null}
    </div>
  );
}

/**
 * A part is one piece of its task: it lives in the Task column, indented
 * under its parent on a hairline, and its only action is promotion — the
 * one way a part becomes something that can take a place in the day
 * (PORT.md §2, §4: "Parts are one level").
 */
export function PartRow({
  taskId,
  title,
  done,
  index,
  onTogglePart,
  onPromotePart,
}: {
  taskId: number;
  title: string;
  done: boolean;
  index: number;
  onTogglePart?: (taskId: number, index: number) => void;
  onPromotePart?: (taskId: number, index: number) => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: TASK_ROW_COLS,
        alignItems: "center",
        gap: 8,
        minHeight: 28,
        padding: "0 6px",
        boxShadow: HAIR,
        background: hovered ? "var(--fill-2)" : "transparent",
        transition: "background-color var(--transition-hover)",
      }}
    >
      <span
        style={{ display: "flex", justifyContent: "flex-end", paddingRight: 2 }}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`Close ${title}`}
          onClick={() => onTogglePart?.(taskId, index)}
          style={{
            width: 14,
            height: 14,
            padding: 0,
            border: 0,
            borderRadius: 4,
            display: "grid",
            placeItems: "center",
            cursor: "default",
            boxShadow: `inset 0 0 0 1.2px ${
              done ? "var(--success)" : "var(--text-quaternary)"
            }`,
            background: done ? "var(--success)" : "transparent",
            color: "var(--surface-raised)",
          }}
        >
          {done ? <RbGlyph name="check" size={9} /> : null}
        </button>
      </span>
      <span
        style={{
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingLeft: 11,
          boxShadow: "var(--border) 1px 0 0 0 inset",
        }}
      >
        <span
          style={{
            minWidth: 0,
            font: "var(--type-meta)",
            color: done ? "var(--text-muted)" : "var(--text-secondary)",
            textDecoration: done ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        {onPromotePart ? (
          <button
            type="button"
            title="Make it a task"
            aria-label="Make it a task"
            onClick={() => onPromotePart(taskId, index)}
            style={{
              flex: "none",
              display: hovered ? "flex" : "none",
              alignItems: "center",
              justifyContent: "center",
              width: 20,
              height: 20,
              border: 0,
              borderRadius: "var(--radius-xs)",
              background: "transparent",
              color: "var(--text-tertiary)",
              cursor: "default",
            }}
          >
            <RbGlyph name="arrow-right" size={13} />
          </button>
        ) : null}
      </span>
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export interface TaskRowProps {
  task: NeedtTask;
  people: readonly NeedtPerson[];
  /** The whole list, so the row can resolve its own blocker — the chain is
   *  derived, never stored (PORT.md §2, `derive.ts`). */
  allTasks: readonly NeedtTask[];
  projects?: readonly NeedtProject[];
  onToggle?: (id: number) => void;
  onOpen?: (task: NeedtTask) => void;
  onTogglePart?: (taskId: number, index: number) => void;
  onPromotePart?: (taskId: number, index: number) => void;
}

/**
 * One task, as a table row: `RichBlock` at `weight="row"` for the task
 * itself, the holder's face beside it, the blocked line beneath it when it
 * cannot move, and its parts beneath that. "A blocked task looks exactly
 * like a task nobody has started, and that is how a week goes missing" —
 * the face and the line are the whole difference.
 */
export function TaskRow({
  task,
  people,
  allTasks,
  projects,
  onToggle,
  onOpen,
  onTogglePart,
  onPromotePart,
}: TaskRowProps) {
  const parts = task.parts ?? [];
  const holder = task.holder
    ? (people.find((p) => p.id === task.holder) ?? null)
    : null;
  const line = task.done
    ? null
    : blockedLine(blockerOf(task, allTasks), people);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <RichBlock
            block={rbShape(task, { layout: "row", projects })}
            weight="row"
            cols={TASK_ROW_COLS}
            onToggle={onToggle ? () => onToggle(task.id) : undefined}
            onOpen={onOpen ? () => onOpen(task) : undefined}
          />
        </div>
        {holder ? (
          <span
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              paddingLeft: 8,
              boxShadow: HAIR,
            }}
          >
            <PersonFace person={holder} size={20} />
          </span>
        ) : null}
      </div>
      {line ? (
        <div
          style={{
            display: "flex",
            padding: "3px 6px 6px 34px",
            boxShadow: HAIR,
          }}
        >
          <BlockedChip text={line} />
        </div>
      ) : null}
      {/* Parts are always visible: the task is its pieces, not a
          disclosure. */}
      {parts.map((part, index) => (
        <PartRow
          key={`${task.id}-${index}`}
          taskId={task.id}
          title={part.title}
          done={part.done}
          index={index}
          onTogglePart={onTogglePart}
          onPromotePart={onPromotePart}
        />
      ))}
    </div>
  );
}
