"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { LuFileText } from "react-icons/lu";

import { useTheme } from "@/components/providers/ThemeProvider";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";

import type { NeedtDocument } from "@/lib/needt/types";
import { notify } from "@/lib/notifications";
import { resolveThemeMode } from "@/lib/theme";

import type { ResolvedThemeMode } from "@/types/settings";

import { ScreenFrame } from "../shell/ScreenFrame";
import { type DocsFilters, type DocsMetadata, DocsScreen } from "./DocsScreen";

interface DocsPayload {
  workspaceId: string;
  canCreate: boolean;
  docs: NeedtDocument[];
  metadata: DocsMetadata;
}

function useResolvedTheme(): ResolvedThemeMode {
  const { theme, systemTheme } = useTheme();
  const [resolved, setResolved] = React.useState<ResolvedThemeMode>(() =>
    resolveThemeMode(theme, false, systemTheme)
  );

  React.useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () =>
      setResolved(resolveThemeMode(theme, media.matches, systemTheme));
    sync();
    if (theme !== "system") return undefined;
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [systemTheme, theme]);

  return resolved;
}

function docsUrl(query: string, filters: DocsFilters) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (filters.folderId) params.set("folderId", filters.folderId);
  filters.tagIds?.forEach((tagId) => params.append("tagId", tagId));
  if (filters.favorites) params.set("favorites", "true");
  if (filters.privateOnly) params.set("privateOnly", "true");
  const suffix = params.toString();
  return `/api/needt/docs${suffix ? `?${suffix}` : ""}`;
}

async function readDocs(query: string, filters: DocsFilters) {
  const response = await fetch(docsUrl(query, filters), { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load documents");
  return response.json() as Promise<DocsPayload>;
}

export function DocsRoute() {
  const router = useRouter();
  const theme = useResolvedTheme();
  const { activeWorkspace } = useWorkspace();
  const activeWorkspaceId = activeWorkspace?.workspace.id;
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState<DocsFilters>({});
  const [data, setData] = React.useState<DocsPayload | null>(null);
  const [error, setError] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!activeWorkspaceId) throw new Error("Workspace unavailable");
    const next = await readDocs(query, filters);
    if (next.workspaceId !== activeWorkspaceId) {
      throw new Error("Workspace changed while loading documents");
    }
    setData(next);
    setError(false);
    return next;
  }, [activeWorkspaceId, filters, query]);

  React.useEffect(() => {
    let current = true;
    setError(false);
    if (!activeWorkspaceId) return () => undefined;
    const timer = window.setTimeout(
      () => {
        void readDocs(query, filters)
          .then((next) => {
            if (current && next.workspaceId === activeWorkspaceId)
              setData(next);
          })
          .catch(() => {
            if (current) setError(true);
          });
      },
      query ? 180 : 0
    );
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [activeWorkspaceId, filters, query]);

  const create = React.useCallback(
    async (kind: "page" | "database") => {
      try {
        const response = await fetch(
          kind === "database" ? "/api/databases" : "/api/pages",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: kind === "database" ? "New database" : "Untitled",
            }),
          }
        );
        if (!response.ok) throw new Error("Create failed");
        const result = (await response.json()) as {
          page?: { id: string };
          database?: { pageId: string };
        };
        const pageId = result.page?.id ?? result.database?.pageId;
        if (!pageId) throw new Error("Missing Page ID");
        window.dispatchEvent(new Event("pages-changed"));
        router.push(`/pages/${pageId}`);
      } catch {
        notify.error(
          kind === "database"
            ? "Could not create a database"
            : "Could not create a document"
        );
      }
    },
    [router]
  );

  const toggleStar = React.useCallback(
    async (doc: NeedtDocument, starred: boolean) => {
      try {
        const response = await fetch(`/api/pages/${doc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isFavorite: starred }),
        });
        if (!response.ok) throw new Error("Favorite failed");
        await refresh();
      } catch {
        notify.error("Could not update this document");
      }
    },
    [refresh]
  );

  const trash = React.useCallback(
    async (doc: NeedtDocument) => {
      if (!window.confirm(`Move “${doc.title}” to trash?`)) return;
      try {
        const response = await fetch(`/api/pages/${doc.id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Trash failed");
        await refresh();
        notify.success("Document moved to trash");
      } catch {
        notify.error("Could not move this document to trash");
      }
    },
    [refresh]
  );

  const createMetadata = React.useCallback(
    async (kind: "folder" | "tag" | "smart-folder", name: string) => {
      try {
        const response = await fetch("/api/pages/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            kind === "smart-folder"
              ? { kind, name, query: { version: 1, ...filters } }
              : { kind, name }
          ),
        });
        if (!response.ok) throw new Error("Create metadata failed");
        await refresh();
        notify.success(
          kind === "smart-folder"
            ? "Saved filter created"
            : "Organization created"
        );
      } catch {
        notify.error("Could not create document organization");
        throw new Error("Create metadata failed");
      }
    },
    [filters, refresh]
  );

  const shellStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    background: "var(--background)",
    color: "var(--text-primary)",
    font: "var(--type-ui)",
  };

  if (!data || data.workspaceId !== activeWorkspaceId) {
    return (
      <div className="needt-v2" data-theme={theme} style={shellStyle}>
        <div className="grid flex-1 place-items-center px-6 text-center text-sm text-[var(--text-muted)]">
          {error ? (
            <div>
              <p>Documents could not be loaded.</p>
              <button
                type="button"
                className="mt-3 min-h-11 rounded-[var(--radius-lg)] px-4 text-[var(--accent)] shadow-[var(--shadow-ring)]"
                onClick={() => void refresh().catch(() => setError(true))}
              >
                Try again
              </button>
            </div>
          ) : (
            <span role="status">Loading documents…</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="needt-v2" data-theme={theme} style={shellStyle}>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <ScreenFrame id="docs" glyph={LuFileText}>
          <DocsScreen
            docs={data.docs}
            query={query}
            filters={filters}
            metadata={data.metadata}
            onQueryChange={setQuery}
            onFiltersChange={setFilters}
            onOpen={(doc) => router.push(`/pages/${doc.id}`)}
            onNew={data.canCreate ? () => void create("page") : undefined}
            onNewDatabase={
              data.canCreate ? () => void create("database") : undefined
            }
            onToggleStar={toggleStar}
            onTrash={trash}
            onCreateMetadata={data.canCreate ? createMetadata : undefined}
          />
        </ScreenFrame>
      </div>
    </div>
  );
}
