import Link from "next/link";

import { FileText, LockKeyhole } from "lucide-react";

import { cn } from "@/lib/utils";

import type { PageSummary } from "./page-types";

type PageTreeProps = {
  activePageId?: string;
  pages: PageSummary[];
};

export function PageTree({ activePageId, pages }: PageTreeProps) {
  const byParent = new Map<string | null, PageSummary[]>();
  for (const page of pages) {
    const siblings = byParent.get(page.parentId) ?? [];
    siblings.push(page);
    byParent.set(page.parentId, siblings);
  }

  const render = (parentId: string | null, depth: number, seen: Set<string>) =>
    (byParent.get(parentId) ?? []).map((page) => {
      if (seen.has(page.id)) return null;
      const nextSeen = new Set(seen).add(page.id);
      const href = `/pages/${page.id}`;
      return (
        <div key={page.id}>
          <Link
            href={href}
            className={cn(
              "flex h-7 items-center gap-2 rounded-[var(--control-radius)] px-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--menu-item-hover)] hover:text-[var(--text-primary)]",
              activePageId === page.id &&
                "bg-[var(--nav-item-active)] text-[var(--text-primary)]"
            )}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            <span className="flex w-4 justify-center text-[13px]">
              {page.icon || <FileText className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0 flex-1 truncate">{page.title}</span>
            {page.isPrivate && <LockKeyhole className="h-3 w-3 opacity-60" />}
          </Link>
          {render(page.id, depth + 1, nextSeen)}
        </div>
      );
    });

  return <div className="space-y-0.5">{render(null, 0, new Set())}</div>;
}
