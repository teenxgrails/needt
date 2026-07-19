"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Sparkles } from "lucide-react";

import { APP_NAME } from "@/lib/app-config";
import { newDate } from "@/lib/date-utils";

/**
 * Compact top bar for phone and tablet layouts (hidden at lg+, where the
 * sidebar owns this chrome).
 * Shows the app name, today's date, and the avatar/profile menu. Paired with
 * the bottom tab bar that AppNav renders below md.
 */
export function MobileTopBar() {
  const pathname = usePathname();
  const [dateLabel, setDateLabel] = useState<string | null>(null);

  useEffect(() => {
    setDateLabel(
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(newDate())
    );
  }, []);

  if (pathname.startsWith("/settings") || pathname.startsWith("/auth")) {
    return null;
  }

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--line-strong)] bg-[var(--app-bg)] px-4 lg:hidden">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-semibold text-[var(--text-hi)]">
          {APP_NAME}
        </span>
        {dateLabel && (
          <span className="text-[11px] text-[var(--text-lo)]">{dateLabel}</span>
        )}
      </div>
      {pathname !== "/chat" && (
        <Link
          href="/chat"
          aria-label="Open AI Chat"
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--border-control)] bg-[var(--surface-panel)] text-[var(--accent)] transition-colors duration-150 active:bg-[var(--surface-hover)]"
        >
          <Sparkles className="h-4 w-4" />
        </Link>
      )}
    </header>
  );
}
