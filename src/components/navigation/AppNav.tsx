"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  ArrowUpRight,
  CalendarDays,
  CheckSquare,
  Focus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

import { MiniCalendar } from "@/components/calendar/MiniCalendar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { APP_NAME } from "@/lib/app-config";
import { getOverdueSummary } from "@/lib/overdue";
import { cn } from "@/lib/utils";

import { useCalendarStore, useViewStore } from "@/store/calendar";
import { useFocusModeStore } from "@/store/focusMode";
import { useTaskStore } from "@/store/task";

import { UserMenu } from "./UserMenu";

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

export function AppNav({ className, onOpenChatOverlay }: AppNavProps) {
  const pathname = usePathname();
  const { date: currentDate, setDate } = useViewStore();
  const { feeds } = useCalendarStore();
  const tasks = useTaskStore((state) => state.tasks);
  const currentTaskId = useFocusModeStore((state) => state.currentTaskId);
  const isProcessing = useFocusModeStore((state) => state.isProcessing);
  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());
  const overdueSummary = getOverdueSummary(tasks);

  const links = [
    { href: "/calendar", label: "Calendar", icon: CalendarDays, meta: todayLabel },
    {
      href: "/tasks",
      label: "Projects & Tasks",
      icon: CheckSquare,
      badge: overdueSummary.count,
      badgeSeverity: overdueSummary.severity,
    },
    { href: "/focus", label: "Focus", icon: Focus },
  ];

  return (
    <aside
      aria-label={`${APP_NAME} navigation`}
      className={cn(
        "motion-sidebar z-20 flex h-screen w-[244px] flex-none flex-col border-r border-[var(--line-strong)] bg-[var(--app-bg)] p-2 text-[var(--text-hi)] max-md:w-[68px] max-md:p-1",
        className
      )}
    >
      <div className="mb-2 max-md:hidden">
        <MiniCalendar currentDate={currentDate} onDateClick={setDate} compact />
      </div>

      <div className="mb-3 grid grid-cols-[1fr_auto] gap-1">
        <Link
          href="/chat"
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-md border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_18%,var(--raised))] px-2.5 py-2 text-[13px] font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_24%,var(--raised))]",
            pathname === "/chat" && "text-white"
          )}
        >
          <Sparkles className="h-4 w-4 flex-none text-[var(--accent)]" strokeWidth={1.75} />
          <span className="truncate max-md:hidden">AI Chat</span>
          <kbd className="ml-auto rounded bg-[var(--app-bg)] px-1.5 py-0.5 text-[10px] text-[var(--text-lo)] max-md:hidden">
            ⌘/
          </kbd>
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onOpenChatOverlay}
              className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text-lo)] transition-colors hover:bg-[var(--active)] hover:text-[var(--text-hi)]"
              aria-label="Open compact AI chat"
            >
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Open compact AI chat</TooltipContent>
        </Tooltip>
      </div>

      <button
        type="button"
        onClick={openCommandPalette}
        className="mb-2 flex w-full items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--raised)] px-2.5 py-1.5 text-left text-[13px] text-[var(--text-lo)] transition-colors hover:bg-[var(--active)] hover:text-[var(--text-hi)]"
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

      <nav className="space-y-0.5 text-[13px]">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          const isFocus = link.href === "/focus";
          const focusLive = isFocus && (currentTaskId || isProcessing);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors",
                isActive
                  ? "bg-[var(--active)] text-[var(--text-hi)]"
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
                    (link.badge ?? 0) > 0 && link.badgeSeverity === "red"
                      ? "bg-red-500/20 text-red-200"
                      : (link.badge ?? 0) > 0
                        ? "bg-orange-500/20 text-orange-200"
                      : "bg-transparent text-transparent"
                  )}
                >
                  ‼ {link.badge}
                </span>
              )}
              {focusLive && (
                <span className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-medium text-white max-md:hidden">
                  Live
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 max-md:hidden">
        <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-lo)]">
          Calendars
        </div>
        <div className="space-y-1 px-1">
          {feeds.slice(0, 4).map((feed) => (
            <div key={feed.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-[12px] text-[var(--text-lo)]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: feed.color || "var(--accent)" }} />
              <span className="truncate">{feed.name}</span>
            </div>
          ))}
          {feeds.length === 0 && (
            <div className="rounded-md px-2 py-1 text-[12px] text-[var(--text-lo)]">
              No calendars connected
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-1 border-t border-[var(--line-strong)] pt-2">
        <UserMenu />
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-md text-[var(--text-lo)] transition-colors hover:bg-[var(--active)] hover:text-[var(--text-hi)]",
                  pathname === "/settings" && "bg-[var(--active)] text-[var(--text-hi)]"
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
                onClick={onOpenChatOverlay}
                className="grid h-8 w-8 place-items-center rounded-md text-[var(--text-lo)] transition-colors hover:bg-[var(--active)] hover:text-[var(--text-hi)]"
                aria-label="AI Chat"
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </TooltipTrigger>
            <TooltipContent>AI Chat</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
