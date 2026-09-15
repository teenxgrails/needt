"use client";

/* THE TASK EDITOR — the sit-down. Ported from `Dialogs.jsx`'s `TaskDialog`.
 *
 * Creating is a hurry; the composer owns that. This is the other pace: the
 * thing already exists and you are changing it, so the surface can afford to
 * lay every attribute out at once instead of hiding them behind a menu.
 *
 * TWO COLUMNS, AND THEY DO DIFFERENT WORK. The left is what the task IS — its
 * name, what it means, the pieces it breaks into, what is attached. The right
 * is what the SCHEDULER knows about it — where it lives, how long it takes,
 * when it must be done. The left changes when you think differently about the
 * work; the right changes when the day changes.
 *
 * THE TASK OBJECT, NOT A FORK OF IT. `task` is typed `RbInput` — the same
 * `NeedtTask & Partial<RbExtras>` `RichBlock` takes — and run through the same
 * `rbShape()` adapter that resolves the project, the hue and the three-state
 * capability fields. A second, editor-only shape of the task is exactly the
 * drift PORT.md §4 warns about ("the kit forked it per surface and the copies
 * drifted within a day"); this file has no `interface` of its own for a task.
 *
 * WHAT THE PROTOTYPE SHOWS THAT THE DATA DOES NOT YET MODEL — Priority,
 * Repeat, Remind, Labels, Hours and "Smallest chunk" have no column on
 * `NeedtTask`. Rather than invent fields nothing else reads (and this
 * directory cannot touch `types.ts` to add them), those rows render their
 * honest default and stay inert, the same way the kit's OWN mock state never
 * wired them to anything real either — see PORT.md §9. `//todo` marks each
 * one for when the schema grows the column.
 *
 * ONE DISAGREEMENT WITH THE PROTOTYPE, KEPT DELIBERATELY: the kit draws two
 * separate rows, "Day" (when it sits on the calendar) and "Deadline" (when it
 * is due), from what is a single `due` string on `NeedtTask`. Two rows fed by
 * one field would either show the same date twice under different names or
 * silently diverge the moment someone edited one and not the other — worse
 * than the row PORT.md's §0 already warns against inventing. This port folds
 * them into one "Due" row, red when `rbShape` says the task is overdue.
 *
 * PORT.md §0.4 — ONE FORM-LABEL COLUMN. The kit's own `TdRow` hardcodes a
 * 92px label column, which is the binding rule's own trap: "a label that does
 * not fit gets shortened, and widening the column re-opens the defect the
 * measurement exists to close." `TdRow` here lays out through `.nt-row`, the
 * vendored `--form-label-w: 105px` grid every other form in this app must
 * share, not a bespoke width of its own.
 */
import * as React from "react";

import type { IconType } from "react-icons";
import {
  LuArrowUpRight,
  LuBell,
  LuBold,
  LuCalendar,
  LuCalendarClock,
  LuCircle,
  LuCircleCheck,
  LuClock,
  LuFileText,
  LuFlag,
  LuFolder,
  LuHourglass,
  LuItalic,
  LuLayers,
  LuLayoutTemplate,
  LuLink,
  LuList,
  LuListChecks,
  LuPaperclip,
  LuPlus,
  LuRepeat,
  LuStrikethrough,
  LuTag,
  LuUsers,
} from "react-icons/lu";

import { person } from "@/lib/needt/derive";
import {
  people as fixturePeople,
  projects as fixtureProjects,
} from "@/lib/needt/fixture";
import type { NeedtPerson, NeedtProject, TaskPart } from "@/lib/needt/types";

import { type RbInput, rbDur, rbShape } from "../rb-shape";
import { Glyph, IconButton } from "../shell/chrome";
import { RbCheckbox, RbEntry } from "../ui";
import { type PartPromotion, promotePart } from "./part-promote";

