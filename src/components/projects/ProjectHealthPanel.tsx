"use client";

import { useCallback, useEffect, useState } from "react";

import { HiOutlineHeart, HiOutlineRefresh } from "react-icons/hi";

import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NeedtPicker } from "@/components/ui/needt-picker";
import { Textarea } from "@/components/ui/textarea";

import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { notify } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const LOG_SOURCE = "ProjectHealthPanel";

type HealthStatus = "UNKNOWN" | "ON_TRACK" | "AT_RISK" | "OFF_TRACK";

type ProjectHealth = {
  healthStatus: HealthStatus;
  healthVersion: number;
  healthUpdatedAt: string | null;
  healthUpdates: Array<{
    id: string;
    status: HealthStatus;
    summary: string;
    version: number;
    createdAt: string;
    author: { id: string; name: string | null; image: string | null } | null;
  }>;
};

const HEALTH_OPTIONS: Array<{
  value: HealthStatus;
  label: string;
  description: string;
}> = [
  {
    value: "ON_TRACK",
    label: "On track",
    description: "Work is proceeding as expected.",
  },
  {
    value: "AT_RISK",
    label: "At risk",
    description: "A decision or blocker needs attention.",
  },
  {
    value: "OFF_TRACK",
    label: "Off track",
    description: "The current plan needs to change.",
  },
  {
    value: "UNKNOWN",
    label: "Not assessed",
    description: "No health assessment has been recorded.",
  },
];

const HEALTH_LABELS: Record<HealthStatus, string> = {
  UNKNOWN: "Not assessed",
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  OFF_TRACK: "Off track",
};

const HEALTH_COLORS: Record<HealthStatus, string> = {
  UNKNOWN: "text-[var(--text-muted)]",
  ON_TRACK: "text-[var(--color-success)]",
  AT_RISK: "text-[var(--color-warning)]",
  OFF_TRACK: "text-[var(--color-danger)]",
};

function formatUpdateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(newDate(value));
}

export function ProjectHealthPanel({ projectId }: { projectId: string }) {
  const { activeWorkspace } = useWorkspace();
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [nextStatus, setNextStatus] = useState<HealthStatus>("UNKNOWN");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canUpdate = activeWorkspace?.role !== "VIEWER";

  const loadHealth = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/health`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Could not load project health");
      const data = (await response.json()) as ProjectHealth;
      setHealth(data);
      setNextStatus(data.healthStatus);
    } catch (error) {
      void logger.error(
        "Failed to load project health",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
      notify.error("Could not load project health");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setHealth(null);
    setSummary("");
    void loadHealth();
  }, [loadHealth]);

  const openDialog = () => {
    setNextStatus(health?.healthStatus ?? "UNKNOWN");
    setSummary("");
    setDialogOpen(true);
  };

  const submitUpdate = async () => {
    if (!health || !summary.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/health`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          summary: summary.trim(),
          expectedVersion: health.healthVersion,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        code?: string;
        error?: string;
      } | null;
      if (!response.ok) {
        if (data?.code === "PROJECT_HEALTH_STALE") {
          await loadHealth();
          notify.warning("Project health changed. Review the latest update.");
          return;
        }
        throw new Error(data?.error || "Could not update project health");
      }
      setDialogOpen(false);
      setSummary("");
      await loadHealth();
      notify.success("Project health updated");
    } catch (error) {
      notify.error("Could not update project health");
      void logger.error(
        "Failed to update project health",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={openDialog}
        disabled={isLoading}
      >
        {isLoading ? (
          <HiOutlineRefresh className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        ) : (
          <HiOutlineHeart className="h-4 w-4" />
        )}
        <span className={cn(health && HEALTH_COLORS[health.healthStatus])}>
          {health ? HEALTH_LABELS[health.healthStatus] : "Health"}
        </span>
      </Button>

      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Project health</DialogTitle>
          <DialogDescription>
            Status updates are versioned so the team can see when and why the
            project changed.
          </DialogDescription>
        </DialogHeader>

        {health?.healthUpdates.length ? (
          <div className="max-h-48 space-y-3 overflow-y-auto border-y border-[var(--border-subtle)] py-3">
            {health.healthUpdates.map((update) => (
              <article key={update.id} className="text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={cn("font-medium", HEALTH_COLORS[update.status])}
                  >
                    {HEALTH_LABELS[update.status]}
                  </span>
                  <span className="text-[12px] text-[var(--text-muted)]">
                    {update.author?.name ?? "Workspace member"} ·{" "}
                    {formatUpdateTime(update.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                  {update.summary}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            No health updates yet.
          </p>
        )}

        {canUpdate && health && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current assessment</Label>
              <NeedtPicker
                value={nextStatus}
                onValueChange={(value) => setNextStatus(value as HealthStatus)}
                options={HEALTH_OPTIONS}
                ariaLabel="Project health status"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-health-summary">Update</Label>
              <Textarea
                id="project-health-summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                maxLength={2000}
                placeholder="What changed, and what needs attention?"
                className="min-h-24"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialogOpen(false)}
            disabled={isSaving}
          >
            Close
          </Button>
          {canUpdate && health && (
            <Button
              type="button"
              onClick={() => void submitUpdate()}
              disabled={!summary.trim() || isSaving}
            >
              {isSaving ? "Posting..." : "Post update"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
