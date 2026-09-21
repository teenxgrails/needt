"use client";

/* THE GRID'S OWN BLOCK — a thin wrap of `RichBlock`, nothing more.
 *
 * The task object is `RichBlock.tsx` everywhere in the product (PORT.md §4);
 * this file only supplies what a grid surface knows that the stored task
 * does not — a display start/end and the height/width the grid's own
 * geometry already computed. It never measures itself: `height` comes from
 * `geometry.heightForDuration`, `width` from the overlap layout, so there is
 * no `ResizeObserver` per card (PORT.md §8's "do not observe every card").
 */
import * as React from "react";

import type { NeedtProject } from "@/lib/needt/types";

import { formatClock } from "./geometry";
import { rbShape } from "../rb-shape";
import type { RbWeight } from "../rb-layout";
import { RichBlock } from "../RichBlock";

import type { CalendarEntry } from "./entries";

export interface CalendarBlockProps {
  entry: CalendarEntry;
  projects?: readonly NeedtProject[];
  /** The height the grid's geometry gave this block. */
  height: number;
  /** The width the overlap layout gave this block, in whatever unit the
   *  wrapping box already applies (a CSS string does the actual sizing). */
  width?: number | null;
  weight?: Extract<RbWeight, "open" | "compressed">;
  use24Hour?: boolean;
  dark?: boolean;
  onOpen?: (entry: CalendarEntry) => void;
  onToggle?: (entry: CalendarEntry) => void;
}

export function CalendarBlock({
  entry,
  projects,
  height,
  width = null,
  weight = "open",
  use24Hour = true,
  dark = false,
  onOpen,
  onToggle,
}: CalendarBlockProps) {
  const withSpan = React.useMemo(() => {
    if (typeof entry.at !== "number") return entry;
    const end = entry.at + (entry.est ?? 30) / 60;
    return {
      ...entry,
      from: formatClock(entry.at, use24Hour),
      to: formatClock(end, use24Hour),
    };
  }, [entry, use24Hour]);

  const block = rbShape(withSpan, { layout: "block", projects });

  return (
    <RichBlock
      block={block}
      weight={weight}
      height={height}
      width={width}
      dark={dark}
      onOpen={onOpen ? () => onOpen(entry) : undefined}
      onToggle={onToggle ? () => onToggle(entry) : undefined}
    />
  );
}
