"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Link2, Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { notify } from "@/lib/notifications";

import { useTaskStore } from "@/store/task";

type DependencyItem = {
  dependencyId: string;
  task: { id: string; title: string; status: string };
};

export function TaskDependenciesSection({ taskId }: { taskId: string }) {
  const tasks = useTaskStore((state) => state.tasks);
  const [blockedBy, setBlockedBy] = useState<DependencyItem[]>([]);
  const [blocks, setBlocks] = useState<DependencyItem[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch(`/api/tasks/${taskId}/dependencies`);
    if (!response.ok) return;
    const data = (await response.json()) as {
      blockedBy: DependencyItem[];
      blocks: DependencyItem[];
    };
    setBlockedBy(data.blockedBy);
    setBlocks(data.blocks);
  }, [taskId]);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  const choices = useMemo(() => {
    const existing = new Set(blockedBy.map((item) => item.task.id));
    return tasks.filter(
      (task) =>
        task.id !== taskId &&
        task.status !== "completed" &&
        !existing.has(task.id)
    );
  }, [blockedBy, taskId, tasks]);

  async function add() {
    if (!selected) return;
    const response = await fetch(`/api/tasks/${taskId}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockerTaskId: selected }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      notify.error(
        data.error === "DEPENDENCY_CYCLE"
          ? "That dependency would create a cycle"
          : "Could not add dependency"
      );
      return;
    }
    setSelected("");
    await load();
  }

  async function remove(dependencyId: string) {
    const response = await fetch(
      `/api/tasks/${taskId}/dependencies?dependencyId=${encodeURIComponent(dependencyId)}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      notify.error("Could not remove dependency");
      return;
    }
    await load();
  }

  return (
    <section className="space-y-3 rounded-lg border border-[var(--border-subtle)] p-3">
      <div>
        <h3 className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
          <Link2 className="h-4 w-4" /> Dependencies
        </h3>
        <p className="mt-0.5 leading-4 text-[var(--text-muted)]">
          This task is scheduled only after every blocker is finished.
        </p>
      </div>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
      ) : (
        <>
          <div className="flex gap-2">
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 text-[13px]"
              aria-label="Choose a blocking task"
            >
              <option value="">Choose blocker…</option>
              {choices.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="icon"
              className="h-11 w-11"
              disabled={!selected}
              onClick={() => void add()}
              aria-label="Add dependency"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {blockedBy.length > 0 && (
            <DependencyList
              label="Blocked by"
              items={blockedBy}
              onRemove={remove}
            />
          )}
          {blocks.length > 0 && (
            <DependencyList label="Blocks" items={blocks} onRemove={remove} />
          )}
        </>
      )}
    </section>
  );
}

function DependencyList({
  label,
  items,
  onRemove,
}: {
  label: string;
  items: DependencyItem[];
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.dependencyId}
            className="flex min-h-9 items-center gap-2 rounded-md bg-[var(--surface-hover)] px-2"
          >
            <span className="min-w-0 flex-1 truncate">{item.task.title}</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {item.task.status.replace("_", " ")}
            </span>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded hover:bg-[var(--surface-active)]"
              onClick={() => void onRemove(item.dependencyId)}
              aria-label={`Remove ${item.task.title} dependency`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
