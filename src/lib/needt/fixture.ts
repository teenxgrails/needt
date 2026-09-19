/* THE DATA — one place where the facts live.
 *
 * A straight translation of `Content height and label fixes/needt-app/Data.js`
 * into TypeScript. The shape is unchanged and the seed is identical: same 26
 * tasks, 5 projects, 4 people, 4 stages, 4 habits, 3 calendars and the same
 * fourteen closed days.
 *
 * Before that file the kit carried four project registries and the current
 * date typed out in six files. They drifted twice: the month disagreed with
 * the week about which day 1 September was, and a habit wore Operations'
 * orange because a missing project fell back to "ops". Neither was a
 * rendering bug — both were two copies of one fact.
 *
 * So: one date, one project registry, one calendar registry, one habit list.
 * Screens keep their own seed of blocks, because a block's position in a day
 * is composition rather than data — but every hue, glyph and name they use is
 * resolved from here.
 *
 * Nothing derived lives in this file. The chain (`blockerOf`, `unblocks`,
 * `blocking`), the streak and the lookups are pure functions in `derive.ts`.
 */
import { newDateFromYMD } from "@/lib/date-utils";

import type {
  NeedtCalendarMap,
  NeedtData,
  NeedtDayMark,
  NeedtHabit,
  NeedtPerson,
  NeedtProject,
  NeedtProjectAliases,
  NeedtStage,
  NeedtTask,
} from "./types";

/* THE DATE. Everything that says "today" derives from this one value; the
   fixture is a Tuesday in September so the week has a middle to sit in. */
export const today: Date = newDateFromYMD(2026, 8, 1);

export const MONTHS: readonly string[] = Object.freeze([
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]);

export const DOW: readonly string[] = Object.freeze([
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
]);

/* THE PROJECTS. A project owns its hue and its glyph, and that is the whole
   colour policy of the product: the colour on screen is the person's own data.
   `id` is what blocks carry, `name` is what tasks carry — the two ways the
   same project gets referred to, resolved by one lookup. */
export const projects: readonly NeedtProject[] = Object.freeze([
  { id: "ops", name: "Operations", hue: "#FF7A45", glyph: "briefcase" },
  { id: "ds", name: "Design system", hue: "#4C8DFF", glyph: "component" },
  { id: "german", name: "German", hue: "#B072FF", glyph: "graduation-cap" },
  { id: "resale", name: "Resale", hue: "#2FD08A", glyph: "package" },
  { id: "life", name: "Life", hue: "#FFC53D", glyph: "heart" },
]);

/* Aliases the seeds already use. Kept here rather than in the screens, so a
   renamed project is one edit. */
export const projectAliases: NeedtProjectAliases = Object.freeze({
  de: "german",
  personal: "life",
});

/* THE CALENDARS. An event has no project, so its calendar owns its hue — the
   same two slots as a task, different owners. */
export const calendars: NeedtCalendarMap = Object.freeze({
  work: { name: "Work", color: "var(--accent)" },
  personal: { name: "Personal", color: "var(--success)" },
  family: { name: "Family", color: "var(--info)" },
});

/* THE HABITS. done: the last fourteen days, oldest first. A quota habit counts
   per week; a miss is an empty dot and nothing else. */
export const habits: readonly NeedtHabit[] = Object.freeze([
  {
    id: "de",
    title: "German",
    at: "18:00",
    project: "German",
    quota: null,
    done: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1] as NeedtDayMark[],
  },
  {
    id: "walk",
    title: "Walk before work",
    at: "08:15",
    project: null,
    quota: null,
    done: [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0] as NeedtDayMark[],
  },
  {
    id: "gym",
    title: "Gym",
    at: "07:00",
    project: null,
    quota: 3,
    done: [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0] as NeedtDayMark[],
  },
  {
    id: "read",
    title: "Read twenty pages",
    at: null,
    project: null,
    quota: null,
    done: [0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1] as NeedtDayMark[],
  },
]);

/* THE STAGES. Named, ordered, and the same for every project — a per-project
   stage set is a second thing to maintain and nobody maintains it. */
