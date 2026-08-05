"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Textarea } from "@/components/ui/textarea";

import { logger } from "@/lib/logger";
import { notify } from "@/lib/notifications";

import { useProjectStore } from "@/store/project";

import { Project, ProjectStatus } from "@/types/project";

import { ArchiveProjectDialog } from "./ArchiveProjectDialog";

const LOG_SOURCE = "ProjectModal";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
}

export function ProjectModal({ isOpen, onClose, project }: ProjectModalProps) {
  const { createProject, updateProject, unarchiveProject } = useProjectStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#E5E7EB");
  const [icon, setIcon] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const archived = project?.status === ProjectStatus.ARCHIVED;

  useEffect(() => {
    if (project && isOpen) {
      setName(project.name);
      setDescription(project.description || "");
      setColor(project.color || "#E5E7EB");
      setIcon(project.icon || "");
    } else if (!project && isOpen) {
      setName("");
      setDescription("");
      setColor("#E5E7EB");
      setIcon("");
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || archived) return;

    setIsSubmitting(true);
    try {
      if (project) {
        await updateProject(project.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          color: color === "#E5E7EB" ? undefined : color,
          icon: icon.trim() || undefined,
        });
      } else {
        await createProject({
          name: name.trim(),
          description: description.trim() || undefined,
          color: color === "#E5E7EB" ? undefined : color,
          icon: icon.trim() || undefined,
          status: ProjectStatus.ACTIVE,
        });
      }
      onClose();
    } catch (error) {
      void logger.error(
        "Failed to save project",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const restoreProject = async () => {
    if (!project) return;
    setIsSubmitting(true);
    try {
      await unarchiveProject(project.id);
      notify.success("Project restored.");
      onClose();
    } catch (error) {
      notify.error("Could not restore the project.");
      void logger.error(
        "Failed to restore project",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[450px]">
          {isSubmitting && <LoadingOverlay />}
          <DialogHeader>
            <DialogTitle>
              {archived
                ? "Archived project"
                : project
                  ? "Edit Project"
                  : "Create Project"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={archived}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={archived}
                className="min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={archived}
                  className="h-10 w-20 p-1"
                />
                <div
                  className="h-10 flex-1 rounded-md border"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                disabled={archived}
                maxLength={2}
                placeholder="◆"
              />
            </div>

            <div className="flex justify-between pt-4">
              {project && !archived && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowArchiveDialog(true)}
                  disabled={isSubmitting}
                >
                  Archive Project
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  {archived ? "Close" : "Cancel"}
                </Button>
                {archived ? (
                  <Button
                    type="button"
                    onClick={() => void restoreProject()}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Restoring..." : "Restore Project"}
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Project"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {project && (
        <ArchiveProjectDialog
          open={showArchiveDialog}
          onOpenChange={setShowArchiveDialog}
          project={project}
          onArchived={onClose}
        />
      )}
    </>
  );
}
