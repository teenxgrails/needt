"use client";

import { useState } from "react";

import { HiClock, HiPencil, HiTrash } from "react-icons/hi";

import { TaskModal } from "@/components/tasks/TaskModal";
import { Button } from "@/components/ui/button";

import { logger } from "@/lib/logger";

import { useTaskMutations } from "@/hooks/useTaskMutations";

import { useFocusModeStore } from "@/store/focusMode";
import { useTaskStore } from "@/store/task";

import { NewTask } from "@/types/task";

const LOG_SOURCE = "FocusQuickActions";

export function QuickActions() {
  const { completeCurrentTask, postponeTask, getCurrentTask } =
    useFocusModeStore();
  const { tags, createTag } = useTaskStore();
  const { updateTask, deleteTask } = useTaskMutations();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const currentTask = getCurrentTask();

  const handleEditTask = async (taskData: NewTask) => {
    if (!currentTask) return;

    try {
      await updateTask(currentTask.id, taskData);
      setIsEditModalOpen(false);
    } catch (error) {
      logger.error(
        "Failed to update task in focus mode",
        {
          error: error instanceof Error ? error.message : String(error),
          taskId: currentTask.id,
        },
        LOG_SOURCE
      );
    }
  };

  const handleDeleteTask = async () => {
    if (!currentTask) return;

    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask(currentTask.id);
      } catch (error) {
        logger.error(
          "Failed to delete task in focus mode",
          {
            error: error instanceof Error ? error.message : String(error),
            taskId: currentTask.id,
          },
          LOG_SOURCE
        );
      }
    }
  };

  return (
    <div className="flex flex-col space-y-4 p-4">
      <h2 className="text-lg font-semibold">Quick Actions</h2>

      {!currentTask && (
        <p className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          Pick a task from the queue to enable these actions. A free session
          runs without one.
        </p>
      )}

      <div className="glass--subtle flex flex-col space-y-2 p-3">
        {/* Complete Task */}
        <Button
          variant="outline"
          onClick={() => completeCurrentTask()}
          className="justify-start"
          disabled={!currentTask}
        >
          <span className="flex items-center">
            <span className="mr-2">✅</span>
            Complete Task
          </span>
        </Button>

        {/* Edit Task */}
        <Button
          variant="outline"
          onClick={() => setIsEditModalOpen(true)}
          className="justify-start"
          disabled={!currentTask}
        >
          <span className="flex items-center">
            <HiPencil className="mr-2 h-4 w-4" />
            Edit Task
          </span>
        </Button>

        {/* Delete Task */}
        <Button
          variant="outline"
          onClick={handleDeleteTask}
          className="justify-start text-destructive hover:text-destructive"
          disabled={!currentTask}
        >
          <span className="flex items-center">
            <HiTrash className="mr-2 h-4 w-4" />
            Delete Task
          </span>
        </Button>

        <div className="my-2 h-px bg-white/10" />
        <h3 className="text-sm font-medium">Postpone Task</h3>

        {/* Postpone Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => postponeTask("1h")}
            className="flex items-center"
            disabled={!currentTask}
          >
            <HiClock className="mr-1 h-3 w-3" /> 1 hour
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => postponeTask("3h")}
            className="flex items-center"
            disabled={!currentTask}
          >
            <HiClock className="mr-1 h-3 w-3" /> 3 hours
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => postponeTask("1d")}
            className="flex items-center"
            disabled={!currentTask}
          >
            <HiClock className="mr-1 h-3 w-3" /> 1 day
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => postponeTask("1w")}
            className="flex items-center"
            disabled={!currentTask}
          >
            <HiClock className="mr-1 h-3 w-3" /> 1 week
          </Button>
        </div>
      </div>

      {/* Task Edit Modal */}
      {currentTask && (
        <TaskModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleEditTask}
          task={currentTask}
          tags={tags}
          onCreateTag={(name, color) => createTag({ name, color: color || "" })}
        />
      )}
    </div>
  );
}
