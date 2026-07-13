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
import { motion, useReducedMotion } from "motion/react";
import { HiCheckCircle, HiClock } from "react-icons/hi";

import { logger } from "@/lib/logger";
import { quickEase, springSnappy } from "@/lib/motion";

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
  const prefersReducedMotion = useReducedMotion();

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
                duration: 220,
                easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
              }
        }
      >
        {activeTask ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0.8, scale: 0.98 }}
            animate={{ opacity: 0.98, scale: prefersReducedMotion ? 1 : 1.03 }}
            transition={prefersReducedMotion ? quickEase : springSnappy}
            className="flex min-w-56 max-w-80 items-center gap-2 rounded-md border border-[#4A4F52] bg-[#303335] px-3 py-2 text-[#F4F5F6] shadow-[0_12px_30px_rgba(0,0,0,0.32)]"
          >
            <HiCheckCircle className="h-4 w-4 shrink-0 text-[#A9B0B5]" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {activeTask.title}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-[#A1A7AC]">
              <HiClock className="h-3.5 w-3.5" />
              {activeTask.duration ?? activeTask.estimatedMinutes ?? 30}m
            </span>
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
