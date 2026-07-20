"use client";

import type { ComponentType } from "react";

import {
  CalendarDays,
  Columns3,
  GalleryHorizontalEnd,
  List,
  Rows3,
  Table2,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { BoardViewType } from "./board-view-types";

interface ViewDefinition {
  type: BoardViewType;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

export const BOARD_VIEW_DEFINITIONS: ViewDefinition[] = [
  {
    type: "table",
    label: "Table",
    description: "Scan fields in a compact grid",
    icon: Table2,
  },
  {
    type: "board",
    label: "Board",
    description: "Move tasks between stages",
    icon: Columns3,
  },
  {
    type: "list",
    label: "List",
    description: "A calm, grouped task list",
    icon: List,
  },
  {
    type: "timeline",
    label: "Timeline",
    description: "See scheduled work across days",
    icon: Rows3,
  },
  {
    type: "calendar",
    label: "Calendar",
    description: "Tasks and calendar events by date",
    icon: CalendarDays,
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "Browse tasks as visual cards",
    icon: GalleryHorizontalEnd,
  },
];

export function BoardViewIcon({
  type,
  className,
}: {
  type: BoardViewType;
  className?: string;
}) {
  const definition = BOARD_VIEW_DEFINITIONS.find((view) => view.type === type);
  const Icon = definition?.icon ?? Columns3;
  return <Icon className={className} />;
}

export function BoardViewTabs({
  value,
  onChange,
}: {
  value: BoardViewType;
  onChange: (view: BoardViewType) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Board views"
      className="flex min-w-max items-center gap-0.5"
    >
      {BOARD_VIEW_DEFINITIONS.map((view) => {
        const Icon = view.icon;
        const selected = value === view.type;
        return (
          <button
            key={view.type}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(view.type)}
            className={cn(
              "relative flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-control)]",
              selected
                ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{view.label}</span>
            {selected && (
              <span className="absolute inset-x-2 -bottom-[5px] h-px bg-[var(--text-secondary)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
