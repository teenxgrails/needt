"use client";

/* THE BRIEF BOARD — one object list, two readings.
 *
 * Owns the state `ProseForm` and `CanvasForm` both read and write, so
 * writing a line in Prose is placing an object on Canvas and dragging an
 * object on Canvas is writing a line in Prose — never two copies of the
 * brief. Ported from `Brief.jsx`'s own top-level component, which held this
 * state and switched between the two renderings itself.
 */
import * as React from "react";

import { CanvasForm } from "./CanvasForm";
import { ProseForm } from "./ProseForm";
import { BRIEF_SEED } from "./brief-seed";
import { type BriefObject, type BriefObjectKind, briefBlank } from "./brief-types";

export type BriefFormKind = "prose" | "canvas";

export interface BriefBoardProps {
  form: BriefFormKind;
  /** Defaults to the brief's own seed — composition, not fixture data. */
  seed?: readonly BriefObject[];
  marks?: boolean;
  timeline?: boolean;
}

function nextSpot(objects: readonly BriefObject[], w: number, h: number, canvasWidth: number) {
  const bottom = objects.reduce((m, o) => Math.max(m, o.y + (o.h ?? 120)), 0);
  const right = canvasWidth - w - 24;
  for (let y = 32; y < bottom + 400; y += 24) {
    for (let x = 40; x < right; x += 24) {
      const clash = objects.some(
        (o) => !(x + w < o.x - 16 || x > o.x + (o.w ?? 240) + 16 || y + h < o.y - 16 || y > o.y + (o.h ?? 110) + 16)
      );
      if (!clash) return { x, y };
    }
  }
  return { x: 40, y: bottom + 32 };
}

const WIDTH_FOR: Readonly<Record<BriefObjectKind, number>> = {
  text: 320,
  heading: 320,
  checklist: 320,
  quote: 320,
  card: 320,
  metric: 240,
  marey: 300,
  image: 268,
  drawing: 268,
  email: 320,
};

/**
 * The board. `form` picks which reading is drawn; the object list underneath
 * is the same either way.
 */
export function BriefBoard({ form, seed = BRIEF_SEED, marks = true, timeline = true }: BriefBoardProps) {
  const [objects, setObjects] = React.useState<readonly BriefObject[]>(seed);
  const [tool, setTool] = React.useState<BriefObjectKind | null>(null);

  const editObject = React.useCallback((id: string, value: string, index?: number) => {
    setObjects((list) =>
      list.map((o) => {
        if (o.id !== id) return o;
        if (index != null && o.items) {
          return { ...o, items: o.items.map((it, i) => (i === index ? { ...it, label: value } : it)) };
        }
        return { ...o, text: value };
      })
    );
  }, []);

  const removeObject = React.useCallback((id: string) => {
    setObjects((list) => list.filter((o) => o.id !== id));
  }, []);

  const toggleItem = React.useCallback((id: string, index: number) => {
    setObjects((list) =>
      list.map((o) =>
        o.id === id && o.items
          ? { ...o, items: o.items.map((it, i) => (i === index ? { ...it, done: !it.done } : it)) }
          : o
      )
    );
  }, []);

  /* Written in the flow: it lands after whatever is already on the page and
     is tagged `tail` so Prose keeps it in writing order while it still takes
     a place on the canvas. */
  const addToFlow = React.useCallback((kind: BriefObjectKind) => {
    setObjects((list) => {
      const y = list.reduce((m, o) => Math.max(m, o.y + (o.h ?? 120)), 0) + 20;
      const blank = briefBlank(kind, `w${Date.now()}`, { x: 40, y });
      return [...list, { ...blank, tail: true, w: WIDTH_FOR[kind] }];
    });
  }, []);

  /* Placed by hand on Canvas: the first clear space, or the exact spot the
     click landed on. */
  const place = React.useCallback((kind: BriefObjectKind, at: { x: number; y: number }) => {
    setObjects((list) => {
      const w = WIDTH_FOR[kind];
      const spot = at ?? nextSpot(list, w, 120, 1000);
      return [...list, briefBlank(kind, `n${Date.now()}`, spot)];
    });
  }, []);

  const moveObject = React.useCallback((id: string, at: { x: number; y: number }) => {
    setObjects((list) => list.map((o) => (o.id === id ? { ...o, x: at.x, y: at.y } : o)));
  }, []);

  /* Needt writes what the week came to, in its own ink. A real close reads
     the checklist objects for what did and did not get done; nothing here is
     wired to a scheduler yet, so the summary is honest about closing zero. */
  const closeWeek = React.useCallback(() => {
    setObjects((list) => {
      const now = Date.now();
      const y = list.reduce((m, o) => Math.max(m, o.y + (o.h ?? 120)), 0) + 28;
      const items = list.filter((o) => o.kind === "checklist").flatMap((o) => o.items ?? []);
      const kept = items.filter((i) => i.done);
      const over = items.filter((i) => !i.done);
      const total = items.length || 1;
      const line = kept.length
        ? `Closed ${kept.length} of ${total} — ${Math.round((kept.length / total) * 100)}% of the week. ${
            over.length
              ? `${over.length} ${over.length === 1 ? "thing did not move" : "things did not move"}: ${over
                  .map((i) => i.label)
                  .join(", ")}. They carry into next week unless you drop them.`
              : "Nothing carried over."
          }`
        : "Nothing was closed this week. Everything on the list carries over.";
      return [
        ...list,
        { id: `w${now}`, kind: "heading", author: "needt", x: 40, y, w: 460, tail: true, text: "Week — closed" },
        { id: `w${now + 1}`, kind: "text", author: "needt", x: 40, y: y + 44, w: 460, tail: true, typed: true, text: line },
        ...(over.length
          ? [
              {
                id: `w${now + 2}`,
                kind: "checklist" as const,
                author: "needt",
                x: 40,
                y: y + 130,
                w: 300,
                tail: true,
                items: over.map((i) => ({ label: i.label, done: false })),
              },
            ]
          : []),
      ];
    });
  }, []);

  if (form === "prose") {
    return (
      <ProseForm
        objects={objects}
        onEdit={editObject}
        onAdd={addToFlow}
        onRemove={removeObject}
        onToggleItem={toggleItem}
        onCloseWeek={closeWeek}
        marks={marks}
        timeline={timeline}
      />
    );
  }

  return (
    <CanvasForm
      objects={objects}
      tool={tool}
      onSelectTool={setTool}
      onPlace={place}
      onMove={moveObject}
      onRemove={removeObject}
      onCloseWeek={closeWeek}
    />
  );
}
