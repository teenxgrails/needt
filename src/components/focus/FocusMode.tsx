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
    <main className="needt-page-depth h-full min-h-0 overflow-y-auto px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-8 sm:pt-6">
      <FocusTimerPanel task={currentTask} />
    </main>
  );
}
