"use client";

import { useEffect, useState } from "react";

import {
  Bot,
  CalendarDays,
  CheckSquare2,
  Command,
  Focus,
  Mail,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const TIP_DELAY_MS = 4_000;
const TIP_INTERVAL_MS = 3 * 24 * 60 * 60 * 1_000;
const LAST_SHOWN_KEY = "needt:quick-tip:last-shown-at";
const NEXT_TIP_KEY = "needt:quick-tip:next-index";

type TipAction =
  | "command"
  | "calendar"
  | "workspace"
  | "focus"
  | "mail"
  | "chat";

interface QuickTip {
  id: string;
  title: string;
  actionLabel: string;
  action: TipAction;
  body: React.ReactNode;
}

function TipKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-flex rounded border border-[var(--border-control)] bg-[var(--surface-canvas)] px-1.5 py-0.5 text-[11px] font-medium leading-none text-[var(--text-primary)]">
      {children}
    </kbd>
  );
}

const QUICK_TIPS: QuickTip[] = [
  {
    id: "command-palette",
    title: "Quick Tip",
    actionLabel: "Try it",
    action: "command",
    body: (
      <>
        Press <TipKey>⌘K</TipKey> (or <TipKey>Ctrl+K</TipKey>) to open the
        command palette and quickly access features.
      </>
    ),
  },
  {
    id: "workspace-shortcut",
    title: "Quick Tip",
    actionLabel: "Open Workspace",
    action: "workspace",
    body: (
      <>
        Press <TipKey>G</TipKey> then <TipKey>T</TipKey> to review every task
        without leaving the keyboard.
      </>
    ),
  },
  {
    id: "calendar-shortcut",
    title: "Quick Tip",
    actionLabel: "Open calendar",
    action: "calendar",
    body: (
      <>
        Use <TipKey>G</TipKey> then <TipKey>C</TipKey> to jump back to your
        calendar without reaching for the mouse.
      </>
    ),
  },
  {
    id: "mail-shortcut",
    title: "Quick Tip",
    actionLabel: "Open Mail",
    action: "mail",
    body: (
      <>
        Press <TipKey>G</TipKey> then <TipKey>M</TipKey> to jump to your inbox.
      </>
    ),
  },
  {
    id: "ai-shortcut",
    title: "Quick Tip",
    actionLabel: "Open AI Chat",
    action: "chat",
    body: (
      <>
        Press <TipKey>G</TipKey> then <TipKey>A</TipKey> when you want help
        reviewing or reshaping the plan.
      </>
    ),
  },
  {
    id: "focus-shortcut",
    title: "Quick Tip",
    actionLabel: "Open Focus",
    action: "focus",
    body: (
      <>
        Need one calm next step? Use <TipKey>G</TipKey> then <TipKey>F</TipKey>
        to jump straight into Focus.
      </>
    ),
  },
];

function getNextTipIndex(): number {
  const stored = Number(localStorage.getItem(NEXT_TIP_KEY));
  return Number.isInteger(stored) && stored >= 0
    ? stored % QUICK_TIPS.length
    : 0;
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

export function CommandPaletteHint() {
  const [tipIndex, setTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const lastShownAt = Number(localStorage.getItem(LAST_SHOWN_KEY));
    if (
      Number.isFinite(lastShownAt) &&
      Date.now() - lastShownAt < TIP_INTERVAL_MS
    ) {
      return;
    }

    const nextTipIndex = getNextTipIndex();
    const timer = window.setTimeout(() => {
      setTipIndex(nextTipIndex);
      setIsVisible(true);
      localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
      localStorage.setItem(
        NEXT_TIP_KEY,
        String((nextTipIndex + 1) % QUICK_TIPS.length)
      );
    }, TIP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  const dismissHint = () => setIsVisible(false);

  const runTipAction = () => {
    const tip = QUICK_TIPS[tipIndex];
    dismissHint();

    if (tip.action === "command") {
      openCommandPalette();
      return;
    }

    const routes: Record<Exclude<TipAction, "command">, string> = {
      calendar: "/calendar",
      workspace: "/tasks",
      focus: "/focus",
      mail: "/mail",
      chat: "/chat",
    };
    window.location.assign(routes[tip.action]);
  };

  if (!isVisible) return null;

  const tip = QUICK_TIPS[tipIndex];
  const icons: Record<TipAction, typeof Command> = {
    command: Command,
    calendar: CalendarDays,
    workspace: CheckSquare2,
    focus: Focus,
    mail: Mail,
    chat: Bot,
  };
  const Icon = icons[tip.action];

  return (
    <aside
      aria-live="polite"
      aria-label={tip.title}
      className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-50 w-[min(22rem,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none lg:bottom-5 lg:right-5"
    >
      <div className="overflow-hidden rounded-lg border border-[var(--border-control)] bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-lg">
        <div className="h-0.5 bg-[var(--color-accent)]" />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface-hover)] text-[var(--color-accent)]">
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              {tip.title}
            </div>
            <button
              type="button"
              onClick={dismissHint}
              className="-mr-1 -mt-1 rounded-md p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none"
              aria-label="Dismiss quick tip"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>

          <p className="mt-3 text-[13px] leading-5 text-[var(--text-secondary)]">
            {tip.body}
          </p>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={dismissHint}
            >
              Dismiss
            </Button>
            <Button type="button" size="sm" onClick={runTipAction}>
              {tip.actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
