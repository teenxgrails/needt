"use client";

/* THE RAIL — four jobs down one 268px column.
 *
 * Pinned at the top: who and where — the mark, and the one way in. Pinned at
 * the bottom: focus and the account. Everything that grows scrolls between
 * them, so the two things you always need are never scrolled away.
 *
 * WHAT IS IN THE QUEUE, AND WHY. "Unplaced" is tasks waiting for a TIME.
 * `noSlot` tasks are excluded — per PORT.md §2 they belong to no day at all,
 * so there is nothing for the scheduler to place and nothing to drag. That is
 * a class, not a filter someone can relax later.
 *
 * Both facts under "Needs attention" are DERIVED, every render, from the tasks
 * themselves: `isOverdue` reads the deadline, `blockerOf` walks the chain. A
 * written-down "is blocked" disagrees with its own tasks by Thursday.
 */
import * as React from "react";

import {
  LuBug,
  LuCircleHelp,
  LuFileText,
  LuGlobe,
  LuKeyboard,
  LuLogOut,
  LuSettings,
} from "react-icons/lu";

import { ExposureWordmark as Wordmark } from "@/components/needt/wordmark";

import {
  blockerOf,
  isOverdue,
  person as resolvePerson,
} from "@/lib/needt/derive";
import type { NeedtPerson, NeedtTask } from "@/lib/needt/types";

import { RichBlock } from "../RichBlock";
import { rbShape } from "../rb-shape";
import { FocusControl, type FocusSession } from "./FocusControl";
import { MiniMonth } from "./MiniMonth";
import {
  Avatar,
  CommandBar,
  Count,
  Dot,
  Glyph,
  Hung,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  NavRow,
  NavSection,
  SidebarHint,
  TriggerCaret,
} from "./chrome";
import type { NeedtScreenId } from "./screens";

/** A document pinned into the rail. */
export interface PinnedDoc {
  id: string;
  title: string;
}

/** What the account row states. */
export interface ShellAccount {
  name: string;
  initials: string;
  email: string;
  hue?: string;
}

