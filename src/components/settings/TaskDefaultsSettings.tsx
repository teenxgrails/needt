"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Bell,
  Box,
  CalendarClock,
  CalendarDays,
  Circle,
  Clock3,
  Flag,
  Layers3,
  Plus,
  Tag,
  UserRound,
} from "lucide-react";

import { useAppSession } from "@/components/providers/app-session-context";
import {
  NeedtPicker,
  MotionSwitchRow,
} from "@/components/settings/MotionSettingsControls";
import { SettingsSection } from "@/components/settings/SettingsSection";

import {
  DEFAULT_TASK_DEFAULTS,
  TaskDeadlinePreset,
  TaskDefaults,
  TaskStartPreset,
  readTaskDefaults,
  writeTaskDefaults,
} from "@/lib/task-defaults";

import { useProjectStore } from "@/store/project";

import { Priority, TaskStatus } from "@/types/task";

const DURATION_OPTIONS = [15, 30, 45, 60, 120, 240, 480].map((minutes) => ({
  value: String(minutes),
  label:
    minutes < 60
      ? `${minutes} min`
      : minutes === 60
        ? "1 hour"
        : `${minutes / 60} hours`,
}));

const DEADLINE_OPTIONS: Array<{
  value: TaskDeadlinePreset;
  label: string;
}> = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "this-week", label: "This week" },
  { value: "7-days", label: "7 days from now" },
  { value: "next-week", label: "Next week" },
  { value: "2-weeks", label: "In 2 weeks" },
  { value: "one-month", label: "In one month" },
  { value: "none", label: "No deadline" },
];

