/* THE SEAM — where the screens stop caring where the data came from.
 *
 * The new design is built against the fixture, and the fixture's shape is the
 * contract. Screens read through `NeedtDataSource` so that swapping the seed
 * for the database is one binding, not a rewrite: the same methods, the same
 * shapes, the same three-state nulls for the capabilities the schema has not
 * grown yet.
 *
 * Every method is async even though the fixture answers instantly. A sync
 * interface would have to change shape the day the Prisma source lands, and
 * every call site with it.
 *
 * This module must not import Prisma or `@prisma/client`: it is imported by
 * client components, and the contract has to stay describable without a
 * database behind it.
 */
import {
  NEEDT,
  calendars as fixtureCalendars,
  closedDays as fixtureClosedDays,
  habits as fixtureHabits,
  people as fixturePeople,
  projects as fixtureProjects,
  stages as fixtureStages,
  tasks as fixtureTasks,
} from "./fixture";
import type {
  NeedtCalendarMap,
  NeedtDayMark,
  NeedtHabit,
  NeedtPerson,
  NeedtProject,
  NeedtStage,
  NeedtTask,
} from "./types";

/**
 * The reads the screens need. Nothing derived belongs here — the chain, the
 * counts and the streak are pure functions in `derive.ts`, computed from
 * whatever list the caller holds.
 */
export interface NeedtDataSource {
  getTasks(): Promise<readonly NeedtTask[]>;
  getProjects(): Promise<readonly NeedtProject[]>;
  getPeople(): Promise<readonly NeedtPerson[]>;
  getHabits(): Promise<readonly NeedtHabit[]>;
  getStages(): Promise<readonly NeedtStage[]>;
  /** Calendars are addressed by id, so this stays a map rather than a list. */
  getCalendars(): Promise<NeedtCalendarMap>;
  /** The last fourteen days, oldest first; `streak()` reads this. */
  getClosedDays(): Promise<readonly NeedtDayMark[]>;
}

/** The seed source: the fixture, unchanged, behind the interface. */
export const fixtureDataSource: NeedtDataSource = {
  getTasks: async () => fixtureTasks,
  getProjects: async () => fixtureProjects,
  getPeople: async () => fixturePeople,
  getHabits: async () => fixtureHabits,
  getStages: async () => fixtureStages,
  getCalendars: async () => fixtureCalendars,
  getClosedDays: async () => fixtureClosedDays,
};

/** The date the fixture calls "today". Real sources use the real clock. */
export const fixtureToday: Date = NEEDT.today;

/* ── The Prisma seam ──────────────────────────────────────────────────────
 *
 * The database-backed implementation lands here as a second object satisfying
 * the same interface — in its own file (`prisma-source.ts`, server-only), so
 * that no client bundle pulls `@prisma/client` in through this module:
 *
 *   export function prismaDataSource(userId: string): NeedtDataSource { … }
 *
 * Two rules it has to keep, both of them things the fixture already encodes:
 *
 *  1. A capability with no column yet returns `null` — `parts`, `entry`,
 *     `value`, `earned`, `heat`, `waitsOn`, `movedFrom`. Not `[]`, not `0`,
 *     not omitted. `null` is what lets the collapse budget skip the row
 *     instead of drawing an empty one. See the header of `types.ts`.
 *  2. Nothing is derived on the way out. `blockedBy` is stored; "is holding
 *     up 4" is not, and must not become a column.
 *
 * Until then, a screen picks its source once, at the top, and everything
 * below takes the list it is handed.
 */
