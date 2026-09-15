/* THE ADAPTER — the single translation from a stored task to what the block
 * draws. One function, so a task cannot look like two different things in two
 * places.
 *
 * It resolves rather than passes through. The seeds spell a project several
 * ways — the grid by id, the columns by display name, the fixture by alias —
 * and handing the input straight to the component printed `ops` on screen
 * wherever the caller happened to use an id. Resolution is what the adapter is
 * for, and the label always comes from the RESOLVED project.
 *
 * It also keeps the three states of an optional field apart. `null` means the
 * product does not have the capability yet and must cost the collapse budget
 * nothing; `undefined` or `[]` means this task genuinely has none. See the
 * header of `@/lib/needt/types`.
 */
import { project as resolveProject } from "@/lib/needt/derive";
import { projects as fixtureProjects } from "@/lib/needt/fixture";
import type {
  NeedtProject,
  NeedtProjectAliases,
  NeedtTask,
  TaskPart,
  WaitsOn,
} from "@/lib/needt/types";

/** The integrations a block can have come from. A mark, never a decoration. */
export type RbSourceId = "slack" | "google" | "apple" | "linear";

/** The page a block points at, as the page describes itself. */
export interface RbOg {
  site: string;
  title: string;
  mark?: RbSourceId | null;
}

/** How much slack is left before a block you placed yourself comes due. */
export interface RbReserve {
  state: "ok" | "tight" | "late";
  text: string;
}

/** One task inside a group. A group's tasks are the block, not its payload. */
export interface RbGroupTask {
  title: string;
  est: number;
  done: boolean;
}

/**
 * What a surface knows about a task that the stored task does not.
 *
 * These are the facts a calendar grid, a link unfurler or the scheduler adds
 * on the way to the block. They are optional on purpose: a plain `NeedtTask`
 * is a complete input.
 */
export interface RbExtras {
  /** Display start and end; only a grid has them. */
  from: string | null;
  to: string | null;
  /** Where you have to be. */
  place: string | null;
  /** What is late, or what must not slip, in words. */
  risk: string | null;
  /** Why the scheduler put it at this hour. */
  reason: string | null;
  /** A block you placed yourself has no reason — it states its reserve. */
  reserve: RbReserve | null;
  link: string | null;
  attachment: string | null;
  og: RbOg | null;
  note: string | null;
  /** The prototype's second spelling of `note`. */
  context: string | null;
  source: RbSourceId | null;
  /** False means the scheduler may not move it. Absent means it may. */
  movable: boolean;
  /** An event carries a tinted body; a task does not. */
  event: boolean;
  /** A declined event keeps its slot and says nothing. */
  declined: boolean;
  /** "now" is the same red as overdue, before the fact instead of after. */
  priority: "now" | null;
  /** A hue that overrides the project's, for a calendar-owned block. */
  hue: string | null;
  /** A group of tasks of one category holding one stretch. */
  group: readonly RbGroupTask[] | null;
}

/** Everything the adapter accepts: a stored task, plus what a surface adds. */
export type RbInput = NeedtTask & Partial<RbExtras>;

export interface RbShapeContext {
  /** The project registry. Defaults to the fixture's. */
  projects?: readonly NeedtProject[];
  aliases?: NeedtProjectAliases;
  /** Only a grid states an hour; a card has none and a row has a column. */
  layout?: "block" | "card" | "row";
  /** A dense surface drops what it cannot afford before the block sees it. */
  dense?: boolean;
  /** False suppresses the scheduler's reason. */
  reason?: boolean;
}

/** What the component draws. Nothing here needs resolving again. */
export interface RbShape {
  id: number;
  title: string;
  done: boolean;
  holder: string | null;
  waitsOn: WaitsOn | null;
  from: string | null;
  to: string | null;
  est: number | null;
  due: string | null;
  /** The resolved project id, or `null` when the task genuinely has none. */
  project: string | null;
  /** The resolved project NAME. Never the caller's spelling. */
  where: string | null;
  /** The resolved project's glyph. `null` when the task has no project. */
  glyph: string | null;
  hue: string | null;
  source: RbSourceId | null;
  movable: boolean;
  event: boolean;
  declined: boolean;
  noSlot: boolean;
  overdue: boolean;
  priority: "now" | null;
  risk: string | null;
  reason: string | null;
  reserve: RbReserve | null;
  place: string | null;
  link: string | null;
  attachment: string | null;
  og: RbOg | null;
  note: string | null;
  entry: string | null;
  value: number | null;
  earned: number | null;
  age: number | null;
  movedFrom: string | null;
  parts: TaskPart[] | null;
  group: readonly RbGroupTask[] | null;
}

