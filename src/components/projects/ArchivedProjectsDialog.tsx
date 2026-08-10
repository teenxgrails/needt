"use client";

import { useState } from "react";

import { HiOutlineArchive, HiOutlineRefresh } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { logger } from "@/lib/logger";
import { notify } from "@/lib/notifications";

import { useProjectStore } from "@/store/project";

import type { Project } from "@/types/project";

const LOG_SOURCE = "ArchivedProjectsDialog";

export function ArchivedProjectsDialog({
  open,
  onOpenChange,
  projects,
  onRestored,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onRestored: (projectId: string) => void;
}) {
  const unarchiveProject = useProjectStore((state) => state.unarchiveProject);
  const [restoringId, setRestoringId] = useState("");

  const restore = async (project: Project) => {
    setRestoringId(project.id);
    try {
      await unarchiveProject(project.id);
      notify.success("Project restored.");
      onOpenChange(false);
      onRestored(project.id);
    } catch (error) {
      notify.error("Could not restore the project.");
      void logger.error(
        "Failed to restore project",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      setRestoringId("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Archived projects</DialogTitle>
          <DialogDescription>
            Archived projects are read-only and excluded from active planning.
          </DialogDescription>
        </DialogHeader>
        {projects.length === 0 ? (
          <div className="rounded-[var(--control-radius)] border border-[var(--border-subtle)] px-4 py-8 text-center">
            <HiOutlineArchive className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
            <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
              No archived projects.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex min-h-11 items-center gap-3 rounded-[var(--control-radius)] px-3 hover:bg-[var(--surface-hover)]"
              >
                <span
                  className="h-2.5 w-2.5 flex-none rounded-full border border-[var(--border-subtle)]"
                  style={{
                    backgroundColor: project.color ?? "var(--surface-control)",
                  }}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-primary)]">
                  {project.name}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(restoringId)}
                  onClick={() => void restore(project)}
                >
                  <HiOutlineRefresh className="h-4 w-4" />
                  {restoringId === project.id ? "Restoring..." : "Restore"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
