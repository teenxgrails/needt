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
import { useAppSession } from "@/components/providers/app-session-context";
import { TodaysTasksPanel } from "@/components/tasks/TodaysTasksPanel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export const AppNav = memo(function AppNav({
  className,
  onOpenChatOverlay,
}: AppNavProps) {
  const pathname = usePathname();
  const { data: session } = useAppSession();
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [unreadMailCount, setUnreadMailCount] = useState(0);
  const [isOverloaded, setIsOverloaded] = useState(false);
  const [todayLabel, setTodayLabel] = useState<string | null>(null);
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
      "/boards",
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

  useEffect(() => {
    setTodayLabel(
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(newDate())
    );
  }, []);

  // Motion swaps its product rail for the settings rail on settings pages.
  // Keeping both creates an unnecessary second navigation column.
  if (pathname.startsWith("/auth") || pathname === "/setup") {
    return null;
  }

  const isSettings = pathname.startsWith("/settings");
  const desktopLinks = [
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
  const mobileLinks = [
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/today", label: "Today", icon: Sun },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/focus", label: "Focus", icon: Focus },
  ];
  const profileInitials =
    session?.user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ME";

  return (
    <aside
      aria-label={`${APP_NAME} navigation`}
      className={cn(
        "needt-panel-depth motion-sidebar z-40 flex h-screen w-[244px] flex-none flex-col border-r border-[var(--line-strong)] p-2 text-[var(--text-hi)] max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-[calc(68px+env(safe-area-inset-bottom))] max-lg:w-full max-lg:flex-row max-lg:border-r-0 max-lg:border-t max-lg:px-1 max-lg:pb-[env(safe-area-inset-bottom)] max-lg:pt-1",
        isSettings && "lg:hidden",
        className
      )}
    >
      <TodaysTasksPanel className="mb-2 max-h-[168px] flex-none max-lg:hidden" />

      <div className="mb-2 max-lg:hidden">
        <MiniCalendar currentDate={currentDate} onDateClick={setDate} compact />
      </div>

      <button
        type="button"
        onClick={openCommandPalette}
        className="mb-2 flex w-full items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--raised)] px-2.5 py-1.5 text-left text-[13px] text-[var(--text-lo)] transition-colors hover:bg-[var(--active)] hover:text-[var(--text-hi)] max-lg:hidden"
        aria-label="Search or open command palette"
      >
        <Search className="h-4 w-4" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate">Search or command</span>
        <kbd className="rounded bg-[var(--app-bg)] px-1.5 py-0.5 text-[10px] text-[var(--text-lo)]">
          ⌘K
        </kbd>
      </button>

      <nav className="space-y-0.5 text-[13px] max-lg:hidden">
        {desktopLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          const isFocus = link.href === "/focus";

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex w-full touch-manipulation items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors [transition-duration:var(--motion-duration-fast)]",
                isActive
                  ? "needt-active-nav-item bg-[var(--active)] text-[var(--text-hi)]"
                  : "text-[var(--text-lo)] hover:bg-[var(--active)] hover:text-[var(--text-hi)]"
              )}
            >
              <Icon
                className="h-[18px] w-[18px] flex-none"
                strokeWidth={1.75}
              />
              <span className="min-w-0 flex-1 truncate">{link.label}</span>
              {"meta" in link && link.meta && (
                <span className="text-[11px] text-[var(--text-lo)]">
                  {link.meta}
                </span>
              )}
              {"badge" in link && Boolean(link.badge) && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold",
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

      <nav className="hidden flex-1 items-stretch justify-around text-[13px] max-lg:flex">
        {mobileLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-h-14 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[var(--text-lo)] transition-colors [transition-duration:var(--motion-duration-fast)] active:bg-[var(--active)]",
                isActive &&
                  "needt-active-nav-item bg-[var(--active)] text-[var(--text-hi)]"
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <span className="text-[10px] leading-3">{link.label}</span>
            </Link>
          );
        })}
        <Link
          href="/settings#account"
          className={cn(
            "flex min-h-14 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[var(--text-lo)] transition-colors [transition-duration:var(--motion-duration-fast)] active:bg-[var(--active)]",
            isSettings &&
              "needt-active-nav-item bg-[var(--active)] text-[var(--text-hi)]"
          )}
        >
          <Avatar className="h-5 w-5 border border-[var(--border-control)]">
            <AvatarImage
              src={session?.user?.image || ""}
              alt={session?.user?.name || "Profile"}
            />
            <AvatarFallback className="text-[8px] font-semibold">
              {profileInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] leading-3">Me</span>
        </Link>
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto max-lg:hidden">
        <BoardsSidebarSection />
      </div>

      <div className="mt-auto max-lg:hidden">
        <Link
          href={
            isOverloaded
              ? `/chat?prompt=${encodeURIComponent(
                  "My day is overloaded. Show me what to defer or reschedule, but do not change anything yet."
                )}`
              : "/chat"
          }
          onClick={(event) => {
            if (!onOpenChatOverlay) return;
            event.preventDefault();
            onOpenChatOverlay();
          }}
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

      {isSettings && (
        <Link
          href="/chat"
          aria-label="Open AI Chat"
          className="fixed right-3 z-30 hidden h-11 items-center gap-2 rounded-full border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-panel))] px-3 text-xs font-medium text-[var(--text-primary)] shadow-sm active:bg-[color-mix(in_srgb,var(--accent)_24%,var(--surface-panel))] max-lg:flex"
          style={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }}
        >
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          AI
        </Link>
      )}

      <DownloadAppsModal open={downloadOpen} onOpenChange={setDownloadOpen} />
    </aside>
  );
});
