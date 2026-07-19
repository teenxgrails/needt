"use client";

import { useEffect, useState } from "react";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { ActionOverlay } from "@/components/ui/action-overlay";

import { springSoft } from "@/lib/motion";

import { useFocusModeStore } from "@/store/focusMode";

import { FocusTimerPanel } from "./FocusTimerPanel";
import { FocusedTask } from "./FocusedTask";
import { QuickActions } from "./QuickActions";
import { TaskQueue } from "./TaskQueue";

export function FocusMode() {
  const [mounted, setMounted] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Add hydration safety
  const {
    getCurrentTask,
    isProcessing,
    actionType,
    actionMessage,
    stopProcessing,
  } = useFocusModeStore();

  // Get current task and queued tasks - do this before any conditional returns
  const currentTask = getCurrentTask();

  // This effect will only run on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // If not mounted yet, render a simple loading state
  if (!mounted) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading focus mode...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--surface-canvas)]">
      {isProcessing && actionType && (
        <ActionOverlay
          type={actionType}
          message={actionMessage || undefined}
          onComplete={stopProcessing}
        />
      )}

      <header className="flex min-h-16 flex-none items-center border-b border-[var(--border-subtle)] px-5 sm:min-h-14 sm:px-8">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">
            Focus
          </h1>
          <p className="text-[12px] text-[var(--text-muted)]">
            One task, one timer, less noise.
          </p>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid min-h-full max-w-[1120px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px]">
          <motion.div
            layout={!prefersReducedMotion}
            transition={prefersReducedMotion ? { duration: 0 } : springSoft}
            className="min-w-0 px-4 py-6 sm:px-10 sm:py-10"
          >
            <FocusTimerPanel
              task={currentTask}
              immersive={sessionActive}
              onRunningChange={setSessionActive}
            />
            <AnimatePresence initial={false}>
              {!sessionActive && (
                <motion.div
                  key="focus-details"
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={
                    prefersReducedMotion ? { duration: 0 } : springSoft
                  }
                >
                  <FocusedTask task={currentTask} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.aside
            aria-hidden={sessionActive}
            animate={{ opacity: sessionActive ? 0.35 : 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : springSoft}
            className="border-t border-[var(--border-subtle)] bg-[var(--surface-panel)] pb-[env(safe-area-inset-bottom)] xl:border-l xl:border-t-0"
            style={{ pointerEvents: sessionActive ? "none" : "auto" }}
          >
            <div className="border-b border-[var(--border-subtle)]">
              <div className="px-4 pt-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Next up
              </div>
              <TaskQueue />
            </div>
            <QuickActions />
          </motion.aside>
        </div>
      </main>
    </div>
  );
}
