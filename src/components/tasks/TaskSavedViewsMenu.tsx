"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Bookmark, Trash2 } from "lucide-react";

import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { APP_TOOLBAR_BUTTON_CLASS } from "@/components/ui/app-toolbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NeedtPicker } from "@/components/ui/needt-picker";

import { logger } from "@/lib/logger";
import { notify } from "@/lib/notifications";

import type { TaskListGroupBy } from "@/store/taskListViewSettings";

import type { Priority, TaskStatus } from "@/types/task";

const LOG_SOURCE = "TaskSavedViewsMenu";

type SavedViewVisibility = "PERSONAL" | "WORKSPACE";

type SavedViewFilter = {
  field: "status" | "priority" | "projectId";
  operator: "eq" | "in" | "is";
  value: string | string[] | null;
};

type SavedViewSort = {
  field: "dueDate" | "priority" | "title";
  direction: "asc" | "desc";
};

type SavedTaskView = {
  id: string;
  name: string;
  userId: string;
  visibility: SavedViewVisibility;
  type: string;
  groupBy: TaskListGroupBy | null;
  filters: SavedViewFilter[] | null;
  sort: SavedViewSort[] | null;
};

export type TaskSavedViewState = {
  groupBy: TaskListGroupBy;
  priority?: Priority[];
  projectId?: string | null;
  sortBy:
    | "dueDate"
    | "startDate"
    | "title"
    | "status"
    | "project"
    | "schedule"
    | "priority"
    | "energyLevel"
    | "preferredTime"
    | "duration";
  sortDirection: "asc" | "desc";
  status?: TaskStatus[];
};

type TaskSavedViewsMenuProps = {
  currentView: TaskSavedViewState;
  onApply: (view: TaskSavedViewState) => void;
};

function supportedSort(sortBy: TaskSavedViewState["sortBy"]): SavedViewSort[] {
  if (sortBy !== "dueDate" && sortBy !== "priority" && sortBy !== "title") {
    return [];
  }
  return [{ field: sortBy, direction: "asc" }];
}

function buildFilters(view: TaskSavedViewState): SavedViewFilter[] {
  const filters: SavedViewFilter[] = [];
  if (view.status?.length) {
    filters.push({ field: "status", operator: "in", value: view.status });
  }
  if (view.priority?.length) {
    filters.push({ field: "priority", operator: "in", value: view.priority });
  }
  if (view.projectId === "no-project") {
    filters.push({ field: "projectId", operator: "is", value: null });
  } else if (view.projectId) {
    filters.push({ field: "projectId", operator: "eq", value: view.projectId });
  }
  return filters;
}

function parseView(view: SavedTaskView): TaskSavedViewState {
  const status = view.filters?.find(
    (filter) => filter.field === "status"
  )?.value;
  const priority = view.filters?.find(
    (filter) => filter.field === "priority"
  )?.value;
  const project = view.filters?.find((filter) => filter.field === "projectId");
  const sort = view.sort?.[0];
  return {
    groupBy: view.groupBy ?? "none",
    status: Array.isArray(status) ? (status as TaskStatus[]) : undefined,
    priority: Array.isArray(priority) ? (priority as Priority[]) : undefined,
    projectId:
      project?.value === null
        ? "no-project"
        : typeof project?.value === "string"
          ? project.value
          : undefined,
    sortBy: sort?.field ?? "dueDate",
    sortDirection: sort?.direction ?? "asc",
  };
}

