"use client";

import { useState } from "react";

import { HiOutlineArchive } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { logger } from "@/lib/logger";
import { notify } from "@/lib/notifications";

import { useProjectStore } from "@/store/project";

import type { Project } from "@/types/project";

const LOG_SOURCE = "ArchiveProjectDialog";

export function ArchiveProjectDialog({
  open,
  onOpenChange,
  project,
  onArchived,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onArchived?: () => void;
}) {
  const archiveProject = useProjectStore((state) => state.archiveProject);
  const [archiving, setArchiving] = useState(false);

  const archive = async () => {
    setArchiving(true);
    try {
      await archiveProject(project.id);
      notify.success("Project archived.");
      onOpenChange(false);
      onArchived?.();
    } catch (error) {
      notify.error("Could not archive the project.");
      void logger.error(
        "Failed to archive project",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      setArchiving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Archive project</DialogTitle>
          <DialogDescription>
            {project.name} becomes read-only and leaves active planning. Its
            tasks, stages, and history stay intact, and you can restore it at
            any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={archiving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void archive()}
            disabled={archiving}
          >
            <HiOutlineArchive className="h-4 w-4" />
            {archiving ? "Archiving..." : "Archive project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