export const stages: readonly NeedtStage[] = Object.freeze([
  { id: "todo", name: "To do" },
  { id: "doing", name: "In progress" },
  { id: "review", name: "In review" },
  { id: "done", name: "Done" },
]);

/* THE PEOPLE. A workspace has more than one person in it, and each of them
   owns a hue the same way a project does — the face is that hue, so who is
   carrying what is read at a glance rather than by name. */
export const people: readonly NeedtPerson[] = Object.freeze([
  { id: "you", name: "You", initials: "MK", hue: "#FF7A45" },
  { id: "anna", name: "Anna", initials: "AN", hue: "#4C8DFF" },
  { id: "tom", name: "Tom", initials: "TM", hue: "#2FD08A" },
  { id: "lena", name: "Lena", initials: "LN", hue: "#B072FF" },
]);

/* THE TASKS. The seed both shells read. A task carries what it is, when it is
   due, how long it takes, and — where it applies — its parts, its money, its
   age and where the scheduler moved it from. */
export const tasks: readonly NeedtTask[] = Object.freeze([
  {
    id: "1",
    title: "Draft the launch brief",
    project: "Operations",
    tone: "info",
    time: "09:00",
    status: "in_progress",
    due: "4 Sep",
    est: 90,
    done: false,
    at: 9,
    holder: "you",
    waitsOn: { on: "anna", for: "the legal sign-off" },
    stage: "doing",
    blockedBy: "6",
    heat: 0.7,
    parts: [
      { title: "Pull last month's numbers", done: true },
      { title: "Write the draft", done: false },
      { title: "Send it for review", done: false },
    ],
  },
  {
    id: "2",
    title: "Send invoices for August",
    project: "Operations",
    tone: "info",
    overdue: true,
    status: "todo",
    due: "31 Aug",
    est: 30,
    done: false,
    at: 9,
    movedFrom: "09:30",
    holder: "anna",
    stage: "doing",
  },
  {
    id: "3",
    title: "Review the form-row spec",
    project: "Design system",
    tone: "accent",
    time: "11:00",
    status: "in_progress",
    due: "2 Sep",
    est: 60,
    done: false,
    at: 11,
    holder: "you",
    stage: "review",
  },
  {
    id: "4",
    title: "German — B2 unit 4",
    project: "German",
    tone: "success",
    time: "18:00",
    status: "todo",
    due: "1 Sep",
    est: 60,
    done: false,
    at: 18,
    holder: "you",
    stage: "todo",
  },
  {
    id: "5",
    title: "Call the accountant back",
    project: null,
    status: "todo",
    est: 20,
    done: false,
    age: 34,
  },
  {
    id: "14",
    title: "Finish the tank graphic",
    project: "Design system",
    tone: "accent",
    status: "todo",
    due: "1 Sep",
    est: 240,
    done: false,
    at: 14,
    entry: "Open the artwork and pick the print side",
    holder: "you",
    waitsOn: { on: "tom", for: "the print files" },
    stage: "doing",
  },
  {
    id: "15",
    title: "Reply to the Berlin buyer",
    project: "Resale",
    status: "todo",
    due: "1 Sep",
    est: 15,
    done: false,
    at: 9,
  },
  {
    id: "16",
    title: "Photograph the shell",
    project: "Resale",
    status: "todo",
    due: "2 Sep",
    est: 40,
    done: false,
    at: 10,
    parts: [
      { title: "Set up the light", done: true },
      { title: "Shoot the front", done: false },
      { title: "Shoot the label", done: false },
    ],
  },
  {
    id: "17",
    title: "Sign the factory quote",
    project: "Operations",
    status: "todo",
    due: "2 Sep",
    est: 45,
    done: false,
    at: 12,
    entry: "Open the quote PDF",
    holder: "tom",
    stage: "review",
    blockedBy: "26",
  },
  {
    id: "18",
    title: "Pick the courier for the batch",
    project: "Operations",
    status: "todo",
    due: "2 Sep",
    est: 30,
    done: false,
    at: 16,
    stage: "todo",
    blockedBy: "17",
  },
  {
    id: "19",
    title: "Read the VAT note",
    status: "todo",
    due: "3 Sep",
    est: 20,
    done: false,
    at: 18,
  },
  {
    id: "20",
    title: "Landing page copy",
    project: "Design system",
    status: "todo",
    due: "3 Sep",
    est: 120,
    done: false,
    at: 10,
    entry: "Write the first sentence",
    holder: "lena",
    stage: "doing",
  },
  {
    id: "21",
    title: "Ship the camera body",
    project: "Resale",
    status: "todo",
    due: "4 Sep",
    est: 45,
    done: false,
    at: 11,
    value: 1600,
  },
  {
    id: "22",
    title: "Write the September brief",
    project: "Operations",
    status: "todo",
    due: "4 Sep",
    est: 45,
    done: false,
    at: 15,
    holder: "anna",
    stage: "todo",
    blockedBy: "1",
  },
  {
    id: "23",
    title: "German — B2 unit 5",
    project: "German",
    status: "todo",
    due: "4 Sep",
    est: 60,
    done: false,
    at: 18,
  },
  {
    id: "24",
    title: "Archive August",
    status: "todo",
    due: "5 Sep",
    est: 20,
    done: false,
  },
  {
    id: "25",
    title: "Two pairs of boots — list them",
    project: "Resale",
    status: "todo",
    due: "6 Sep",
    est: 45,
    done: false,
    at: 11,
    value: 5600,
  },
  {
    id: "26",
    title: "Read the two supplier contracts",
    project: "Operations",
    status: "todo",
    due: "7 Sep",
    est: 60,
    done: false,
    at: 14,
    holder: "tom",
    stage: "doing",
  },
  {
    id: "6",
    title: "Collect last quarter's numbers",
    project: "Operations",
    tone: "info",
    status: "todo",
    due: "3 Sep",
    est: 45,
    done: false,
    at: 9,
    entry: "Export the card statement",
    stage: "doing",
    parts: [
      { title: "Export the card statement", done: false },
      { title: "Export the invoices", done: false },
    ],
  },
  {
    id: "7",
    title: "Pick a courier for the September batch",
    project: null,
    status: "todo",
    est: 45,
    done: false,
  },
  {
    id: "8",
    title: "Write the weekly review",
    project: "Design system",
    tone: "accent",
    time: "Fri",
    status: "todo",
    due: "4 Sep",
    est: 60,
    done: false,
  },
  {
    id: "9",
    title: "Reconcile the card statement",
    project: "Operations",
    tone: "info",
    est: 30,
    done: true,
    stage: "done",
  },
  { id: "10", title: "Book the dentist", project: null, est: 15, done: true },
  /* A money group: one task per thing, a sum on the group, and no slot in the
     day — the thing sells when it sells, so there is nothing to move. */
  {
    id: "11",
    title: "Arc'teryx shell — L",
    project: "Resale",
    status: "in_progress",
    value: 4200,
    earned: 3800,
    done: false,
    noSlot: true,
    heat: 1,
    parts: [
      { title: "Photograph it", done: true },
      { title: "List it", done: true },
      { title: "Ship it", done: false },
    ],
  },
  {
    id: "12",
    title: "Two pairs of boots",
    project: "Resale",
    status: "todo",
    value: 5600,
    done: false,
    noSlot: true,
    heat: 0.5,
    parts: [
      { title: "Photograph them", done: false },
      { title: "List them", done: false },
      { title: "Ship them", done: false },
    ],
  },
  {
    id: "13",
    title: "Camera body",
    project: "Resale",
    status: "todo",
    value: 1600,
    done: false,
    noSlot: true,
    parts: [
      { title: "Photograph it", done: false },
      { title: "List it", done: false },
    ],
  },
]);

/* THE CLOSED DAYS. A day counts as closed when everything with a deadline on
   it was closed — the definition that cannot be farmed by adding empty tasks,
   because an empty day has no deadline in it to close. The last fourteen,
   oldest first, the same window the habits use. */
export const closedDays: readonly NeedtDayMark[] = Object.freeze([
  1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0,
]) as readonly NeedtDayMark[];

/** The whole fixture as one frozen object, the way `window.NEEDT` carried it. */
export const NEEDT: NeedtData = Object.freeze({
  today,
  MONTHS,
  DOW,
  projects,
  projectAliases,
  calendars,
  habits,
  stages,
  people,
  tasks,
  closedDays,
});