export function TaskSavedViewsMenu({
  currentView,
  onApply,
}: TaskSavedViewsMenuProps) {
  const { activeWorkspace } = useWorkspace();
  const [views, setViews] = useState<SavedTaskView[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<SavedViewVisibility>("PERSONAL");
  const [isSaving, setIsSaving] = useState(false);

  const canShare =
    activeWorkspace?.workspace.kind === "SHARED" &&
    activeWorkspace.role !== "VIEWER";

  const loadViews = useCallback(async () => {
    try {
      const response = await fetch("/api/saved-views?resource=TASKS");
      if (!response.ok) throw new Error("Could not load saved views");
      const data = (await response.json()) as { views?: SavedTaskView[] };
      setViews(data.views?.filter((view) => view.type === "list") ?? []);
    } catch (error) {
      void logger.error(
        "Failed to load task saved views",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    }
  }, []);

  useEffect(() => {
    void loadViews();
  }, [activeWorkspace?.workspace.id, loadViews]);

  const personalViews = useMemo(
    () => views.filter((view) => view.visibility === "PERSONAL"),
    [views]
  );
  const workspaceViews = useMemo(
    () => views.filter((view) => view.visibility === "WORKSPACE"),
    [views]
  );

  const saveView = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          visibility,
          resource: "TASKS",
          type: "list",
          groupBy: currentView.groupBy === "none" ? null : currentView.groupBy,
          filters: buildFilters(currentView),
          sort: supportedSort(currentView.sortBy).map((sort) => ({
            ...sort,
            direction: currentView.sortDirection,
          })),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) throw new Error(data?.error || "Could not save view");
      setDialogOpen(false);
      setName("");
      setVisibility("PERSONAL");
      await loadViews();
      notify.success("Saved view created");
    } catch (error) {
      notify.error("Could not save this view");
      void logger.error(
        "Failed to save task view",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      setIsSaving(false);
    }
  };

  const removeView = async (view: SavedTaskView) => {
    try {
      const response = await fetch(`/api/saved-views/${view.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not remove saved view");
      setViews((current) => current.filter(({ id }) => id !== view.id));
      notify.success("Saved view removed");
    } catch (error) {
      notify.error("Could not remove this saved view");
      void logger.error(
        "Failed to remove task view",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    }
  };

  const canRemove = (view: SavedTaskView) =>
    view.visibility === "PERSONAL" || activeWorkspace?.role !== "VIEWER";

  const renderView = (view: SavedTaskView) => (
    <DropdownMenuSub key={view.id}>
      <DropdownMenuSubTrigger className="h-9 text-[12px]">
        <Bookmark className="h-3.5 w-3.5" />
        <span className="min-w-0 flex-1 truncate">{view.name}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-44">
        <DropdownMenuItem
          className="h-9 text-[12px]"
          onSelect={() => onApply(parseView(view))}
        >
          Apply view
        </DropdownMenuItem>
        {canRemove(view) && (
          <DropdownMenuItem
            className="h-9 text-[12px] text-[var(--color-danger)]"
            onSelect={() => void removeView(view)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove view
          </DropdownMenuItem>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger className={APP_TOOLBAR_BUTTON_CLASS}>
          <Bookmark className="h-3.5 w-3.5" />
          Views
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
            Personal views
          </DropdownMenuLabel>
          {personalViews.length ? (
            personalViews.map(renderView)
          ) : (
            <DropdownMenuItem disabled className="h-8 text-[12px]">
              No saved views yet
            </DropdownMenuItem>
          )}
          {workspaceViews.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
                Shared with this workspace
              </DropdownMenuLabel>
              {workspaceViews.map(renderView)}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="h-9 text-[12px]"
            onSelect={() => setDialogOpen(true)}
          >
            <Bookmark className="h-3.5 w-3.5" />
            Save current view
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Save task view</DialogTitle>
          <DialogDescription>
            Save the current filters, grouping and supported sort for this
            workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-saved-view-name">Name</Label>
            <Input
              id="task-saved-view-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="This week"
            />
          </div>
          {canShare && (
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <NeedtPicker
                value={visibility}
                onValueChange={(value) =>
                  setVisibility(value as SavedViewVisibility)
                }
                options={[
                  { value: "PERSONAL", label: "Only me" },
                  {
                    value: "WORKSPACE",
                    label: "Shared with workspace",
                    description: "Editors can manage this view.",
                  },
                ]}
                ariaLabel="Saved view visibility"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialogOpen(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void saveView()}
            disabled={!name.trim() || isSaving}
          >
            {isSaving ? "Saving..." : "Save view"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
