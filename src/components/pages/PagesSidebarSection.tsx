"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, LockKeyhole, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PageSummary } from "./page-types";

export function PagesSidebarSection() {
  const pathname = usePathname();
  const router = useRouter();
  const [pages, setPages] = useState<PageSummary[]>([]);
  const load = useCallback(async () => {
    const response = await fetch("/api/pages");
    if (!response.ok) return;
    const payload = (await response.json()) as { pages?: PageSummary[] };
    setPages(Array.isArray(payload.pages) ? payload.pages : []);
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener("pages-changed", load);
    return () => window.removeEventListener("pages-changed", load);
  }, [load]);

  const create = async () => {
    const response = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled" }),
    });
    if (!response.ok) return;
    const { page } = (await response.json()) as { page: PageSummary };
    window.dispatchEvent(new Event("pages-changed"));
    router.push(`/pages/${page.id}`);
  };

  return (
    <section className="px-2 pb-3 pt-2">
      <div className="flex h-7 items-center justify-between px-1.5">
        <Link href="/pages" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Pages</Link>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => void create()} aria-label="New page"><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="space-y-0.5">
        {pages.slice(0, 12).map((page) => {
          const href = `/pages/${page.id}`;
          return (
            <Link key={page.id} href={href} className={cn("flex h-7 items-center gap-2 rounded-[var(--control-radius)] px-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--menu-item-hover)] hover:text-[var(--text-primary)]", pathname === href && "bg-[var(--nav-item-active)] text-[var(--text-primary)]")}>
              <span className="flex w-4 justify-center text-[13px]">{page.icon || <FileText className="h-3.5 w-3.5" />}</span>
              <span className="min-w-0 flex-1 truncate">{page.title}</span>
              {page.isPrivate && <LockKeyhole className="h-3 w-3 opacity-60" />}
            </Link>
          );
        })}
        {pages.length === 0 && <p className="px-2 py-1 text-[12px] text-[var(--text-muted)]">Notes, docs and databases.</p>}
      </div>
    </section>
  );
}
