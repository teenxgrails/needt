export type ShellAction =
  | "palette"
  | "composer"
  | "sidebar"
  | "settings"
  | "ask"
  | "keyboard"
  | "close";

export interface ShellShortcut {
  group: "Everywhere" | "Go to";
  keys: readonly string[];
  label: string;
  action?: ShellAction;
  href?: string;
  sequence?: string;
  match?: (
    event: Pick<
      KeyboardEvent,
      "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey"
    >
  ) => boolean;
}

const command =
  (key: string) =>
  (
    event: Pick<
      KeyboardEvent,
      "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey"
    >
  ) =>
    (event.metaKey || event.ctrlKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === key;

/** One table drives both the shortcut handler and the Keyboard sheet. */
export const SHELL_SHORTCUTS: readonly ShellShortcut[] = [
  {
    group: "Everywhere",
    keys: ["⌘", "K"],
    label: "Open anything",
    action: "palette",
    match: command("k"),
  },
  {
    group: "Everywhere",
    keys: ["N"],
    label: "New task",
    action: "composer",
    match: (e) =>
      !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "n",
  },
  {
    group: "Everywhere",
    keys: ["⌘", "\\"],
    label: "Toggle sidebar",
    action: "sidebar",
    match: command("\\"),
  },
  {
    group: "Everywhere",
    keys: ["⌘", ","],
    label: "Settings",
    action: "settings",
    match: command(","),
  },
  {
    group: "Everywhere",
    keys: ["⌘", "J"],
    label: "Ask Needt",
    action: "ask",
    match: command("j"),
  },
  {
    group: "Everywhere",
    keys: ["?"],
    label: "Keyboard shortcuts",
    action: "keyboard",
    match: (e) => !e.metaKey && !e.ctrlKey && !e.altKey && e.key === "?",
  },
  {
    group: "Everywhere",
    keys: ["esc"],
    label: "Close what is open",
    action: "close",
    match: (e) => e.key === "Escape",
  },
  {
    group: "Go to",
    keys: ["G", "H"],
    sequence: "gh",
    label: "Home",
    href: "/today",
  },
  {
    group: "Go to",
    keys: ["G", "C"],
    sequence: "gc",
    label: "Calendar",
    href: "/calendar",
  },
  {
    group: "Go to",
    keys: ["G", "T"],
    sequence: "gt",
    label: "Tasks",
    href: "/tasks",
  },
  {
    group: "Go to",
    keys: ["G", "P"],
    sequence: "gp",
    label: "Projects",
    href: "/projects",
  },
  {
    group: "Go to",
    keys: ["G", "D"],
    sequence: "gd",
    label: "Documents",
    href: "/pages",
  },
  {
    group: "Go to",
    keys: ["G", "S"],
    sequence: "gs",
    label: "Settings",
    action: "settings",
  },
];

export function shortcutForSequence(sequence: string) {
  return SHELL_SHORTCUTS.find(
    (shortcut) => shortcut.sequence === sequence.toLowerCase()
  );
}

export function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest(
      "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']"
    )
  );
}
