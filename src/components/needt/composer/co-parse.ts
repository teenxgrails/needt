/* THE PARSE — one line in, one verdict out, and nothing else in this module.
 *
 * It is pure on purpose. The composer is the one place in the product where a
 * sentence becomes a task, so the rule that decides what a typed line means
 * has to be provable without a browser, a clock or a database: text and a
 * reference date in, a typed verdict out. `new Date()` never appears here —
 * `now` is an argument, which is the only reason the fixture's own Tuesday,
 * 1 September 2026, can be asserted against.
 *
 * ONE RUN OF WORDS MEANS ONE THING. Every rule scans only the words no earlier
 * rule has claimed, and the claimed spans come back with the verdict. That is
 * what lets the line under the input be trusted: the underline says WHICH
 * WORDS were taken, the chip says WHAT THEY BECAME, and no letter is ever
 * counted twice.
 *
 * ORDER IS THE SPECIFICITY LADDER. Longest and most specific first, so "by
 * friday" is a deadline before "friday" can be a date, and "every friday" is a
 * cadence before either. Reordering these rules changes what sentences mean.
 *
 * NO SIGILS. `#project` and `@label` are a syntax to learn; the vocabulary is
 * already known — the projects have names — so the words are enough. The
 * vocabulary is an argument too, so a real workspace passes its own projects
 * and the parser never reaches for a global.
 */
import { addCalendarDays, startOfDay } from "@/lib/date-utils";
import {
  dateLabel,
  parseDueDate,
  project as resolveProject,
} from "@/lib/needt/derive";
import {
  MONTHS,
  projectAliases as fixtureAliases,
  projects as fixtureProjects,
} from "@/lib/needt/fixture";
import type {
  NeedtProject,
  NeedtProjectAliases,
  TaskPart,
} from "@/lib/needt/types";

/* ── What a line can become ────────────────────────────────────────────── */

/** The verdict. Inferred, and overrulable — faster than a menu you must read. */
export type CoKind = "task" | "event" | "doc" | "habit";

/** The eight facets a line can carry, named as the chips name them. */
export type CoFacetKind =
  | "date"
  | "time"
  | "duration"
  | "deadline"
  | "repeat"
  | "priority"
  | "project"
  | "label";

export type CoPriority = "urgent" | "important" | "whenever";

/** How often a standing thing comes round. A weekday cadence names its day. */
export type CoCadence = "day" | "week" | "month" | "weekday";

/** Half-open, in characters of the typed line. */
export interface CoSpan {
  readonly from: number;
  readonly to: number;
}

/** A claimed run, for the underlay to mark in the colour of its facet. */
export interface CoMark extends CoSpan {
  readonly kind: CoFacetKind;
}

interface CoFacet {
  /** The words as typed. */
  readonly text: string;
  /** The words as the chip says them back. */
  readonly label: string;
  readonly span: CoSpan;
}

/** A day. `on` is midnight local, so two dates compare as days. */
export interface CoDateFacet extends CoFacet {
  readonly on: Date;
}

/** A clock time, as minutes from midnight. */
export interface CoTimeFacet extends CoFacet {
  readonly minutes: number;
}

/** An estimate, always in minutes however it was typed. */
export interface CoDurationFacet extends CoFacet {
  readonly minutes: number;
}

export interface CoRepeatFacet extends CoFacet {
  readonly cadence: CoCadence;
  /** 0–6, Sunday first, when the cadence is a weekday. */
  readonly weekday: number | null;
}

export interface CoPriorityFacet extends CoFacet {
  readonly level: CoPriority;
}

export interface CoProjectFacet extends CoFacet {
  readonly project: NeedtProject;
}

export interface CoLabelFacet extends CoFacet {
  readonly name: string;
}

/**
 * Everything the line said. `null` means the line did not say it — never that
 * the app supplied something; what the app supplies is the composer's business
 * and it says so by drawing that chip grey.
 */
