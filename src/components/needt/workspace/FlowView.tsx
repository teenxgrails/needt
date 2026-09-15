"use client";

/* FLOW — what is stuck, and what unsticks the most.
 *
 * PORT.md §3: "List, Kanban and Gantt all answer 'what is there'... this one
 * draws the one thing the others cannot: the chain." Stages run left to
 * right — the same `stages` Kanban boards by (PORT.md §2) — and a task that
 * is waiting is joined by a routed link to the thing it is waiting on.
 *
 * The routing math and the ranking are pure functions in `flow-path.ts`,
 * proved there with no DOM. This file owns the one thing that needs a DOM:
 * measuring where the cards actually landed, once layout settles and on
 * resize — never inside a pointer handler, and with one `ResizeObserver` on
 * the scroller rather than one per card (PORT.md §8, rules 2 and 3).
 *
 * Cards are `RichBlock` — PORT.md §4: "Use it. Do not fork it." The blocked
 * line rides through `RbExtras.note`, the channel a surface already has for
 * telling the task object something it does not carry on its own, rather
 * than a bespoke card that would drift from every other surface's.
 */
import * as React from "react";

import { blockerOf } from "@/lib/needt/derive";
import type {
  NeedtPerson,
  NeedtProject,
  NeedtStage,
  NeedtTask,
} from "@/lib/needt/types";

import { RichBlock } from "../RichBlock";
import { type RbShape, rbShape } from "../rb-shape";
import { RbGlyph } from "../ui";
import {
  type FlowLink,
  blockedLine,
  pickFlowLead,
  routeFlowLink,
} from "./flow-path";

export interface FlowViewProps {
  tasks: readonly NeedtTask[];
  people: readonly NeedtPerson[];
  projects: readonly NeedtProject[];
  stages: readonly NeedtStage[];
  dark?: boolean;
  onOpen?: (task: NeedtTask) => void;
}

interface DrawnLink extends FlowLink {
  id: number;
  hue: string;
}

const NEUTRAL_HUE = "var(--text-disabled)";

/** The stage a task boards by, defaulting to the first stage when it has
 *  none — the same fallback Kanban uses, so the two boards never disagree
 *  about where an un-staged task sits. */
function stageOf(task: NeedtTask, stages: readonly NeedtStage[]): string {
  return task.stage ?? stages[0]?.id ?? "todo";
}

