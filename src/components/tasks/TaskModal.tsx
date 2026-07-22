import { useCallback, useEffect, useRef, useState } from "react";

import dynamic from "next/dynamic";

import {
  Bell,
  BookOpen,
  BookTemplate,
  Box,
  CalendarDays,
  Check,
  ChevronDown,
  Circle,
  Copy,
  Ellipsis,
  Flag,
  Folder,
  Layers3,
  Paperclip,
  Plus,
  Repeat2,
  Tag as TagIcon,
  UserRound,
} from "lucide-react";
import { RRule } from "rrule";
import { toast } from "sonner";

import { CalendarItemTypeSwitch } from "@/components/calendar/CalendarItemTypeSwitch";
import { TaskTimer } from "@/components/tasks/TaskTimer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { format, formatToLocalISOString, newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { readTaskDefaults, resolveTaskDefaultDate } from "@/lib/task-defaults";
import { taskDescriptionToPlainText } from "@/lib/task-description-format";
import { cn } from "@/lib/utils";

import { useProjectStore } from "@/store/project";

import {
  EnergyLevel,
  NewTask,
  Priority,
  SchedulingEnergyLevel,
  SchedulingTaskPriority,
  Tag,
  Task,
  TaskStatus,
  TimePreference,
} from "@/types/task";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: NewTask) => Promise<void>;
  task?: Task;
  tags: Tag[];
  onCreateTag: (name: string, color?: string) => Promise<Tag>;
  initialProjectId?: string | null;
  initialStart?: Date;
  initialEnd?: Date;
  onItemTypeChange?: (type: "task" | "event") => void;
}

//TODO: move to utils
const formatEnumValue = (value: string) => {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  duration: string;
  priority: Priority;
  energyRequired: SchedulingEnergyLevel;
  contextTag: string;
}

const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: "deep-work",
    name: "Deep work block",
    description: "Define the outcome, then work without interruption.",
    duration: "90",
    priority: Priority.HIGH,
    energyRequired: SchedulingEnergyLevel.HIGH,
    contextTag: "deep work",
  },
  {
    id: "quick-admin",
    name: "Quick admin",
    description: "Small admin task with a clear next action.",
    duration: "30",
    priority: Priority.LOW,
    energyRequired: SchedulingEnergyLevel.LOW,
    contextTag: "admin",
  },
  {
    id: "meeting-prep",
    name: "Meeting prep",
    description:
      "Gather context, draft an agenda, and note the decision needed.",
    duration: "30",
    priority: Priority.MEDIUM,
    energyRequired: SchedulingEnergyLevel.MEDIUM,
    contextTag: "meetings",
  },
];

