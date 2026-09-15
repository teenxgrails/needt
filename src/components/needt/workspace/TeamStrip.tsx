"use client";

/* THE TEAM STRIP — who is holding what, and who is holding something up.
 *
 * PORT.md §3 "List": "Each person carries their open count and hours; the
 * ones holding something up say so in words — 'blocks one of yours'." A
 * count there would be a score; the sentence is a fact about your week, so
 * the "blocks" line only ever appears when it is true — never a zero badge.
 *
 * `PersonFace` is Workspace's own mark, not the shell's account avatar:
 * `Avatar` in `shell/chrome.tsx` is neutral chrome for the rail and the
 * composer. A person's face here carries THEIR hue, the same way a
 * project's tile carries the project's — identity read at a glance rather
 * than by name (PORT.md §2 "Project, stage, team").
 */
import * as React from "react";

import { blocking } from "@/lib/needt/derive";
import type { NeedtPerson, NeedtTask } from "@/lib/needt/types";

import { rbDur } from "../rb-shape";
import { RbGlyph } from "../ui";

/** A person's face: their hue, at rest. */
export function PersonFace({
  person,
  size = 22,
}: {
  person: NeedtPerson;
  size?: number;
}) {
  return (
    <span
      aria-label={person.name}
      title={person.name}
      style={{
        flex: "none",
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: size,
        background: `color-mix(in oklab, ${person.hue} 22%, var(--surface-raised))`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${person.hue} 45%, transparent)`,
        font: "var(--type-meta-medium)",
        fontSize: Math.round(size * 0.42),
        color: `color-mix(in oklab, ${person.hue} 78%, var(--text-primary))`,
      }}
    >
      {person.initials}
    </span>
  );
}

/**
 * The one line a blocked task owes, as a chip: a mark and a sentence, on the
 * task itself rather than tucked away in a panel — "the place you read the
 * task is the place you find out it cannot move" (PORT.md, `Team.jsx`).
 */
export function BlockedChip({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 20,
        minWidth: 0,
        padding: "0 7px 0 5px",
        borderRadius: "var(--radius-sm)",
        background: "var(--fill-2)",
        boxShadow: "var(--shadow-inset-ring)",
      }}
    >
      <span
        aria-hidden="true"
        style={{ flex: "none", display: "flex", color: "var(--text-tertiary)" }}
      >
        <RbGlyph name="lock" size={11} />
      </span>
      <span
        style={{
          minWidth: 0,
          font: "var(--type-meta)",
          color: "var(--text-tertiary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {text}
      </span>
    </span>
  );
}

export interface TeamStripProps {
  tasks: readonly NeedtTask[];
  people: readonly NeedtPerson[];
}

/**
 * The strip above the filter: what each person is carrying, and which of
 * them is holding something of yours up. Two facts and no more — see the
 * header of `Team.jsx` in the prototype for why a third (who is "on" the
 * project) is left out on purpose.
 */
export function TeamStrip({ tasks, people }: TeamStripProps) {
  const open = React.useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const blocks = React.useMemo(() => blocking(tasks), [tasks]);

  if (!people.length) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 8,
        flexWrap: "wrap",
        flex: "none",
      }}
    >
      {people.map((person) => {
        const mine = open.filter((t) => (t.holder ?? "you") === person.id);
        const mins = mine.reduce((sum, t) => sum + (t.est ?? 0), 0);
        const holds = blocks[person.id] ?? 0;
        return (
          <span
            key={person.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 40,
              padding: "0 11px 0 8px",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-raised)",
              boxShadow: "var(--shadow-ring)",
            }}
          >
            <PersonFace person={person} size={24} />
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  font: "var(--type-meta-medium)",
                  color: "var(--text-primary)",
                }}
              >
                {person.name}
              </span>
              <span
                style={{
                  font: "var(--type-meta)",
                  color: "var(--text-quaternary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {mine.length} open{mins ? ` · ${rbDur(mins)}` : ""}
              </span>
            </span>
            {holds ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  height: 20,
                  padding: "0 7px 0 5px",
                  marginLeft: 3,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--fill-destructive)",
                  color: "var(--destructive)",
                }}
              >
                <RbGlyph name="lock" size={11} />
                <span
                  style={{
                    font: "var(--type-meta-medium)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {holds === 1
                    ? "blocks one of yours"
                    : `blocks ${holds} of yours`}
                </span>
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
