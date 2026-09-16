"use client";

/* WORKSPACE — projects, with their sums.
 *
 * Ported from `Mobile.jsx`'s `MbWorkspace`. The desktop's Workspace screen
 * (`../workspace`) is List / Kanban / Flow / Team over one task list; a phone
 * keeps only the shape the prototype gives it here — the grouped list, cards
 * instead of a dense table row. Kanban, Flow and Team have no mobile form in
 * the prototype and are not built here — see this port's own report for what
 * that leaves absent.
 */
import * as React from "react";

import { projects as fixtureProjects } from "@/lib/needt/fixture";
import type { NeedtProject, NeedtTask } from "@/lib/needt/types";

import { RichBlock } from "../RichBlock";
import { type RbInput, rbMoney, rbShape } from "../rb-shape";
import { mobileGroupByProject } from "./mobile-logic";

export interface MobileWorkspaceProps {
  tasks: readonly NeedtTask[];
  projects?: readonly NeedtProject[];
  onOpenTask: (task: NeedtTask) => void;
  onToggleTask: (id: string) => void;
}

export function MobileWorkspace({
  tasks,
  projects = fixtureProjects,
  onOpenTask,
  onToggleTask,
}: MobileWorkspaceProps) {
  const open = React.useMemo(() => tasks.filter((task) => !task.done), [tasks]);
  const groups = React.useMemo(
    () => mobileGroupByProject(open, projects),
    [open, projects]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "0 16px 16px",
      }}
    >
      {groups.map((group) => (
        <section
          key={group.key}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                font: "var(--type-meta-medium)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--text-quaternary)",
              }}
            >
              {group.name}
            </span>
            <span
              style={{
                font: "var(--type-meta)",
                color: "var(--text-muted)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {group.items.length}
            </span>
            {group.value ? (
              <span
                style={{
                  marginLeft: "auto",
                  font: "var(--type-meta-medium)",
                  color: "var(--text-secondary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {rbMoney(group.value)}
              </span>
            ) : null}
          </span>
          {group.items.map((task) => {
            /* The card already sits under its own project header, so the
               project dot on the card itself would repeat it — the same
               reason the prototype clears `where` here. */
            const input: RbInput = {
              ...task,
              project: null,
              priority: task.overdue ? "now" : null,
            };
            return (
              <RichBlock
                touch
                key={task.id}
                block={rbShape(input, { layout: "card" })}
                weight="open"
                fit
                onOpen={() => onOpenTask(task)}
                onToggle={() => onToggleTask(task.id)}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
}
