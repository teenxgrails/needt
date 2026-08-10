"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Database,
  FileText,
  LockKeyhole,
  Plus,
  Search,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { newDate } from "@/lib/date-utils";
import { notify } from "@/lib/notifications";

import type { PageSummary } from "./page-types";

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
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState<"page" | "database" | null>(null);

  useEffect(() => {
    void fetch("/api/pages")
      .then((response) => (response.ok ? response.json() : { pages: [] }))
      .then((data: { pages?: PageSummary[] }) =>
        setPages(Array.isArray(data.pages) ? data.pages : [])
      )
      .catch(() => {
        setPages([]);
        notify.error("Could not load Pages");
      });
  }, []);

  const visiblePages = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return pages;
    return pages.filter((page) =>
      page.title.toLocaleLowerCase().includes(normalized)
    );
  }, [pages, query]);

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
