"use client";

import { memo, useEffect, useState } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  CalendarDays,
  CheckSquare,
  Download,
  Focus,
  Mail,
  Search,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";

import { BoardsSidebarSection } from "@/components/boards/BoardsSidebarSection";
import { MiniCalendar } from "@/components/calendar/MiniCalendar";
import { DownloadAppsModal } from "@/components/navigation/DownloadAppsModal";
import { TodaysTasksPanel } from "@/components/tasks/TodaysTasksPanel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { APP_NAME } from "@/lib/app-config";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

import { useViewStore } from "@/store/calendar";
import { useTaskStore } from "@/store/task";

import { TaskStatus } from "@/types/task";

import { FocusNavBadge } from "./FocusNavBadge";
import { UserMenu } from "./UserMenu";

const LOG_SOURCE = "AppNav";

interface AppNavProps {
  className?: string;
  onOpenChatOverlay?: () => void;
}

function openCommandPalette() {
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    })
  );
}

export const AppNav = memo(function AppNav({ className }: AppNavProps) {
  const pathname = usePathname();
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [unreadMailCount, setUnreadMailCount] = useState(0);
  const [isOverloaded, setIsOverloaded] = useState(false);
  const overdueCount = useTaskStore(
    (state) =>
      state.tasks.filter(
        (task) =>
          task.status !== TaskStatus.COMPLETED &&
          task.dueDate &&
          newDate(task.dueDate) < newDate()
      ).length
  );
  const currentDate = useViewStore((state) => state.date);
  const setDate = useViewStore((state) => state.setDate);
  const router = useRouter();

  // Warm the router cache for every section so switching is instant (matters in
  // production, where prefetch is enabled).
  useEffect(() => {
    [
      "/today",
      "/calendar",
      "/tasks",
      "/focus",
      "/mail",
      "/settings",
      "/chat",
    ].forEach((route) => router.prefetch(route));
  }, [router]);

  useEffect(() => {
    if (pathname.startsWith("/auth") || pathname === "/setup") return;
    const refreshUnread = async () => {
      try {
        const response = await fetch("/api/mail/accounts");
        if (!response.ok) return;
        const accounts = (await response.json()) as Array<{
          _count: { messages: number };
        }>;
        setUnreadMailCount(
          accounts.reduce(
            (total, account) => total + account._count.messages,
            0
          )
        );
      } catch (error) {
        void logger.debug(
          "Unread mail badge is unavailable",
          { error: error instanceof Error ? error.message : String(error) },
          LOG_SOURCE
        );
      }
    };
    void refreshUnread();
    window.addEventListener("mail-unread-changed", refreshUnread);
    return () =>
      window.removeEventListener("mail-unread-changed", refreshUnread);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/auth") || pathname === "/setup") return;
    fetch("/api/ai/briefing-status")
      .then((response) => (response.ok ? response.json() : null))
      .then((status) => setIsOverloaded(Boolean(status?.overloaded)))
      .catch((error) => {
        void logger.debug(
          "AI overload status is unavailable",
          { error: error instanceof Error ? error.message : String(error) },
          LOG_SOURCE
        );
      });
  }, [pathname]);

  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(newDate());

  // Motion swaps its product rail for the settings rail on settings pages.
  // Keeping both creates an unnecessary second navigation column.
  if (pathname.startsWith("/settings")) {
    return null;
  }

  const links = [
    { href: "/today", label: "Today", icon: Sun },
    {
      href: "/calendar",
      label: "Calendar",
      icon: CalendarDays,
      meta: todayLabel,
    },
    {
      href: "/tasks",
      label: "Workspace",
      icon: CheckSquare,
      badge: overdueCount,
    },
    { href: "/focus", label: "Focus", icon: Focus },
    { href: "/mail", label: "Mail", icon: Mail, badge: unreadMailCount },
  ];

  return (
    <aside
      aria-label={`${APP_NAME} navigation`}
      className={cn(
        "motion-sidebar z-20 flex h-screen w-[244px] flex-none flex-col border-r border-[var(--line-strong)] bg-[var(--app-bg)] p-2 text-[var(--text-hi)] max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:h-16 max-md:w-full max-md:flex-row max-md:border-r-0 max-md:border-t max-md:p-1",
        className
      )}
    >
      <TodaysTasksPanel className="mb-2 max-h-[168px] flex-none max-md:hidden" />

      <div className="mb-2 max-md:hidden">
        <MiniCalendar currentDate={currentDate} onDateClick={setDate} compact />
      </div>

      <button
        type="button"
        onClick={openCommandPalette}
        className="mb-2 flex w-full items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--raised)] px-2.5 py-1.5 text-left text-[13px] text-[var(--text-lo)] transition-colors hover:bg-[var(--active)] hover:text-[var(--text-hi)] max-md:hidden"
        aria-label="Search or open command palette"
      >
        <Search className="h-4 w-4" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate max-md:hidden">
          Search or command
        </span>
        <kbd className="rounded bg-[var(--app-bg)] px-1.5 py-0.5 text-[10px] text-[var(--text-lo)] max-md:hidden">
          ⌘K
        </kbd>
      </button>

      <nav className="space-y-0.5 text-[13px] max-md:flex max-md:flex-1 max-md:items-center max-md:justify-around max-md:space-y-0">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          const isFocus = link.href === "/focus";

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors max-md:w-auto max-md:flex-1 max-md:justify-center max-md:py-2",
                isActive
                  ? "needt-active-nav-item bg-[var(--active)] text-[var(--text-hi)]"
                  : "text-[var(--text-lo)] hover:bg-[var(--active)] hover:text-[var(--text-hi)]"
              )}
            >
              <Icon className="h-4 w-4 flex-none" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate max-md:hidden">
                {link.label}
              </span>
              {"meta" in link && link.meta && (
                <span className="text-[11px] text-[var(--text-lo)] max-md:hidden">
                  {link.meta}
                </span>
              )}
              {"badge" in link && Boolean(link.badge) && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold max-md:hidden",
                    (link.badge ?? 0) > 0
                      ? "bg-red-500/20 text-red-200"
                      : "bg-transparent text-transparent"
                  )}
                >
                  ‼ {link.badge}
                </span>
              )}
              {isFocus && <FocusNavBadge />}
            </Link>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto max-md:hidden">
        <BoardsSidebarSection />
      </div>

      <div className="mt-auto max-md:hidden">
        <Link
          href={
            isOverloaded
              ? `/chat?prompt=${encodeURIComponent(
                  "My day is overloaded. Show me what to defer or reschedule, but do not change anything yet."
                )}`
              : "/chat"
          }
          className={cn(
            "mb-2 flex min-w-0 items-center gap-2 rounded-md border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_18%,var(--raised))] px-2.5 py-2 text-[13px] font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_24%,var(--raised))]",
            pathname === "/chat" && "text-white"
          )}
        >
          <Sparkles
            className="h-4 w-4 flex-none text-[var(--accent)]"
            strokeWidth={1.75}
          />
          <span className="truncate">AI Chat</span>
          {isOverloaded && (
            <span
              className="h-2 w-2 flex-none rounded-full bg-[var(--color-warning)]"
              aria-label="Today's workload exceeds your work hours"
            />
          )}
          <kbd className="ml-auto rounded bg-[var(--app-bg)] px-1.5 py-0.5 text-[10px] text-[var(--text-lo)]">
            ⌘/
          </kbd>
        </Link>
        <div className="flex items-center justify-between gap-1 border-t border-[var(--line-strong)] pt-2">
          <UserMenu />
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-md text-[var(--text-lo)] transition-colors hover:bg-[var(--active)] hover:text-[var(--text-hi)]",
                    pathname === "/settings" &&
                      "bg-[var(--active)] text-[var(--text-hi)]"
                  )}
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4" strokeWidth={1.75} />
                </Link>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setDownloadOpen(true)}
                  className="grid h-8 w-8 place-items-center rounded-md text-[var(--text-lo)] transition-colors hover:bg-[var(--active)] hover:text-[var(--text-hi)]"
                  aria-label="Get the apps"
                >
                  <Download className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Get the apps</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <DownloadAppsModal open={downloadOpen} onOpenChange={setDownloadOpen} />
    </aside>
  );
});