const LOG_SOURCE = "TaskModal";
const SAVED_TASK_TEMPLATES_KEY = "needt-task-templates";
const TaskDescriptionEditor = dynamic(
  () =>
    import("@/components/tasks/TaskDescriptionEditor").then(
      (module) => module.TaskDescriptionEditor
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[260px] flex-1 text-[14px] text-[var(--text-muted)]"
        aria-hidden="true"
      />
    ),
  }
);

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  task,
  tags,
  onCreateTag,
  initialProjectId,
  initialStart,
  initialEnd,
  onItemTypeChange,
}: TaskModalProps) {
  const { projects } = useProjectStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [dueDate, setDueDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");
  const [estOptimistic, setEstOptimistic] = useState<string>("");
  const [estLikely, setEstLikely] = useState<string>("");
  const [estPessimistic, setEstPessimistic] = useState<string>("");
  const [minChunkMinutes, setMinChunkMinutes] = useState<string>("");
  const [maxChunkMinutes, setMaxChunkMinutes] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [contextTag, setContextTag] = useState("");
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | "">("");
  const [energyRequired, setEnergyRequired] = useState<SchedulingEnergyLevel>(
    SchedulingEnergyLevel.MEDIUM
  );
  const [preferredTime, setPreferredTime] = useState<TimePreference | "">("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#E5E7EB");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [isDirty, setIsDirty] = useState(false);
  const [projectId, setProjectId] = useState<string | null | undefined>(
    initialProjectId || task?.projectId
  );
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<string | undefined>();
  const [isAutoScheduled, setIsAutoScheduled] = useState(
    task?.isAutoScheduled || false
  );
  const [scheduleLocked, setScheduleLocked] = useState(
    task?.scheduleLocked || false
  );
  const [isFrozen, setIsFrozen] = useState(task?.isFrozen || false);
  const [priority, setPriority] = useState<Priority | null>(
    task?.priority || null
  );
  const [priorityLevel, setPriorityLevel] = useState<SchedulingTaskPriority>(
    SchedulingTaskPriority.MEDIUM
  );
  const [calibrationFactors, setCalibrationFactors] = useState<
    Record<string, number>
  >({});
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<TaskTemplate[]>([]);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const preserveDraftRef = useRef(false);

  const resetForm = useCallback(() => {
    const defaults = readTaskDefaults();
    setTitle("");
    setDescription("");
    setStatus(defaults.status);
    setDueDate("");
    setStartDate(resolveTaskDefaultDate(defaults.startPreset));
    setDuration(String(defaults.durationMinutes));
    setEstimatedMinutes(String(defaults.durationMinutes));
    setEstOptimistic("");
    setEstLikely(String(defaults.durationMinutes));
    setEstPessimistic("");
    setMinChunkMinutes(
      defaults.minChunkMinutes > 0 ? String(defaults.minChunkMinutes) : ""
    );
    setMaxChunkMinutes("");
    setDeadline(resolveTaskDefaultDate(defaults.deadlinePreset, true));
    setContextTag("");
    setEnergyLevel("");
    setEnergyRequired(SchedulingEnergyLevel.MEDIUM);
    setPreferredTime("");
    setSelectedTagIds([]);
    setNewTagName("");
    setNewTagColor("#E5E7EB");
    setProjectId(
      initialProjectId ??
        (defaults.projectId === "none" ? null : defaults.projectId)
    );
    setIsRecurring(false);
    setRecurrenceRule(undefined);
    setIsAutoScheduled(defaults.autoScheduled);
    setScheduleLocked(defaults.hardDeadline);
    setIsFrozen(false);
    setPriority(defaults.priority === "none" ? null : defaults.priority);
    setPriorityLevel(SchedulingTaskPriority.MEDIUM);
    setIsAdvancedOpen(false);
    setIsTemplateMenuOpen(false);
    setIsDirty(false);
    setSaveState("idle");
  }, [initialProjectId]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen && !preserveDraftRef.current) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const parsed = JSON.parse(
        localStorage.getItem(SAVED_TASK_TEMPLATES_KEY) ?? "[]"
      );
      setSavedTemplates(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      setSavedTemplates([]);
      void logger.warn(
        "Could not load saved task templates",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    }
  }, [isOpen]);

  // Populate form with task data when editing
  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      // Handle date string from API
      if (task.dueDate) {
        const date = newDate(task.dueDate);
        setDueDate(formatToLocalISOString(date).split("T")[0]);
      } else {
        setDueDate("");
      }
      if (task.startDate) {
        const date = newDate(task.startDate);
        setStartDate(formatToLocalISOString(date).split("T")[0]);
      } else {
        setStartDate("");
      }
      setDuration(task.duration?.toString() || "");
      setEstimatedMinutes(
        (task.estimatedMinutes ?? task.duration)?.toString() || ""
      );
      setEstOptimistic(task.estOptimistic?.toString() || "");
      setEstLikely(
        (
          task.estLikely ??
          task.estimatedMinutes ??
          task.duration
        )?.toString() || ""
      );
      setEstPessimistic(task.estPessimistic?.toString() || "");
      setMinChunkMinutes(task.minChunkMinutes?.toString() || "");
      setMaxChunkMinutes(task.maxChunkMinutes?.toString() || "");
      if (task.deadline) {
        const date = newDate(task.deadline);
        setDeadline(formatToLocalISOString(date));
      } else {
        setDeadline("");
      }
      setContextTag(task.contextTag || "");
      setEnergyLevel(task.energyLevel || "");
      setEnergyRequired(task.energyRequired || SchedulingEnergyLevel.MEDIUM);
      setPreferredTime(task.preferredTime || "");
      setSelectedTagIds(task.tags.map((t) => t.id));
      setProjectId(task.projectId || null);
      setIsRecurring(task.isRecurring);
      setRecurrenceRule(task.recurrenceRule || undefined);
      setIsAutoScheduled(task.isAutoScheduled);
      setScheduleLocked(task.scheduleLocked);
      setIsFrozen(task.isFrozen || false);
      setPriority(task.priority || null);
      setPriorityLevel(task.priorityLevel || SchedulingTaskPriority.MEDIUM);
    } else if (!task && isOpen) {
      if (preserveDraftRef.current) {
        preserveDraftRef.current = false;
        return;
      }
      resetForm();
      if (initialStart) {
        setStartDate(formatToLocalISOString(initialStart).split("T")[0]);
        setDeadline(formatToLocalISOString(initialStart));
      }
      if (initialStart && initialEnd) {
        const diffMinutes = Math.max(
          15,
          Math.round((initialEnd.getTime() - initialStart.getTime()) / 60000)
        );
        setDuration(String(diffMinutes));
        setEstimatedMinutes(String(diffMinutes));
        setEstLikely(String(diffMinutes));
      }
    }
  }, [task, isOpen, initialProjectId, initialStart, initialEnd, resetForm]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => {
      setIsDirty(false);
      setSaveState("idle");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, task?.id]);

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/calibration")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.factors && typeof data.factors === "object") {
          setCalibrationFactors(data.factors);
        }
      })
      .catch(() => setCalibrationFactors({}));
  }, [isOpen]);

  const parsedLikely = estLikely
    ? parseInt(estLikely, 10)
    : estimatedMinutes
      ? parseInt(estimatedMinutes, 10)
      : duration
        ? parseInt(duration, 10)
        : null;
  const contextFactor = contextTag.trim()
    ? calibrationFactors[contextTag.trim().toLowerCase()]
    : undefined;
  const suggestedLikely =
    contextFactor && parsedLikely
      ? Math.max(1, Math.round(parsedLikely * contextFactor))
      : null;

  const buildPayload = (statusValue: TaskStatus): NewTask => {
    return {
      title: title.trim(),
      description: description.trim() || undefined,
      status: statusValue,
      dueDate: dueDate ? newDate(dueDate) : null,
      startDate: startDate ? newDate(startDate) : null,
      duration: duration ? parseInt(duration, 10) : undefined,
      estimatedMinutes: estimatedMinutes
        ? parseInt(estimatedMinutes, 10)
        : duration
          ? parseInt(duration, 10)
          : undefined,
      estOptimistic: estOptimistic ? parseInt(estOptimistic, 10) : undefined,
      estLikely: parsedLikely ?? undefined,
      estPessimistic: estPessimistic ? parseInt(estPessimistic, 10) : undefined,
      minChunkMinutes: minChunkMinutes
        ? parseInt(minChunkMinutes, 10)
        : undefined,
      maxChunkMinutes: maxChunkMinutes
        ? parseInt(maxChunkMinutes, 10)
        : undefined,
      deadline: deadline
        ? newDate(deadline)
        : dueDate
          ? newDate(dueDate)
          : null,
      energyLevel: energyLevel || undefined,
      energyRequired,
      preferredTime: preferredTime || undefined,
      priorityLevel,
      contextTag: contextTag.trim() || undefined,
      tagIds: selectedTagIds,
      projectId: projectId,
      isRecurring,
      recurrenceRule: isRecurring ? recurrenceRule : undefined,
      isAutoScheduled,
      autoScheduled: isAutoScheduled,
      scheduleLocked,
      isFrozen,
      priority,
    };
  };

  const save = async (statusValue: TaskStatus) => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    setSaveState("saving");
    try {
      await onSave(buildPayload(statusValue));
      setIsDirty(false);
      setSaveState("saved");
      await new Promise((resolve) => window.setTimeout(resolve, 240));
      onClose();
    } catch (error) {
      void logger.error(
        "Task save failed",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
      toast.error(
        task ? "Couldn't save the task." : "Couldn't create the task."
      );
    } finally {
      setIsSubmitting(false);
      setSaveState((current) => (current === "saved" ? current : "idle"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await save(status);
  };

  const handleMarkComplete = async () => {
    await save(TaskStatus.COMPLETED);
  };

  // Missed deadline: an incomplete task whose deadline is in the past.
  const isMissedDeadline =
    !!task &&
    !!task.deadline &&
    status !== TaskStatus.COMPLETED &&
    newDate(task.deadline).getTime() < Date.now();

  const requestClose = () => {
    if (
      isDirty &&
      !isSubmitting &&
      !window.confirm("Discard your unsaved task changes?")
    ) {
      return;
    }
    onClose();
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const tag = await onCreateTag(newTagName.trim(), newTagColor);
      setSelectedTagIds([...selectedTagIds, tag.id]);
      setNewTagName("");
      setNewTagColor("#E5E7EB");
    } catch (error) {
      void logger.error(
        "Task tag creation failed",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    }
  };

  const applyTemplate = (template: TaskTemplate) => {
    setTitle((current) => current || template.name);
    setDescription(template.description);
    setDuration(template.duration);
    setEstimatedMinutes(template.duration);
    setEstLikely(template.duration);
    setPriority(template.priority);
    setPriorityLevel(
      template.priority === Priority.HIGH
        ? SchedulingTaskPriority.HIGH
        : template.priority === Priority.LOW
          ? SchedulingTaskPriority.LOW
          : SchedulingTaskPriority.MEDIUM
    );
    setEnergyRequired(template.energyRequired);
    setContextTag(template.contextTag);
    setIsAutoScheduled(true);
    setIsTemplateMenuOpen(false);
  };

  const copyTask = async () => {
    try {
      await navigator.clipboard.writeText(
        [title, taskDescriptionToPlainText(description)]
          .filter(Boolean)
          .join("\n\n")
      );
      toast.success("Task copied");
    } catch (error) {
      void logger.warn(
        "Could not copy task",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
      toast.error("Could not copy the task");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && requestClose()}>
      <DialogContent
        data-testid="task-modal"
        className="needt-overlay-depth !bottom-0 !left-0 !top-auto h-[92dvh] max-h-[92dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 gap-0 overflow-hidden !rounded-b-none !rounded-t-2xl border-[var(--dialog-border)] p-0 text-[var(--text-primary)] shadow-lg sm:!bottom-auto sm:!left-1/2 sm:!top-1/2 sm:h-[min(767px,calc(100dvh-3.875rem))] sm:max-h-[calc(100dvh-3.875rem)] sm:!w-[calc(100vw-3rem)] sm:!max-w-[960px] sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:!rounded-[var(--dialog-radius)] lg:[&>button.absolute]:-right-8 lg:[&>button.absolute]:top-0"
      >
        {isSubmitting && <LoadingOverlay />}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-2 z-10 h-1 w-9 -translate-x-1/2 rounded-full bg-[var(--border-control)] sm:hidden"
        />
        <form
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void save(status);
            }
          }}
          onChangeCapture={() => setIsDirty(true)}
          className="flex h-full min-h-0 flex-col overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,380px)] lg:grid-rows-[95px_minmax(0,1fr)_54px] lg:overflow-hidden lg:[grid-template-areas:'header_aside''main_aside''mainFooter_asideFooter']"
        >
          <DialogHeader className="space-y-0 px-6 py-4 lg:[grid-area:header] lg:px-10 lg:pt-4">
            <DialogDescription className="sr-only">
              Create or edit a schedulable task, its description, project,
              timing, priority, and planner settings.
            </DialogDescription>
            <div className="flex min-h-10 items-center justify-between gap-4 sm:h-[25px] sm:min-h-0">
              <DialogTitle asChild>
                <div>
                  <CalendarItemTypeSwitch
                    value="task"
                    locked={Boolean(task)}
                    onValueChange={(type) => {
                      preserveDraftRef.current = true;
                      onItemTypeChange?.(type);
                    }}
                  />
                </div>
              </DialogTitle>
              <div className="mr-4 flex items-center gap-1 text-[13px] text-[var(--text-secondary)] lg:mr-0">
                {task ? (
                  <>
                    {status !== TaskStatus.COMPLETED ? (
                      <button
                        type="button"
                        onClick={handleMarkComplete}
                        disabled={isSubmitting}
                        className="flex min-h-10 items-center gap-1.5 rounded-md border border-[var(--border-control)] bg-[var(--surface-control)] px-2 text-[var(--text-primary)] hover:bg-[var(--surface-control-hover)] sm:h-[25px] sm:min-h-0"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark complete
                      </button>
                    ) : (
                      <span className="flex min-h-10 items-center gap-1.5 rounded-md bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] px-2 text-[var(--color-success)] sm:h-[25px] sm:min-h-0">
                        <Check className="h-3.5 w-3.5" /> Completed
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void copyTask()}
                      className="grid h-10 w-10 place-items-center rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] sm:h-[25px] sm:w-[25px]"
                      aria-label="Copy task"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdvancedOpen((open) => !open)}
                      className="grid h-10 w-10 place-items-center rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] sm:h-[25px] sm:w-[25px]"
                      aria-label="More task settings"
                    >
                      <Ellipsis className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Popover
                      open={isTemplateMenuOpen}
                      onOpenChange={setIsTemplateMenuOpen}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex min-h-10 items-center gap-1.5 rounded-md px-2 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] sm:h-[25px] sm:min-h-0"
                        >
                          <BookTemplate className="h-4 w-4" /> Use template
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        className="w-72 border-[var(--popover-border)] bg-[var(--popover-bg)] p-1.5 text-[var(--text-primary)]"
                      >
                        <div className="px-2 py-1.5 text-[13px] font-semibold">
                          Task templates
                        </div>
                        {[...savedTemplates, ...TASK_TEMPLATES].map(
                          (template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => applyTemplate(template)}
                              className="w-full rounded px-2 py-2 text-left hover:bg-[var(--surface-hover)]"
                            >
                              <span className="block text-[13px] font-medium">
                                {template.name}
                              </span>
                              <span className="block text-[11px] text-[var(--text-secondary)]">
                                {template.duration} min · {template.contextTag}
                              </span>
                            </button>
                          )
                        )}
                      </PopoverContent>
                    </Popover>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isRecurring;
                        setIsRecurring(next);
                        if (next && !recurrenceRule) {
                          setRecurrenceRule(
                            new RRule({
                              freq: RRule.WEEKLY,
                              interval: 1,
                              byweekday: [RRule.MO],
                            }).toString()
                          );
                        }
                      }}
                      className={cn(
                        "flex min-h-10 items-center gap-1.5 rounded-md px-2 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] sm:h-[25px] sm:min-h-0",
                        isRecurring &&
                          "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                      )}
                    >
                      <Repeat2 className="h-4 w-4" /> Recurring
                    </button>
                  </>
                )}
              </div>
            </div>
            <Label htmlFor="title" className="sr-only">
              Task name
            </Label>
            <Input
              id="title"
              ref={titleInputRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              placeholder="Task name"
              className="mt-1 h-[42px] border-0 bg-transparent px-0 text-[22px] font-semibold text-[var(--text-primary)] shadow-none placeholder:text-[var(--text-muted)] focus-visible:border-0 focus-visible:ring-0"
            />
          </DialogHeader>

          <main className="flex min-h-[280px] flex-none flex-col px-6 pb-3 lg:min-h-0 lg:[grid-area:main] lg:px-10 lg:pb-6">
            <TaskDescriptionEditor
              value={description}
              onChange={(value) => {
                setDescription(value);
                setIsDirty(true);
              }}
            />
            <div className="flex h-[50px] flex-none items-center justify-between text-[13px]">
              <span className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                <Paperclip className="h-4 w-4 text-[var(--text-muted)]" />{" "}
                Attachments
              </span>
              <span
                title="Choose file storage before enabling task attachments"
                className="flex items-center gap-1.5 rounded px-2 py-1 text-[var(--text-muted)]"
              >
                Storage not configured
              </span>
            </div>
          </main>

          <aside className="needt-panel-depth flex-none border-t border-[var(--border-subtle)] lg:min-h-0 lg:overflow-y-auto lg:[grid-area:aside] lg:border-l lg:border-t-0">
            <div className="space-y-0.5 px-3 py-4 lg:px-5">
              <div
                className="flex min-h-11 w-full items-center gap-2 px-1 text-left text-[14px] sm:h-[28px] sm:min-h-0"
                aria-label="Workspace"
              >
                <Layers3 className="h-4 w-4 text-[var(--text-muted)]" /> My
                Workspace
              </div>
              <div
                className="flex min-h-11 w-full items-center gap-2 px-1 text-left text-[14px] text-[var(--text-muted)] sm:h-[28px] sm:min-h-0"
                aria-label="No folder"
              >
                <Folder className="h-4 w-4" /> No folder
              </div>
              <div className="flex min-h-11 items-center gap-2 px-1 sm:h-[28px] sm:min-h-0">
                <Box className="h-4 w-4 flex-none text-[var(--text-muted)]" />
                <Select
                  value={projectId || "none"}
                  onValueChange={(value) =>
                    setProjectId(value === "none" ? null : value)
                  }
                >
                  <SelectTrigger className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 text-[14px] shadow-none focus:ring-0 sm:h-[28px]">
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects
                      .filter((project) => project.status === "active")
                      .map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label
              className={cn(
                "flex h-[48px] cursor-pointer items-center gap-2 px-5 text-[13px]",
                isAutoScheduled
                  ? "bg-[color-mix(in_srgb,var(--color-accent)_18%,var(--surface-panel))] text-[var(--color-accent)]"
                  : "bg-[var(--surface-hover)] text-[var(--text-primary)]"
              )}
            >
              <Switch
                checked={isAutoScheduled}
                onCheckedChange={setIsAutoScheduled}
                className="sr-only"
              />
              <span className="grid h-5 w-5 place-items-center rounded-full border border-current">
                <Check className="h-3 w-3" />
              </span>
              <span className="font-medium">Auto-scheduled</span>
              <span className="text-current/80">
                {!isAutoScheduled
                  ? "(Off)"
                  : task?.scheduledStart
                    ? format(newDate(task.scheduledStart), "EEE MMM d, h:mm a")
                    : "(Pending)"}
              </span>
            </label>

            <div className="space-y-0.5 border-b border-[var(--border-subtle)] px-5 py-3 text-[13px]">
              <div className="flex min-h-11 items-center gap-2 sm:h-[30px] sm:min-h-0">
                <UserRound className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="w-[76px] text-[var(--text-secondary)]">
                  Assignee:
                </span>
                <span>Me</span>
              </div>
              <div className="flex min-h-11 items-center gap-2 sm:h-[30px] sm:min-h-0">
                <Circle className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="w-[76px] text-[var(--text-secondary)]">
                  Status:
                </span>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as TaskStatus)}
                >
                  <SelectTrigger className="h-11 flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none sm:h-[28px]">
                    <SelectValue>{formatEnumValue(status)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TaskStatus).map((value) => (
                      <SelectItem key={value} value={value}>
                        {formatEnumValue(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-h-11 items-center gap-2 sm:h-[30px] sm:min-h-0">
                <Flag className="h-4 w-4 text-[var(--color-warning)]" />
                <span className="w-[76px] text-[var(--text-secondary)]">
                  Priority:
                </span>
                <Select
                  value={priority || Priority.NONE}
                  onValueChange={(value) => setPriority(value as Priority)}
                >
                  <SelectTrigger className="h-11 flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none sm:h-[28px]">
                    <SelectValue>
                      {formatEnumValue(priority || Priority.NONE)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(Priority).map((value) => (
                      <SelectItem key={value} value={value}>
                        {formatEnumValue(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-0.5 border-b border-[var(--border-subtle)] px-5 py-3 text-[13px]">
              <div className="flex min-h-11 items-center gap-2 sm:h-[30px] sm:min-h-0">
                <span className="w-[100px] text-[var(--text-secondary)]">
                  Duration:
                </span>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  placeholder="30"
                  className="h-11 flex-1 border-0 bg-transparent px-0 text-[16px] shadow-none focus-visible:ring-0 sm:h-[28px] sm:text-[13px]"
                />
                <span className="text-[var(--text-secondary)]">min</span>
              </div>
              <div className="flex min-h-11 items-center gap-2 pl-3 sm:h-[30px] sm:min-h-0">
                <span className="w-[88px] text-[var(--text-secondary)]">
                  └ Min chunk:
                </span>
                <Input
                  id="minChunkMinutes"
                  type="number"
                  min="0"
                  value={minChunkMinutes}
                  onChange={(event) => setMinChunkMinutes(event.target.value)}
                  placeholder="No Chunks"
                  className="h-11 flex-1 border-0 bg-transparent px-0 text-[16px] shadow-none focus-visible:ring-0 sm:h-[28px] sm:text-[13px]"
                />
              </div>
              <div className="flex min-h-11 items-center gap-2 sm:h-[30px] sm:min-h-0">
                <CalendarDays className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="w-[76px] text-[var(--text-secondary)]">
                  Start date:
                </span>
                <DatePicker
                  value={
                    startDate
                      ? new Date(`${startDate.split("T")[0]}T00:00:00`)
                      : null
                  }
                  onChange={(date) => {
                    setStartDate(date ? format(date, "yyyy-MM-dd") : "");
                    setIsDirty(true);
                  }}
                  placeholder="No start date"
                  ariaLabel="Choose task start date"
                  showIcon={false}
                  className="min-h-11 min-w-0 flex-1 px-0 sm:h-[28px] sm:min-h-0"
                />
              </div>
              <div className="flex min-h-11 items-center gap-2 sm:h-[30px] sm:min-h-0">
                <CalendarDays className="h-4 w-4 text-[var(--color-accent)]" />
                <span className="w-[76px] text-[var(--text-secondary)]">
                  Deadline:
                </span>
                <DatePicker
                  value={deadline ? newDate(deadline) : null}
                  onChange={(date) => {
                    setDeadline(date ? formatToLocalISOString(date) : "");
                    setIsDirty(true);
                  }}
                  includeTime
                  accent
                  placeholder="No deadline"
                  ariaLabel="Choose task deadline"
                  showIcon={false}
                  className="min-h-11 min-w-0 flex-1 px-0 sm:h-[28px] sm:min-h-0"
                />
                <Bell className="h-4 w-4 text-[var(--color-accent)]" />
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 pl-3 sm:h-[30px] sm:min-h-0">
                <span className="w-[88px] text-[var(--text-secondary)]">
                  └ Hard deadline:
                </span>
                <Switch
                  checked={isFrozen}
                  onCheckedChange={setIsFrozen}
                  className="h-4 w-[26px] [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-[12px]"
                />
              </label>
              <div className="flex min-h-11 items-center gap-2 sm:h-[30px] sm:min-h-0">
                <CalendarDays className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="w-[76px] text-[var(--text-secondary)]">
                  Schedule:
                </span>
                <Select
                  value={preferredTime || "none"}
                  onValueChange={(value) =>
                    setPreferredTime(
                      value === "none" ? "" : (value as TimePreference)
                    )
                  }
                >
                  <SelectTrigger className="h-11 flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none sm:h-[28px]">
                    <SelectValue>
                      {preferredTime
                        ? formatEnumValue(preferredTime)
                        : "Work hours"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Work hours</SelectItem>
                    {Object.values(TimePreference).map((value) => (
                      <SelectItem key={value} value={value}>
                        {formatEnumValue(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="px-5 py-3 text-[13px]">
              <div className="flex min-h-11 items-center gap-2 sm:h-[30px] sm:min-h-0">
                <TagIcon className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="w-[76px] text-[var(--text-secondary)]">
                  Labels:
                </span>
                <span className="truncate">
                  {selectedTagIds.length
                    ? tags
                        .filter((tag) => selectedTagIds.includes(tag.id))
                        .map((tag) => tag.name)
                        .join(", ")
                    : "None"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAdvancedOpen((open) => !open)}
                aria-expanded={isAdvancedOpen}
                className="mt-1 flex min-h-11 w-full items-center gap-2 rounded px-1 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] sm:h-[30px] sm:min-h-0"
              >
                <Plus className="h-4 w-4" /> Advanced settings{" "}
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 transition-transform",
                    isAdvancedOpen && "rotate-180"
                  )}
                />
              </button>
            </div>

            {isAdvancedOpen && (
              <div className="space-y-4 border-t border-[var(--border-subtle)] px-5 py-4 text-[12px]">
                <div>
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">
                    Scheduling details
                  </p>
                  <p className="mt-0.5 leading-4 text-[var(--text-muted)]">
                    Fine-tune how Needt estimates and places this task.
                  </p>
                </div>
                {isMissedDeadline && (
                  <div className="rounded border border-[color-mix(in_srgb,var(--color-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] px-2 py-1.5 text-[var(--color-danger)]">
                    Missed deadline
                  </div>
                )}
                {task && (
                  <TaskTimer
                    taskId={task.id}
                    actualMinutes={task.actualMinutes}
                    likelyDelta={task.likelyDelta}
                  />
                )}
                <section className="space-y-3 rounded-lg border border-[var(--border-subtle)] p-3">
                  <div>
                    <h3 className="font-medium text-[var(--text-primary)]">
                      Time estimate
                    </h3>
                    <p className="mt-0.5 leading-4 text-[var(--text-muted)]">
                      Used by auto-scheduling and workload planning.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="estimatedMinutes">Planner estimate</Label>
                      <div className="relative mt-1">
                        <Input
                          id="estimatedMinutes"
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={estimatedMinutes}
                          onChange={(event) =>
                            setEstimatedMinutes(event.target.value)
                          }
                          className="pr-10"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                          min
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="maxChunkMinutes">Longest session</Label>
                      <div className="relative mt-1">
                        <Input
                          id="maxChunkMinutes"
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={maxChunkMinutes}
                          onChange={(event) =>
                            setMaxChunkMinutes(event.target.value)
                          }
                          className="pr-10"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                          min
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[var(--text-secondary)]">
                      Estimate range
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="estOptimistic" className="text-[11px]">
                          Best case
                        </Label>
                        <Input
                          id="estOptimistic"
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={estOptimistic}
                          onChange={(event) =>
                            setEstOptimistic(event.target.value)
                          }
                          placeholder="min"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="estLikely" className="text-[11px]">
                          Expected
                        </Label>
                        <Input
                          id="estLikely"
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={estLikely}
                          onChange={(event) => setEstLikely(event.target.value)}
                          placeholder="min"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="estPessimistic" className="text-[11px]">
                          Worst case
                        </Label>
                        <Input
                          id="estPessimistic"
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={estPessimistic}
                          onChange={(event) =>
                            setEstPessimistic(event.target.value)
                          }
                          placeholder="min"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                  {contextFactor && suggestedLikely && (
                    <button
                      type="button"
                      onClick={() => setEstLikely(String(suggestedLikely))}
                      className="text-left text-[var(--accent)] hover:underline"
                    >
                      Use {suggestedLikely} min from similar tasks
                    </button>
                  )}
                </section>

                <section className="space-y-3 rounded-lg border border-[var(--border-subtle)] p-3">
                  <div>
                    <h3 className="font-medium text-[var(--text-primary)]">
                      Placement preferences
                    </h3>
                    <p className="mt-0.5 leading-4 text-[var(--text-muted)]">
                      Guides the planner when several tasks compete for time.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="contextTag">Context or batch</Label>
                    <Input
                      id="contextTag"
                      value={contextTag}
                      onChange={(event) => setContextTag(event.target.value)}
                      placeholder="e.g. deep work, admin, calls"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Scheduling priority</Label>
                      <Select
                        value={priorityLevel}
                        onValueChange={(value) =>
                          setPriorityLevel(value as SchedulingTaskPriority)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(SchedulingTaskPriority).map(
                            (value) => (
                              <SelectItem key={value} value={value}>
                                {formatEnumValue(value)}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Focus required</Label>
                      <Select
                        value={energyRequired}
                        onValueChange={(value) =>
                          setEnergyRequired(value as SchedulingEnergyLevel)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(SchedulingEnergyLevel).map((value) => (
                            <SelectItem key={value} value={value}>
                              {formatEnumValue(value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Best personal energy</Label>
                    <Select
                      value={energyLevel || "none"}
                      onValueChange={(value) =>
                        setEnergyLevel(
                          value === "none" ? "" : (value as EnergyLevel)
                        )
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Any energy window</SelectItem>
                        {Object.values(EnergyLevel).map((value) => (
                          <SelectItem key={value} value={value}>
                            {formatEnumValue(value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center justify-between gap-3 rounded-md bg-[var(--surface-control)] px-3 py-2.5">
                    <span>
                      <span className="block font-medium text-[var(--text-primary)]">
                        Keep scheduled time
                      </span>
                      <span className="mt-0.5 block leading-4 text-[var(--text-muted)]">
                        Auto-scheduling will not move this task.
                      </span>
                    </span>
                    <Switch
                      checked={scheduleLocked}
                      onCheckedChange={setScheduleLocked}
                      aria-label="Keep scheduled time"
                    />
                  </label>
                </section>

                <section className="space-y-2 rounded-lg border border-[var(--border-subtle)] p-3">
                  <div>
                    <h3 className="font-medium text-[var(--text-primary)]">
                      Labels
                    </h3>
                    <p className="mt-0.5 leading-4 text-[var(--text-muted)]">
                      Add labels for search and filtered views.
                    </p>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <label
                        key={tag.id}
                        className={cn(
                          "cursor-pointer rounded px-2 py-1",
                          selectedTagIds.includes(tag.id)
                            ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                            : "bg-[var(--surface-input)] text-[var(--text-secondary)]"
                        )}
                      >
                        <Checkbox
                          className="sr-only"
                          checked={selectedTagIds.includes(tag.id)}
                          onCheckedChange={(checked) =>
                            setSelectedTagIds(
                              checked
                                ? [...selectedTagIds, tag.id]
                                : selectedTagIds.filter((id) => id !== tag.id)
                            )
                          }
                        />
                        {tag.name}
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Input
                      value={newTagName}
                      onChange={(event) => setNewTagName(event.target.value)}
                      placeholder="New tag"
                    />
                    <Input
                      type="color"
                      value={newTagColor}
                      onChange={(event) => setNewTagColor(event.target.value)}
                      className="w-9 p-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </section>
                {isRecurring && (
                  <div className="rounded border border-[var(--border-subtle)] bg-[var(--surface-input)] p-2 text-[var(--text-secondary)]">
                    Repeats weekly. Recurrence details are saved with this task.
                  </div>
                )}
              </div>
            )}
          </aside>

          <footer className="hidden items-center px-6 sm:flex lg:[grid-area:mainFooter] lg:px-10">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)] px-2 py-1 text-[12px] font-medium text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_24%,transparent)]"
                >
                  <BookOpen className="h-4 w-4" /> Task guide
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-72 border-[var(--popover-border)] bg-[var(--popover-bg)] p-3 text-[var(--text-primary)]"
              >
                <h3 className="text-[13px] font-semibold">
                  Build a schedulable task
                </h3>
                <ol className="mt-2 space-y-1.5 text-[12px] leading-5 text-[var(--text-secondary)]">
                  <li>1. Name the concrete outcome.</li>
                  <li>2. Add a realistic duration and deadline.</li>
                  <li>3. Keep Auto-scheduled on to let Needt place it.</li>
                  <li>4. Use chunks for work that can be split.</li>
                </ol>
              </PopoverContent>
            </Popover>
          </footer>
          <div className="needt-panel-depth sticky bottom-0 z-10 mt-auto flex min-h-[54px] flex-none items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-3 lg:static lg:[grid-area:asideFooter] lg:border-l">
            <span className="mr-auto text-[11px] text-[var(--text-muted)]">
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? "Saved"
                  : isDirty
                    ? "Unsaved changes"
                    : "All changes saved"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={requestClose}
              className="h-11 px-2 text-[13px] text-[var(--text-secondary)] sm:h-[30px]"
            >
              Cancel{" "}
              <kbd className="ml-1 rounded bg-[var(--surface-control)] px-1 text-[10px]">
                Esc
              </kbd>
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="h-11 px-3 text-[13px] sm:h-[34px]"
            >
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? "Saved"
                  : task
                    ? "Save changes"
                    : "Save task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