/* ── Small local rows — the editor's own vocabulary, not a shared control.
   `TdValue` reads as text until you reach for it, which is what keeps a rail
   of fifteen attributes from reading as fifteen inputs; most of them are not
   wired to a picker yet (see the file header), so they are honest buttons
   that currently do nothing when nothing is passed to `onClick`. */

function TdRow({
  glyph,
  label,
  indent,
  children,
}: {
  glyph?: IconType;
  label: string;
  indent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="nt-row" style={indent ? { marginLeft: 18 } : undefined}>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {glyph ? (
          <span
            style={{
              flex: "none",
              display: "flex",
              color: "var(--text-quaternary)",
            }}
          >
            <Glyph of={glyph} size={15} />
          </span>
        ) : null}
        <span
          style={{
            font: "var(--type-ui)",
            color: "var(--text-quaternary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </span>
      <span className="nt-row-control" style={{ justifyContent: "flex-end" }}>
        {children}
      </span>
    </div>
  );
}

function TdValue({
  children,
  muted,
  tone,
  glyph,
  onClick,
}: {
  children: React.ReactNode;
  muted?: boolean;
  tone?: string;
  glyph?: IconType;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        maxWidth: "100%",
        height: 24,
        padding: "0 7px",
        border: 0,
        cursor: "default",
        borderRadius: "var(--radius-sm)",
        background: "transparent",
        font: "var(--type-ui-medium)",
        color: tone ?? (muted ? "var(--text-disabled)" : "var(--text-primary)"),
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {glyph ? <Glyph of={glyph} size={13} /> : null}
      {children}
    </button>
  );
}

function TdGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        padding: "8px 0",
        boxShadow: "var(--border) 0 -1px 0 0 inset",
      }}
    >
      {children}
    </div>
  );
}

/** A 28×16 switch, wired to the vendored `.nt-switch` CSS — no shared
    component for this exists outside this directory yet. */
function TdSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="nt-switch" data-checked={checked ? "true" : undefined}>
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="nt-switch-track">
        <span className="nt-switch-knob" />
      </span>
    </label>
  );
}

const TD_MARKS: ReadonlyArray<{
  glyph: IconType;
  letter?: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
}> = [
  { glyph: LuBold, letter: "B", bold: true },
  { glyph: LuItalic, letter: "I", italic: true },
  { glyph: LuStrikethrough, letter: "S", strike: true },
  { glyph: LuList },
  { glyph: LuListChecks },
  { glyph: LuLink },
];

export interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  /** The task being edited — `NeedtTask` plus whatever a surface adds. */
  task: RbInput;
  projects?: readonly NeedtProject[];
  people?: readonly NeedtPerson[];
  /** Fires once, with the edited task, when "Save" is pressed. */
  onSave?: (task: RbInput) => void;
  /** Fires once per promotion — see `part-promote.ts` for the rule itself. */
  onPromotePart?: (promotion: PartPromotion) => void;
}

/**
 * The task editor.
 *
 * Local state mirrors what a person can change here (kind, title, parts, the
 * hard-deadline and placed toggles) seeded from `task` at mount. Like the
 * kit's own `useState(...)` seed, it does not resync if `task` changes under
 * an already-open dialog — a caller switching which task is open should key
 * this component by `task.id` so React remounts it instead of leaving stale
 * edits from the last task on screen.
 */