export interface CoFound {
  readonly date: CoDateFacet | null;
  readonly time: CoTimeFacet | null;
  readonly duration: CoDurationFacet | null;
  readonly deadline: CoDateFacet | null;
  readonly repeat: CoRepeatFacet | null;
  readonly priority: CoPriorityFacet | null;
  readonly project: CoProjectFacet | null;
  /** Several labels are ordinary; one project is not. */
  readonly labels: readonly CoLabelFacet[];
}

export interface CoParse {
  /** The line as typed, unchanged. */
  readonly text: string;
  /** The title: the sentence you wrote, whitespace-normalised. */
  readonly title: string;
  /** Everything after a `/` is a part of the task, one level only. */
  readonly parts: readonly string[];
  readonly kind: CoKind;
  readonly found: CoFound;
  /** Claimed runs, in the order they appear in the line. */
  readonly marks: readonly CoMark[];
}

/** The words this workspace knows. Names and aliases, never ids. */
export interface CoVocabulary {
  readonly projects: readonly NeedtProject[];
  readonly aliases: NeedtProjectAliases;
  readonly labels: readonly string[];
}

/** The labels the prototype ships with; a real workspace passes its own. */
export const CO_LABELS: readonly string[] = Object.freeze([
  "errand",
  "money",
  "deep work",
  "admin",
  "reading",
]);

/** The fixture's own registry, so the aliases in a test are the real ones. */
export const CO_VOCABULARY: CoVocabulary = Object.freeze({
  projects: fixtureProjects,
  aliases: fixtureAliases,
  labels: CO_LABELS,
});

/* ── Claiming ──────────────────────────────────────────────────────────── */

