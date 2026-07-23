"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Database, FileText, FormInput, Import, LockKeyhole, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PageSummary } from "./page-types";

const starters = [
  { label: "Page", description: "A flexible document", icon: FileText, kind: "page", disabled: false },
  { label: "Database", description: "Table, board, calendar and more", icon: Database, kind: "database", disabled: false },
  { label: "Form", description: "Collect structured entries", icon: FormInput, kind: "database", disabled: false },
  { label: "Import", description: "Markdown and CSV", icon: Import, kind: "page", disabled: true },
] as const;

export function PagesHome() {
  const router = useRouter();
  const [pages, setPages] = useState<PageSummary[]>([]);
  useEffect(() => {
    void fetch("/api/pages")
      .then((response) => (response.ok ? response.json() : { pages: [] }))
      .then((data: { pages?: PageSummary[] }) =>
        setPages(Array.isArray(data.pages) ? data.pages : [])
      )
      .catch(() => setPages([]));
  }, []);

  const create = async (kind: "page" | "database") => {
    const response = await fetch(kind === "database" ? "/api/databases" : "/api/pages", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: kind === "database" ? "New database" : "Untitled" }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { page?: PageSummary; database?: { pageId: string } };
    const id = data.page?.id || data.database?.pageId;
    if (id) { window.dispatchEvent(new Event("pages-changed")); router.push(`/pages/${id}`); }
  };

  return (
    <div className="min-h-dvh bg-[var(--app-bg)] px-6 py-10 text-[var(--text-primary)] lg:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]"><Sparkles className="h-3.5 w-3.5" /> Your private workspace</p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">Pages</h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--text-secondary)]">Write freely, organize knowledge and view the same database in different ways.</p>
          </div>
          <Button onClick={() => void create("page")}><Plus /> New page</Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {starters.map((starter) => (
            <button key={starter.label} type="button" disabled={starter.disabled} onClick={() => void create(starter.kind)} className="group min-h-28 rounded-[var(--panel-radius)] bg-[var(--surface-raised)] p-4 text-left transition-colors hover:bg-[var(--menu-item-hover)] disabled:cursor-not-allowed disabled:opacity-40">
              <starter.icon className="mb-5 h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
              <div className="text-sm font-medium">{starter.label}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{starter.description}</div>
            </button>
          ))}
        </div>
        <h2 className="mb-3 mt-12 text-sm font-semibold">Recently edited</h2>
        <div className="divide-y divide-[var(--border-subtle)]">
          {pages.map((page) => (
            <Link key={page.id} href={`/pages/${page.id}`} className="flex items-center gap-3 py-3 hover:text-[var(--color-accent)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--surface-raised)]">{page.icon || <FileText className="h-4 w-4" />}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{page.title}</span>{page.isPrivate && <LockKeyhole className="h-3.5 w-3.5 text-[var(--text-muted)]" />}
              <span className="text-xs text-[var(--text-muted)]">{new Date(page.updatedAt).toLocaleDateString()}</span>
            </Link>
          ))}
          {pages.length === 0 && <div className="py-8 text-sm text-[var(--text-muted)]">Create your first page to start writing.</div>}
        </div>
      </div>
    </div>
  );
}