export function TaskDialog({
  open,
  onClose,
  task,
  projects = fixtureProjects,
  people = fixturePeople,
  onSave,
  onPromotePart,
}: TaskDialogProps) {
  const shape = React.useMemo(
    () => rbShape(task, { projects }),
    [task, projects]
  );
  const hasParts = shape.parts !== null;

  const [kind, setKind] = React.useState<"task" | "event" | "doc">(
    shape.event ? "event" : "task"
  );
  const [title, setTitle] = React.useState(task.title);
  const [parts, setParts] = React.useState<TaskPart[]>(shape.parts ?? []);
  const [hard, setHard] = React.useState(false);
  const [placed, setPlaced] = React.useState(
    !task.noSlot && Boolean(task.time || task.at !== undefined)
  );
  /* Ids for parts promoted in this session. Not a real id sequence — there is
     no store behind this component — just enough to keep each promoted task
     distinct within one editing session. */
  const nextPromotedId = React.useRef(task.id * 1000 + 1);

  if (!open) return null;

  const holder = person(task.holder, people);
  const closed = parts.filter((p) => p.done).length;
  const entryHue = shape.hue ?? "var(--accent)";

  function togglePart(index: number) {
    setParts((list) =>
      list.map((p, i) => (i === index ? { ...p, done: !p.done } : p))
    );
  }

  function addPart() {
    setParts((list) => list.concat([{ title: "New part", done: false }]));
  }

  function promote(index: number) {
    const current: RbInput = { ...task, title, parts };
    const result = promotePart(current, index, nextPromotedId.current);
    if (!result) return;
    nextPromotedId.current += 1;
    setParts(result.task.parts ?? []);
    onPromotePart?.(result);
  }

  function save() {
    onSave?.({ ...task, title, parts });
    onClose();
  }

  return (
    <div className="td-scrim" onMouseDown={onClose}>
      <div
        className="td-box"
        role="dialog"
        aria-modal="true"
        aria-label="Edit task"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="td-main">
          {/* What kind of thing this is, first — everything below it means
              something slightly different depending on the answer. */}
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              flex: "none",
            }}
          >
            <div className="toggle-group" role="group" aria-label="Kind">
              {(
                [
                  ["task", "Task", LuCircleCheck],
                  ["event", "Event", LuCalendar],
                  ["doc", "Document", LuFileText],
                ] as const
              ).map(([k, label, glyph]) => (
                <button
                  key={k}
                  type="button"
                  className={kind === k ? "segment is-selected" : "segment"}
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Glyph of={glyph} size={13} />
                  {label}
                </button>
              ))}
            </div>
            <span
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {/* Not wired — the kit's own template and recurrence pickers
                  are not part of this port. */}
              <button type="button" className="btn btn-ghost">
                <Glyph of={LuLayoutTemplate} size={14} />
                Template
              </button>
              <button type="button" className="btn btn-ghost">
                <Glyph of={LuRepeat} size={14} />
                Recurring
              </button>
            </span>
          </header>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Name it"
            style={{
              flex: "none",
              width: "100%",
              margin: 0,
              padding: 0,
              border: 0,
              background: "transparent",
              outline: "none",
              font: "var(--type-page-title)",
              color: "var(--text-primary)",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flex: "none",
              opacity: 0.85,
            }}
          >
            {/* Decorative — no rich-text model backs this port yet. */}
            {TD_MARKS.map((mark, i) => (
              <IconButton
                key={i}
                label={mark.letter ?? "Formatting"}
                variant="ghost"
                icon={
                  mark.letter ? (
                    <span
                      style={{
                        font: "var(--type-ui-medium)",
                        fontStyle: mark.italic ? "italic" : "normal",
                        textDecoration: mark.strike ? "line-through" : "none",
                        fontWeight: mark.bold ? 700 : 500,
                      }}
                    >
                      {mark.letter}
                    </span>
                  ) : (
                    <Glyph of={mark.glyph} size={14} />
                  )
                }
              />
            ))}
          </div>

          <div className="scroll-inner td-body">
            {/* Three-state: `null` means the product has no description on
                this task yet, so nothing is drawn — an authored placeholder
                here is exactly the kind of copy PORT.md §9 says the port has
                no generator for. */}
            {shape.note ? (
              <p
                style={{
                  margin: 0,
                  font: "var(--type-body)",
                  color: "var(--text-secondary)",
                  textWrap: "pretty",
                }}
              >
                {shape.note}
              </p>
            ) : null}

            {/* THE PARTS. Not an afterthought at the bottom of a rail: the
                pieces are what the work actually is, so they sit in the
                column that says what the task is. `hasParts` is `false` only
                when `shape.parts` is `null` — the capability not built yet —
                and then this section draws nothing at all, per PORT.md's
                three-state convention. */}
            {hasParts ? (
              <section
                style={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    height: 26,
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
                    Parts
                  </span>
                  <span
                    style={{
                      font: "var(--type-meta)",
                      color: "var(--text-muted)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {closed}/{parts.length}
                  </span>
                </span>
                {parts.map((p, i) => (
                  <span
                    key={i}
                    className="td-row group"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minHeight: 30,
                      padding: "0 6px",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <RbCheckbox
                      done={p.done}
                      hue={shape.hue ?? "var(--text-tertiary)"}
                      label={p.title}
                      onToggle={() => togglePart(i)}
                    />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        font: "var(--type-ui)",
                        color: p.done
                          ? "var(--text-muted)"
                          : "var(--text-primary)",
                        textDecoration: p.done ? "line-through" : "none",
                      }}
                    >
                      {p.title}
                    </span>
                    <span
                      className="reveal-on-hover"
                      style={{ display: "flex", gap: 2 }}
                    >
                      <IconButton
                        label="Make it a task of its own"
                        variant="ghost"
                        onClick={() => promote(i)}
                        icon={<Glyph of={LuArrowUpRight} size={13} />}
                      />
                    </span>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={addPart}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    height: 30,
                    padding: "0 6px",
                    border: 0,
                    cursor: "default",
                    borderRadius: "var(--radius-md)",
                    background: "transparent",
                    font: "var(--type-ui)",
                    color: "var(--text-muted)",
                  }}
                >
                  <Glyph of={LuPlus} size={14} />
                  Add a part
                </button>
              </section>
            ) : null}

            {/* The two-minute step. Three-state again: `null` omits this
                section entirely rather than drawing an empty invitation. */}
            {shape.entry ? (
              <section
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                <span
                  style={{
                    font: "var(--type-meta-medium)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--text-quaternary)",
                  }}
                >
                  Way in
                </span>
                <RbEntry label={shape.entry} hue={entryHue} />
              </section>
            ) : null}
          </div>

          <footer
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              flex: "none",
              paddingTop: 11,
              boxShadow: "var(--border) 0 -1px 0 0 inset",
            }}
          >
            <button type="button" className="btn btn-ghost">
              <Glyph of={LuPaperclip} size={14} />
              Attach
            </button>
            <span
              style={{
                font: "var(--type-meta)",
                color: "var(--text-disabled)",
              }}
            >
              {shape.attachment ?? "Nothing attached"}
            </span>
          </footer>
        </div>

        <aside className="td-rail scroll-inner">
          <TdGroup>
            <TdRow glyph={LuLayers} label="Workspace">
              <TdValue>Needt</TdValue>
            </TdRow>
            <TdRow glyph={LuFolder} label="Project">
              {shape.where ? (
                <TdValue>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: shape.hue ?? "var(--text-tertiary)",
                    }}
                  />
                  {shape.where}
                </TdValue>
              ) : (
                <TdValue muted>No project</TdValue>
              )}
            </TdRow>
          </TdGroup>

          {/* THE SCHEDULER'S VERDICT — the one thing on this rail that is not
              a setting but a result, so it is the one thing that carries
              fill. Toggling it is local UI only: PORT.md §9 is explicit that
              the scheduler is scripted, not solved, in this port. */}
          <button
            type="button"
            onClick={() => setPlaced((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              width: "100%",
              height: 44,
              padding: "0 11px",
              border: 0,
              cursor: "default",
              background: placed ? "var(--fill-accent)" : "var(--fill-2)",
              color: placed ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <Glyph of={placed ? LuCircleCheck : LuCircle} size={17} />
            <span style={{ font: "var(--type-ui-medium)" }}>
              {placed ? "Placed" : "Not placed"}
            </span>
            <span
              style={{
                marginLeft: "auto",
                font: "var(--type-meta)",
                color: placed ? "var(--accent)" : "var(--text-disabled)",
                opacity: 0.8,
              }}
            >
              {placed ? (task.time ?? "—") : "you place it"}
            </span>
          </button>

          <TdGroup>
            <TdRow glyph={LuCircle} label="Status">
              <TdValue muted={!task.status}>
                {task.status === "in_progress"
                  ? "In progress"
                  : task.status === "todo"
                    ? "To do"
                    : "Not set"}
              </TdValue>
            </TdRow>
            {/* Not modeled on `NeedtTask` yet — `rbShape`'s `priority` is a
                surface-supplied extra (`RbExtras.priority`), so this reads
                the resolved shape rather than a field this port invented. */}
            <TdRow glyph={LuFlag} label="Priority">
              {shape.priority === "now" ? (
                <TdValue tone="var(--destructive)">Urgent</TdValue>
              ) : (
                <TdValue muted>Whenever</TdValue>
              )}
            </TdRow>
            <TdRow glyph={LuUsers} label="Who">
              <TdValue muted={!holder}>{holder?.name ?? "Unassigned"}</TdValue>
            </TdRow>
          </TdGroup>

          <TdGroup>
            <TdRow glyph={LuHourglass} label="Duration">
              <TdValue muted={shape.est === null}>
                {shape.est !== null ? rbDur(shape.est) : "Not set"}
              </TdValue>
            </TdRow>
            {/* //todo: no per-task minimum-chunk field yet; this stays the
                honest default until the scheduler grows one. */}
            <TdRow label="Smallest chunk" indent>
              <TdValue muted>Don&apos;t split</TdValue>
            </TdRow>
            <TdRow glyph={LuCalendarClock} label="Due">
              <TdValue
                muted={!shape.due}
                tone={shape.overdue ? "var(--destructive)" : undefined}
              >
                {shape.due ?? "Unscheduled"}
              </TdValue>
            </TdRow>
            <TdRow label="Hard deadline" indent>
              <TdSwitch
                checked={hard}
                label="Hard deadline"
                onChange={setHard}
              />
            </TdRow>
            {/* //todo: recurrence is a `Habit` concept today (`NeedtHabit`),
                not a field a plain `Task` carries — see `types.ts`. */}
            <TdRow glyph={LuRepeat} label="Repeat">
              <TdValue muted>Never</TdValue>
            </TdRow>
            {/* //todo: no reminder field on `NeedtTask` yet. */}
            <TdRow glyph={LuBell} label="Remind">
              <TdValue muted>None</TdValue>
            </TdRow>
          </TdGroup>

          <TdGroup>
            {/* //todo: no labels field on `NeedtTask` yet. */}
            <TdRow glyph={LuTag} label="Labels">
              <TdValue muted>None</TdValue>
            </TdRow>
            {/* //todo: no per-task hours override yet; every task currently
                schedules within the account's work hours. */}
            <TdRow glyph={LuClock} label="Hours">
              <TdValue>Work hours</TdValue>
            </TdRow>
          </TdGroup>

          <div style={{ padding: "8px 0" }}>
            <button
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                height: 30,
                padding: "0 8px",
                border: 0,
                cursor: "default",
                borderRadius: "var(--radius-md)",
                background: "transparent",
                font: "var(--type-ui)",
                color: "var(--text-muted)",
              }}
            >
              <Glyph of={LuPlus} size={14} />
              More settings
            </button>
          </div>

          <footer
            style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingTop: 11,
              boxShadow: "var(--border) 0 -1px 0 0 inset",
            }}
          >
            <span
              style={{
                font: "var(--type-meta)",
                color: "var(--text-disabled)",
              }}
            >
              {onSave ? "Unsaved" : "Saved"}
            </span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn" onClick={save}>
                Save
              </button>
            </span>
          </footer>
        </aside>
      </div>
    </div>
  );
}
