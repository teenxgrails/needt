"use client";

import * as React from "react";

import { usePathname, useRouter } from "next/navigation";

import { useTheme } from "@/components/providers/ThemeProvider";
import { useAppSession } from "@/components/providers/app-session-context";

import { newDate } from "@/lib/date-utils";
import type { NeedtPerson, NeedtTask } from "@/lib/needt/types";
import { resolveThemeMode } from "@/lib/theme";

import type { ThemeMode } from "@/types/settings";

import { AppShell } from "./AppShell";
import type { PinnedDoc } from "./Sidebar";
import type { NeedtScreenId } from "./screens";

interface ShellPayload {
  now: string;
  tasks: NeedtTask[];
  people: NeedtPerson[];
  pinned: PinnedDoc[];
}

/**
 * Which screen a path belongs to, longest prefix first.
 *
 * The shell has five places and the app has rather more routes. A path with
 * no entry here still renders — the rail simply highlights nothing — which is
 * the honest outcome for a page the design has no tab for, and better than
 * lighting up a tab the user is not on.
 */
const SCREEN_BY_PREFIX: ReadonlyArray<[string, NeedtScreenId]> = [
  ["/today", "today"],
  ["/tasks", "workspace"],
  ["/projects", "workspace"],
  ["/boards", "workspace"],
  ["/calendar", "calendar"],
  ["/pages", "docs"],
  ["/moodboards", "docs"],
  ["/settings", "settings"],
];

/** Where a tab goes. The inverse of the table above, where it is ambiguous. */
const PATH_BY_SCREEN: Record<NeedtScreenId, string> = {
  today: "/today",
  workspace: "/tasks",
  calendar: "/calendar",
  docs: "/pages",
  settings: "/settings",
};

/**
 * Routes that are inside the authenticated route group but are not the
 * application: signing in, resetting a password, first-time setup. Wrapping
 * those in the rail shows a signed-out visitor an empty workspace and a
 * stranger's chrome around the form they came for.
 */
const BARE_PREFIXES = ["/auth", "/setup"] as const;

function isBare(pathname: string): boolean {
  return BARE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function screenForPath(pathname: string): NeedtScreenId | undefined {
  const hit = SCREEN_BY_PREFIX.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return hit?.[1];
}

function initialsOf(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  return letters.toUpperCase() || "YO";
}

/**
 * The design's shell, mounted around the real application.
 *
 * Navigation stays with the router rather than with the shell. The shell can
 * hold its own screen state — that is what the design preview uses — but in
 * the app the URL has to stay the truth, or a deep link, a shared link and
 * the calendar's own OAuth return all land on the wrong screen.
 *
 * Each ported route draws its own `ScreenFrame`, so the page is passed as
 * children and the shell does not frame it a second time.
 */
export function NeedtAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = isBare(pathname);
  const router = useRouter();
  const { theme, setTheme, systemTheme } = useTheme();
  const { data: session } = useAppSession();
  const [data, setData] = React.useState<ShellPayload | null>(null);

  React.useEffect(() => {
    let live = true;
    if (bare) return undefined;
    void fetch("/api/needt/shell", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: ShellPayload | null) => {
        if (live && payload) setData(payload);
      })
      .catch(() => {
        /* The rail is an accessory to the page. A shell that cannot read its
           own data still has to let the page through. */
      });
    return () => {
      live = false;
    };
  }, [bare, pathname]);

  const resolved = resolveThemeMode(
    theme,
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
    systemTheme
  );

  /* ⌘⇧L walks the four grounds in the order the picker lists them. */
  const cycleTheme = React.useCallback(() => {
    const order: ThemeMode[] = ["paper", "warm", "dim", "dark"];
    const at = order.indexOf(theme);
    setTheme(order[(at + 1) % order.length]);
  }, [setTheme, theme]);

  if (bare) return <>{children}</>;

  const name = session?.user?.name ?? "You";
  const screen = screenForPath(pathname);

  return (
    <AppShell
      today={data ? newDate(data.now) : newDate()}
      tasks={data?.tasks ?? []}
      people={data?.people ?? []}
      pinned={data?.pinned ?? []}
      account={{
        name,
        initials: initialsOf(name),
        email: session?.user?.email ?? "",
      }}
      dark={resolved === "dark" || resolved === "dim"}
      onCycleTheme={cycleTheme}
      screen={screen ?? "today"}
      onScreen={(next) => router.push(PATH_BY_SCREEN[next])}
      onOpenTask={(task) =>
        router.push(`/tasks?task=${encodeURIComponent(task.id)}`)
      }
      /* ⌘K and ? already belong to the command palette and the shortcuts
         modal that ship today. Two handlers on one chord fire both. */
      bindKeys={false}
    >
      {children}
    </AppShell>
  );
}
