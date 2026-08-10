"use client";

import { useEffect, useMemo, useState } from "react";

import {
  HiOutlineCollection,
  HiOutlineDocumentDuplicate,
  HiOutlinePlay,
  HiOutlinePlus,
  HiOutlineTemplate,
} from "react-icons/hi";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NeedtPicker } from "@/components/ui/needt-picker";

import { calendarDayDifference, newDate, startOfDay } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { notify } from "@/lib/notifications";

import { ProjectTemplateKind } from "@/types/project";

import type { ProjectWorkspaceDetail } from "./project-workspace-types";

const LOG_SOURCE = "ProjectTemplatesDialog";
const UNASSIGNED_MEMBER = "__unassigned_member__";

interface ProjectTemplateResponse {
  id: string;
  name: string;
  description?: string | null;
  kind: ProjectTemplateKind;
  stages: Array<{ id: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
  tasks: Array<{ id: string; title: string }>;
}

interface WorkspaceMember {
  userId: string;
  user: { name?: string | null; email?: string | null };
}

interface PlaceholderRole {
  key: string;
  name: string;
}

function dateValue(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = newDate(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function ProjectTemplatesDialog({
  open,
  onOpenChange,
  project,
  onProjectCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWorkspaceDetail;
  onProjectCreated: (projectId: string) => void;
}) {
  const [templates, setTemplates] = useState<ProjectTemplateResponse[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [name, setName] = useState(`${project.name} template`);
  const [kind, setKind] = useState<ProjectTemplateKind>(
    ProjectTemplateKind.WORKFLOW
  );
  const [roles, setRoles] = useState<PlaceholderRole[]>([]);
  const [taskRoles, setTaskRoles] = useState<Record<string, string>>({});
  const [launchTemplateId, setLaunchTemplateId] = useState("");
  const [launchDate, setLaunchDate] = useState<Date | null>(
    startOfDay(newDate())
  );
  const [roleAssignments, setRoleAssignments] = useState<
    Record<string, string>
  >({});
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);

  const loadTemplates = async () => {
    const response = await fetch("/api/project-templates", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Could not load project templates");
    const data = (await response.json()) as {
      templates: ProjectTemplateResponse[];
    };
    setTemplates(data.templates);
  };

  useEffect(() => {
    if (!open) return;
    setName(`${project.name} template`);
    void loadTemplates().catch((error) => {
      notify.error("Could not load project templates.");
      void logger.error(
        "Failed to load project templates",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    });
    if (project.workspaceId) {
      void fetch(`/api/workspaces/${project.workspaceId}/members`)
        .then((response) => (response.ok ? response.json() : { members: [] }))
        .then((data) => setMembers(data.members ?? []))
        .catch(() => setMembers([]));
    }
  }, [open, project.name, project.workspaceId]);

  const selectedTemplate = templates.find(
    (template) => template.id === launchTemplateId
  );
  const memberOptions = useMemo(
    () => [
      {
        value: UNASSIGNED_MEMBER,
        label: "Leave unassigned",
        description: "Map this placeholder later",
      },
      ...members.map((member) => ({
        value: member.userId,
        label: member.user.name ?? member.user.email ?? "Workspace member",
        description: member.user.email ?? undefined,
      })),
    ],
    [members]
  );

  const addRole = (taskId: string, roleName: string) => {
    const existing = roles.find(
      (role) => role.name.toLowerCase() === roleName.toLowerCase()
    );
    const role = existing ?? {
      key: `role-${roles.length + 1}`,
      name: roleName,
    };
    if (!existing) setRoles((current) => [...current, role]);
    setTaskRoles((current) => ({ ...current, [taskId]: role.key }));
  };

  const saveTemplate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const projectStart = dateValue(project.startDate);
      const workflow = kind === ProjectTemplateKind.WORKFLOW;
      const projectTaskIds = new Set(project.tasks.map((task) => task.id));
      const payload = {
        name: name.trim(),
        description: project.description,
        color: project.color,
        icon: project.icon,
        kind,
        stages: workflow
          ? project.stages.map((stage, index) => {
              const start = dateValue(stage.startDate);
              const deadline = dateValue(stage.deadline);
              return {
                key: stage.id,
                name: stage.name,
                color: stage.color,
                position: stage.position ?? index,
                startOffsetDays:
                  start && projectStart
                    ? calendarDayDifference(start, projectStart)
                    : index * 7,
                durationDays:
                  start && deadline
                    ? Math.max(0, calendarDayDifference(deadline, start))
                    : stage.expectedDurationDays,
              };
            })
          : [],
        roles: workflow
          ? roles.map((role, index) => ({ ...role, position: index }))
          : [],
        tasks: workflow
          ? project.tasks.map((task, index) => {
              const stage = project.stages.find(
                (candidate) => candidate.id === task.stageId
              );
              const taskStart = dateValue(task.startDate);
              const taskDeadline = dateValue(task.deadline ?? task.dueDate);
              const stageStart = dateValue(stage?.startDate);
              const stageDeadline = dateValue(stage?.deadline);
              return {
                key: task.id,
                stageKey: stage?.id ?? null,
                roleKey: taskRoles[task.id] ?? null,
                title: task.title,
                description: task.description,
                position: index,
                estimatedMinutes: task.estimatedMinutes ?? task.duration,
                priority: task.priority,
                energyRequired: task.energyRequired,
                startAnchor:
                  taskStart && stageStart ? "STAGE_START" : undefined,
                startOffsetDays:
                  taskStart && stageStart
                    ? calendarDayDifference(taskStart, stageStart)
                    : undefined,
                deadlineAnchor:
                  taskDeadline && stageDeadline ? "STAGE_DEADLINE" : undefined,
                deadlineOffsetDays:
                  taskDeadline && stageDeadline
                    ? calendarDayDifference(taskDeadline, stageDeadline)
                    : undefined,
              };
            })
          : [],
        dependencies: workflow
          ? project.tasks.flatMap((task) =>
              (task.blockedByDependencies ?? [])
                .filter((dependency) =>
                  projectTaskIds.has(dependency.blocker.id)
                )
                .map((dependency) => ({
                  blockerTaskKey: dependency.blocker.id,
                  blockedTaskKey: task.id,
                }))
            )
          : [],
      };
      const response = await fetch("/api/project-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Could not save project template");
      await loadTemplates();
      notify.success("Project template saved.");
    } catch (error) {
      notify.error("Could not save the project template.");
      void logger.error(
        "Failed to save project template",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      setSaving(false);
    }
  };

  const launchTemplate = async () => {
    if (!selectedTemplate || !launchDate) return;
    setLaunching(true);
    try {
      const assignments = Object.fromEntries(
        Object.entries(roleAssignments).filter(
          ([, userId]) => userId && userId !== UNASSIGNED_MEMBER
        )
      );
      const response = await fetch(
        `/api/project-templates/${selectedTemplate.id}/instantiate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: launchDate.toISOString(),
            roleAssignments: assignments,
          }),
        }
      );
      if (!response.ok)
        throw new Error("Could not create project from template");
      const data = (await response.json()) as { project: { id: string } };
      notify.success("Project created from template.");
      onOpenChange(false);
      onProjectCreated(data.project.id);
    } catch (error) {
      notify.error("Could not create the project.");
      void logger.error(
        "Failed to instantiate project template",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      setLaunching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Project templates</DialogTitle>
          <DialogDescription>
            Save a lightweight regular template or a workflow with stages,
            tasks, placeholder roles, dependencies, and relative dates.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3 border-b border-[var(--border-subtle)] pb-5">
          <div className="flex items-center gap-2">
            <HiOutlineDocumentDuplicate className="h-4 w-4 text-[var(--text-secondary)]" />
            <h2 className="text-[13px] font-semibold">Save current project</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
              <Label htmlFor="project-template-name">Template name</Label>
              <Input
                id="project-template-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Template type</Label>
              <NeedtPicker
                options={[
                  {
                    value: ProjectTemplateKind.REGULAR,
                    label: "Regular",
                    description: "Project shell only",
                  },
                  {
                    value: ProjectTemplateKind.WORKFLOW,
                    label: "Workflow",
                    description: "Stages, tasks, and roles",
                  },
                ]}
                value={kind}
                onValueChange={(value) => setKind(value as ProjectTemplateKind)}
                ariaLabel="Template type"
              />
            </div>
          </div>

          {kind === ProjectTemplateKind.WORKFLOW &&
            project.tasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Optional placeholder role per task
                </p>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-[var(--control-radius)] border border-[var(--border-subtle)] p-2">
                  {project.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="grid min-h-10 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_240px]"
                    >
                      <span className="truncate text-[12px] text-[var(--text-primary)]">
                        {task.title}
                      </span>
                      <NeedtPicker
                        options={roles.map((role) => ({
                          value: role.key,
                          label: role.name,
                        }))}
                        mode="creatable"
                        value={taskRoles[task.id] ?? ""}
                        onValueChange={(value) =>
                          setTaskRoles((current) => ({
                            ...current,
                            [task.id]: value,
                          }))
                        }
                        onCreate={(roleName) => addRole(task.id, roleName)}
                        createLabel={(value) => `Create role “${value}”`}
                        placeholder="Choose or create role"
                        searchPlaceholder="Search or create role"
                        ariaLabel={`Placeholder role for ${task.title}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          <Button
            onClick={() => void saveTemplate()}
            disabled={saving || !name.trim()}
          >
            <HiOutlinePlus className="h-4 w-4" />
            {saving ? "Saving..." : "Save template"}
          </Button>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <HiOutlineTemplate className="h-4 w-4 text-[var(--text-secondary)]" />
            <h2 className="text-[13px] font-semibold">Create from template</h2>
          </div>
          {templates.length === 0 ? (
            <p className="text-[12px] text-[var(--text-muted)]">
              No project templates yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
              <NeedtPicker
                options={templates.map((template) => ({
                  value: template.id,
                  label: template.name,
                  description: `${template.kind === ProjectTemplateKind.WORKFLOW ? "Workflow" : "Regular"} · ${template.tasks.length} tasks`,
                  icon: <HiOutlineCollection className="h-4 w-4" />,
                }))}
                mode="searchable"
                value={launchTemplateId}
                onValueChange={(value) => {
                  setLaunchTemplateId(value);
                  setRoleAssignments({});
                }}
                placeholder="Choose template"
                searchPlaceholder="Search templates"
                ariaLabel="Project template"
              />
              <DatePicker
                value={launchDate}
                onChange={setLaunchDate}
                ariaLabel="Project start date"
                placeholder="Project start"
                className="w-full justify-between border border-[var(--border-control)] bg-[var(--surface-input)] px-3"
              />
            </div>
          )}

          {selectedTemplate?.roles.map((role) => (
            <div
              key={role.id}
              className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_260px]"
            >
              <span className="text-[12px] text-[var(--text-secondary)]">
                {role.name}
              </span>
              <NeedtPicker
                options={memberOptions}
                value={roleAssignments[role.id] ?? UNASSIGNED_MEMBER}
                onValueChange={(value) =>
                  setRoleAssignments((current) => ({
                    ...current,
                    [role.id]: value,
                  }))
                }
                ariaLabel={`Map ${role.name}`}
              />
            </div>
          ))}

          <Button
            onClick={() => void launchTemplate()}
            disabled={!selectedTemplate || !launchDate || launching}
          >
            <HiOutlinePlay className="h-4 w-4" />
            {launching ? "Creating..." : "Create project"}
          </Button>
        </section>
      </DialogContent>
    </Dialog>
  );
}