function minutesWord(total: number): string {
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export interface SidebarProps {
  today: Date;
  tasks: readonly NeedtTask[];
  people: readonly NeedtPerson[];
  pinned: readonly PinnedDoc[];
  account: ShellAccount;
  screen: NeedtScreenId;
  onScreen: (screen: NeedtScreenId) => void;
  onOpenPalette: () => void;
  /** Opening a task. Absent when no task editor exists yet: a row that cannot
      open anything says so by not being clickable. */
  onOpenTask?: (task: NeedtTask) => void;
  onOpenKeys: () => void;
  onSignOut: () => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  focus: FocusSession | null;
  onStartFocus: (session: Omit<FocusSession, "elapsed">) => void;
  onStopFocus: () => void;
  dark: boolean;

  /* ── SLOTS ─────────────────────────────────────────────────────────────
     Each of these needs a subsystem that is not built yet. They are props
     rather than stubs so that nothing in the rail pretends to work. */

  /**
   * The drag layer. When it exists it hands each queue row the props that make
   * it a grab handle; until then the rows carry only the `data-drop` hooks a
   * drag layer will look for, and nothing moves.
   */
  dragProps?: ((task: NeedtTask) => React.HTMLAttributes<HTMLElement>) | null;
  /** Sync state has no source yet. `null` draws no second line. */
  accountNote?: string | null;
  /** The day a drag is currently over, as a `year-monthIndex-day` key. */
  dragOverKey?: string | null;
}

export function Sidebar({
  today,
  tasks,
  people,
  pinned,
  account,
  screen,
  onScreen,
  onOpenPalette,
  onOpenTask,
  onOpenKeys,
  onSignOut,
  selectedDate,
  onSelectDate,
  focus,
  onStartFocus,
  onStopFocus,
  dark,
  dragProps = null,
  accountNote = null,
  dragOverKey = null,
}: SidebarProps) {
  const [accountOpen, setAccountOpen] = React.useState(false);

  const queue = React.useMemo(
    () => tasks.filter((task) => !task.done && !task.time && !task.noSlot),
    [tasks]
  );
  const attention = React.useMemo(
    () =>
      tasks.filter(
        (task) =>
          !task.done &&
          (isOverdue(task, today) || blockerOf(task, tasks) !== null)
      ),
    [tasks, today]
  );
  const waiting = React.useMemo(
    () => queue.reduce((sum, task) => sum + (task.est ?? 0), 0),
    [queue]
  );

  const viewer = resolvePerson("you", people);

  return (
    <aside
      style={{
        width: "var(--sidebar-w)",
        flex: "none",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "11px 8px",
        boxSizing: "border-box",
        background: "var(--background)",
        overflow: "hidden",
      }}
    >
      {/* Pinned: who and where. Never scrolls away. */}
      <div
        style={{
          flex: "none",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 48,
            padding: "0 6px",
          }}
        >
          <Wordmark size={40} still={focus !== null} />
        </div>
        <CommandBar label="Find anything" caps="⌘K" onClick={onOpenPalette} />
      </div>

      {/* Scrolls: everything that grows. */}
      <div
        className="scroll-inner"
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          minWidth: 0,
          overflowX: "hidden",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "16px 0",
        }}
      >
        <MiniMonth
          today={today}
          selected={selectedDate}
          onSelect={onSelectDate}
          tasks={tasks}
          dragOverKey={dragOverKey}
        />

        <section
          data-agent-queue
          style={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <NavSection title="Unplaced" action={<Count n={queue.length} />} />
          {/* An unplaced task is the same object it will be on the grid, minus
              its position — so picking one up looks like moving a block, not
              like dragging a list item that turns into one. */}
          {queue.length ? (
            queue.slice(0, 3).map((task) => (
              <article
                key={task.id}
                data-drop="row"
                data-id={task.id}
                onClick={onOpenTask ? () => onOpenTask(task) : undefined}
                style={{ marginBottom: 2 }}
                {...(dragProps ? dragProps(task) : {})}
              >
                <RichBlock
                  block={rbShape(task, { layout: "card", dense: true })}
                  weight="compressed"
                  fit
                  dark={dark}
                />
              </article>
            ))
          ) : (
            <SidebarHint>Everything has a time.</SidebarHint>
          )}
          {queue.length ? (
            <p
              style={{
                margin: "6px 6px 0",
                font: "var(--type-meta)",
                color: "var(--text-muted)",
                textWrap: "pretty",
              }}
            >
              {minutesWord(waiting)} waiting. Drag one onto a day, or onto a
              free slot in the calendar.
            </p>
          ) : null}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <NavSection
            title="Needs attention"
            action={<Count n={attention.length} />}
          />
          {attention.length ? (
            attention.slice(0, 4).map((task) => {
              const late = isOverdue(task, today);
              const blocker = blockerOf(task, tasks);
              const why = late
                ? "Past due"
                : blocker?.kind === "task"
                  ? `Waiting on ${blocker.task.title}`
                  : blocker
                    ? `Waiting on ${blocker.for}`
                    : "";
              return (
                <NavRow
                  key={task.id}
                  label={task.title}
                  icon={
                    <Dot tone={late ? "destructive" : "info"} title={why} />
                  }
                  trailing={
                    <span
                      title={why}
                      style={{
                        font: "var(--type-meta)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {late ? "late" : "held"}
                    </span>
                  }
                  onClick={onOpenTask ? () => onOpenTask(task) : undefined}
                />
              );
            })
          ) : (
            <SidebarHint>Nothing is late and nothing is held.</SidebarHint>
          )}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <NavSection title="Pinned" />
          {pinned.length ? (
            pinned.map((doc) => (
              <NavRow
                key={doc.id}
                label={doc.title}
                icon={<Glyph of={LuFileText} size={20} />}
                active={screen === "docs"}
                onClick={() => onScreen("docs")}
              />
            ))
          ) : (
            <SidebarHint>Nothing pinned yet.</SidebarHint>
          )}
        </section>
      </div>

      {/* Pinned: focus, account. */}
      <div
        style={{
          flex: "none",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          paddingTop: 8,
        }}
      >
        <div data-drop="focus" style={{ display: "flex", width: "100%" }}>
          <FocusControl
            tasks={tasks}
            focus={focus}
            dark={dark}
            onStart={onStartFocus}
            onStop={onStopFocus}
          />
        </div>

        <Hung
          open={accountOpen}
          up
          kind="menu"
          onDismiss={() => setAccountOpen(false)}
          trigger={
            <button
              type="button"
              onClick={() => setAccountOpen((was) => !was)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                height: 40,
                padding: "0 6px",
                border: 0,
                background: "transparent",
                cursor: "default",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--border) 0 -1px 0 0 inset",
                transition: "background-color var(--transition-hover)",
              }}
            >
              <Avatar
                initials={account.initials}
                name={account.name}
                hue={account.hue ?? viewer?.hue}
              />
              <span
                style={{
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    font: "var(--type-meta-medium)",
                    color: "var(--text-primary)",
                  }}
                >
                  {account.name}
                </span>
                {accountNote ? (
                  <span
                    style={{
                      font: "var(--type-meta)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {accountNote}
                  </span>
                ) : null}
              </span>
              <span style={{ marginLeft: "auto", display: "flex" }}>
                <TriggerCaret />
              </span>
            </button>
          }
        >
          <MenuLabel>{account.email}</MenuLabel>
          <MenuItem
            icon={<Glyph of={LuSettings} size={14} />}
            shortcut="⌘,"
            onClick={() => {
              setAccountOpen(false);
              onScreen("settings");
            }}
          >
            Settings
          </MenuItem>
          <MenuItem icon={<Glyph of={LuGlobe} size={14} />}>Language</MenuItem>
          <MenuItem
            icon={<Glyph of={LuKeyboard} size={14} />}
            shortcut="?"
            onClick={() => {
              setAccountOpen(false);
              onOpenKeys();
            }}
          >
            Keyboard shortcuts
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Glyph of={LuCircleHelp} size={14} />}>
            Get help
          </MenuItem>
          <MenuItem icon={<Glyph of={LuBug} size={14} />} destructive>
            Report bug
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            icon={<Glyph of={LuLogOut} size={14} />}
            onClick={() => {
              setAccountOpen(false);
              onSignOut();
            }}
          >
            Log out
          </MenuItem>
        </Hung>
      </div>
    </aside>
  );
}
