"use client";

import { type ReactNode, useState } from "react";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { motion } from "motion/react";
import { HiCheckCircle, HiClock } from "react-icons/hi";

import { logger } from "@/lib/logger";
import { dragSpring, instantTransition } from "@/lib/motion";

import { useNeedtReducedMotion } from "@/components/providers/MotionRuntime";

import { useTaskMutations } from "@/hooks/useTaskMutations";

import { useProjectStore } from "@/store/project";

import { Task } from "@/types/task";

const LOG_SOURCE = "DndProvider";

interface DndProviderProps {
  children: ReactNode;
}

export function DndProvider({ children }: DndProviderProps) {
  const { moveTask } = useTaskMutations();
  const { fetchProjects } = useProjectStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const prefersReducedMotion = useNeedtReducedMotion();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    setActiveTask(task ?? null);
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!active || !over) return;

    // Handle dropping a task onto a project
    if (
      active.data.current?.type === "task" &&
      over.data.current?.type === "project"
    ) {
      const taskId = active.id as string;
      const projectId =
        over.id === "remove-project" ? null : (over.id as string);

      try {
        await moveTask(taskId, { projectId });
        await fetchProjects();
      } catch (error) {
        void logger.error(
          "Failed to move task to project",
          {
            taskId,
            projectId,
            error: error instanceof Error ? error.message : String(error),
          },
          LOG_SOURCE
        );
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay
        dropAnimation={
          prefersReducedMotion
            ? null
            : {
                duration: 180,
                easing: "cubic-bezier(0.2, 0, 0, 1)",
              }
        }
      >
        {activeTask ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0.9 }}
            animate={{ opacity: 0.98, scale: prefersReducedMotion ? 1 : 1.015 }}
            transition={prefersReducedMotion ? instantTransition : dragSpring}
            className="needt-overlay-shadow flex min-w-56 max-w-80 origin-center items-center gap-2 rounded-md border border-[var(--border-control)] bg-[var(--surface-control)] px-3 py-2 text-[var(--text-primary)] shadow-md"
          >
            <HiCheckCircle className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {activeTask.title}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-[var(--text-secondary)]">
              <HiClock className="h-3.5 w-3.5" />
              {activeTask.duration ?? activeTask.estimatedMinutes ?? 30}m
            </span>
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
