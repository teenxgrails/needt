import { useCallback, useEffect, useRef, useState } from "react";

import {
  Bell,
  Bold,
  BookOpen,
  BookTemplate,
  Box,
  CalendarDays,
  Check,
  CheckSquare2,
  ChevronDown,
  Circle,
  Code2,
  Copy,
  Ellipsis,
  Flag,
  Folder,
  Heading1,
  Heading2,
  Image,
  Italic,
  Layers3,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Paperclip,
  Plus,
  Repeat2,
  Strikethrough,
  Tag as TagIcon,
  Underline,
  UserRound,
} from "lucide-react";
import { RRule } from "rrule";
import { toast } from "sonner";

import { TaskTimer } from "@/components/tasks/TaskTimer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";

import { format, formatToLocalISOString, newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { readTaskDefaults, resolveTaskDefaultDate } from "@/lib/task-defaults";
import {
  type TaskDescriptionFormat,
  formatTaskDescription,
} from "@/lib/task-description-format";
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
const DESCRIPTION_ACTIONS: Array<{
  icon: typeof Bold;
  label: string;
  format: TaskDescriptionFormat;
}> = [
  { icon: Bold, label: "Bold", format: "bold" },
  { icon: Italic, label: "Italic", format: "italic" },
  { icon: Underline, label: "Underline", format: "underline" },
  {
    icon: Strikethrough,
    label: "Strikethrough",
    format: "strikethrough",
  },
  { icon: Heading1, label: "Heading 1", format: "heading1" },
  { icon: Heading2, label: "Heading 2", format: "heading2" },
  { icon: List, label: "Bulleted list", format: "bulletList" },
  { icon: ListOrdered, label: "Numbered list", format: "numberedList" },
  { icon: ListChecks, label: "Checklist", format: "checklist" },
  { icon: Image, label: "Image link", format: "image" },
  { icon: Code2, label: "Inline code", format: "code" },
  { icon: Link2, label: "Link", format: "link" },
];

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
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

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
  }, [initialProjectId]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
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
    try {
      await onSave(buildPayload(statusValue));
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

  const applyDescriptionFormat = (formatType: TaskDescriptionFormat) => {
    const input = descriptionInputRef.current;
    const selectionStart = input?.selectionStart ?? description.length;
    const selectionEnd = input?.selectionEnd ?? selectionStart;
    const formatted = formatTaskDescription(
      description,
      selectionStart,
      selectionEnd,
      formatType
    );

    setDescription(formatted.value);
    requestAnimationFrame(() => {
      const nextInput = descriptionInputRef.current;
      if (!nextInput) return;
      nextInput.focus();
      nextInput.setSelectionRange(
        formatted.selectionStart,
        formatted.selectionEnd
      );
    });
  };

  const copyTask = async () => {
    try {
      await navigator.clipboard.writeText(
        [title, description].filter(Boolean).join("\n\n")
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="task-modal"
        className="h-[min(767px,calc(100dvh-1rem))] max-h-[calc(100dvh-1rem)] !w-[calc(100vw-1rem)] gap-0 overflow-hidden border-[var(--dialog-border)] bg-[var(--surface-canvas)] p-0 text-[var(--text-primary)] shadow-none sm:h-[min(767px,calc(100dvh-3.875rem))] sm:max-h-[calc(100dvh-3.875rem)] sm:!w-[calc(100vw-3rem)] sm:!max-w-[1016px] lg:[&>button.absolute]:-right-8 lg:[&>button.absolute]:top-0"
      >
        {isSubmitting && <LoadingOverlay />}
        <form
          onSubmit={handleSubmit}
          className="grid h-full min-h-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,696px)_320px] lg:grid-rows-[95px_minmax(0,1fr)_54px] lg:[grid-template-areas:'header_aside''main_aside''mainFooter_asideFooter']"
        >
          <DialogHeader className="space-y-0 px-6 py-4 lg:[grid-area:header] lg:px-10 lg:pt-4">
            <DialogDescription className="sr-only">
              Create or edit a schedulable task, its description, project,
              timing, priority, and planner settings.
            </DialogDescription>
            <div className="flex h-[25px] items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-2 text-[13px] font-normal text-[var(--text-muted)]">
                <CheckSquare2 className="h-4 w-4" />
                Task
              </DialogTitle>
              <div className="mr-4 flex items-center gap-1 text-[13px] text-[var(--text-secondary)] lg:mr-0">
                {task ? (
                  <>
                    {status !== TaskStatus.COMPLETED ? (
                      <button
                        type="button"
                        onClick={handleMarkComplete}
                        disabled={isSubmitting}
                        className="flex h-[25px] items-center gap-1.5 rounded-md border border-[var(--border-control)] bg-[var(--surface-control)] px-2 text-[var(--text-primary)] hover:bg-[var(--surface-control-hover)]"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark complete
                      </button>
                    ) : (
                      <span className="flex h-[25px] items-center gap-1.5 rounded-md bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] px-2 text-[var(--color-success)]">
                        <Check className="h-3.5 w-3.5" /> Completed
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void copyTask()}
                      className="grid h-[25px] w-[25px] place-items-center rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                      aria-label="Copy task"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdvancedOpen((open) => !open)}
                      className="grid h-[25px] w-[25px] place-items-center rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
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
                          className="flex h-[25px] items-center gap-1.5 rounded-md px-2 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
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
                        "flex h-[25px] items-center gap-1.5 rounded-md px-2 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
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

          <main className="flex min-h-0 flex-col px-6 pb-3 lg:[grid-area:main] lg:px-10 lg:pb-6">
            <div
              aria-label="Description toolbar"
              className="flex h-[52px] flex-none items-start gap-0.5 overflow-x-auto pt-1 text-[var(--text-muted)]"
            >
              {DESCRIPTION_ACTIONS.map(({ icon: Icon, label, format }) => (
                <button
                  key={format}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => applyDescriptionFormat(format)}
                  className="grid h-[30px] w-[30px] flex-none place-items-center rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
            <Textarea
              id="description"
              ref={descriptionInputRef}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
              className="min-h-[260px] flex-1 resize-none border-0 bg-transparent px-0 py-0 text-[14px] leading-6 text-[var(--text-primary)] shadow-none placeholder:text-[var(--text-secondary)] focus-visible:border-0 focus-visible:ring-0"
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

          <aside className="min-h-0 overflow-y-auto border-t border-[var(--border-subtle)] bg-[var(--surface-panel)] lg:[grid-area:aside] lg:border-l lg:border-t-0">
            <div className="space-y-0.5 px-3 py-4 lg:px-5">
              <div
                className="flex h-[28px] w-full items-center gap-2 px-1 text-left text-[14px]"
                aria-label="Workspace"
              >
                <Layers3 className="h-4 w-4 text-[var(--text-muted)]" /> My
                Workspace
              </div>
              <div
                className="flex h-[28px] w-full items-center gap-2 px-1 text-left text-[14px] text-[var(--text-muted)]"
                aria-label="No folder"
              >
                <Folder className="h-4 w-4" /> No folder
              </div>
              <div className="flex h-[28px] items-center gap-2 px-1">
                <Box className="h-4 w-4 flex-none text-[var(--text-muted)]" />
                <Select
                  value={projectId || "none"}
                  onValueChange={(value) =>
                    setProjectId(value === "none" ? null : value)
                  }
                >
                  <SelectTrigger className="h-[28px] min-w-0 flex-1 border-0 bg-transparent px-0 text-[14px] shadow-none focus:ring-0">
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
                {task?.scheduledStart
                  ? format(newDate(task.scheduledStart), "EEE MMM d, h:mm a")
                  : "(Pending)"}
              </span>
            </label>

            <div className="space-y-0.5 border-b border-[var(--border-subtle)] px-5 py-3 text-[13px]">
              <div className="flex h-[30px] items-center gap-2">
                <UserRound className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="w-[76px] text-[var(--text-secondary)]">
                  Assignee:
                </span>
                <span>Me</span>
              </div>
              <div className="flex h-[30px] items-center gap-2">
                <Circle className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="w-[76px] text-[var(--text-secondary)]">
                  Status:
                </span>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as TaskStatus)}
                >
                  <SelectTrigger className="h-[28px] flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none">
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
              <div className="flex h-[30px] items-center gap-2">
                <Flag className="h-4 w-4 text-[var(--color-warning)]" />
                <span className="w-[76px] text-[var(--text-secondary)]">
                  Priority:
                </span>
                <Select
                  value={priority || Priority.NONE}
                  onValueChange={(value) => setPriority(value as Priority)}
                >
                  <SelectTrigger className="h-[28px] flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none">
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
              <div className="flex h-[30px] items-center gap-2">
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
                  className="h-[28px] flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
                />
                <span className="text-[var(--text-secondary)]">min</span>
              </div>
              <div className="flex h-[30px] items-center gap-2 pl-3">
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
                  className="h-[28px] flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="flex h-[30px] items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="w-[76px] text-[var(--text-secondary)]">
                  Start date:
                </span>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="h-[28px] min-w-0 flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="flex h-[30px] items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[var(--color-accent)]" />
                <span className="w-[76px] text-[var(--text-secondary)]">
                  Deadline:
                </span>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                  className="h-[28px] min-w-0 flex-1 border-0 bg-transparent px-0 text-[13px] text-[var(--color-accent)] shadow-none focus-visible:ring-0"
                />
                <Bell className="h-4 w-4 text-[var(--color-accent)]" />
              </div>
              <label className="flex h-[30px] cursor-pointer items-center gap-2 pl-3">
                <span className="w-[88px] text-[var(--text-secondary)]">
                  └ Hard deadline:
                </span>
                <Switch
                  checked={isFrozen}
                  onCheckedChange={setIsFrozen}
                  className="h-4 w-[26px] [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-[12px]"
                />
              </label>
              <div className="flex h-[30px] items-center gap-2">
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
                  <SelectTrigger className="h-[28px] flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none">
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
              <div className="flex h-[30px] items-center gap-2">
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
                className="mt-1 flex h-[30px] w-full items-center gap-2 rounded px-1 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
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
              <div className="space-y-3 border-t border-[var(--border-subtle)] px-5 py-4 text-[12px]">
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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="estimatedMinutes">Estimate</Label>
                    <Input
                      id="estimatedMinutes"
                      type="number"
                      min="0"
                      value={estimatedMinutes}
                      onChange={(event) =>
                        setEstimatedMinutes(event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxChunkMinutes">Max chunk</Label>
                    <Input
                      id="maxChunkMinutes"
                      type="number"
                      min="0"
                      value={maxChunkMinutes}
                      onChange={(event) =>
                        setMaxChunkMinutes(event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="estOptimistic">Optimistic</Label>
                    <Input
                      id="estOptimistic"
                      type="number"
                      min="0"
                      value={estOptimistic}
                      onChange={(event) => setEstOptimistic(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="estLikely">Likely</Label>
                    <Input
                      id="estLikely"
                      type="number"
                      min="0"
                      value={estLikely}
                      onChange={(event) => setEstLikely(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="estPessimistic">Pessimistic</Label>
                    <Input
                      id="estPessimistic"
                      type="number"
                      min="0"
                      value={estPessimistic}
                      onChange={(event) =>
                        setEstPessimistic(event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="contextTag">Context</Label>
                    <Input
                      id="contextTag"
                      value={contextTag}
                      onChange={(event) => setContextTag(event.target.value)}
                    />
                  </div>
                </div>
                {contextFactor && suggestedLikely && (
                  <button
                    type="button"
                    onClick={() => setEstLikely(String(suggestedLikely))}
                    className="text-left text-[var(--accent)]"
                  >
                    Suggest {suggestedLikely} min from your history
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Planner priority</Label>
                    <Select
                      value={priorityLevel}
                      onValueChange={(value) =>
                        setPriorityLevel(value as SchedulingTaskPriority)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(SchedulingTaskPriority).map((value) => (
                          <SelectItem key={value} value={value}>
                            {formatEnumValue(value)}
                          </SelectItem>
                        ))}
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
                      <SelectTrigger>
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
                  <div>
                    <Label>Energy level</Label>
                    <Select
                      value={energyLevel || "none"}
                      onValueChange={(value) =>
                        setEnergyLevel(
                          value === "none" ? "" : (value as EnergyLevel)
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {Object.values(EnergyLevel).map((value) => (
                          <SelectItem key={value} value={value}>
                            {formatEnumValue(value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-end justify-between gap-2 pb-2">
                    <span>Lock schedule</span>
                    <Switch
                      checked={scheduleLocked}
                      onCheckedChange={setScheduleLocked}
                      className="h-4 w-[26px] [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-[12px]"
                    />
                  </label>
                </div>
                <div>
                  <Label>Tags</Label>
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
                </div>
                {isRecurring && (
                  <div className="rounded border border-[var(--border-subtle)] bg-[var(--surface-input)] p-2 text-[var(--text-secondary)]">
                    Repeats weekly. Recurrence details are saved with this task.
                  </div>
                )}
              </div>
            )}
          </aside>

          <footer className="flex items-center px-6 lg:[grid-area:mainFooter] lg:px-10">
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
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3 lg:[grid-area:asideFooter] lg:border-l">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-[30px] px-2 text-[13px] text-[var(--text-secondary)]"
            >
              Cancel{" "}
              <kbd className="ml-1 rounded bg-[var(--surface-control)] px-1 text-[10px]">
                Esc
              </kbd>
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="h-[34px] px-3 text-[13px]"
            >
              {isSubmitting ? "Saving..." : task ? "Save changes" : "Save task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