const DOW_NAMES: readonly string[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** `mon`, `tues`, `wednes`… — the stems both the date and repeat rules share. */
const DOW_STEMS = "mon|tues|wednes|thurs|fri|satur|sun";

const MONTH_STEMS = MONTHS.join("|");

function escape(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function overlaps(span: CoSpan, taken: readonly CoSpan[]): boolean {
  return taken.some((claim) => span.from < claim.to && claim.from < span.to);
}

/**
 * Run one rule over the words nothing has claimed yet.
 *
 * `make` may refuse a match by returning `null` — an unknown project name is
 * not a project — and the scan then carries on to the next candidate rather
 * than giving up on the whole rule.
 */
function scan<T extends CoFacet>(
  body: string,
  taken: CoSpan[],
  source: RegExp,
  kind: CoFacetKind,
  marks: CoMark[],
  make: (match: RegExpExecArray, span: CoSpan) => T | null
): T | null {
  const re = new RegExp(source.source, "gi");
  let hit = re.exec(body);
  while (hit) {
    const span: CoSpan = { from: hit.index, to: hit.index + hit[0].length };
    if (!overlaps(span, taken)) {
      const facet = make(hit, span);
      if (facet) {
        taken.push(span);
        marks.push({ from: span.from, to: span.to, kind });
        return facet;
      }
    }
    hit = re.exec(body);
  }
  return null;
}

/* ── Days ──────────────────────────────────────────────────────────────── */

/** The next `weekday`, counting today as the nearest one rather than a week off. */
function nextWeekday(weekday: number, now: Date): Date {
  const base = startOfDay(now);
  return addCalendarDays(base, (weekday - base.getDay() + 7) % 7);
}

function weekdayFromStem(stem: string): number {
  /* An empty stem would match every day name — the answer is "no weekday",
     not Sunday. */
  if (!stem) return -1;
  return DOW_NAMES.findIndex((name) => name.startsWith(stem.toLowerCase()));
}

/**
 * A relative day word, or an explicit day and month, resolved against `now`.
 *
 * The explicit form goes through `parseDueDate`, which owns the no-year rule
 * for the whole product: a label more than six months away belongs to the
 * neighbouring year, which is what makes "31 Dec" read correctly on 1 January.
 * Two copies of that rule would disagree every New Year.
 */
function readDay(
  words: string,
  now: Date
): { on: Date; label: string } | null {
  const word = words.toLowerCase().trim();

  const dayMonth = /^(\d{1,2})\s+([a-z]{3,})$/.exec(word);
  const monthDay = /^([a-z]{3,})\s+(\d{1,2})$/.exec(word);
  const explicit = dayMonth
    ? `${dayMonth[1]} ${dayMonth[2].slice(0, 3)}`
    : monthDay
      ? `${monthDay[2]} ${monthDay[1].slice(0, 3)}`
      : null;
  if (explicit) {
    const on = parseDueDate(explicit, now);
    return on ? { on: startOfDay(on), label: dateLabel(on) } : null;
  }

  if (word === "today" || word === "tonight") {
    return {
      on: startOfDay(now),
      label: word === "tonight" ? "Tonight" : "Today",
    };
  }
  if (word === "tomorrow" || word === "tom") {
    return { on: addCalendarDays(startOfDay(now), 1), label: "Tomorrow" };
  }
  if (word === "this weekend") {
    return { on: nextWeekday(6, now), label: "This weekend" };
  }
  if (word === "next week") {
    /* The Monday after this one — a week named, not seven days counted. */
    return {
      on: nextWeekday(1, addCalendarDays(startOfDay(now), 1)),
      label: "Next week",
    };
  }
  const inDays = /^in (\d+) days?$/.exec(word);
  if (inDays) {
    const days = Number(inDays[1]);
    return {
      on: addCalendarDays(startOfDay(now), days),
      label: `In ${days} day${days === 1 ? "" : "s"}`,
    };
  }

  const weekday = weekdayFromStem(word.replace(/day$/, ""));
  if (weekday >= 0) {
    return {
      on: nextWeekday(weekday, now),
      label: DOW_NAMES[weekday][0].toUpperCase() + DOW_NAMES[weekday].slice(1),
    };
  }
  return null;
}

/* ── Clocks ────────────────────────────────────────────────────────────── */

function readClock(words: string): { minutes: number; label: string } | null {
  const word = words.toLowerCase().replace(/\s+/g, "");
  if (word === "noon") return { minutes: 12 * 60, label: "noon" };
  if (word === "midnight") return { minutes: 0, label: "midnight" };

  const meridiem = /^(\d{1,2})(?::(\d{2}))?(am|pm)$/.exec(word);
  if (meridiem) {
    const hour = Number(meridiem[1]) % 12;
    const minute = meridiem[2] ? Number(meridiem[2]) : 0;
    if (hour > 11 || minute > 59) return null;
    return {
      minutes: (meridiem[3] === "pm" ? hour + 12 : hour) * 60 + minute,
      label: word,
    };
  }

  const twentyFour = /^(\d{1,2}):(\d{2})$/.exec(word);
  if (twentyFour) {
    const hour = Number(twentyFour[1]);
    const minute = Number(twentyFour[2]);
    if (hour > 23 || minute > 59) return null;
    return { minutes: hour * 60 + minute, label: word };
  }
  return null;
}

/** "15:00" — the display string a task carries when it is pinned to a time. */
export function coClock(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  return `${String(hour).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/* ── The parse ─────────────────────────────────────────────────────────── */

const PRIORITIES: Readonly<Record<string, CoPriority>> = Object.freeze({
  urgent: "urgent",
  asap: "urgent",
  important: "important",
  whenever: "whenever",
  sometime: "whenever",
});

const PRIORITY_LABELS: Readonly<Record<CoPriority, string>> = Object.freeze({
  urgent: "Urgent",
  important: "Important",
  whenever: "Whenever",
});

const RE_REPEAT = new RegExp(
  `\\b(every day|every week|every month|every (?:${DOW_STEMS})day|daily|weekly|monthly)\\b`
);
const RE_DAY_WORDS = `today|tonight|tomorrow|tom|this weekend|next week|in \\d+ days?|\\d{1,2} (?:${MONTH_STEMS})[a-z]*|(?:${MONTH_STEMS})[a-z]* \\d{1,2}|(?:${DOW_STEMS})(?:day)?`;
const RE_DEADLINE = new RegExp(`\\b(?:by|due) (${RE_DAY_WORDS})\\b`);
const RE_DURATION = new RegExp(
  "\\bfor (\\d+)\\s?(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\\b"
);
const RE_DATE = new RegExp(`\\b(${RE_DAY_WORDS})\\b`);
const RE_TIME = new RegExp(
  "\\b(?:at )?(\\d{1,2}(?::\\d{2})?\\s?(?:am|pm)|\\d{1,2}:\\d{2}|noon|midnight)\\b"
);
const RE_PRIORITY = new RegExp(
  `\\b(${Object.keys(PRIORITIES).join("|")})\\b`
);

const RE_EVENT =
  /\b(meeting|call with|lunch|dinner|sync|standup|stand-up|1:1|interview)\b/i;
const RE_DOC = /\b(notes?|draft|write up|write-up|doc|document|brief|memo)\b/i;

/**
 * Read a typed line against a reference date.
 *
 * `now` is required and never defaulted to the clock: a parser that reads the
 * time of day cannot be tested, and a composer whose meaning changes at
 * midnight is worse than one that is handed the day it is composing for.
 */
export function coParse(
  text: string,
  now: Date,
  vocabulary: CoVocabulary = CO_VOCABULARY
): CoParse {
  /* Everything after the first `/` is a part, not a sentence. Parts are one
     level: a part belongs to its task and can only ever be promoted. */
  const cut = text.indexOf("/");
  const body = cut < 0 ? text : text.slice(0, cut);
  const parts =
    cut < 0
      ? []
      : text
          .slice(cut + 1)
          .split("/")
          .map((piece) => piece.trim())
          .filter(Boolean);

  const taken: CoSpan[] = [];
  const marks: CoMark[] = [];

  const repeat = scan(body, taken, RE_REPEAT, "repeat", marks, (match, span) => {
    const words = match[1].toLowerCase();
    const weekdayStem = new RegExp(`^every (${DOW_STEMS})day$`).exec(words);
    const cadence: CoCadence = weekdayStem
      ? "weekday"
      : /week/.test(words)
        ? "week"
        : /month/.test(words)
          ? "month"
          : "day";
    return {
      text: match[0],
      label: words,
      span,
      cadence,
      weekday: weekdayStem ? weekdayFromStem(weekdayStem[1]) : null,
    };
  });

  const deadline = scan(
    body,
    taken,
    RE_DEADLINE,
    "deadline",
    marks,
    (match, span) => {
      const day = readDay(match[1], now);
      if (!day) return null;
      /* "by friday", but "by 4 Sep" — a month keeps its capital. */
      const said = /\d/.test(day.label) ? day.label : day.label.toLowerCase();
      return { text: match[0], label: `by ${said}`, span, on: day.on };
    }
  );

  const duration = scan(
    body,
    taken,
    RE_DURATION,
    "duration",
    marks,
    (match, span) => {
      const size = Number(match[1]);
      const hours = /^h/i.test(match[2]);
      return {
        text: match[0],
        label: hours ? `${size} h` : `${size} min`,
        span,
        minutes: hours ? size * 60 : size,
      };
    }
  );

  const date = scan(body, taken, RE_DATE, "date", marks, (match, span) => {
    const day = readDay(match[1], now);
    return day ? { text: match[0], label: day.label, span, on: day.on } : null;
  });

  const time = scan(body, taken, RE_TIME, "time", marks, (match, span) => {
    const clock = readClock(match[1]);
    return clock
      ? { text: match[0], label: clock.label, span, minutes: clock.minutes }
      : null;
  });

  const priority = scan(
    body,
    taken,
    RE_PRIORITY,
    "priority",
    marks,
    (match, span) => {
      const level = PRIORITIES[match[1].toLowerCase()];
      return level
        ? { text: match[0], label: PRIORITY_LABELS[level], span, level }
        : null;
    }
  );

  /* Names and aliases, longest first, so "Design system" is claimed whole
     before any shorter word inside it can be. */
  const projectWords = [
    ...vocabulary.projects.map((each) => each.name),
    ...Object.keys(vocabulary.aliases),
  ].sort((a, b) => b.length - a.length);
  const project = projectWords.length
    ? scan(
        body,
        taken,
        new RegExp(`\\b(${projectWords.map(escape).join("|")})\\b`),
        "project",
        marks,
        (match, span) => {
          const canonical = projectWords.find(
            (word) => word.toLowerCase() === match[1].toLowerCase()
          );
          const found = resolveProject(
            canonical,
            vocabulary.projects,
            vocabulary.aliases
          );
          return found
            ? { text: match[0], label: found.name, span, project: found }
            : null;
        }
      )
    : null;

  /* Labels are the one facet a line may say several times. */
  const labels: CoLabelFacet[] = [];
  if (vocabulary.labels.length) {
    const labelWords = [...vocabulary.labels].sort(
      (a, b) => b.length - a.length
    );
    const source = new RegExp(`\\b(${labelWords.map(escape).join("|")})\\b`);
    const makeLabel = (
      match: RegExpExecArray,
      span: CoSpan
    ): CoLabelFacet | null => {
      const name = labelWords.find(
        (word) => word.toLowerCase() === match[1].toLowerCase()
      );
      return name ? { text: match[0], label: name, span, name } : null;
    };
    let next = scan(body, taken, source, "label", marks, makeLabel);
    while (next) {
      labels.push(next);
      next = scan(body, taken, source, "label", marks, makeLabel);
    }
  }

  /* THE VERDICT. A recurring thing is a habit whatever else it says; a thing
     with a clock is an event; a thing that is written is a document. */
  const kind: CoKind = repeat
    ? "habit"
    : time || RE_EVENT.test(body)
      ? "event"
      : RE_DOC.test(body)
        ? "doc"
        : "task";

  return {
    text,
    /* The title keeps the whole sentence, claimed words and all: the underline
       already says which words were taken, and a title cut down to its
       leftovers reads as something you did not write. */
    title: body.replace(/\s+/g, " ").trim(),
    parts,
    kind,
    found: {
      date,
      time,
      duration,
      deadline,
      repeat,
      priority,
      project,
      labels,
    },
    marks: marks.slice().sort((a, b) => a.from - b.from),
  };
}

/* ── The draft ─────────────────────────────────────────────────────────── */

/**
 * What is about to be made, in the shapes the data contract already uses:
 * `due` is a day label ("4 Sep"), `time` a display clock ("15:00"), `est`
 * minutes, `project` the project NAME a task carries.
 *
 * `assumedDate` is the whole reason this is a separate step. A day nobody
 * named is still a day the task will have, and the composer has to be able to
 * draw it differently from one you asked for — said in colour, assumed in
 * grey. Folding the assumption into `due` would lose that difference.
 */
export interface CoDraft {
  readonly kind: CoKind;
  readonly title: string;
  readonly project: string | null;
  readonly due: string | null;
  readonly on: Date | null;
  readonly assumedDate: boolean;
  readonly time: string | null;
  readonly est: number | null;
  readonly deadline: string | null;
  readonly repeat: CoCadence | null;
  readonly priority: CoPriority | null;
  readonly labels: readonly string[];
  readonly parts: readonly TaskPart[];
  readonly note: string | null;
  readonly files: readonly string[];
}

/** What travels with the task besides the line: the second line, and files. */
export interface CoAttachments {
  readonly note?: string | null;
  readonly files?: readonly string[];
}

export function coDraft(
  parse: CoParse,
  now: Date,
  attachments: CoAttachments = {}
): CoDraft {
  const { found } = parse;
  /* A habit owns a cadence rather than a day, so nothing is assumed for it. */
  const assumedDate = !found.date && !found.repeat;
  const on = found.date ? found.date.on : assumedDate ? startOfDay(now) : null;
  const note = attachments.note?.trim();

  return {
    kind: parse.kind,
    title: parse.title,
    project: found.project ? found.project.project.name : null,
    due: on ? dateLabel(on) : null,
    on,
    assumedDate,
    time: found.time ? coClock(found.time.minutes) : null,
    est: found.duration ? found.duration.minutes : null,
    deadline: found.deadline ? dateLabel(found.deadline.on) : null,
    repeat: found.repeat ? found.repeat.cadence : null,
    priority: found.priority ? found.priority.level : null,
    labels: found.labels.map((label) => label.name),
    parts: parse.parts.map((title): TaskPart => ({ title, done: false })),
    note: note ? note : null,
    files: attachments.files ? [...attachments.files] : [],
  };
}