export function TaskDefaultsSettings() {
  const { projects, fetchProjects } = useProjectStore();
  const { data: session } = useAppSession();
  const [defaults, setDefaults] = useState<TaskDefaults>(DEFAULT_TASK_DEFAULTS);

  useEffect(() => {
    setDefaults(readTaskDefaults());
    void fetchProjects();
  }, [fetchProjects]);

  const updateDefaults = (updates: Partial<TaskDefaults>) => {
    setDefaults((current) => {
      const next = { ...current, ...updates };
      writeTaskDefaults(next);
      return next;
    });
  };

  const projectOptions = useMemo(
    () => [
      {
        value: "none",
        label: "No project",
        icon: <Box className="h-4 w-4 text-[var(--text-secondary)]" />,
      },
      ...projects
        .filter((project) => project.status === "active")
        .map((project) => ({
          value: project.id,
          label: project.name,
          icon: (
            <Box
              className="h-4 w-4"
              style={{ color: project.color || "var(--text-secondary)" }}
            />
          ),
        })),
    ],
    [projects]
  );

  const selectedProject =
    projectOptions.find((option) => option.value === defaults.projectId)
      ?.label ?? "No project";
  const deadlineLabel =
    DEADLINE_OPTIONS.find((option) => option.value === defaults.deadlinePreset)
      ?.label ?? "7 days from now";

  return (
    <SettingsSection description="These defaults will be used when creating a task.">
      <div className="space-y-8">
        <div className="space-y-0.5">
          <NeedtPicker
            label="Workspace"
            value="personal"
            valueLabel="My Workspace"
            options={[
              {
                value: "personal",
                label: "My Workspace",
                icon: (
                  <Layers3 className="h-4 w-4 text-[var(--text-secondary)]" />
                ),
              },
            ]}
            onValueChange={() => undefined}
            icon={
              <Layers3 className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            }
          />
          <NeedtPicker
            label="Project"
            value={defaults.projectId}
            valueLabel={selectedProject}
            options={projectOptions}
            onValueChange={(projectId) => updateDefaults({ projectId })}
            icon={<Box className="h-3.5 w-3.5 text-[var(--text-secondary)]" />}
            searchPlaceholder="Choose project…"
          />
          <NeedtPicker
            label="Assignee"
            value="me"
            valueLabel={session?.user?.name || session?.user?.email || "Me"}
            options={[
              {
                value: "me",
                label: session?.user?.name || session?.user?.email || "Me",
                icon: (
                  <UserRound className="h-4 w-4 text-[var(--text-secondary)]" />
                ),
              },
            ]}
            onValueChange={() => undefined}
            icon={
              <UserRound className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            }
          />
          <NeedtPicker
            label="Status"
            value={defaults.status}
            valueLabel={
              defaults.status === TaskStatus.TODO
                ? "Todo"
                : defaults.status === TaskStatus.IN_PROGRESS
                  ? "In progress"
                  : "Completed"
            }
            options={[
              { value: TaskStatus.TODO, label: "Todo" },
              { value: TaskStatus.IN_PROGRESS, label: "In progress" },
              { value: TaskStatus.COMPLETED, label: "Completed" },
            ]}
            onValueChange={(status) =>
              updateDefaults({ status: status as TaskStatus })
            }
            icon={
              <Circle className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            }
          />
          <NeedtPicker
            label="Priority"
            value={defaults.priority}
            valueLabel={
              defaults.priority === "none"
                ? "None"
                : `${defaults.priority[0].toUpperCase()}${defaults.priority.slice(1)}`
            }
            options={[
              { value: "none", label: "None" },
              { value: Priority.LOW, label: "Low" },
              { value: Priority.MEDIUM, label: "Medium" },
              { value: Priority.HIGH, label: "High" },
            ]}
            onValueChange={(priority) =>
              updateDefaults({ priority: priority as Priority | "none" })
            }
            icon={<Flag className="h-3.5 w-3.5 text-amber-400" />}
          />
          <NeedtPicker
            label="Labels"
            value="none"
            valueLabel="None"
            options={[
              {
                value: "none",
                label: "None",
                icon: <Tag className="h-4 w-4 text-[var(--text-secondary)]" />,
              },
            ]}
            onValueChange={() => undefined}
            icon={<Tag className="h-3.5 w-3.5 text-[var(--text-secondary)]" />}
          />
        </div>

        <div className="space-y-0.5">
          <MotionSwitchRow
            label="Auto-scheduled"
            checked={defaults.autoScheduled}
            onCheckedChange={(autoScheduled) =>
              updateDefaults({ autoScheduled })
            }
            icon={
              <CalendarClock className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            }
          />
          <NeedtPicker
            label="Duration"
            value={String(defaults.durationMinutes)}
            valueLabel={
              DURATION_OPTIONS.find(
                (option) => option.value === String(defaults.durationMinutes)
              )?.label ?? `${defaults.durationMinutes} min`
            }
            options={DURATION_OPTIONS}
            onValueChange={(durationMinutes) =>
              updateDefaults({ durationMinutes: Number(durationMinutes) })
            }
            icon={
              <Clock3 className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            }
          />
          <NeedtPicker
            label="Min chunk duration"
            value={String(defaults.minChunkMinutes)}
            valueLabel={
              defaults.minChunkMinutes === 0
                ? "No Chunks"
                : `${defaults.minChunkMinutes} min`
            }
            options={[
              { value: "0", label: "No Chunks" },
              ...DURATION_OPTIONS.filter(
                (option) => Number(option.value) < defaults.durationMinutes
              ),
            ]}
            onValueChange={(minChunkMinutes) =>
              updateDefaults({ minChunkMinutes: Number(minChunkMinutes) })
            }
            indented
          />
          <NeedtPicker
            label="Start date"
            value={defaults.startPreset}
            valueLabel={
              defaults.startPreset === "today"
                ? "Today"
                : defaults.startPreset === "tomorrow"
                  ? "Tomorrow"
                  : "No start date"
            }
            options={[
              { value: "today", label: "Today" },
              { value: "tomorrow", label: "Tomorrow" },
              { value: "none", label: "No start date" },
            ]}
            onValueChange={(startPreset) =>
              updateDefaults({ startPreset: startPreset as TaskStartPreset })
            }
            icon={
              <CalendarDays className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            }
          />
          <NeedtPicker
            label="Deadline"
            value={defaults.deadlinePreset}
            valueLabel={deadlineLabel}
            options={DEADLINE_OPTIONS}
            onValueChange={(deadlinePreset) =>
              updateDefaults({
                deadlinePreset: deadlinePreset as TaskDeadlinePreset,
              })
            }
            icon={
              <CalendarDays className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            }
            footer={
              <button
                type="button"
                className="flex h-9 w-full items-center gap-2 rounded-[var(--control-radius)] px-3 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--menu-item-hover)] hover:text-[var(--text-primary)]"
              >
                <Plus className="h-4 w-4" />
                Custom deadline
              </button>
            }
          />
          <MotionSwitchRow
            label="Hard deadline"
            checked={defaults.hardDeadline}
            onCheckedChange={(hardDeadline) => updateDefaults({ hardDeadline })}
            icon={<Bell className="h-3.5 w-3.5 text-[var(--text-secondary)]" />}
            indented
          />
          <NeedtPicker
            label="Schedule"
            value={defaults.scheduleName}
            valueLabel={defaults.scheduleName}
            options={[
              { value: "Work hours", label: "Work hours" },
              { value: "Anytime (24/7)", label: "Anytime (24/7)" },
            ]}
            onValueChange={(scheduleName) => updateDefaults({ scheduleName })}
            icon={
              <CalendarClock className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            }
            footer={
              <a
                href="#schedules"
                className="flex h-9 items-center gap-2 rounded-[var(--control-radius)] px-3 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--menu-item-hover)] hover:text-[var(--text-primary)]"
              >
                <Plus className="h-4 w-4" />
                Add schedule
              </a>
            }
          />
        </div>
      </div>
    </SettingsSection>
  );
}
