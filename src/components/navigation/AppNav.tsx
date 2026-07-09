"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CalendarDays,
  CheckSquare,
  ExternalLink,
  Focus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { useFocusModeStore } from "@/store/focusMode";

import { ThemeToggle } from "./ThemeToggle";
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
  const currentTaskId = useFocusModeStore((state) => state.currentTaskId);
  const isProcessing = useFocusModeStore((state) => state.isProcessing);

  const links = [
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/tasks", label: "Projects & Tasks", icon: CheckSquare },
    { href: "/focus", label: "Focus", icon: Focus },
  ];

  return (
    <aside
      className={cn(
        "motion-sidebar z-20 flex h-screen w-[232px] flex-none flex-col border-r border-[#323234] bg-[#1A1D1E] p-2 text-white max-md:w-[64px] max-md:p-1",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2 px-2 py-1.5">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-[#262627] text-xs font-semibold">
          M
        </span>
        <div className="min-w-0 max-md:hidden">
          <div className="truncate text-sm font-semibold">Mina</div>
          <div className="truncate text-[11px] text-[#9AA0A6]">
            Private planner
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-[1fr_auto] gap-1">
        <Link
          href="/chat"
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-md border border-[#323234] bg-[#262627] px-2.5 py-2 text-[13px] font-medium transition-colors hover:bg-[#2B2F31]",
            pathname === "/chat" && "bg-[#2B2F31] text-white"
          )}
        >
          <Search className="h-4 w-4 flex-none" strokeWidth={1.75} />
          <span className="truncate max-md:hidden">AI Chat</span>
          <kbd className="ml-auto rounded bg-[#1A1D1E] px-1.5 py-0.5 text-[10px] text-[#9AA0A6] max-md:hidden">
            ⌘/
          </kbd>
        </Link>
        <button
          type="button"
          onClick={onOpenChatOverlay}
          className="grid h-9 w-9 place-items-center rounded-md border border-[#323234] bg-[#262627] text-[#9AA0A6] transition-colors hover:bg-[#2B2F31] hover:text-white"
          title="Open compact AI chat"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <button
        type="button"
        onClick={openCommandPalette}
        className="mb-2 flex w-full items-center gap-2 rounded-md border border-[#323234] bg-[#262627] px-2.5 py-1.5 text-left text-[13px] text-[#9AA0A6] transition-colors hover:bg-[#2B2F31] hover:text-white"
      >
        <Search className="h-4 w-4" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate max-md:hidden">
          Search or command
        </span>
        <kbd className="rounded bg-[#1A1D1E] px-1.5 py-0.5 text-[10px] text-[#9AA0A6] max-md:hidden">
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
                  ? "bg-[#2B2F31] text-white"
                  : "text-[#9AA0A6] hover:bg-[#2B2F31] hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 flex-none" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate max-md:hidden">
                {link.label}
              </span>
              {focusLive && (
                <span className="rounded bg-[#3E63DD] px-1.5 py-0.5 text-[10px] font-medium text-white max-md:hidden">
                  Live
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t border-[#323234] pt-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
            pathname === "/settings"
              ? "bg-[#2B2F31] text-white"
              : "text-[#9AA0A6] hover:bg-[#2B2F31] hover:text-white"
          )}
        >
          <Settings className="h-4 w-4" strokeWidth={1.75} />
          <span className="max-md:hidden">Settings</span>
        </Link>
        <div className="flex items-center justify-between gap-2">
          <UserMenu />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              onClick={onOpenChatOverlay}
              className="grid h-8 w-8 place-items-center rounded-md text-[#9AA0A6] transition-colors hover:bg-[#2B2F31] hover:text-white"
              title="AI Chat"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
