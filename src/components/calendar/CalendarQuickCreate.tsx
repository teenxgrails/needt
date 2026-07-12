"use client";

import { useEffect, useRef, useState } from "react";

import { CalendarDays, CheckSquare2, Clock3, CornerDownLeft } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTaskStore } from "@/store/task";
import { SchedulingEnergyLevel, SchedulingTaskPriority, TaskStatus } from "@/types/task";

export interface QuickCreateSelection {
  start: Date;
  end: Date;
  allDay: boolean;
  point?: { x: number; y: number };
}

interface CalendarQuickCreateProps {
  selection?: QuickCreateSelection;
  onClose: () => void;
  onOpenTaskEditor: () => void;
  onOpenEventEditor: () => void;
}

export function CalendarQuickCreate({
  selection,
  onClose,
  onOpenTaskEditor,
  onOpenEventEditor,
}: CalendarQuickCreateProps) {
  const createTask = useTaskStore((state) => state.createTask);
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!selection) {
      setTitle("");
      return;
    }

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [selection]);

  const close = () => {
    setTitle("");
    onClose();
  };

  const create = async () => {
    if (!selection || !title.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const duration = Math.max(
        15,
        Math.round((selection.end.getTime() - selection.start.getTime()) / 60000)
      );
      await createTask({
        title: title.trim(),
        status: TaskStatus.TODO,
        startDate: selection.start,
        deadline: selection.end,
        duration,
        estimatedMinutes: duration,
        estLikely: duration,
        energyRequired: SchedulingEnergyLevel.MEDIUM,
        priorityLevel: SchedulingTaskPriority.MEDIUM,
        tagIds: [],
        projectId: null,
        isRecurring: false,
        isAutoScheduled: true,
        autoScheduled: true,
        scheduleLocked: false,
        isFrozen: false,
      });
      close();
    } finally {
      setIsCreating(false);
    }
  };

  if (!selection) return null;

  const top = Math.min(Math.max(selection.point?.y ?? 220, 84), window.innerHeight - 214);
  const left = Math.min(Math.max(selection.point?.x ?? 320, 16), window.innerWidth - 352);

  return (
    <div
      role="dialog"
      aria-label="Create task or event"
      className="fixed z-[70] w-[336px] rounded-[8px] border border-[#3A3F42] bg-[#202425] p-2 text-[#F2F2F2] shadow-2xl"
      style={{ left, top }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    >
      <div className="flex items-center gap-2 px-2 pb-2 pt-1 text-[12px] text-[#9BA1A6]">
        <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
        <span>{selection.allDay ? "All day" : "Selected time"}</span>
      </div>
      <Input
        ref={inputRef}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void create();
          }
        }}
        placeholder="What needs to happen?"
        className="h-10 border-[#3A3F42] bg-[#1B1D1E] px-3 text-[14px] text-white placeholder:text-[#737A80] focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
      />
      <div className="mt-1.5 grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => void create()}
          disabled={!title.trim() || isCreating}
          className={cn(
            "flex items-center gap-2 rounded-[5px] px-2.5 py-2 text-left text-[13px] transition-colors",
            title.trim()
              ? "bg-[var(--accent)] text-white hover:brightness-110"
              : "bg-[#2B2F31] text-[#737A80]"
          )}
        >
          <CheckSquare2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          {isCreating ? "Creating…" : "Create task"}
        </button>
        <button
          type="button"
          onClick={() => {
            close();
            onOpenEventEditor();
          }}
          className="flex items-center gap-2 rounded-[5px] px-2.5 py-2 text-left text-[13px] text-[#D7DBDE] transition-colors hover:bg-[#2B2F31]"
        >
          <Clock3 className="h-3.5 w-3.5 text-[#9BA1A6]" strokeWidth={1.8} />
          Create event
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          close();
          onOpenTaskEditor();
        }}
        className="mt-1 flex w-full items-center justify-between rounded-[5px] px-2.5 py-2 text-left text-[13px] text-[#9BA1A6] transition-colors hover:bg-[#2B2F31] hover:text-white"
      >
        <span>More task options</span>
        <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
    </div>
  );
}
