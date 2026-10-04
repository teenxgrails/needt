"use client";

/* THE TASK SHEET — the two-minute entry and the parts at the top, then
 * attributes as a list where the value is the control.
 *
 * Ported from `Mobile.jsx`'s `MbTask`, opened as a `MobileSheet`. The desktop
 * editor (`TaskDialog`, `../dialogs`) is a sit-down: two columns, everything
 * laid out at once, reached with a mouse that can travel to either side in
 * one move. A phone reads top to bottom, so this is that dialog's attribute
 * rail turned into a single column — and rather than inventing a new label
 * layout for it, every row wears `.nt-row`, the same `--form-label-w: 105px`
 * grid PORT.md §0.4 already binds every OTHER form in this app to. The
 * prototype's own `MbAttr` did not (it laid out ad hoc, icon-label-value with
 * no fixed column); this port applies the standing rule here too, so a label
 * column measured once means the same thing on both shells.
 *
 * THE TASK OBJECT, NOT A FORK OF IT: `task` is `RbInput`, run through the
 * same `rbShape()` every other surface calls. `RbEntry` and `RbCheckbox`
 * (`../ui`) are the exact components the desktop editor uses for the same
 * two things — the two-minute step and a part's own toggle.
 */
import * as React from "react";

import type { IconType } from "react-icons";
import { LuCalendar, LuClock, LuFlag, LuFolder, LuTag } from "react-icons/lu";

import { person as resolvePerson } from "@/lib/needt/derive";
import {
  people as fixturePeople,
  projects as fixtureProjects,
} from "@/lib/needt/fixture";
import type { NeedtPerson, NeedtProject } from "@/lib/needt/types";

import { type RbInput, rbDur, rbShape } from "../rb-shape";
import { Glyph } from "../shell/chrome";
import { RbCheckbox, RbEntry } from "../ui";
import { MobileSheet } from "./MobileSheet";
import { TASK_SHEET_ROW_HEIGHT } from "./mobile-logic";

export interface MobileTaskSheetProps {
  task: RbInput | null;
  open: boolean;
  projects?: readonly NeedtProject[];
  people?: readonly NeedtPerson[];
  onClose: () => void;
  onToggle?: (id: string) => void;
  onTogglePart?: (id: string, index: number) => void;
  onDelete?: (id: string) => void;
}

function MobileAttrRow({
  glyph,
  label,
  value,
  tone,
  muted,
}: {
  glyph: IconType;
  label: string;
  value: string;
  tone?: string;
  muted?: boolean;
}) {
  return (
    <div className="nt-row">
      <span className="nt-row-label" title={label}>
        {label}
      </span>
      <span className="nt-row-control">
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            height: TASK_SHEET_ROW_HEIGHT,
            padding: "0 4px",
            border: 0,
            cursor: "default",
            background: "transparent",
            font: "var(--type-ui-medium)",
            color:
              tone ?? (muted ? "var(--text-disabled)" : "var(--text-primary)"),
          }}
        >
          <Glyph of={glyph} size={14} />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "left",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </span>
        </span>
      </span>
    </div>
  );
}

export function MobileTaskSheet({
  task,
  open,
  projects = fixtureProjects,
  people = fixturePeople,
  onClose,
  onToggle,
  onTogglePart,
  onDelete,
}: MobileTaskSheetProps) {
  const shape = React.useMemo(
    () => (task ? rbShape(task, { projects }) : null),
    [task, projects]
  );
  const parts = shape?.parts ?? [];
  const closed = parts.filter((part) => part.done).length;
  const holder = task?.holder ? resolvePerson(task.holder, people) : null;

  return (
    <MobileSheet
      open={open && !!task}
      onClose={onClose}
      title={task?.title ?? "Task"}
      count={parts.length ? `${closed}/${parts.length}` : undefined}
      meta={[shape?.where, shape?.est != null ? rbDur(shape.est) : null]
        .filter(Boolean)
        .join(" · ")}
    >
      {task && shape ? (
        <>
          {shape.entry ? (
            <RbEntry label={shape.entry} hue={shape.hue ?? "var(--accent)"} />
          ) : null}

          {task.waitsOn ? (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minHeight: 36,
                padding: "0 11px",
                borderRadius: "var(--radius-lg)",
                background: "var(--fill-2)",
                boxShadow: "var(--shadow-inset-ring)",
              }}
            >
              <Glyph of={LuClock} size={13} />
              <span
                style={{
                  font: "var(--type-meta)",
                  color: "var(--text-tertiary)",
                }}
              >
                Waiting on{" "}
                {resolvePerson(task.waitsOn.on, people)?.name ??
                  task.waitsOn.on}{" "}
                for {task.waitsOn.for}
              </span>
            </span>
          ) : null}

          {parts.length ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {parts.map((part, index) => (
                <div
                  key={`${part.title}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    width: "100%",
                    minHeight: TASK_SHEET_ROW_HEIGHT,
                    padding: 0,
                    border: 0,
                    textAlign: "left",
                    background: "transparent",
                    boxShadow: "var(--border) 0 -1px 0 0 inset",
                  }}
                >
                  <RbCheckbox
                    done={part.done}
                    hue={shape.hue ?? "var(--text-tertiary)"}
                    label={part.title}
                    onToggle={
                      onTogglePart
                        ? () => onTogglePart(task.id, index)
                        : undefined
                    }
                  />
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      font: "var(--type-ui)",
                      color: part.done
                        ? "var(--text-muted)"
                        : "var(--text-primary)",
                      textDecoration: part.done ? "line-through" : "none",
                    }}
                  >
                    {part.title}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div
            className="nt-form"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <MobileAttrRow
              glyph={LuFolder}
              label="Project"
              value={shape.where ?? "No project"}
              tone={shape.hue ?? undefined}
              muted={!shape.where}
            />
            <MobileAttrRow
              glyph={LuCalendar}
              label="Day"
              value={shape.due ?? "Unscheduled"}
              tone="var(--accent)"
              muted={!shape.due}
            />
            <MobileAttrRow
              glyph={LuClock}
              label="Takes"
              value={shape.est != null ? rbDur(shape.est) : "Not set"}
              muted={shape.est == null}
            />
            <MobileAttrRow
              glyph={LuFlag}
              label="Deadline"
              value={shape.overdue ? "Past due" : (shape.due ?? "Unscheduled")}
              tone={shape.overdue ? "var(--destructive)" : undefined}
            />
            <MobileAttrRow
              glyph={LuTag}
              label="Who"
              value={holder?.name ?? "Unassigned"}
              muted={!holder}
            />
          </div>

          {onToggle || onDelete ? (
            <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
              {onToggle ? (
                <button
                  type="button"
                  onClick={() => {
                    onToggle(task.id);
                    onClose();
                  }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    border: 0,
                    cursor: "default",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--fill-accent)",
                    color: "var(--accent)",
                    font: "var(--type-ui-medium)",
                  }}
                >
                  {task.done ? "Reopen" : "Close it"}
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(task.id)}
                  style={{
                    flex: "none",
                    minHeight: 44,
                    padding: "0 16px",
                    border: 0,
                    cursor: "default",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--fill-destructive)",
                    color: "var(--destructive)",
                    font: "var(--type-ui-medium)",
                  }}
                >
                  Archive
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </MobileSheet>
  );
}
