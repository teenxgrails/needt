/**
 * Settings derivations (SettingsScreen.jsx), pure so they are tested apart
 * from the sheet: the sections, the `/settings#section` deep link, what Free
 * locks, and the hour / weekday helpers the Your day rows need.
 */
import type { AccentId, ThemeChoice } from "@/lib/needt3/theme";

export type SectionId =
  | "account"
  | "plan"
  | "general"
  | "appearance"
  | "day"
  | "tasks"
  | "focus"
  | "alerts"
  | "keys"
  | "data"
  | "about";

export interface NavItem {
  id: SectionId | "connections";
  name: string;
  /** Opens another screen instead of a section. */
  jump?: string;
}

export const SETTINGS_NAV: readonly {
  group: string;
  items: readonly NavItem[];
}[] = [
  {
    group: "",
    items: [
      { id: "account", name: "Account" },
      { id: "plan", name: "Plan & billing" },
    ],
  },
  {
    group: "Preferences",
    items: [
      { id: "general", name: "General" },
      { id: "appearance", name: "Appearance" },
      { id: "day", name: "Your day" },
      { id: "tasks", name: "Tasks" },
      { id: "focus", name: "Focus" },
      { id: "alerts", name: "Notifications" },
      { id: "keys", name: "Shortcuts" },
    ],
  },
  {
    group: "",
    items: [
      { id: "connections", name: "Connections", jump: "/connections" },
      { id: "data", name: "Data & privacy" },
    ],
  },
  { group: "", items: [{ id: "about", name: "About" }] },
];

export const SECTION_TITLES: Record<SectionId, string> = {
  general: "General",
  day: "Your day",
  tasks: "Tasks",
  focus: "Focus",
  appearance: "Appearance",
  alerts: "Notifications",
  keys: "Shortcuts",
  data: "Data & privacy",
  account: "Account",
  plan: "Plan & billing",
  about: "About",
};

/** Sections the arrow keys walk through (jump rows leave Settings). */
export const NAV_FLAT: readonly SectionId[] = SETTINGS_NAV.flatMap((g) =>
  g.items.filter((i) => !i.jump).map((i) => i.id as SectionId)
);

export const DEFAULT_SECTION: SectionId = "account";

/** Old settings anchors the app still links to, mapped to a section. */
const HASH_ALIASES: Record<string, SectionId> = {
  billing: "plan",
  subscription: "plan",
  appearance: "appearance",
  notifications: "alerts",
  schedule: "day",
  hours: "day",
  account: "account",
  data: "data",
  shortcuts: "keys",
};

export function isSectionId(value: unknown): value is SectionId {
  return typeof value === "string" && value in SECTION_TITLES;
}

/**
 * `/settings#plan` → "plan". Accepts the section id or an old anchor
 * (`#billing`), with or without the `#`. Anything else is `null`, so the
 * sheet opens on its default.
 */
export function sectionFromHash(hash: string | null | undefined) {
  const key = (hash ?? "").replace(/^#/, "").trim().toLowerCase();
  if (!key) return null;
  if (isSectionId(key)) return key;
  return HASH_ALIASES[key] ?? null;
}

/** The section a store value names, falling back to the default. */
export function sectionOf(value: string | null | undefined): SectionId {
  return sectionFromHash(value) ?? DEFAULT_SECTION;
}

/* ---------- plan and what Free locks ---------- */

/** Pro features are on from the trial through every paid plan. */
export function isPro(kind: string | null | undefined) {
  return !!kind && kind !== "free";
}

/** Blue is yours on Free; the other eight come with Pro (paywall.jsx). */
export const FREE_ACCENT: AccentId = "blue";

export function accentLocked(id: AccentId, kind: string | null | undefined) {
  return !isPro(kind) && id !== FREE_ACCENT;
}

/** The Time theme is Pro; System, Light and Dark are free. */
export function themeLocked(
  theme: ThemeChoice,
  kind: string | null | undefined
) {
  return theme === "time" && !isPro(kind);
}

/** "Plan my day puts first" is a Pro setting. */
export const ORDER_LOCKED_FOR_FREE = true;

export interface PlanInfo {
  name: string;
  badge: string;
}

export function planInfo(kind: string | null | undefined): PlanInfo {
  switch (kind) {
    case "trial":
      return { name: "Pro trial", badge: "Trial" };
    case "monthly":
      return { name: "Pro Monthly", badge: "Pro" };
    case "yearly":
      return { name: "Pro Yearly", badge: "Pro" };
    case "lifetime":
      return { name: "Lifetime", badge: "Lifetime" };
    default:
      return { name: "Free", badge: "Free" };
  }
}

/** Width of the trial bar: days left over the trial length, 0–100. */
export function trialBarPct(daysLeft: number | null, trialDays: number) {
  if (daysLeft === null || trialDays <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((daysLeft / trialDays) * 100)));
}