/** `undefined` and `null` both mean "nothing to draw"; keep `null` as `null`. */
function keepNull<T>(value: T | null | undefined): T | null {
  return value === undefined ? null : value;
}

/** A string that is present and not empty, or `null`. */
function text(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  return value === "" ? null : value;
}

/**
 * Translate a stored task into what the block draws.
 *
 * The only place a `NeedtTask` becomes a block. A surface that wants something
 * the task does not carry adds it through `RbExtras`; it never reaches past
 * this function into the component.
 */
export function rbShape(task: RbInput, ctx: RbShapeContext = {}): RbShape {
  const projects = ctx.projects ?? fixtureProjects;
  const resolved = ctx.aliases
    ? resolveProject(task.project, projects, ctx.aliases)
    : resolveProject(task.project, projects);
  const dense = ctx.dense === true;
  /* A card has no hour to state and a row has a column for it, so the time
     span belongs to the grid alone. */
  const onGrid = ctx.layout === "block";
  return {
    id: task.id,
    title: task.title,
    done: task.done,
    holder: text(task.holder),
    waitsOn: keepNull(task.waitsOn),
    from: onGrid ? text(task.from) : null,
    to: onGrid ? text(task.to) : null,
    est: task.est ?? null,
    due: text(task.due),
    project: resolved ? resolved.id : null,
    /* The label comes from the RESOLVED project, never from the input. */
    where: dense ? null : resolved ? resolved.name : null,
    glyph: resolved ? resolved.glyph : null,
    hue: text(task.hue) ?? (resolved ? resolved.hue : null),
    source: keepNull(task.source),
    movable: task.movable !== false,
    event: task.event === true,
    declined: task.declined === true,
    noSlot: task.noSlot === true,
    overdue: task.overdue === true,
    priority: keepNull(task.priority),
    risk: text(task.risk),
    reason: ctx.reason === false ? null : text(task.reason),
    reserve: keepNull(task.reserve),
    place: text(task.place),
    link: dense ? null : text(task.link),
    attachment: dense ? null : text(task.attachment),
    og: dense ? null : keepNull(task.og),
    note: dense ? null : (text(task.note) ?? text(task.context)),
    /* Three-state: `null` stays `null`, so the budget skips it without a hole. */
    entry: dense ? null : keepNull(task.entry),
    value: keepNull(task.value),
    earned: keepNull(task.earned),
    age: task.age ?? null,
    movedFrom: keepNull(task.movedFrom),
    parts: task.parts === null ? null : task.parts ? [...task.parts] : [],
    group: keepNull(task.group),
  };
}

/** What the collapse budget reads off a shape. One mapping, not two. */
export function rbFactSource(shape: RbShape) {
  return {
    place: shape.place,
    risk:
      shape.overdue || shape.priority === "now"
        ? (shape.risk ?? (shape.overdue ? "Past due" : "Must not slip"))
        : null,
    reason: shape.movable ? shape.reason : null,
    moved: shape.movedFrom,
    where: shape.where,
    reserve: shape.movable ? null : shape.reserve,
    entry: shape.entry,
    link: shape.link,
    attachment: shape.attachment,
    preview: shape.og,
    note: shape.note,
    tasks: shape.group,
  };
}

/* ── The small formatters ────────────────────────────────────────────────── */

/** A duration in the product's words: "1 h 40 min", "45 min". */
export function rbDur(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/**
 * Money, narrow-space grouped so the digits stay tabular.
 *
 * The separator is U+202F NARROW NO-BREAK SPACE, not the U+2009 THIN SPACE the
 * prototype used. They render identically, but U+2009 is a line-break
 * opportunity, so "\u20AC1 200" was breaking between the thousands and the hundreds
 * inside a block \u2014 measured on the lab page, the only two multi-line text nodes
 * across 102 rendered blocks. Nothing inside a block may wrap to a second line
 * at any height, so the separator has to be one that cannot break.
 */
export function rbMoney(value: number): string {
  return `\u20AC${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F")}`;
}

/**
 * HOW OLD IS IT. A task nobody has touched in three weeks is not urgent and
 * not new — it is furniture, and it should read like furniture. The title
 * steps down the text ladder rather than gaining a badge: a badge would make
 * neglect louder than the work, which is backwards.
 */
export function rbAgeInk(days: number | null): string {
  if (!days || days < 21) return "var(--text-primary)";
  return days < 42 ? "var(--text-tertiary)" : "var(--text-quaternary)";
}
