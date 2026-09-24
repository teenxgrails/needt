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
  documents as fixtureDocuments,
  habits as fixtureHabits,
  people as fixturePeople,
  projects as fixtureProjects,
  stages as fixtureStages,
  tasks as fixtureTasks,
} from "./fixture";
import type {
  NeedtCalendarEntry,
  NeedtCalendarMap,
  NeedtDayMark,
  NeedtDocument,
  NeedtDocumentFilters,
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
  getCalendarEntries(
    start: Date,
    end: Date
  ): Promise<readonly NeedtCalendarEntry[]>;
  /** The last fourteen days, oldest first; `streak()` reads this. */
  getClosedDays(): Promise<readonly NeedtDayMark[]>;
  getDocuments(
    filters?: NeedtDocumentFilters
  ): Promise<readonly NeedtDocument[]>;
}

/** The seed source: the fixture, unchanged, behind the interface. */
export const fixtureDataSource: NeedtDataSource = {
  getTasks: async () => fixtureTasks,
  getProjects: async () => fixtureProjects,
  getPeople: async () => fixturePeople,
  getHabits: async () => fixtureHabits,
  getStages: async () => fixtureStages,
  getCalendars: async () => fixtureCalendars,
  getCalendarEntries: async () =>
    fixtureTasks.map((task) => ({
      ...task,
      kind: "task" as const,
      sourceId: task.id,
    })),
  getClosedDays: async () => fixtureClosedDays,
  getDocuments: async (filters) =>
    fixtureDocuments.filter((document) => {
      if (
        filters?.search &&
        !document.title.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      if (
        filters?.collectionId &&
        document.collection?.id !== filters.collectionId
      ) {
        return false;
      }
      if (
        filters?.tagIds?.length &&
        !filters.tagIds.every((id) =>
          document.tags.some((tag) => tag.id === id)
        )
      ) {
        return false;
      }
      if (filters?.favorites && !document.pinned) return false;
      if (filters?.privateOnly && !document.isPrivate) return false;
      return true;
    }),
};

/** The date the fixture calls "today". Real sources use the real clock. */
export const fixtureToday: Date = NEEDT.today;

/* ── The Prisma seam ──────────────────────────────────────────────────────
 *
 * The database-backed implementation lives in `prisma-source.ts` (server-only),
 * so
 * that no client bundle pulls `@prisma/client` in through this module:
 *
 *   prismaDataSource(userId, authorizedWorkspace): NeedtDataSource
 *
 * It requires a server-resolved `WorkspaceAccess`; a request-supplied workspace
 * id is never authorization. Two mapping rules stay shared with the fixture:
 *
 *  1. A capability with no honest source returns `null`, not `[]` or `0`.
 *     Today that is `heat`; the other design fields have additive schema
 *     storage and map an empty database value to an absent/empty task value.
 *  2. Nothing is derived on the way out. `blockedBy` is stored; "is holding
 *     up 4" is not, and must not become a column.
 */
