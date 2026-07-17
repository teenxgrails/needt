"use client";

import { useState } from "react";

import {
  AlertCircle,
  Archive,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  FolderPlus,
  Link2,
  Moon,
  MoreHorizontal,
  Package,
  Play,
  Puzzle,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { StartTaskModal } from "@/components/tasks/StartTaskModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { addDays, newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

import { useTaskMutations } from "@/hooks/useTaskMutations";

import { useFocusModeStore } from "@/store/focusMode";
import { useProjectStore } from "@/store/project";

import {
  NewTask,
  Priority,
  SchedulingEnergyLevel,
  SchedulingTaskPriority,
  Task,
  TaskStatus,
} from "@/types/task";

const LOG_SOURCE = "CalendarTaskActionsMenu";
const MENU_ITEM_CLASS =
  "h-8 gap-2 rounded-md px-2 py-1.5 text-[13px] font-normal text-[var(--text-primary)] focus:bg-[var(--menu-item-hover)] focus:text-[var(--text-primary)] [&>svg]:size-4 [&>svg]:text-[var(--text-secondary)]";

interface CalendarTaskActionsMenuProps {
  task: Task;
  onOpenTask: (taskId: string) => void;
}

function duplicatePayload(task: Task, suffix = "copy"): NewTask {
  return {
    title: `${task.title} ${suffix}`,
    description: task.description,
    status: TaskStatus.TODO,
    dueDate: task.dueDate,
    startDate: task.startDate,
    duration: task.duration,
    priority: task.priority,
    energyLevel: task.energyLevel,
    preferredTime: task.preferredTime,
    energyRequired: task.energyRequired,
    estimatedMinutes: task.estimatedMinutes,
    minChunkMinutes: task.minChunkMinutes,
    maxChunkMinutes: task.maxChunkMinutes,
    deadline: task.deadline,
    priorityLevel: task.priorityLevel,
    contextTag: task.contextTag,
    projectId: task.projectId,
    recurrenceRule: task.recurrenceRule,
    isRecurring: task.isRecurring,
    isAutoScheduled: task.isAutoScheduled,
    scheduleLocked: false,
    tagIds: task.tags.map((tag) => tag.id),
  };
}

export function CalendarTaskActionsMenu({
  task,
  onOpenTask,
}: CalendarTaskActionsMenuProps) {
  const [startModalOpen, setStartModalOpen] = useState(false);
  const { createTask, updateTask, completeTask, deleteTask } =
    useTaskMutations();
  const createProject = useProjectStore((state) => state.createProject);
  const switchToTask = useFocusModeStore((state) => state.switchToTask);
  const router = useRouter();

  const startFocus = () => {
    // Bind this task in Focus, then open the Focus page to start a session.
    switchToTask(task.id);
    router.push("/focus");
  };

  const run = (label: string, action: () => Promise<unknown>) => {
    void action().catch((error: unknown) => {
      void logger.error(
        `${label} failed`,
        {
          taskId: task.id,
          error: error instanceof Error ? error.message : String(error),
        },
        LOG_SOURCE
      );
    });
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/tasks?task=${task.id}`
    );
    toast.success("Task link copied");
  };

  const cancelTask = () =>
    updateTask(task.id, {
      isAutoScheduled: false,
      autoScheduled: false,
      scheduledStart: null,
      scheduledEnd: null,
      scheduleLocked: false,
    });

  const postponeTask = () => {
    const tomorrow = addDays(newDate(), 1);
    tomorrow.setHours(0, 0, 0, 0);
    return updateTask(task.id, {
      startDate: tomorrow,
      postponedUntil: tomorrow,
      isAutoScheduled: true,
      scheduleLocked: false,
    });
  };

  const makeAsap = () =>
    updateTask(task.id, {
      startDate: newDate(),
      postponedUntil: null,
      priority: Priority.HIGH,
      priorityLevel: SchedulingTaskPriority.URGENT,
      isAutoScheduled: true,
      scheduleLocked: false,
    });

  const addTime = () => {
    const currentDuration = task.duration ?? task.estimatedMinutes ?? 30;
    return updateTask(task.id, {
      duration: currentDuration + 15,
      estimatedMinutes: currentDuration + 15,
    });
  };

  const createProjectFromTask = async () => {
    const project = await createProject({
      name: task.title,
      description: task.description ?? undefined,
      color: "#555B5F",
    });
    await updateTask(task.id, { projectId: project.id });
    toast.success("Project created from task");
  };

  const saveTemplate = async () => {
    const key = "needt-task-templates";
    const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<
      Record<string, unknown>
    >;
    localStorage.setItem(
      key,
      JSON.stringify([
        ...existing,
        {
          id: `${task.id}-${newDate().getTime()}`,
          name: task.title,
          description: task.description ?? "",
          duration: String(task.duration ?? task.estimatedMinutes ?? 30),
          priority: task.priority ?? Priority.NONE,
          energyRequired: task.energyRequired ?? SchedulingEnergyLevel.MEDIUM,
          contextTag: task.contextTag ?? "general",
        },
      ])
    );
    toast.success("Task saved as template");
  };

  const unschedule = () =>
    updateTask(task.id, {
      isAutoScheduled: false,
      autoScheduled: false,
      scheduledStart: null,
      scheduledEnd: null,
      scheduleLocked: false,
    });

  const archive = () =>
    updateTask(task.id, {
      status: TaskStatus.COMPLETED,
      scheduledStart: null,
      scheduledEnd: null,
      scheduleLocked: false,
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Task actions"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded border border-transparent text-[var(--text-secondary)] opacity-0 transition-[opacity,background-color,border-color,color] duration-150 hover:border-[var(--control-border)] hover:bg-[var(--control-bg)] hover:text-[var(--text-primary)] group-hover:opacity-100 data-[state=open]:border-[var(--control-border)] data-[state=open]:bg-[var(--control-bg)] data-[state=open]:text-[var(--text-primary)] data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="right"
          sideOffset={6}
          collisionPadding={10}
          className="w-[220px] border-[var(--menu-border)] bg-[var(--menu-bg)] p-1 text-[var(--text-primary)] shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() => run("Complete task", () => completeTask(task.id))}
          >
            <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[var(--color-success)] text-white">
              <Check className="h-3 w-3" />
            </span>
            Complete task
          </DropdownMenuItem>
          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() => run("Cancel task", cancelTask)}
          >
            <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[var(--color-danger)] text-[var(--surface-panel)]">
              <X className="h-3.5 w-3.5" />
            </span>
            Cancel task
          </DropdownMenuItem>

          <DropdownMenuSeparator className="-mx-1 my-1 bg-[var(--border-subtle)]" />

          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() => run("Copy task link", copyLink)}
          >
            <Link2 />
            Copy link
          </DropdownMenuItem>
          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() => onOpenTask(task.id)}
          >
            <ExternalLink />
            Open task
          </DropdownMenuItem>

          <DropdownMenuSeparator className="-mx-1 my-1 bg-[var(--border-subtle)]" />

          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() => setStartModalOpen(true)}
          >
            <Play />
            Start task now
          </DropdownMenuItem>
          <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={startFocus}>
            <Timer />
            Start focus
          </DropdownMenuItem>
          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() => onOpenTask(task.id)}
          >
            <CalendarClock />
            Change start date
          </DropdownMenuItem>
          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() => onOpenTask(task.id)}
          >
            <CalendarDays />
            Change deadline
          </DropdownMenuItem>
          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() => run("Add time to task", addTime)}
          >
            <Clock3 />
            Add time to task
          </DropdownMenuItem>
          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() => run("Postpone task", postponeTask)}
          >
            <Moon />
            Do later
          </DropdownMenuItem>
          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() => run("Prioritize task", makeAsap)}
          >
            <AlertCircle />
            Do ASAP
          </DropdownMenuItem>

          <DropdownMenuSeparator className="-mx-1 my-1 bg-[var(--border-subtle)]" />

          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() =>
              run("Duplicate task", () => createTask(duplicatePayload(task)))
            }
          >
            <Copy />
            Duplicate task
          </DropdownMenuItem>
          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() =>
              run("Bulk duplicate task", () =>
                Promise.all(
                  [1, 2, 3].map((copyNumber) =>
                    createTask(duplicatePayload(task, `copy ${copyNumber}`))
                  )
                )
              )
            }
          >
            <Package />
            Bulk duplicate task
          </DropdownMenuItem>
          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() =>
              run("Create project from task", createProjectFromTask)
            }
          >
            <FolderPlus />
            Create project from task
          </DropdownMenuItem>
          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() => run("Save task template", saveTemplate)}
          >
            <Puzzle />
            Save as template
          </DropdownMenuItem>

          <DropdownMenuSeparator className="-mx-1 my-1 bg-[var(--border-subtle)]" />

          <DropdownMenuItem
            className={`${MENU_ITEM_CLASS} bg-[var(--surface-raised)]`}
            onSelect={() => run("Unschedule task", unschedule)}
          >
            <CalendarX2 />
            Unschedule
          </DropdownMenuItem>

          <DropdownMenuSeparator className="-mx-1 my-1 bg-[var(--border-subtle)]" />

          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={() => run("Archive task", archive)}
          >
            <Archive />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem
            className={`${MENU_ITEM_CLASS} text-[var(--color-danger)] focus:bg-[var(--button-danger-bg)] focus:text-[var(--color-danger)] [&>svg]:text-[var(--color-danger)]`}
            onSelect={() => run("Delete task", () => deleteTask(task.id))}
          >
            <Trash2 />
            Delete task
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <StartTaskModal
        task={task}
        open={startModalOpen}
        onOpenChange={setStartModalOpen}
      />
    </>
  );
}
