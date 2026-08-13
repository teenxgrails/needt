"use client";

import { useCallback, useEffect, useState } from "react";

import { CalendarPlus, Plus, Trash2 } from "lucide-react";

import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NeedtPicker } from "@/components/ui/needt-picker";

import { logger } from "@/lib/logger";
import { notify } from "@/lib/notifications";

const LOG_SOURCE = "HabitPanel";

type Habit = {
  id: string;
  title: string;
  targetOccurrencesPerWeek: number;
  estimatedMinutes: number;
};

export function HabitPanel() {
  const { activeWorkspace } = useWorkspace();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [occurrences, setOccurrences] = useState("3");
  const [minutes, setMinutes] = useState("30");
  const [saving, setSaving] = useState(false);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  const canManage = activeWorkspace?.role !== "VIEWER";
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/habits", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load habits");
      const data = (await response.json()) as { habits?: Habit[] };
      setHabits(data.habits ?? []);
    } catch (error) {
      void logger.error(
        "Failed to load habits",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createHabit = async () => {
    const targetOccurrencesPerWeek = Number(occurrences);
    const estimatedMinutes = Number(minutes);
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          targetOccurrencesPerWeek,
          daysOfWeek: [],
          estimatedMinutes,
          energyRequired: "MEDIUM",
          priority: "MEDIUM",
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok)
        throw new Error(data?.error || "Could not create habit");
      setDialogOpen(false);
      setTitle("");
      await load();
      notify.success("Habit created");
    } catch (error) {
      notify.error("Could not create habit");
      void logger.error(
        "Failed to create habit",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      setSaving(false);
    }
  };

  const scheduleHabit = async (habitId: string) => {
    if (schedulingId) return;
    setSchedulingId(habitId);
    try {
      const response = await fetch(`/api/habits/${habitId}/schedule`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as {
        created?: number;
        error?: string;
      } | null;
      if (!response.ok)
        throw new Error(data?.error || "Could not schedule habit");
      notify.success(
        data?.created
          ? "Habit added to this week"
          : "This habit is already scheduled"
      );
    } catch (error) {
      notify.error("Could not schedule this habit");
      void logger.error(
        "Failed to schedule habit",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      setSchedulingId(null);
    }
  };

  const archiveHabit = async (habitId: string) => {
    try {
      const response = await fetch(`/api/habits/${habitId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not archive habit");
      setHabits((current) => current.filter((habit) => habit.id !== habitId));
      notify.success("Habit archived");
    } catch (error) {
      notify.error("Could not archive habit");
      void logger.error(
        "Failed to archive habit",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <section className="border-b border-[var(--border-subtle)] py-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Habits
            </p>
            <h2 className="mt-1 font-semibold">Flexible weekly routines</h2>
          </div>
          {canManage && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Habit
            </Button>
          )}
        </div>
        {habits.length ? (
          <ul className="mt-4 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            {habits.map((habit) => (
              <li
                key={habit.id}
                className="flex flex-wrap items-center gap-2 py-2.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {habit.title}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {habit.targetOccurrencesPerWeek}× / week ·{" "}
                  {habit.estimatedMinutes}m
                </span>
                {canManage && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void scheduleHabit(habit.id)}
                      disabled={schedulingId === habit.id}
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      {schedulingId === habit.id ? "Adding..." : "This week"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Archive ${habit.title}`}
                      onClick={() => void archiveHabit(habit.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Add a routine when it needs a flexible place in your week.
          </p>
        )}
      </section>

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>New habit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="habit-title">Name</Label>
            <Input
              id="habit-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Read"
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Times per week</Label>
              <NeedtPicker
                value={occurrences}
                onValueChange={setOccurrences}
                options={[1, 2, 3, 4, 5, 6, 7].map((value) => ({
                  value: String(value),
                  label: String(value),
                }))}
                ariaLabel="Habit times per week"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Minutes each</Label>
              <NeedtPicker
                value={minutes}
                onValueChange={setMinutes}
                options={[5, 10, 15, 20, 30, 45, 60, 90].map((value) => ({
                  value: String(value),
                  label: String(value),
                }))}
                ariaLabel="Habit minutes each"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialogOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void createHabit()}
            disabled={!title.trim() || saving}
          >
            {saving ? "Creating..." : "Create habit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