/* ---------- Your day ---------- */

export const HOUR_OPTIONS: readonly (readonly [string, string])[] = [
  "07:00",
  "08:00",
  "08:30",
  "09:00",
  "10:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
].map((h) => [h, h] as const);

/** The auto-schedule columns are whole hours; "08:30" has no home there. */
export function hourOf(value: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!m || m[2] !== "00") return null;
  return Number(m[1]);
}

export const hourLabel = (hour: number) =>
  `${String(Math.max(0, Math.min(23, hour))).padStart(2, "0")}:00`;

/** Hour options for a select, adding the stored hour if the list lacks it. */
export function hourOptions(current: number | null | undefined) {
  const value =
    current === null || current === undefined ? null : hourLabel(current);
  const base = HOUR_OPTIONS.filter(([v]) => hourOf(v) !== null || v === value);
  if (value && !base.some(([v]) => v === value)) {
    return [...base, [value, value] as const].sort((a, b) =>
      a[0].localeCompare(b[0])
    );
  }
  return base;
}

/** `workDays` is a JSON string of weekday numbers, 0 = Sunday. */
export function parseWorkDays(raw: string | null | undefined): number[] {
  try {
    const v = JSON.parse(raw ?? "[]") as unknown;
    return Array.isArray(v)
      ? v.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= 6)
      : [];
  } catch {
    return [];
  }
}

export const plansWeekends = (days: readonly number[]) =>
  days.includes(0) || days.includes(6);

/** Turn Saturday and Sunday on or off; weekdays are left alone. */
export function withWeekends(days: readonly number[], on: boolean): number[] {
  const weekdays = days.filter((d) => d >= 1 && d <= 5);
  return on ? [...weekdays, 6, 0].sort((a, b) => a - b) : weekdays;
}

export const minutes = (list: readonly number[]) =>
  list.map((m) => [String(m), `${m} min`] as const);

/** One line for the folded "Planning options" row. */
export function planningSummary(opts: {
  weekends: boolean;
  bufferMinutes: number;
}) {
  return `${opts.weekends ? "Plans on weekends" : "Weekdays only"} · ${opts.bufferMinutes}-min gap`;
}

/* ---------- UI-only preferences (UserSettings.prefs) ---------- */

/**
 * Keys the sheet stores in `UserSettings.prefs` (01-data-map open question 6:
 * UI-only keys in one map; anything the server reads gets a typed column).
 * Nothing reads them yet except the screens named next to each; they exist
 * so the choice survives a reload.
 */
export const PREF_DEFAULTS = {
  /** Composer / new-task dialog default (the Composer ignores it in the prototype too). */
  est: "30",
  project: "none",
  parts: true,
  money: true,
  len: "50",
  brk: "10",
  sound: "tick",
  hideAlerts: true,
  snapSound: false,
  /** Stored inverted, as in the prototype: true = the logo stays still. */
  stopMark: false,
  links: "ask",
  offline: true,
  usage: true,
} as const;

export type PrefKey = keyof typeof PREF_DEFAULTS;

export function readPref<K extends PrefKey>(
  prefs: Record<string, unknown> | null | undefined,
  key: K
): (typeof PREF_DEFAULTS)[K] {
  const fallback = PREF_DEFAULTS[key];
  const v = prefs?.[key];
  return (
    typeof v === typeof fallback ? v : fallback
  ) as (typeof PREF_DEFAULTS)[K];
}

/** The accent a person saved, or the default when none or unknown. */
export function accentFromPrefs(
  prefs: Record<string, unknown> | null | undefined
) {
  const v = prefs?.accent;
  return typeof v === "string" ? v : undefined;
}
