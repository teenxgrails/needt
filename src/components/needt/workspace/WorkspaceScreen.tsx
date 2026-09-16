"use client";

/* THE WORKSPACE — List, Kanban and Flow over one task list, with the team
 * strip that says who is carrying what before anything gets filtered.
 *
 * PORT.md §3 "Workspace". List groups by project and draws the grouped
 * table (`TaskRow`, `RichBlock` at `weight="row"`); Kanban and Flow both lay
 * tasks out by `stage` — PORT.md §2: "Stage: ordered {id, name} per
 * project — the Flow/Kanban columns" — so the two board views share one
 * grouping, not two.
 *
 * This file owns the screen shell: the view switch, the filter tabs, and
 * List's own table. Kanban's board is small enough to stay here; Flow gets
 * its own file because the link routing and the ranking earn one.
 *
 * Exported, not mounted: nothing here reaches into `shell/**` or renders
 * itself inside `AppShell`/`ScreenFrame` — the caller drops this in as
 * content.
 */
import * as React from "react";

import { project as resolveProject } from "@/lib/needt/derive";
import type {
  NeedtPerson,
  NeedtProject,
  NeedtStage,
  NeedtTask,
} from "@/lib/needt/types";

import { RichBlock } from "../RichBlock";
import { rbShape } from "../rb-shape";
import { FlowView } from "./FlowView";
import { TaskGroupHeader, TaskRow, TaskTableHead } from "./TaskTable";
import { TeamStrip } from "./TeamStrip";

export type WorkspaceView = "list" | "board" | "flow";
export type WorkspaceFilter = "all" | "today" | "later" | "done";

export interface WorkspaceScreenProps {
  tasks: readonly NeedtTask[];
  people: readonly NeedtPerson[];
  projects: readonly NeedtProject[];
  stages: readonly NeedtStage[];
  dark?: boolean;
  onToggle?: (id: string) => void;
  onOpen?: (task: NeedtTask) => void;
  onCreate?: () => void;
  onTogglePart?: (taskId: string, index: number) => void;
  onPromotePart?: (taskId: string, index: number) => void;
}

interface ProjectGroup {
  key: string;
  name: string;
  items: NeedtTask[];
}

/** Tasks grouped by their resolved project, in the project registry's own
 *  order, with an unresolved bucket last — never first, so "No project"
 *  does not read as the default. */
function groupByProject(
  items: readonly NeedtTask[],
  projects: readonly NeedtProject[]
): ProjectGroup[] {
  const byId = new Map<string, ProjectGroup>();
  const none: ProjectGroup = { key: "__none", name: "No project", items: [] };
  for (const task of items) {
    const resolved = resolveProject(task.project, projects);
    if (!resolved) {
      none.items.push(task);
      continue;
    }
    let group = byId.get(resolved.id);
    if (!group) {
      group = { key: resolved.id, name: resolved.name, items: [] };
      byId.set(resolved.id, group);
    }
    group.items.push(task);
  }
  const ordered = projects
    .map((p) => byId.get(p.id))
    .filter((g): g is ProjectGroup => Boolean(g));
  if (none.items.length) ordered.push(none);
  return ordered;
}

/** The `stage` a task boards by, defaulting to the first stage when it has
 *  none — the same fallback Flow uses, so the two boards never disagree
 *  about where an un-staged task sits. */
function stageOf(task: NeedtTask, stages: readonly NeedtStage[]): string {
  return task.stage ?? stages[0]?.id ?? "todo";
}

