"use client";

/* THE PHONE'S BOTTOM BAR, mounted on the real routes.
 *
 * The design draws navigation twice: a rail for the desktop and a bar for the
 * phone. `AppShell` hides its rail below `lg`, so without this the phone had
 * no shell navigation at all and kept the pre-port dock instead.
 *
 * Only the bar is wired here. The design's phone screens (`MobileShell` and
 * the five screens under `../mobile/`) still render their own fixtures; the
 * live routes underneath this bar are the real ones. Mapping a path to a tab
 * is the shell's job either way, so the table lives with the shell and this
 * component only translates between the two vocabularies.
 */
import * as React from "react";

import { MobileTabBar } from "../mobile/MobileTabBar";
import { type MobileTabId, mobileDueTodayCount } from "../mobile/mobile-logic";
import type { NeedtScreenId } from "./screens";

import type { NeedtTask } from "@/lib/needt/types";

/** The bar's four tabs against the shell's five places. `settings` is reached
 * from the header, not from a tab, so nothing is current while it is open —
 * which is exactly what `MobileTabBar`'s `active: null` means. */
const TAB_BY_SCREEN: Readonly<Record<NeedtScreenId, MobileTabId | null>> = {
  today: "home",
  workspace: "workspace",
  calendar: "calendar",
  docs: "docs",
  settings: null,
};

const SCREEN_BY_TAB: Readonly<Record<MobileTabId, NeedtScreenId>> = {
  home: "today",
  calendar: "calendar",
  workspace: "workspace",
  docs: "docs",
};

export interface NeedtMobileTabsProps {
  /** `undefined` on a route the design has no tab for — nothing lights up,
   * the same honest outcome the rail gives on the desktop. */
  screen: NeedtScreenId | undefined;
  onScreen: (next: NeedtScreenId) => void;
  tasks: readonly NeedtTask[];
  now: Date;
}

export function NeedtMobileTabs({
  screen,
  onScreen,
  tasks,
  now,
}: NeedtMobileTabsProps) {
  return (
    <div
      /* The bar draws itself as a flex row for the phone shell's column. On a
         route it has to hold the bottom of the viewport instead, and the
         route's own padding (`max-sm:pb-…` in the app shell) keeps the last
         row of content clear of it. */
      className="fixed inset-x-0 bottom-0 z-40 sm:hidden"
      data-assistant-avoid
    >
      <MobileTabBar
        active={screen ? TAB_BY_SCREEN[screen] : null}
        onSelect={(tab) => onScreen(SCREEN_BY_TAB[tab])}
        hidden={false}
        homeDueToday={mobileDueTodayCount(tasks, now)}
      />
    </div>
  );
}
