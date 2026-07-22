"use client";

import { useState } from "react";

import { CornerDownLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
    <div className="needt-page-depth flex h-full min-h-[calc(100dvh-56px)] items-center justify-center px-4 py-10 text-[var(--text-primary)] lg:min-h-full">
      <main className="w-full max-w-[620px]">
        <header className="mb-7">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[var(--control-radius)] border border-[var(--border-subtle)] text-[var(--color-accent)]">
            <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em]">
            Quick add
          </h1>
          <p className="mt-2 max-w-lg text-[14px] leading-6 text-[var(--text-secondary)]">
            Drop in rough notes, one task per line. Needt will pull out useful
            durations, deadlines, and priorities.
          </p>
        </header>

        <Textarea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              void submit();
            }
          }}
          rows={7}
          placeholder={"Draft the Q3 report ~90m by Friday\nEmail the design team\nBook dentist"}
          className="min-h-[180px] resize-y px-3.5 py-3 text-[14px] leading-6"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
            <CornerDownLeft className="h-3.5 w-3.5" />
            ⌘/Ctrl + Enter
          </span>
          <Button type="button" onClick={submit} disabled={busy || !text.trim()}>
            {busy ? "Adding…" : "Add tasks"}
          </Button>
        </div>
      </main>
    </div>
  );
}