function ViewToggle({
  value,
  onChange,
}: {
  value: WorkspaceView;
  onChange: (v: WorkspaceView) => void;
}) {
  const items: Array<{ value: WorkspaceView; label: string }> = [
    { value: "list", label: "List" },
    { value: "board", label: "Kanban" },
    { value: "flow", label: "Flow" },
  ];
  return (
    <div
      role="group"
      aria-label="Workspace view"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 2,
        borderRadius: "var(--radius-lg)",
        background: "var(--fill-2)",
      }}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            style={{
              height: 26,
              padding: "0 11px",
              border: 0,
              borderRadius: "var(--radius-md)",
              cursor: "default",
              font: "var(--type-meta-medium)",
              color: active ? "var(--text-primary)" : "var(--text-quaternary)",
              background: active ? "var(--surface-raised)" : "transparent",
              boxShadow: active ? "var(--shadow-ring)" : "none",
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function FilterTabs({
  value,
  onChange,
  counts,
}: {
  value: WorkspaceFilter;
  onChange: (v: WorkspaceFilter) => void;
  counts: Record<WorkspaceFilter, number | null>;
}) {
  const items: Array<{ value: WorkspaceFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "today", label: "Today" },
    { value: "later", label: "Later" },
    { value: "done", label: "Done" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Task filter"
      style={{ display: "flex", alignItems: "center", gap: 4 }}
    >
      {items.map((item) => {
        const active = item.value === value;
        const count = counts[item.value];
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 10px",
              border: 0,
              borderRadius: "var(--radius-md)",
              cursor: "default",
              font: "var(--type-meta-medium)",
              color: active ? "var(--text-primary)" : "var(--text-quaternary)",
              background: active ? "var(--fill-3)" : "transparent",
            }}
          >
            {item.label}
            {count != null ? (
              <span
                style={{
                  font: "var(--type-meta)",
                  color: "var(--text-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function KanbanCard({
  task,
  projects,
  dark,
  onOpen,
}: {
  task: NeedtTask;
  projects: readonly NeedtProject[];
  dark?: boolean;
  onOpen?: () => void;
}) {
  return (
    <RichBlock
      block={rbShape(task, { layout: "card", projects })}
      weight="open"
      fit
      dark={dark}
      onOpen={onOpen}
    />
  );
}

function KanbanBoard({
  tasks,
  stages,
  projects,
  dark,
  onOpen,
}: {
  tasks: readonly NeedtTask[];
  stages: readonly NeedtStage[];
  projects: readonly NeedtProject[];
  dark?: boolean;
  onOpen?: (task: NeedtTask) => void;
}) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: `repeat(${stages.length || 1}, minmax(0,1fr))`,
        gap: 16,
        paddingBottom: 20,
      }}
    >
      {stages.map((stage) => {
        const items = tasks.filter((t) => stageOf(t, stages) === stage.id);
        return (
          <section
            key={stage.id}
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flex: "none",
                height: 28,
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
                {stage.name}
              </span>
              <span
                style={{
                  font: "var(--type-meta)",
                  color: "var(--text-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {items.length}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 8,
                borderRadius: "var(--radius-3xl)",
                background: "var(--fill-2)",
              }}
            >
              {items.length ? (
                items.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    projects={projects}
                    dark={dark}
                    onOpen={onOpen ? () => onOpen(task) : undefined}
                  />
                ))
              ) : (
                <p
                  style={{
                    margin: "auto",
                    font: "var(--type-meta)",
                    fontStyle: "italic",
                    color: "var(--text-muted)",
                  }}
                >
                  Nothing in this column.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function WorkspaceScreen({
  tasks,
  people,
  projects,
  stages,
  dark = false,
  onToggle,
  onOpen,
  onCreate,
  onTogglePart,
  onPromotePart,
}: WorkspaceScreenProps) {
  const [view, setView] = React.useState<WorkspaceView>("list");
  const [filter, setFilter] = React.useState<WorkspaceFilter>("all");

  const open = React.useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const done = React.useMemo(() => tasks.filter((t) => t.done), [tasks]);
  const today = React.useMemo(
    () =>
      open.filter((t) => typeof t.time === "string" && t.time.includes(":")),
    [open]
  );
  const shown = React.useMemo(
    () =>
      filter === "done"
        ? done
        : filter === "later"
          ? []
          : filter === "today"
            ? today
            : open,
    [filter, done, today, open]
  );

  const groups = React.useMemo(
    () => groupByProject(shown, projects),
    [shown, projects]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        gap: 16,
      }}
    >
      <div
        style={{ flex: "none", display: "flex", alignItems: "center", gap: 12 }}
      >
        <ViewToggle value={view} onChange={setView} />
        {onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            style={{
              marginLeft: "auto",
              height: 30,
              padding: "0 12px",
              border: 0,
              borderRadius: "var(--radius-md)",
              cursor: "default",
              font: "var(--type-meta-medium)",
              color: "var(--accent)",
              background: "var(--fill-accent)",
            }}
          >
            New task
          </button>
        ) : null}
      </div>

      <TeamStrip tasks={tasks} people={people} />

      {view !== "flow" ? (
        <FilterTabs
          value={filter}
          onChange={setFilter}
          counts={{
            all: open.length,
            today: today.length,
            later: null,
            done: done.length,
          }}
        />
      ) : null}

      {view === "flow" ? (
        <FlowView
          tasks={tasks}
          people={people}
          projects={projects}
          stages={stages}
          dark={dark}
          onOpen={onOpen}
        />
      ) : view === "board" ? (
        <KanbanBoard
          tasks={shown}
          stages={stages}
          projects={projects}
          dark={dark}
          onOpen={onOpen}
        />
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {shown.length === 0 ? (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "grid",
                placeItems: "center",
              }}
            >
              <p
                style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}
              >
                Nothing here yet.
              </p>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  background: "var(--background)",
                }}
              >
                <TaskTableHead />
              </div>
              {groups.map((group, i) => (
                <div
                  key={group.key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginTop: i ? 11 : 0,
                  }}
                >
                  <TaskGroupHeader
                    name={group.name}
                    count={group.items.length}
                    sum={group.items.reduce(
                      (sum, t) => sum + (t.value ?? 0),
                      0
                    )}
                  />
                  {group.items.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      people={people}
                      allTasks={tasks}
                      projects={projects}
                      onToggle={onToggle}
                      onOpen={onOpen}
                      onTogglePart={onTogglePart}
                      onPromotePart={onPromotePart}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
