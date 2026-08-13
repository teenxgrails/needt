"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Database,
  FileText,
  Folder,
  LockKeyhole,
  Plus,
  Search,
  Star,
  Tag,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { newDate } from "@/lib/date-utils";
import { notify } from "@/lib/notifications";

import type { PageSummary } from "./page-types";

type PageMetadata = {
  folders: Array<{ id: string; name: string; color: string | null }>;
  tags: Array<{ id: string; name: string; color: string | null }>;
  smartFolders: Array<{
    id: string;
    name: string;
    query: {
      folderId?: string;
      tagIds?: string[];
      favorites?: boolean;
      privateOnly?: boolean;
    };
  }>;
};

type PageFilters = {
  folderId?: string;
  tagIds?: string[];
  favorites?: boolean;
  privateOnly?: boolean;
};

function editedLabel(value: string) {
  const edited = newDate(value);
  const today = newDate();
  const sameDay = edited.toDateString() === today.toDateString();

  return sameDay
    ? edited.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : edited.toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year:
          edited.getFullYear() === today.getFullYear() ? undefined : "numeric",
      });
}

export function PagesHome() {
  const router = useRouter();
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [metadata, setMetadata] = useState<PageMetadata>({
    folders: [],
    tags: [],
    smartFolders: [],
  });
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<PageFilters>({});
  const [creating, setCreating] = useState<"page" | "database" | null>(null);
  const [metadataName, setMetadataName] = useState("");
  const [creatingMetadata, setCreatingMetadata] = useState<
    "folder" | "tag" | "smart-folder" | null
  >(null);

  const loadMetadata = useCallback(() => {
    void fetch("/api/pages/metadata")
      .then((response) =>
        response.ok
          ? response.json()
          : { folders: [], tags: [], smartFolders: [] }
      )
      .then((data: PageMetadata) => setMetadata(data))
      .catch(() => setMetadata({ folders: [], tags: [], smartFolders: [] }));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (filters.folderId) params.set("folderId", filters.folderId);
    filters.tagIds?.forEach((tagId) => params.append("tagId", tagId));
    if (filters.favorites) params.set("favorites", "true");
    if (filters.privateOnly) params.set("privateOnly", "true");
    void fetch(`/api/pages?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : { pages: [] }))
      .then((data: { pages?: PageSummary[] }) =>
        setPages(Array.isArray(data.pages) ? data.pages : [])
      )
      .catch(() => {
        setPages([]);
        notify.error("Could not load Pages");
      });
  }, [filters, query]);

  useEffect(() => {
    loadMetadata();
    window.addEventListener("pages-metadata-changed", loadMetadata);
    return () =>
      window.removeEventListener("pages-metadata-changed", loadMetadata);
  }, [loadMetadata]);

  const visiblePages = useMemo(() => pages, [pages]);

  const favorites = visiblePages.filter((page) => page.isFavorite);

  const create = async (kind: "page" | "database") => {
    setCreating(kind);
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
      const data = (await response.json()) as {
        page?: PageSummary;
        database?: { pageId: string };
      };
      const id = data.page?.id || data.database?.pageId;
      if (!id) throw new Error("Missing Page ID");
      window.dispatchEvent(new Event("pages-changed"));
      router.push(`/pages/${id}`);
    } catch {
      notify.error(
        `Could not create ${kind === "page" ? "a Page" : "a database"}`
      );
      setCreating(null);
    }
  };

  const createMetadata = async (kind: "folder" | "tag" | "smart-folder") => {
    const name = metadataName.trim();
    if (!name) return;
    try {
      setCreatingMetadata(kind);
      const response = await fetch("/api/pages/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "smart-folder"
            ? { kind, name, query: { version: 1, ...filters } }
            : { kind, name }
        ),
      });
      if (!response.ok) throw new Error("Create failed");
      setMetadataName("");
      loadMetadata();
      notify.success(
        kind === "smart-folder"
          ? "Smart Folder saved"
          : "Page organization created"
      );
    } catch {
      notify.error("Could not create Page organization.");
    } finally {
      setCreatingMetadata(null);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--surface-canvas)] px-5 py-8 text-[var(--text-primary)] sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-start justify-between gap-4 sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">Pages</h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              Notes, documents and shared knowledge.
            </p>
          </div>
          <Button
            onClick={() => void create("page")}
            disabled={creating !== null}
          >
            <Plus /> {creating === "page" ? "Creating…" : "New note"}
          </Button>
        </header>

        <div className="relative mb-7 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your notes"
            aria-label="Search Pages"
            className="h-10 pl-9"
          />
        </div>

        <div className="mb-5 flex max-w-xl flex-wrap gap-2">
          <Input
            value={metadataName}
            onChange={(event) => setMetadataName(event.target.value)}
            maxLength={80}
            placeholder="New folder, tag or Smart Folder"
            aria-label="New Page organization"
            className="min-w-[220px] flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={creatingMetadata !== null || !metadataName.trim()}
            onClick={() => void createMetadata("folder")}
          >
            <Folder /> Folder
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={creatingMetadata !== null || !metadataName.trim()}
            onClick={() => void createMetadata("tag")}
          >
            <Tag /> Tag
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={creatingMetadata !== null || !metadataName.trim()}
            onClick={() => void createMetadata("smart-folder")}
          >
            <Folder /> Save filter
          </Button>
        </div>

        {(metadata.folders.length > 0 ||
          metadata.tags.length > 0 ||
          metadata.smartFolders.length > 0) && (
          <div className="mb-7 flex flex-wrap gap-2" aria-label="Page filters">
            <Button
              type="button"
              variant={
                Object.keys(filters).length === 0 ? "secondary" : "outline"
              }
              size="sm"
              onClick={() => setFilters({})}
            >
              All notes
            </Button>
            {metadata.folders.map((folder) => (
              <Button
                key={folder.id}
                type="button"
                variant={
                  filters.folderId === folder.id ? "secondary" : "outline"
                }
                size="sm"
                onClick={() => setFilters({ folderId: folder.id })}
              >
                <Folder /> {folder.name}
              </Button>
            ))}
            {metadata.tags.map((tag) => (
              <Button
                key={tag.id}
                type="button"
                variant={
                  filters.tagIds?.[0] === tag.id ? "secondary" : "outline"
                }
                size="sm"
                onClick={() => setFilters({ tagIds: [tag.id] })}
              >
                <Tag /> {tag.name}
              </Button>
            ))}
            {metadata.smartFolders.map((folder) => (
              <Button
                key={folder.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilters(folder.query)}
              >
                <Folder /> {folder.name}
              </Button>
            ))}
          </div>
        )}

        {!query && (
          <section aria-labelledby="quick-start-heading" className="mb-10">
            <h2
              id="quick-start-heading"
              className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]"
            >
              Quick start
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void create("page")}
                disabled={creating !== null}
                className="group flex min-h-20 items-center gap-4 rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 text-left transition-colors hover:bg-[var(--menu-item-hover)] disabled:opacity-50"
              >
                <span className="grid h-10 w-10 flex-none place-items-center rounded-[var(--control-radius)] bg-[var(--surface-control)]">
                  <FileText className="h-5 w-5 text-[var(--text-secondary)]" />
                </span>
                <span>
                  <span className="block text-sm font-medium">Blank note</span>
                  <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                    Start writing immediately
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => void create("database")}
                disabled={creating !== null}
                className="group flex min-h-20 items-center gap-4 rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 text-left transition-colors hover:bg-[var(--menu-item-hover)] disabled:opacity-50"
              >
                <span className="grid h-10 w-10 flex-none place-items-center rounded-[var(--control-radius)] bg-[var(--surface-control)]">
                  <Database className="h-5 w-5 text-[var(--text-secondary)]" />
                </span>
                <span>
                  <span className="block text-sm font-medium">Database</span>
                  <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                    Table, board or calendar
                  </span>
                </span>
              </button>
            </div>
          </section>
        )}

        {favorites.length > 0 && (
          <section aria-labelledby="favorites-heading" className="mb-9">
            <h2
              id="favorites-heading"
              className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]"
            >
              <Star className="h-3.5 w-3.5" /> Favorites
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((page) => (
                <Link
                  key={page.id}
                  href={`/pages/${page.id}`}
                  className="min-h-28 rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 transition-colors hover:bg-[var(--menu-item-hover)]"
                >
                  <span className="text-2xl">
                    {page.icon || (page.database ? "▦" : "📄")}
                  </span>
                  <span className="mt-4 block truncate text-sm font-medium">
                    {page.title || "Untitled"}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    Edited {editedLabel(page.updatedAt)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="recent-heading">
          <h2
            id="recent-heading"
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]"
          >
            {query ? "Results" : "Recently edited"}
          </h2>
          <div className="overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
            {visiblePages.map((page) => (
              <Link
                key={page.id}
                href={`/pages/${page.id}`}
                className="group flex min-h-14 items-center gap-3 border-b border-[var(--border-subtle)] px-3.5 transition-colors last:border-b-0 hover:bg-[var(--menu-item-hover)] sm:px-4"
              >
                <span className="grid h-8 w-8 flex-none place-items-center rounded-[var(--control-radius)] bg-[var(--surface-control)] text-sm">
                  {page.icon ||
                    (page.database ? (
                      <Database className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {page.title || "Untitled"}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[var(--text-muted)] sm:hidden">
                    {editedLabel(page.updatedAt)}
                  </span>
                </span>
                {page.isFavorite && (
                  <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                )}
                {page.isPrivate && (
                  <LockKeyhole className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                )}
                <span className="hidden text-xs text-[var(--text-muted)] sm:block">
                  {editedLabel(page.updatedAt)}
                </span>
              </Link>
            ))}
            {visiblePages.length === 0 && (
              <div className="px-5 py-12 text-center">
                <FileText className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
                <p className="mt-3 text-sm font-medium">
                  {query ? "No matching notes" : "Your notes will appear here"}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {query
                    ? "Try a different title."
                    : "Create a blank note and start writing."}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
