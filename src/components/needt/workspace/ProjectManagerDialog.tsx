"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { notify } from "@/lib/notifications";

import { useProjectStore } from "@/store/project";

import type { Project } from "@/types/project";
import { ProjectStatus } from "@/types/project";

interface ProjectManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => Promise<unknown>;
}

interface ProjectDraft {
  name: string;
  description: string;
  color: string;
  icon: string;
}

const EMPTY_DRAFT: ProjectDraft = {
  name: "",
  description: "",
  color: "#7C6FE8",
  icon: "",
};

function draftFromProject(project: Project): ProjectDraft {
  return {
    name: project.name,
    description: project.description ?? "",
    color: project.color ?? EMPTY_DRAFT.color,
    icon: project.icon ?? "",
  };
}

export function ProjectManagerDialog({
  open,
  onOpenChange,
  onChanged,
}: ProjectManagerDialogProps) {
  const projects = useProjectStore((state) => state.projects);
  const createProject = useProjectStore((state) => state.createProject);
  const updateProject = useProjectStore((state) => state.updateProject);
  const archiveProject = useProjectStore((state) => state.archiveProject);
  const unarchiveProject = useProjectStore((state) => state.unarchiveProject);
  const [editing, setEditing] = React.useState<Project | null>(null);
  const [draft, setDraft] = React.useState<ProjectDraft>(EMPTY_DRAFT);
  const [showForm, setShowForm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const beginCreate = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setShowForm(true);
  };
  const beginEdit = (project: Project) => {
    setEditing(project);
    setDraft(draftFromProject(project));
    setShowForm(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    setBusy(true);
    try {
      const input = {
        name,
        description: draft.description.trim(),
        color: draft.color,
        icon: draft.icon.trim(),
      };
      if (editing) await updateProject(editing.id, input);
      else await createProject(input);
      await onChanged();
      setShowForm(false);
      setEditing(null);
      notify.success(editing ? "Project updated" : "Project created");
    } catch {
      notify.error("Could not save this project");
    } finally {
      setBusy(false);
    }
  };

  const setArchived = async (project: Project, archived: boolean) => {
    if (archived && !window.confirm(`Archive ${project.name}?`)) return;
    setBusy(true);
    try {
      if (archived) await archiveProject(project.id);
      else await unarchiveProject(project.id);
      await onChanged();
      notify.success(archived ? "Project archived" : "Project restored");
    } catch {
      notify.error("Could not update this project");
    } finally {
      setBusy(false);
    }
  };

  const active = projects.filter(
    (project) => project.status !== ProjectStatus.ARCHIVED
  );
  const archived = projects.filter(
    (project) => project.status === ProjectStatus.ARCHIVED
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Projects</DialogTitle>
          <DialogDescription>
            Create, rename, archive, or restore workspace projects.
          </DialogDescription>
        </DialogHeader>

        {showForm ? (
          <form className="grid gap-4" onSubmit={save}>
            <div className="grid gap-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                autoFocus
                value={draft.name}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={draft.description}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-[96px_1fr] gap-3">
              <div className="grid gap-2">
                <Label htmlFor="project-color">Colour</Label>
                <Input
                  id="project-color"
                  type="color"
                  value={draft.color}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      color: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-icon">Glyph</Label>
                <Input
                  id="project-icon"
                  value={draft.icon}
                  placeholder="Optional"
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      icon: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !draft.name.trim()}>
                {editing ? "Save changes" : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="grid gap-5">
            <Button type="button" className="w-fit" onClick={beginCreate}>
              New project
            </Button>
            <section className="grid gap-2" aria-label="Active projects">
              <h3 className="text-sm font-semibold">Active</h3>
              {active.length ? (
                active.map((project) => (
                  <div
                    key={project.id}
                    className="flex min-h-12 items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] px-3"
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full"
                      style={{
                        background: project.color ?? "var(--text-muted)",
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {project.name}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => beginEdit(project)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void setArchived(project, true)}
                    >
                      Archive
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  No projects yet.
                </p>
              )}
            </section>
            {archived.length ? (
              <section className="grid gap-2" aria-label="Archived projects">
                <h3 className="text-sm font-semibold">Archived</h3>
                {archived.map((project) => (
                  <div
                    key={project.id}
                    className="flex min-h-12 items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] px-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-secondary)]">
                      {project.name}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void setArchived(project, false)}
                    >
                      Restore
                    </Button>
                  </div>
                ))}
              </section>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
