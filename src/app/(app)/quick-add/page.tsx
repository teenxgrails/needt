"use client";

import { useState } from "react";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { logger } from "@/lib/logger";

import { useTaskMutations } from "@/hooks/useTaskMutations";

import {
  SchedulingEnergyLevel,
  SchedulingTaskPriority,
  TaskStatus,
} from "@/types/task";

const LOG_SOURCE = "quick-add-page";

interface ParsedTask {
  title: string;
  description?: string;
  estimatedMinutes?: number;
  deadline?: string;
  priority?: SchedulingTaskPriority;
  energyRequired?: SchedulingEnergyLevel;
  contextTag?: string;
}

/**
 * Minimal quick-add: type or paste one or many tasks (one per line), and the
 * existing brain-dump parser (`/api/ai/parse-tasks`) turns them into scheduled
 * tasks. Deliberately dependency-free and house-format.
 */
export default function QuickAddPage() {
  const { createTask } = useTaskMutations();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/ai/parse-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!response.ok) throw new Error(`parse failed: ${response.status}`);
      const data = (await response.json()) as { tasks: ParsedTask[] };

      if (!data.tasks.length) {
        toast.error("Nothing to add");
        return;
      }

      for (const task of data.tasks) {
        await createTask({
          title: task.title,
          status: TaskStatus.TODO,
          estimatedMinutes: task.estimatedMinutes,
          duration: task.estimatedMinutes,
          energyRequired: task.energyRequired || SchedulingEnergyLevel.MEDIUM,
          priorityLevel: task.priority || SchedulingTaskPriority.MEDIUM,
          contextTag: task.contextTag,
          isAutoScheduled: true,
          autoScheduled: true,
          scheduleLocked: false,
          isRecurring: false,
        });
      }

      setText("");
      toast.success(
        `Added ${data.tasks.length} ${data.tasks.length === 1 ? "task" : "tasks"}`
      );
    } catch (error) {
      logger.error(
        "Quick add failed",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
      toast.error("Could not add tasks");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col justify-center px-4 py-8">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[var(--accent)]" />
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Quick add
        </h1>
      </div>
      <p className="mb-3 text-sm text-[var(--text-secondary)]">
        Brain-dump one task per line. We&apos;ll parse durations, deadlines, and
        priorities where we can.
      </p>
      <textarea
        autoFocus
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            void submit();
          }
        }}
        rows={6}
        placeholder={"Draft the Q3 report ~90m by Friday\nEmail the design team\nBook dentist"}
        className="w-full resize-y rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">⌘/Ctrl + Enter</span>
        <Button type="button" onClick={submit} disabled={busy || !text.trim()}>
          {busy ? "Adding…" : "Add tasks"}
        </Button>
      </div>
    </div>
  );
}
