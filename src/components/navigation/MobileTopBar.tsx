"use client";

import { usePathname } from "next/navigation";

import { UserMenu } from "@/components/navigation/UserMenu";

import { APP_NAME } from "@/lib/app-config";
import { newDate } from "@/lib/date-utils";

/**
 * Mobile-only top bar (hidden at md+, where the sidebar owns this chrome).
 * Shows the app name, today's date, and the avatar/profile menu. Paired with
 * the bottom tab bar that AppNav renders below md.
 */
export function MobileTopBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/settings") || pathname.startsWith("/auth")) {
    return null;
  }

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(newDate());

  return (
    <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--line-strong)] bg-[var(--app-bg)] px-4 md:hidden">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-semibold text-[var(--text-hi)]">
          {APP_NAME}
        </span>
        <span className="text-[11px] text-[var(--text-lo)]">{dateLabel}</span>
      </div>
      <UserMenu />
    </header>
  );
}
