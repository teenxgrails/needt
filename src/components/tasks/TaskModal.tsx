import { useCallback, useEffect, useRef, useState } from "react";

import { BookTemplate, ChevronDown, Settings2 } from "lucide-react";
import { RRule } from "rrule";
import { toast } from "sonner";

import { TaskTimer } from "@/components/tasks/TaskTimer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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

import { format, newDate } from "@/lib/date-utils";
import { RecurrenceConverterFactory } from "@/lib/task-sync/recurrence/recurrence-converter-factory";
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

// Helper function to convert external recurrence rule to RRule format
function getStandardRRule(task?: Task): RRule {
  if (!task?.recurrenceRule) {
    return new RRule({
      freq: RRule.WEEKLY,
      interval: 1,
      byweekday: [RRule.MO],
    });
  }

  // If the task has a source (e.g., OUTLOOK), use the appropriate converter
  if (task.source) {
    const converter = RecurrenceConverterFactory.getConverter(task.source);
    const standardRule = converter.convertFromString(task.recurrenceRule);
    return RRule.fromString(standardRule);
  }

  // If no source or internal task, assume it's already in RRule format
  return RRule.fromString(task.recurrenceRule);
}

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
  const titleInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setStatus(TaskStatus.TODO);
    setDueDate("");
    setStartDate("");
    setDuration("");
    setEstimatedMinutes("");
    setEstOptimistic("");
    setEstLikely("");
    setEstPessimistic("");
    setMinChunkMinutes("");
    setMaxChunkMinutes("");
    setDeadline("");
    setContextTag("");
    setEnergyLevel("");
    setEnergyRequired(SchedulingEnergyLevel.MEDIUM);
    setPreferredTime("");
    setSelectedTagIds([]);
    setNewTagName("");
    setNewTagColor("#E5E7EB");
    setProjectId(initialProjectId ?? null);
    setIsRecurring(false);
    setRecurrenceRule(undefined);
    setIsAutoScheduled(true);
    setScheduleLocked(false);
    setIsFrozen(false);
    setPriority(null);
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

  // Populate form with task data when editing
  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      // Handle date string from API
      if (task.dueDate) {
        const date = newDate(task.dueDate);
        setDueDate(date.toISOString().split("T")[0]);
      } else {
        setDueDate("");
      }
      if (task.startDate) {
        const date = newDate(task.startDate);
        setStartDate(date.toISOString().split("T")[0]);
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
        setDeadline(date.toISOString().slice(0, 16));
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
        setStartDate(initialStart.toISOString().split("T")[0]);
        setDeadline(initialStart.toISOString().slice(0, 16));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
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
        estPessimistic: estPessimistic
          ? parseInt(estPessimistic, 10)
          : undefined,
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
      });
      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error(
        task ? "Couldn't save the task." : "Couldn't create the task."
      );
    } finally {
      setIsSubmitting(false);
    }
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
      console.error("Error creating tag:", error);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[min(760px,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 text-[var(--text-hi)] sm:max-w-[1120px]">
        <div className="contents">
          {isSubmitting && <LoadingOverlay />}
          <DialogHeader className="flex-row items-center justify-between space-y-0 border-b border-[var(--line-strong)] px-5 py-3.5 pr-14">
            <DialogTitle className="flex items-center gap-3 text-base">
              <span className="rounded-md border border-[var(--line-strong)] bg-[var(--raised)] px-2.5 py-1 text-xs font-medium text-[var(--text-lo)]">
                Task
              </span>
              {task ? "Edit task" : "Create task"}
            </DialogTitle>
            {!task && (
              <Popover
                open={isTemplateMenuOpen}
                onOpenChange={setIsTemplateMenuOpen}
              >
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="sm">
                    <BookTemplate className="h-3.5 w-3.5" />
                    Use template
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-72 bg-[var(--raised)] p-2 text-[var(--text-hi)]"
                >
                  <div className="px-2 py-1.5 text-[13px] font-semibold">
                    Task templates
                  </div>
                  <div className="my-1 h-px bg-[var(--line-strong)]" />
                  {TASK_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className="w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-[var(--active)]"
                    >
                      <div className="text-[13px] font-medium">
                        {template.name}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--text-lo)]">
                        {template.duration} min · {template.contextTag}
                      </div>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            )}
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            {task && (
              <div className="flex-none px-5 pt-4">
                <TaskTimer
                  taskId={task.id}
                  actualMinutes={task.actualMinutes}
                  likelyDelta={task.likelyDelta}
                />
              </div>
            )}

            <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="flex min-h-0 flex-col gap-3 p-5">
                <div>
                  <Label htmlFor="title" className="sr-only">
                    Task name
                  </Label>
                  <Input
                    id="title"
                    ref={titleInputRef}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Task name"
                    className="h-11 border-[var(--line-strong)] bg-[var(--raised)] text-xl font-normal text-[var(--text-hi)] placeholder:text-[var(--text-lo)]"
                  />
                </div>

                <div
                  aria-label="Description toolbar"
                  className="flex flex-wrap gap-1 rounded-md border border-[var(--line-strong)] bg-[var(--raised)] p-1 text-xs text-[var(--text-lo)]"
                >
                  {[
                    "B",
                    "I",
                    "U",
                    "S",
                    "H1",
                    "H2",
                    "•",
                    "1.",
                    "Img",
                    "Code",
                    "Link",
                  ].map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="rounded px-2 py-1 hover:bg-[var(--active)] hover:text-[var(--text-hi)]"
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Add notes, links, acceptance criteria, or a quick brain dump."
                    className="mt-2 min-h-[140px] flex-1 resize-none border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text-hi)] placeholder:text-[var(--text-lo)]"
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border border-[var(--line-strong)] bg-[var(--raised)] px-3 py-2.5 text-xs text-[var(--text-lo)]">
                  <span>Attachments</span>
                  <span>Add files after saving</span>
                </div>
              </div>

              <div className="min-h-0 space-y-3 overflow-y-auto border-t border-[var(--line-strong)] p-5 lg:border-l lg:border-t-0">
                <div
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors",
                    isAutoScheduled
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,var(--raised))] text-[var(--text-hi)]"
                      : "border-[var(--line-strong)] bg-[var(--raised)]"
                  )}
                >
                  <span className="font-medium">Auto-scheduled</span>
                  <Switch
                    checked={isAutoScheduled}
                    onCheckedChange={setIsAutoScheduled}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={status}
                      onValueChange={(value) => setStatus(value as TaskStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue>{formatEnumValue(status)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(TaskStatus).map((s) => (
                          <SelectItem key={s} value={s}>
                            {formatEnumValue(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={priority || Priority.NONE}
                      onValueChange={(value) => setPriority(value as Priority)}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {formatEnumValue(priority || Priority.NONE)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(Priority).map((level) => (
                          <SelectItem key={level} value={level}>
                            {formatEnumValue(level)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      type="number"
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      min="0"
                      placeholder="30"
                    />
                  </div>

                  <div className={cn(!isAdvancedOpen && "hidden")}>
                    <Label htmlFor="minChunkMinutes">Min chunk</Label>
                    <Input
                      type="number"
                      id="minChunkMinutes"
                      value={minChunkMinutes}
                      onChange={(e) => setMinChunkMinutes(e.target.value)}
                      min="0"
                      placeholder="No chunks"
                    />
                  </div>

                  <div className={cn(!isAdvancedOpen && "hidden")}>
                    <Label htmlFor="startDate">Start date</Label>
                    <Input
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      type="datetime-local"
                      id="deadline"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </div>

                  <div
                    className={cn(
                      "col-span-full flex items-center justify-between rounded-md border border-[var(--line-strong)] bg-[var(--raised)] px-3 py-2",
                      !isAdvancedOpen && "hidden"
                    )}
                  >
                    <div>
                      <Label>Hard deadline</Label>
                      <p className="text-xs text-[var(--text-lo)]">
                        Keep this block fixed when reflowing.
                      </p>
                    </div>
                    <Switch checked={isFrozen} onCheckedChange={setIsFrozen} />
                  </div>

                  <div className="col-span-full">
                    <Label htmlFor="preferredTime">Schedule</Label>
                    <Select
                      value={preferredTime || "none"}
                      onValueChange={(value) =>
                        setPreferredTime(
                          value === "none" ? "" : (value as TimePreference)
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Work hours">
                          {preferredTime
                            ? formatEnumValue(preferredTime)
                            : "Work hours"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Work hours</SelectItem>
                        {Object.values(TimePreference).map((time) => (
                          <SelectItem key={time} value={time}>
                            {formatEnumValue(time)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAdvancedOpen((open) => !open)}
                    aria-expanded={isAdvancedOpen}
                    className="col-span-full flex items-center justify-between rounded-md border border-[var(--line-strong)] bg-[var(--raised)] px-3 py-2 text-left transition-colors hover:bg-[var(--active)]"
                  >
                    <span className="flex items-center gap-2">
                      <Settings2
                        className="h-3.5 w-3.5 text-[var(--text-lo)]"
                        strokeWidth={1.8}
                      />
                      <span>
                        <span className="block text-[13px] font-medium text-[var(--text-hi)]">
                          Advanced settings
                        </span>
                        <span className="block text-xs text-[var(--text-lo)]">
                          Estimates, focus, chunks, tags, and recurrence
                        </span>
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-[var(--text-lo)] transition-transform duration-150",
                        isAdvancedOpen && "rotate-180"
                      )}
                      strokeWidth={1.8}
                    />
                  </button>
                </div>

                <div
                  className={cn(
                    "grid grid-cols-1 gap-3 border-t border-[var(--line-strong)] pt-3 sm:grid-cols-2",
                    !isAdvancedOpen && "hidden"
                  )}
                >
                  <div>
                    <Label htmlFor="estimatedMinutes">Planner estimate</Label>
                    <Input
                      type="number"
                      id="estimatedMinutes"
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(e.target.value)}
                      min="0"
                      placeholder={duration || "45"}
                    />
                  </div>

                  <div>
                    <Label htmlFor="estOptimistic">Optimistic</Label>
                    <Input
                      type="number"
                      id="estOptimistic"
                      value={estOptimistic}
                      onChange={(e) => setEstOptimistic(e.target.value)}
                      min="0"
                      placeholder="30"
                    />
                  </div>

                  <div>
                    <Label htmlFor="estLikely">Likely</Label>
                    <Input
                      type="number"
                      id="estLikely"
                      value={estLikely}
                      onChange={(e) => setEstLikely(e.target.value)}
                      min="0"
                      placeholder={estimatedMinutes || duration || "45"}
                    />
                  </div>

                  <div>
                    <Label htmlFor="estPessimistic">Pessimistic</Label>
                    <Input
                      type="number"
                      id="estPessimistic"
                      value={estPessimistic}
                      onChange={(e) => setEstPessimistic(e.target.value)}
                      min="0"
                      placeholder="75"
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxChunkMinutes">Max chunk</Label>
                    <Input
                      type="number"
                      id="maxChunkMinutes"
                      value={maxChunkMinutes}
                      onChange={(e) => setMaxChunkMinutes(e.target.value)}
                      min="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contextTag">Labels</Label>
                    <Input
                      id="contextTag"
                      value={contextTag}
                      onChange={(e) => setContextTag(e.target.value)}
                      placeholder="deep work"
                    />
                    {contextFactor && suggestedLikely && (
                      <button
                        type="button"
                        onClick={() => setEstLikely(String(suggestedLikely))}
                        className="mt-1 text-left text-xs text-[var(--accent)] hover:text-[var(--text-hi)]"
                      >
                        You usually run {contextFactor.toFixed(1)}x on &quot;
                        {contextTag.trim()}&quot;. Suggest {suggestedLikely}{" "}
                        min.
                      </button>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="priorityLevel">Planner priority</Label>
                    <Select
                      value={priorityLevel}
                      onValueChange={(value) =>
                        setPriorityLevel(value as SchedulingTaskPriority)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {formatEnumValue(priorityLevel)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(SchedulingTaskPriority).map((level) => (
                          <SelectItem key={level} value={level}>
                            {formatEnumValue(level)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="energyRequired">Focus required</Label>
                    <Select
                      value={energyRequired}
                      onValueChange={(value) =>
                        setEnergyRequired(value as SchedulingEnergyLevel)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {formatEnumValue(energyRequired)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(SchedulingEnergyLevel).map((level) => (
                          <SelectItem key={level} value={level}>
                            {formatEnumValue(level)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="energyLevel">Energy level</Label>
                    <Select
                      value={energyLevel || "none"}
                      onValueChange={(value) =>
                        setEnergyLevel(
                          value === "none" ? "" : (value as EnergyLevel)
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None">
                          {energyLevel ? formatEnumValue(energyLevel) : "None"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {Object.values(EnergyLevel).map((level) => (
                          <SelectItem key={level} value={level}>
                            {formatEnumValue(level)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isAdvancedOpen && isAutoScheduled && (
                  <div className="space-y-3 border-t border-[var(--line-strong)] pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Lock schedule</Label>
                        <p className="text-sm text-[var(--text-lo)]">
                          Prevent automatic rescheduling
                        </p>
                      </div>
                      <Switch
                        checked={scheduleLocked}
                        onCheckedChange={setScheduleLocked}
                      />
                    </div>

                    {task?.scheduledStart && task?.scheduledEnd && (
                      <div className="rounded-md border border-[var(--line-strong)] bg-[var(--raised)] p-3">
                        <div className="text-sm text-[var(--text-hi)]">
                          Scheduled for{" "}
                          {format(newDate(task.scheduledStart), "PPp")} to{" "}
                          {format(newDate(task.scheduledEnd), "p")}
                        </div>
                        {task.scheduleScore && (
                          <div className="mt-1 text-sm text-[var(--text-lo)]">
                            Confidence: {Math.round(task.scheduleScore * 100)}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="project">Project</Label>
                  <Select
                    value={projectId || "none"}
                    onValueChange={(value) =>
                      setProjectId(value === "none" ? null : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Project</SelectItem>
                      {projects
                        .filter((p) => p.status === "active")
                        .map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={cn(!isAdvancedOpen && "hidden")}>
                  <Label>Tags</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <label
                        key={tag.id}
                        className={cn(
                          "inline-flex cursor-pointer items-center rounded-md px-3 py-1.5 text-sm transition-colors",
                          selectedTagIds.includes(tag.id)
                            ? "bg-[var(--active)] text-[var(--text-hi)]"
                            : "bg-[var(--raised)] text-[var(--text-lo)] hover:bg-[var(--active)] hover:text-[var(--text-hi)]"
                        )}
                      >
                        <Checkbox
                          className="sr-only"
                          checked={selectedTagIds.includes(tag.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTagIds([...selectedTagIds, tag.id]);
                            } else {
                              setSelectedTagIds(
                                selectedTagIds.filter((id) => id !== tag.id)
                              );
                            }
                          }}
                        />
                        <span
                          className="mr-2 h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: tag.color || "var(--muted)",
                          }}
                        />
                        {tag.name}
                      </label>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Input
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="New tag name"
                    />
                    <Input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="h-9 w-9 p-1"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim()}
                      variant="secondary"
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <div
                  className={cn(
                    "space-y-2 border-t border-[var(--line-strong)] pt-3",
                    !isAdvancedOpen && "hidden"
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="recurring"
                      checked={isRecurring}
                      onCheckedChange={(checked) => {
                        setIsRecurring(checked as boolean);
                        if (checked) {
                          if (!dueDate) {
                            const today = newDate();
                            setDueDate(today.toISOString().split("T")[0]);
                          }
                          if (!recurrenceRule) {
                            setRecurrenceRule(
                              new RRule({
                                freq: RRule.WEEKLY,
                                interval: 1,
                                byweekday: [RRule.MO],
                              }).toString()
                            );
                          }
                        }
                      }}
                    />
                    <Label htmlFor="recurring">Recurring task</Label>
                  </div>
                  {isRecurring && !dueDate && (
                    <div className="ml-6 mt-1 text-sm text-[var(--accent)]">
                      A recurring task needs a start date. Today has been set as
                      the default.
                    </div>
                  )}
                  {isRecurring && (
                    <div className="mt-2 space-y-3 pl-6">
                      <div>
                        <Label>Repeat every</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={
                              recurrenceRule
                                ? getStandardRRule({
                                    recurrenceRule,
                                    source: task?.source,
                                  } as Task).options.interval || 1
                                : 1
                            }
                            onChange={(e) => {
                              const interval = parseInt(e.target.value) || 1;
                              const currentRule = recurrenceRule
                                ? getStandardRRule({
                                    recurrenceRule,
                                    source: task?.source,
                                  } as Task)
                                : new RRule({
                                    freq: RRule.WEEKLY,
                                    interval: 1,
                                    byweekday: [RRule.MO],
                                  });
                              setRecurrenceRule(
                                new RRule({
                                  ...currentRule.options,
                                  interval,
                                }).toString()
                              );
                            }}
                            className="w-20"
                          />
                          <Select
                            value={
                              recurrenceRule
                                ? getStandardRRule({
                                    recurrenceRule,
                                    source: task?.source,
                                  } as Task).options.freq.toString()
                                : RRule.WEEKLY.toString()
                            }
                            onValueChange={(value) => {
                              const freq = parseInt(value);
                              const currentRule = recurrenceRule
                                ? getStandardRRule({
                                    recurrenceRule,
                                    source: task?.source,
                                  } as Task)
                                : new RRule({
                                    freq: RRule.WEEKLY,
                                    interval: 1,
                                    byweekday: [RRule.MO],
                                  });
                              setRecurrenceRule(
                                new RRule({
                                  ...currentRule.options,
                                  freq,
                                  byweekday:
                                    freq === RRule.WEEKLY ? [RRule.MO] : null,
                                }).toString()
                              );
                            }}
                          >
                            <SelectTrigger className="w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={RRule.DAILY.toString()}>
                                days
                              </SelectItem>
                              <SelectItem value={RRule.WEEKLY.toString()}>
                                weeks
                              </SelectItem>
                              <SelectItem value={RRule.MONTHLY.toString()}>
                                months
                              </SelectItem>
                              <SelectItem value={RRule.YEARLY.toString()}>
                                years
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-none justify-end gap-3 border-t border-[var(--line-strong)] px-5 py-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel (Esc)
              </Button>
              <Button type="submit" disabled={isSubmitting || !title.trim()}>
                {isSubmitting
                  ? "Saving..."
                  : task
                    ? "Save changes"
                    : "Save task"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
