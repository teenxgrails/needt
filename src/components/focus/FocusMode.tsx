"use client";

import { FocusTimerPanel } from "@/components/focus/FocusTimerPanel";

import { useFocusModeStore } from "@/store/focusMode";
import { useTaskStore } from "@/store/task";

export function FocusMode() {
  const currentTaskId = useFocusModeStore((state) => state.currentTaskId);
  const currentTask = useTaskStore((state) =>
    currentTaskId
      ? (state.tasks.find((task) => task.id === currentTaskId) ?? null)
      : null
  );

  return (
    <main className="needt-page-depth flex h-full min-h-0 items-center justify-center overflow-y-auto px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-8 sm:px-8 sm:pb-8">
      <FocusTimerPanel task={currentTask} />
    </main>
  );
}
