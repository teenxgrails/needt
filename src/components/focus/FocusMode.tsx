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
    <div className="flex h-full flex-col bg-[#1A1D1E] max-md:pb-16">
      {isProcessing && actionType && (
        <ActionOverlay
          type={actionType}
          message={actionMessage || undefined}
          onComplete={stopProcessing}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar with queued tasks */}
        <motion.aside
          aria-hidden={sessionActive}
          animate={{
            opacity: sessionActive ? 0.18 : 1,
            scale: sessionActive && !prefersReducedMotion ? 0.985 : 1,
          }}
          transition={prefersReducedMotion ? { duration: 0 } : springSoft}
          className="hidden h-full w-[244px] origin-left border-r border-[#2B2F31] bg-[#1B1D1E] lg:block"
          style={{ pointerEvents: sessionActive ? "none" : "auto" }}
        >
          <TaskQueue />
        </motion.aside>

        {/* Main content area */}
        <main className="relative min-w-0 flex-1 overflow-y-auto">
          <motion.div
            layout={!prefersReducedMotion}
            transition={prefersReducedMotion ? { duration: 0 } : springSoft}
            className="mx-auto flex min-h-full max-w-[860px] flex-col px-5 py-8 sm:px-10"
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
                  initial={
                    prefersReducedMotion ? false : { opacity: 0, scale: 0.99 }
                  }
                  animate={{ opacity: 1, scale: 1 }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, scale: 0.985 }
                  }
                  transition={
                    prefersReducedMotion ? { duration: 0 } : springSoft
                  }
                >
                  <FocusedTask task={currentTask} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </main>

        {/* Right sidebar with quick actions */}
        <motion.aside
          aria-hidden={sessionActive}
          animate={{
            opacity: sessionActive ? 0.18 : 1,
            scale: sessionActive && !prefersReducedMotion ? 0.985 : 1,
          }}
          transition={prefersReducedMotion ? { duration: 0 } : springSoft}
          className="hidden h-full w-[244px] origin-right border-l border-[#2B2F31] bg-[#1B1D1E] xl:block"
          style={{ pointerEvents: sessionActive ? "none" : "auto" }}
        >
          <QuickActions />
        </motion.aside>
      </div>
    </div>
  );
}
