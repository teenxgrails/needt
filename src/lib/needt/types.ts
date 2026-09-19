/* THE CONTRACT — the shape the new design is built against.
 *
 * Ported from `Content height and label fixes/needt-app/Data.js`, whose shape
 * the handoff records as the production contract. The screens resolve every
 * hue, glyph and name from here, so one fact has exactly one home: one date,
 * one project registry, one calendar registry, one habit list.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THREE-STATE OPTIONAL FIELDS — read this before adding a field.
 *
 * Some of what a task carries has no column in the database yet: `parts`,
 * `entry`, `value`, `earned`, `heat`, `waitsOn`, `movedFrom`. The UI has to
 * ship before the schema catches up, and it has to be able to tell two very
 * different silences apart:
 *
 *   a value (or a non-empty array)  this task has this
 *   `undefined` / absent, or `[]`   this task has none of it — draw the row
 *                                   empty, or leave it out
 *   `null`                          THE PRODUCT DOES NOT HAVE THIS YET —
 *                                   the capability is missing, not the datum
 *
 * The difference is load-bearing for the collapse budget: a `null` row is
 * skipped entirely and costs no height, so nothing draws a hole where a
 * feature has not landed. An `[]` or `undefined` row is a real, empty row and
 * may still earn its space (an affordance to add the first part, say).
 *
 * When a Prisma-backed source lands, a field it cannot yet read returns
 * `null` — never `[]` and never `0` — until its column exists.
 *
 * This convention covers the task capability fields listed above only. Other
 * nullable fields say what they mean at their own declaration: a habit's
 * `project: null` means the habit has no project, and a habit's `quota: null`
 * means it has no quota. Both of those capabilities exist.
 * ───────────────────────────────────────────────────────────────────────── */

/** A project's stage set is the same for every project, by design. */
export type NeedtStageId = "todo" | "doing" | "review" | "done";

/** The lifecycle of a task, as the fixture spells it. */
export type NeedtTaskStatus = "todo" | "in_progress";

/** Which of the semantic hues a seeded row was authored with. */
export type NeedtTone = "info" | "accent" | "success";

/** A day in a fourteen-day record: kept or not. Oldest first. */
export type NeedtDayMark = 0 | 1;

/** One level only — a part can be promoted to a task, never nested further. */
export interface TaskPart {
  title: string;
  done: boolean;
}

/** A person id plus what is awaited from them. */
export interface WaitsOn {
  /** Person id, e.g. "anna". */
  on: string;
  /** What is being waited for, in the user's words. */
  for: string;
}

/**
 * A task.
 *
 * `project` carries the project NAME ("Operations") or an alias ("de"); blocks
 * carry the id ("ops"). One resolver — `project()` in `derive.ts` — reads both.
 * `null` or absent means the task genuinely has no project; it must never fall
 * back to a default, which is how a habit once wore Operations' orange.
 */
export interface NeedtTask {
  id: string;
  title: string;
  /** Project name, id or alias. `null`/absent = no project. */
  project?: string | null;
  tone?: NeedtTone;
  /** Display string when the task is pinned to a time, e.g. "09:00", "Fri". */
  time?: string;
  status?: NeedtTaskStatus;
  /** Authored overdue flag; `isOverdue()` derives the truth from `due`. */
  overdue?: boolean;
  /** Day label, e.g. "4 Sep". */
  due?: string;
  /** Local calendar day of the scheduled block, in YYYY-MM-DD form. */
  scheduledOn?: string;
  /** Exact placement timestamps, used by production mutations. */
  scheduledStart?: string;
  scheduledEnd?: string;
  /** Estimate in minutes. */
  est?: number;
  done: boolean;
  /** The hour the task sits at, 0–24. */
  at?: number;
  /** Belongs to no day: no rail, nothing to move. */
  noSlot?: boolean;
  /** Days untouched; the UI fades past 21. */
  age?: number;
  /** Person id of whoever is carrying it. */
  holder?: string;
  stage?: NeedtStageId;
  /** Id of the task that must close first. */
  blockedBy?: string;

  /* Three-state fields — see the header. `null` = capability not built yet. */

  /** `[]` = no parts, `null` = the product has no parts yet. */
  parts?: TaskPart[] | null;
  /** The two-minute first step. `null` = capability not built yet. */
  entry?: string | null;
  /** Money task: what it is worth. `null` = capability not built yet. */
  value?: number | null;
  /** Money task: what has come in. `null` = capability not built yet. */
  earned?: number | null;
  /** 0–1, drives the category flame. `null` = capability not built yet. */
  heat?: number | null;
  /** Who is being waited on and why. `null` = capability not built yet. */
  waitsOn?: WaitsOn | null;
  /** Where the scheduler moved it from. `null` = capability not built yet. */
  movedFrom?: string | null;
}

/**
 * A project owns its hue and its glyph, and that is the whole colour policy of
 * the product: the colour on screen is the person's own data.
 */
export interface NeedtProject {
  id: string;
  name: string;
  hue: string;
  glyph: string;
}

/** A person owns a hue the same way a project does; the face is that hue. */
export interface NeedtPerson {
  id: string;
  name: string;
  initials: string;
  hue: string;
}

/** An event has no project, so its calendar owns its hue. */
export interface NeedtCalendar {
  name: string;
  /** A CSS colour, usually a token reference such as `var(--accent)`. */
  color: string;
}

/** Calendars are addressed by id: "work", "personal", "family". */
export type NeedtCalendarMap = Readonly<Record<string, NeedtCalendar>>;

/** Named, ordered, and the same for every project. */
export interface NeedtStage {
  id: NeedtStageId;
  name: string;
}

/**
 * A habit. `done` is the last fourteen days, oldest first — the same window
 * the closed-day record uses. A quota habit counts per week; a miss is an
 * empty dot and nothing else.
 */
export interface NeedtHabit {
  id: string;
  title: string;
  /** Time of day, or `null` when the habit is not pinned to one. */
  at: string | null;
  /** Project name/id/alias, or `null` when the habit has no project. */
  project: string | null;
  /** Per-week quota, or `null` when the habit has no quota. */
  quota: number | null;
  done: readonly NeedtDayMark[];
}

/** What a task is waiting on: another task that must close first. */
export interface TaskBlocker {
  kind: "task";
  task: NeedtTask;
}

/** What a task is waiting on: a person, with a reason. */
export interface PersonBlocker {
  kind: "person";
  /** Person id. */
  on: string;
  /** What is awaited. */
  for: string;
}

/** The resolved chain link, or `null` when nothing holds the task up. */
export type NeedtBlocker = TaskBlocker | PersonBlocker;

/** Aliases the seeds already use, e.g. `{ de: "german" }`. */
export type NeedtProjectAliases = Readonly<Record<string, string>>;

/** The whole fixture, as one object. */
export interface NeedtData {
  readonly today: Date;
  readonly MONTHS: readonly string[];
  readonly DOW: readonly string[];
  readonly projects: readonly NeedtProject[];
  readonly projectAliases: NeedtProjectAliases;
  readonly calendars: NeedtCalendarMap;
  readonly habits: readonly NeedtHabit[];
  readonly stages: readonly NeedtStage[];
  readonly people: readonly NeedtPerson[];
  readonly tasks: readonly NeedtTask[];
  readonly closedDays: readonly NeedtDayMark[];
}
