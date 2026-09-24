"use client";

import * as React from "react";

import { Bookmark, Trash2 } from "lucide-react";

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

import type { WorkspaceFilter, WorkspaceView } from "./WorkspaceScreen";

const LOG_SOURCE = "WorkspaceSavedViews";

type SavedViewVisibility = "PERSONAL" | "WORKSPACE";

interface SavedWorkspaceView {
  id: string;
  name: string;
  userId: string;
  visibility: SavedViewVisibility;
  type: string;
  filters: Array<{
    field: string;
    operator: string;
    value: string | string[] | boolean | null;
  }> | null;
}

interface WorkspaceSavedViewsProps {
  view: WorkspaceView;
  filter: WorkspaceFilter;
  onApply: (state: { view: WorkspaceView; filter: WorkspaceFilter }) => void;
}

function savedState(
  view: SavedWorkspaceView
): { view: WorkspaceView; filter: WorkspaceFilter } | null {
  if (view.type !== "list" && view.type !== "board") return null;
  const filters = view.filters ?? [];
  if (filters.length !== 1) return null;
  const [filter] = filters;
  const values = Array.isArray(filter.value) ? filter.value : [filter.value];
  if (
    filter.field !== "status" ||
    values.length !== 1 ||
    values[0] !== "completed"
  ) {
    return null;
  }
  if (filter.operator === "eq" || filter.operator === "in") {
    return { view: view.type, filter: "done" };
  }
  if (filter.operator === "neq" || filter.operator === "not_in") {
    return { view: view.type, filter: "all" };
  }
  return null;
}

export function WorkspaceSavedViews({
  view,
  filter,
  onApply,
}: WorkspaceSavedViewsProps) {
  const { activeWorkspace } = useWorkspace();
  const [views, setViews] = React.useState<SavedWorkspaceView[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [visibility, setVisibility] =
    React.useState<SavedViewVisibility>("PERSONAL");
  const [saving, setSaving] = React.useState(false);

  const canShare =
    activeWorkspace?.workspace.kind === "SHARED" &&
    activeWorkspace.role !== "VIEWER";
  const canSaveCurrent =
    view !== "flow" && (filter === "all" || filter === "done");

  const loadViews = React.useCallback(async () => {
    try {
      const response = await fetch("/api/saved-views?resource=TASKS", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Could not load saved views");
      const data = (await response.json()) as { views?: SavedWorkspaceView[] };
      setViews(data.views ?? []);
    } catch (error) {
      void logger.error(
        "Failed to load workspace saved views",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    }
  }, []);

  React.useEffect(() => {
    void loadViews();
  }, [activeWorkspace?.workspace.id, loadViews]);

  const saveView = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || saving || !canSaveCurrent) return;
    setSaving(true);
    try {
      const response = await fetch("/api/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          visibility,
          resource: "TASKS",
          type: view,
          filters:
            filter === "done"
              ? [
                  {
                    field: "status",
                    operator: "eq",
                    value: "completed",
                  },
                ]
              : [
                  {
                    field: "status",
                    operator: "not_in",
                    value: ["completed"],
                  },
                ],
          sort: [],
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
        "Failed to save workspace view",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      setSaving(false);
    }
  };

  const removeView = async (savedView: SavedWorkspaceView) => {
    try {
      const response = await fetch(`/api/saved-views/${savedView.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not remove saved view");
      setViews((current) =>
        current.filter((candidate) => candidate.id !== savedView.id)
      );
      notify.success("Saved view removed");
    } catch (error) {
      notify.error("Could not remove this saved view");
      void logger.error(
        "Failed to remove workspace view",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    }
  };

  const canRemove = (savedView: SavedWorkspaceView) =>
    savedView.visibility === "PERSONAL" || activeWorkspace?.role !== "VIEWER";

  const renderView = (savedView: SavedWorkspaceView) => (
    <DropdownMenuSub key={savedView.id}>
      <DropdownMenuSubTrigger className="h-9 text-[12px]">
        <Bookmark className="h-3.5 w-3.5" />
        <span className="min-w-0 flex-1 truncate">{savedView.name}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-44">
        {savedState(savedView) ? (
          <DropdownMenuItem
            className="h-9 text-[12px]"
            onSelect={() => onApply(savedState(savedView)!)}
          >
            Apply view
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled className="h-9 text-[12px]">
            Uses unavailable filters
          </DropdownMenuItem>
        )}
        {canRemove(savedView) ? (
          <DropdownMenuItem
            className="h-9 text-[12px] text-[var(--color-danger)]"
            onSelect={() => void removeView(savedView)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove view
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );

  const personalViews = views.filter(
    (savedView) => savedView.visibility === "PERSONAL"
  );
  const workspaceViews = views.filter(
    (savedView) => savedView.visibility === "WORKSPACE"
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex h-[30px] items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--fill-2)] px-3 text-[12px] font-medium text-[var(--text-secondary)]"
          >
            <Bookmark className="h-3.5 w-3.5" />
            Views
          </button>
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
          {workspaceViews.length ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
                Shared with this workspace
              </DropdownMenuLabel>
              {workspaceViews.map(renderView)}
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="h-9 text-[12px]"
            disabled={!canSaveCurrent}
            onSelect={() => setDialogOpen(true)}
          >
            <Bookmark className="h-3.5 w-3.5" />
            {canSaveCurrent
              ? "Save current view"
              : "Save List or Kanban with All or Done"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Save task view</DialogTitle>
          <DialogDescription>
            Save this workspace layout and filter for later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="workspace-saved-view-name">Name</Label>
            <Input
              id="workspace-saved-view-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="Launch review"
            />
          </div>
          {canShare ? (
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
          ) : null}
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
            onClick={() => void saveView()}
            disabled={!name.trim() || saving}
          >
            {saving ? "Saving…" : "Save view"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