function FlowCard({
  task,
  shape,
  lead,
  dark,
  onOpen,
  setNode,
}: {
  task: NeedtTask;
  shape: RbShape;
  lead: boolean;
  dark?: boolean;
  onOpen?: () => void;
  setNode: (id: number, el: HTMLElement | null) => void;
}) {
  return (
    <div ref={(el) => setNode(task.id, el)} style={{ position: "relative" }}>
      <RichBlock block={shape} weight="open" fit dark={dark} onOpen={onOpen} />
      {/* The one card named "do this first" wears a ring in its own hue, on
          top of whatever edge `RichBlock` already drew — an overlay, so the
          task object underneath is untouched. */}
      {lead ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "var(--radius-lg)",
            boxShadow: `inset 0 0 0 1.5px color-mix(in oklab, ${
              shape.hue ?? NEUTRAL_HUE
            } 62%, transparent)`,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </div>
  );
}

export function FlowView({
  tasks,
  people,
  projects,
  stages,
  dark = false,
  onOpen,
}: FlowViewProps) {
  const open = React.useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const stuck = React.useMemo(
    () => open.filter((t) => blockerOf(t, tasks)),
    [open, tasks]
  );
  const lead = React.useMemo(() => pickFlowLead(open, tasks), [open, tasks]);

  const shapes = React.useMemo(() => {
    const map = new Map<number, RbShape>();
    for (const t of open) {
      const line = blockedLine(blockerOf(t, tasks), people);
      map.set(
        t.id,
        rbShape({ ...t, note: line ?? undefined }, { layout: "card", projects })
      );
    }
    return map;
  }, [open, tasks, people, projects]);

  /* Who is holding up the most of what is stuck, in words — the same rule
     `TeamStrip` uses: a count is a score, a sentence is a fact about your
     week. Unlike `blocking()` (person blockers only), this also credits a
     TASK blocker to whoever holds the blocking task, because a chain that
     bottoms out in a task still bottoms out with a person holding it. */
  const worst = React.useMemo(() => {
    const byPerson = new Map<string, number>();
    for (const t of stuck) {
      const blocker = blockerOf(t, tasks);
      if (!blocker) continue;
      const who =
        blocker.kind === "person" ? blocker.on : (blocker.task.holder ?? "you");
      byPerson.set(who, (byPerson.get(who) ?? 0) + 1);
    }
    let bestId: string | null = null;
    let bestN = 0;
    for (const [id, n] of byPerson) {
      if (n > bestN) {
        bestId = id;
        bestN = n;
      }
    }
    if (!bestId) return null;
    const found = people.find((p) => p.id === bestId);
    return { name: found?.name ?? bestId, n: bestN };
  }, [stuck, tasks, people]);

  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const nodeRefs = React.useRef(new Map<number, HTMLElement>());
  const setNode = React.useCallback((id: number, el: HTMLElement | null) => {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  }, []);

  const [links, setLinks] = React.useState<DrawnLink[]>([]);

  /* The connectors are measured, not guessed: a link has to land on the card
     wherever the column put it, and columns move when the window does. Read
     once per settle, never per pointer frame (PORT.md §8). */
  const measure = React.useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const box = wrap.getBoundingClientRect();
    const out: DrawnLink[] = [];
    for (const t of stuck) {
      const blocker = blockerOf(t, tasks);
      if (!blocker || blocker.kind !== "task") continue;
      const fromEl = nodeRefs.current.get(blocker.task.id);
      const toEl = nodeRefs.current.get(t.id);
      if (!fromEl || !toEl) continue;
      const fr = fromEl.getBoundingClientRect();
      const tr = toEl.getBoundingClientRect();
      const link = routeFlowLink(
        {
          left: fr.left - box.left,
          right: fr.right - box.left,
          top: fr.top - box.top,
          bottom: fr.bottom - box.top,
        },
        {
          left: tr.left - box.left,
          right: tr.right - box.left,
          top: tr.top - box.top,
          bottom: tr.bottom - box.top,
        }
      );
      out.push({
        ...link,
        id: t.id,
        hue: shapes.get(t.id)?.hue ?? NEUTRAL_HUE,
      });
    }
    setLinks(out);
  }, [stuck, tasks, shapes]);

  React.useEffect(() => {
    measure();
    /* 0.42s rise-and-settle plus a 55ms stagger; 700ms clears both
       (PORT.md §6). */
    const settle = window.setTimeout(measure, 700);
    const wrap = wrapRef.current;
    /* One observer on the scroller, never one per card (PORT.md §8, rule 3):
       a per-card observer fires through every entry's own stagger and
       hover-shadow change, and each fire re-measures everything. */
    const ro =
      typeof ResizeObserver !== "undefined" && wrap
        ? new ResizeObserver(measure)
        : null;
    if (ro && wrap) ro.observe(wrap);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(settle);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        gap: 14,
      }}
    >
      {/* The verdict, before the board. */}
      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          padding: "11px 14px",
          borderRadius: "var(--radius-xl)",
          background: "var(--surface-raised)",
          boxShadow: "var(--shadow-ring)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              font: "var(--type-page-title)",
              color: stuck.length
                ? "var(--destructive)"
                : "var(--text-primary)",
            }}
          >
            {stuck.length}
          </span>
          <span style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                font: "var(--type-ui-medium)",
                color: "var(--text-primary)",
              }}
            >
              {stuck.length === 1 ? "thing cannot move" : "things cannot move"}
            </span>
            <span
              style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}
            >
              {worst
                ? `${worst.name} holds ${worst.n} of them.`
                : "Nothing is waiting on anyone."}
            </span>
          </span>
        </span>

        {lead ? (
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 11,
              minWidth: 0,
            }}
          >
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  font: "var(--type-meta)",
                  color: "var(--text-quaternary)",
                }}
              >
                Do this first — it frees {lead.n}
              </span>
              <span
                style={{
                  font: "var(--type-ui-medium)",
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {lead.task.title}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onOpen?.(lead.task)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 30,
                padding: "0 12px",
                border: 0,
                borderRadius: "var(--radius-md)",
                cursor: "default",
                font: "var(--type-meta-medium)",
                color: "var(--text-primary)",
                background: "var(--fill-3)",
              }}
            >
              Open
              <RbGlyph name="arrow-right" size={15} />
            </button>
          </span>
        ) : null}
      </div>

      <div
        ref={wrapRef}
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          paddingBottom: 16,
        }}
      >
        {/* The chain, drawn under the cards. */}
        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 1,
            overflow: "visible",
          }}
        >
          {links.map((link) => (
            <g key={link.id}>
              <path
                d={link.d}
                fill="none"
                stroke={link.hue}
                strokeWidth={1.5}
                strokeOpacity={0.55}
                strokeLinecap="round"
              />
              <circle cx={link.x2} cy={link.y2} r={3} fill={link.hue} />
            </g>
          ))}
        </svg>

        {stages.map((stage) => {
          const items = open.filter((t) => stageOf(t, stages) === stage.id);
          const held = items.filter((t) => blockerOf(t, tasks)).length;
          return (
            <section
              key={stage.id}
              style={{
                position: "relative",
                zIndex: 2,
                flex: "0 0 auto",
                width: 252,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {/* The header states what is STUCK in the stage, not how many
                  items it holds — an item count is the one number every
                  board already shows and nobody acts on. */}
              <header
                style={{
                  display: "flex",
                  alignItems: "baseline",
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
                  {stage.name}
                </span>
                {held ? (
                  <span
                    style={{
                      marginLeft: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      height: 18,
                      padding: "0 6px 0 5px",
                      borderRadius: "var(--radius-xs)",
                      background: "var(--fill-destructive)",
                      color: "var(--destructive)",
                    }}
                  >
                    <RbGlyph name="lock" size={10} />
                    <span style={{ font: "var(--type-meta-medium)" }}>
                      {held} stuck
                    </span>
                  </span>
                ) : null}
              </header>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((t) => {
                  const shape = shapes.get(t.id);
                  if (!shape) return null;
                  return (
                    <FlowCard
                      key={t.id}
                      task={t}
                      shape={shape}
                      lead={lead?.task.id === t.id}
                      dark={dark}
                      onOpen={onOpen ? () => onOpen(t) : undefined}
                      setNode={setNode}
                    />
                  );
                })}
                {!items.length ? (
                  <span
                    style={{
                      font: "var(--type-meta)",
                      fontStyle: "italic",
                      color: "var(--text-disabled)",
                      padding: "0 2px",
                    }}
                  >
                    Nothing here.
                  </span>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
