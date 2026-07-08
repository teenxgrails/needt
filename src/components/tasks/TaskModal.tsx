import { useCallback, useEffect, useRef, useState } from "react";

import { RRule } from "rrule";

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
}

//TODO: move to utils
const formatEnumValue = (value: string) => {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

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
    }
  }, [task, isOpen, initialProjectId, resetForm]);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[500px]">
        {isSubmitting && <LoadingOverlay />}
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto">
          {task && (
            <TaskTimer
              taskId={task.id}
              actualMinutes={task.actualMinutes}
              likelyDelta={task.likelyDelta}
            />
          )}

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                type="date"
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Task won&apos;t be scheduled before this date
              </p>
            </div>

            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                type="number"
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="estimatedMinutes">Planner Estimate</Label>
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
              <Label htmlFor="energyLevel">Energy Level</Label>
              <Select
                value={energyLevel || "none"}
                onValueChange={(value) =>
                  setEnergyLevel(value === "none" ? "" : (value as EnergyLevel))
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

            <div>
              <Label htmlFor="priorityLevel">Planner Priority</Label>
              <Select
                value={priorityLevel}
                onValueChange={(value) =>
                  setPriorityLevel(value as SchedulingTaskPriority)
                }
              >
                <SelectTrigger>
                  <SelectValue>{formatEnumValue(priorityLevel)}</SelectValue>
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
              <Label htmlFor="energyRequired">Focus Required</Label>
              <Select
                value={energyRequired}
                onValueChange={(value) =>
                  setEnergyRequired(value as SchedulingEnergyLevel)
                }
              >
                <SelectTrigger>
                  <SelectValue>{formatEnumValue(energyRequired)}</SelectValue>
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
              <Label htmlFor="preferredTime">Preferred Time</Label>
              <Select
                value={preferredTime || "none"}
                onValueChange={(value) =>
                  setPreferredTime(
                    value === "none" ? "" : (value as TimePreference)
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None">
                    {preferredTime ? formatEnumValue(preferredTime) : "None"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {Object.values(TimePreference).map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatEnumValue(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <Label htmlFor="deadline">Planner Deadline</Label>
              <Input
                type="datetime-local"
                id="deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="contextTag">Context Tag</Label>
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
                  className="mt-1 text-left text-xs text-blue-300 hover:text-blue-200"
                >
                  You usually run {contextFactor.toFixed(1)}x on &quot;
                  {contextTag.trim()}&quot;. Suggest {suggestedLikely} min.
                </button>
              )}
            </div>

            <div>
              <Label htmlFor="minChunkMinutes">Min Chunk</Label>
              <Input
                type="number"
                id="minChunkMinutes"
                value={minChunkMinutes}
                onChange={(e) => setMinChunkMinutes(e.target.value)}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="maxChunkMinutes">Max Chunk</Label>
              <Input
                type="number"
                id="maxChunkMinutes"
                value={maxChunkMinutes}
                onChange={(e) => setMaxChunkMinutes(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div className="space-y-4 border-t pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Schedule</Label>
                <p className="text-sm text-muted-foreground">
                  Let the system schedule this task automatically
                </p>
              </div>
              <Switch
                checked={isAutoScheduled}
                onCheckedChange={setIsAutoScheduled}
              />
            </div>

            {isAutoScheduled && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Lock Schedule</Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent automatic rescheduling
                    </p>
                  </div>
                  <Switch
                    checked={scheduleLocked}
                    onCheckedChange={setScheduleLocked}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Freeze Block</Label>
                    <p className="text-sm text-muted-foreground">
                      Keep this block fixed when the smart scheduler reflows.
                    </p>
                  </div>
                  <Switch checked={isFrozen} onCheckedChange={setIsFrozen} />
                </div>

                {task?.scheduledStart && task?.scheduledEnd && (
                  <div className="rounded-md bg-primary/10 p-3">
                    <div className="text-sm text-primary">
                      Scheduled for{" "}
                      {format(newDate(task.scheduledStart), "PPp")} to{" "}
                      {format(newDate(task.scheduledEnd), "p")}
                    </div>
                    {task.scheduleScore && (
                      <div className="mt-1 text-sm text-primary/70">
                        Confidence: {Math.round(task.scheduleScore * 100)}%
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

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

          <div>
            <Label>Tags</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <label
                  key={tag.id}
                  className={cn(
                    "inline-flex cursor-pointer items-center rounded-full px-3 py-1.5 text-sm transition-colors",
                    selectedTagIds.includes(tag.id)
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
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
                    style={{ backgroundColor: tag.color || "var(--muted)" }}
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
                Add Tag
              </Button>
            </div>
          </div>

          <div className="space-y-2">
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
              <Label htmlFor="recurring">Make this a recurring task</Label>
            </div>
            {isRecurring && !dueDate && (
              <div className="ml-6 mt-1 text-sm text-primary">
                A recurring task needs a start date. Today has been set as the
                default.
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

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? "Saving..." : task ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
