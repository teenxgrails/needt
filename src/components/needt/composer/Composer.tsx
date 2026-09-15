"use client";

/* THE COMPOSER — one line that makes anything.
 *
 * Creating is a hurry and editing is a sit-down, so they are different
 * objects: this is the hurry. You type a sentence, the app shows you what it
 * understood inside the sentence itself, and Enter commits. Nothing here is a
 * form.
 *
 * WHAT IT UNDERSTANDS, AND HOW YOU SEE IT. Every recognised run of words is
 * underlined in the line where you typed it and restated as a chip below. Two
 * readings of one thing: the underline says WHICH WORDS were taken, the chip
 * says WHAT THEY BECAME. A parser that only showed chips would leave you
 * guessing which part of your sentence it ate.
 *
 * THE VERDICT IS SHOWN FIRST — what is about to be made, before what it is
 * made of. It is not a preview after the fact.
 *
 * SAID VERSUS ASSUMED. A chip you caused carries its colour. A chip the app
 * supplied — the day, when you named none — is grey and dimmed, so the row
 * shows at a glance what you decided and what it decided.
 *
 * ONE VOCABULARY. The `+` shelf opens UPWARD, so the line you are typing in
 * never moves, and each of its eight glyphs wears the colour that facet wears
 * as a chip. The shelf and the bar are the same eight facets twice.
 *
 * THE CSS IS NOT HERE. Every `.co-*` class this file writes is vendored into
 * `src/styles/needt-motion.css` by `npm run tokens:sync` — the box and its
 * tube, the arrival, the discharge, the mirror, the shelf's grid rows, the
 * flight. Nothing in this component may restate one of those rules; where a
 * style is written inline it is because the prototype wrote it inline too.
 *
 * NO RECT INSIDE A POINTER PATH (PORT.md §8). The mirror follows the input's
 * horizontal scroll, which reports at display rate; the handler records
 * nothing in state, coalesces into one frame, and writes the transform
 * straight to the element. `getBoundingClientRect` is called exactly once, in
 * a layout effect, to read where the composer arrived from.
 */
import * as React from "react";

import type { IconType } from "react-icons";
import {
  LuAlignLeft,
  LuArrowUp,
  LuAudioLines,
  LuCalendar,
  LuCalendarClock,
  LuCircleCheck,
  LuClock,
  LuFileText,
  LuFlag,
  LuHourglass,
  LuListPlus,
  LuPaperclip,
  LuPlus,
  LuRepeat,
  LuTag,
  LuX,
} from "react-icons/lu";

import { Glyph, IconButton } from "../shell/chrome";
import {
  CO_VOCABULARY,
  type CoDraft,
  type CoFacetKind,
  type CoKind,
  type CoParse,
  type CoVocabulary,
  coDraft,
  coParse,
} from "./co-parse";

/* ── The vocabulary, once ──────────────────────────────────────────────── */

/** The four verdicts, and the glyph each one states itself with. */
const KINDS: Readonly<Record<CoKind, { label: string; glyph: IconType }>> =
  Object.freeze({
    task: { label: "Task", glyph: LuCircleCheck },
    event: { label: "Event", glyph: LuCalendar },
    doc: { label: "Document", glyph: LuFileText },
    habit: { label: "Habit", glyph: LuRepeat },
  });

const KIND_ORDER: readonly CoKind[] = ["task", "event", "doc", "habit"];

/**
 * One colour per facet, and the shelf reads it too. A project is the exception
 * and always will be: its hue is the person's own data, not a palette choice.
 */
const TONES: Readonly<Record<CoFacetKind | "parts" | "file", string>> =
  Object.freeze({
    date: "var(--accent)",
    time: "var(--accent)",
    duration: "var(--text-tertiary)",
    deadline: "var(--destructive)",
    repeat: "var(--info)",
    priority: "var(--destructive)",
    project: "var(--text-tertiary)",
    label: "var(--success)",
    parts: "var(--text-tertiary)",
    file: "var(--text-tertiary)",
  });

/** Everything the line does not say, in the order the shelf shows it. */
interface ShelfEntry {
  readonly label: string;
  readonly glyph: IconType;
  readonly tone: string;
  /** What pressing it does: open the second line, pick a file, or type for you. */
  readonly does: "note" | "file" | "insert";
  readonly insert: string;
}

const SHELF: readonly ShelfEntry[] = Object.freeze([
  {
    label: "Description",
    glyph: LuAlignLeft,
    tone: TONES.parts,
    does: "note",
    insert: "",
  },
  {
    label: "Attachment",
    glyph: LuPaperclip,
    tone: TONES.file,
    does: "file",
    insert: "",
  },
  {
    label: "Parts",
    glyph: LuListPlus,
    tone: TONES.parts,
    does: "insert",
    insert: "/",
  },
  {
    label: "Duration",
    glyph: LuHourglass,
    tone: TONES.duration,
    does: "insert",
    insert: "for 30 min",
  },
  {
    label: "Priority",
    glyph: LuFlag,
    tone: TONES.priority,
    does: "insert",
    insert: "urgent",
  },
  {
    label: "Deadline",
    glyph: LuCalendarClock,
    tone: TONES.deadline,
    does: "insert",
    insert: "by friday",
  },
  /* The prototype's shelf drew Repeat in the accent while its chip is
     `--info`. PORT.md §5 settles it: the glyph wears the colour that facet
     wears as a chip, so the shelf follows the chip. */
  {
    label: "Repeat",
    glyph: LuRepeat,
    tone: TONES.repeat,
    does: "insert",
    insert: "every day",
  },
  {
    label: "Labels",
    glyph: LuTag,
    tone: TONES.label,
    does: "insert",
    insert: "errand",
  },
]);

/* Dictation makes several things at once, so it does not commit several things
   at once: the drafts stack above the line, you strike out the wrong ones, and
   one button accepts what is left. Undoing five things across five screens is
   the alternative, and it is much worse.
   //todo: these three lines are a scripted stand-in, exactly as in the kit —
   PORT.md §9. A real recogniser replaces `hear()` and nothing else. */
const HEARD: readonly string[] = Object.freeze([
  "Finish the Q3 budget tomorrow urgent Operations",
  "Schedule the team sync friday at 10am",
  "Buy milk after work today errand",
]);

/* ── The chip ──────────────────────────────────────────────────────────── */

/**
 * The composer's own chip, and deliberately not the design system's: this one
 * carries a facet's tone at 13% over the raised surface with a 34% ring and
 * the tone as its text, which is how a colour is allowed to appear on a
 * surface here. A solid fill would be the one thing §0 rule 3 forbids.
 */
function CoChip({
  tone,
  glyph,
  said,
  onClear,
  clearLabel,
  children,
}: {
  tone: string;
  glyph?: IconType;
  said: boolean;
  onClear?: () => void;
  clearLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 26,
        padding: onClear ? "0 4px 0 8px" : "0 9px",
        borderRadius: "var(--radius-pill)",
        flex: "none",
        background: said
          ? `color-mix(in oklab, ${tone} 13%, var(--surface-raised))`
          : "var(--fill-2)",
        boxShadow: said
          ? `inset 0 0 0 1px color-mix(in oklab, ${tone} 34%, transparent)`
          : "var(--shadow-inset-ring)",
        color: said ? tone : "var(--text-muted)",
        opacity: said ? 1 : 0.82,
      }}
    >
      {glyph ? <Glyph of={glyph} size={12} /> : null}
      <span style={{ font: "var(--type-meta-medium)", whiteSpace: "nowrap" }}>
        {children}
      </span>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel ?? "Remove"}
          title={clearLabel ?? "Remove"}
          style={{
            display: "grid",
            placeItems: "center",
            width: 18,
            height: 18,
            border: 0,
            borderRadius: 9,
            cursor: "default",
            background: "transparent",
            color: "inherit",
          }}
        >
          <Glyph of={LuX} size={11} />
        </button>
      ) : null}
    </span>
  );
}

/* ── The underlay ──────────────────────────────────────────────────────── */

/**
 * The input's own text is transparent; this draws the same string underneath
 * it with the claimed runs marked. It shares the input's metrics and its
 * scroll position — `.co-input` and `.co-mirror` are one vendored rule for
 * exactly that reason — so the marks sit under the letters they belong to.
 */
const CoUnderlay = React.forwardRef<
  HTMLDivElement,
  { parse: CoParse; projectHue: string }
>(function CoUnderlay({ parse, projectHue }, ref) {
  const out: React.ReactNode[] = [];
  let at = 0;

  parse.marks.forEach((mark, index) => {
    if (mark.from > at) {
      out.push(<span key={`plain${index}`}>{parse.text.slice(at, mark.from)}</span>);
    }
    const tone = mark.kind === "project" ? projectHue : TONES[mark.kind];
    out.push(
      <span
        key={`mark${index}`}
        style={{
          borderRadius: 3,
          padding: "1px 0",
          boxShadow: `inset 0 -2px 0 0 color-mix(in oklab, ${tone} 55%, transparent)`,
          background: `color-mix(in oklab, ${tone} 12%, transparent)`,
        }}
      >
        {parse.text.slice(mark.from, mark.to)}
      </span>
    );
    at = mark.to;
  });

  const tail = parse.text.slice(at);
  const slash = tail.indexOf("/");
  if (slash >= 0) {
    out.push(<span key="tail">{tail.slice(0, slash)}</span>);
    /* The parts are the task in a lower register, so they read as one. */
    out.push(
      <span key="parts" style={{ color: "var(--text-tertiary)" }}>
        {tail.slice(slash)}
      </span>
    );
  } else if (tail) {
    out.push(<span key="tail">{tail}</span>);
  }

  return (
    <div ref={ref} aria-hidden="true" className="co-mirror">
      {out}
    </div>
  );
});

/* ── The shelf ─────────────────────────────────────────────────────────── */

function CoShelf({
  open,
  onPick,
}: {
  open: boolean;
  onPick: (entry: ShelfEntry) => void;
}) {
  return (
    <div
      className={open ? "co-shelf is-open" : "co-shelf"}
      aria-hidden={open ? undefined : "true"}
    >
      <div className="co-shelf-inner">
        <div className="co-shelf-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 2,
            }}
          >
            {SHELF.map((entry) => (
              <button
                key={entry.label}
                type="button"
                tabIndex={open ? 0 : -1}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => onPick(entry)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  height: 30,
                  padding: "0 8px 0 6px",
                  border: 0,
                  cursor: "default",
                  borderRadius: "var(--radius-md)",
                  background: "transparent",
                  minWidth: 0,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = "var(--fill-3)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = "transparent";
                }}
              >
                {/* The glyph carries the facet's colour on a fill of the same
                    hue, which is how every other mark in this product is set. */}
                <span
                  style={{
                    flex: "none",
                    display: "grid",
                    placeItems: "center",
                    width: 20,
                    height: 20,
                    borderRadius: "var(--radius-xs)",
                    color: entry.tone,
                    background: `color-mix(in oklab, ${entry.tone} 12%, transparent)`,
                  }}
                >
                  <Glyph of={entry.glyph} size={13} />
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: "left",
                    font: "var(--type-meta-medium)",
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── The dictation drafts ──────────────────────────────────────────────── */

function CoDrafts({
  drafts,
  now,
  vocabulary,
  onDrop,
  onAccept,
  onCancel,
}: {
  drafts: readonly string[];
  now: Date;
  vocabulary: CoVocabulary;
  onDrop: (index: number) => void;
  onAccept: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        paddingBottom: 4,
      }}
    >
      {drafts.map((line, index) => {
        const parse = coParse(line, now, vocabulary);
        return (
          <span
            key={line}
            className="co-draft"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 38,
              padding: "0 6px 0 11px",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-raised)",
              boxShadow: "var(--shadow-ring)",
            }}
          >
            <Glyph of={KINDS[parse.kind].glyph} size={14} />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                font: "var(--type-ui)",
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {parse.title}
            </span>
            {parse.found.date ? (
              <CoChip tone={TONES.date} said>
                {parse.found.date.label}
              </CoChip>
            ) : null}
            {parse.found.project ? (
              <CoChip tone={parse.found.project.project.hue} said>
                {parse.found.project.label}
              </CoChip>
            ) : null}
            <IconButton
              label="Drop it"
              icon={<Glyph of={LuX} size={13} />}
              onClick={() => onDrop(index)}
            />
          </span>
        );
      })}
      <span
        style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 2 }}
      >
        <button
          type="button"
          onClick={onAccept}
          className="rb-entry"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            height: 30,
            padding: "0 12px",
            border: 0,
            cursor: "default",
            borderRadius: "var(--radius-lg)",
            ...({ "--rb-ink": "var(--accent)" } as React.CSSProperties),
          }}
        >
          <span className="rb-rest" style={{ font: "var(--type-ui-medium)" }}>
            Add {drafts.length}
          </span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            height: 30,
            padding: "0 10px",
            border: 0,
            cursor: "default",
            borderRadius: "var(--radius-lg)",
            background: "transparent",
            font: "var(--type-ui)",
            color: "var(--text-muted)",
          }}
        >
          Cancel
        </button>
      </span>
    </div>
  );
}

/* ── The composer ──────────────────────────────────────────────────────── */

/** Where the composer came from, so one object travels instead of two arriving. */
export interface ComposerOrigin {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface ComposerProps {
  open: boolean;
  onClose: () => void;
  /**
   * The day the line is composed against. Never read from the clock inside:
   * the fixture's today is 1 September 2026, and a composer that disagreed
   * with the screen behind it about what "tomorrow" means would be worse than
   * one that is told.
   */
  now: Date;
  /** What is about to be made, once. */
  onCreate: (draft: CoDraft) => void;
  /** The projects and labels this workspace knows. */
  vocabulary?: CoVocabulary;
  /** The rect the composer grows out of — the chat pill, when there is one. */
  from?: ComposerOrigin | null;
}

export function Composer({
  open,
  onClose,
  now,
  onCreate,
  vocabulary = CO_VOCABULARY,
  from = null,
}: ComposerProps) {
  const [text, setText] = React.useState("");
  const [shelf, setShelf] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [files, setFiles] = React.useState<readonly string[]>([]);
  const [listening, setListening] = React.useState(false);
  const [drafts, setDrafts] = React.useState<readonly string[] | null>(null);
  const [overruled, setOverruled] = React.useState<CoKind | null>(null);
  const [flight, setFlight] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(0);
  const [arc, setArc] = React.useState<React.CSSProperties | null>(null);
  const [landed, setLanded] = React.useState(false);

  const input = React.useRef<HTMLInputElement | null>(null);
  const mirror = React.useRef<HTMLDivElement | null>(null);
  const box = React.useRef<HTMLDivElement | null>(null);
  const picker = React.useRef<HTMLInputElement | null>(null);
  const frame = React.useRef(0);

  const parse = React.useMemo(
    () => coParse(text, now, vocabulary),
    [text, now, vocabulary]
  );
  const kind = overruled ?? parse.kind;
  const projectHue = parse.found.project?.project.hue ?? "var(--accent)";

  /* THE MIRROR FOLLOWS THE INPUT, ONCE A FRAME. A scroll reports at display
     rate; the transform is written straight to the element, so the tree the
     marks live in is not rebuilt 120 times a second to move by a pixel. */
  const followScroll = React.useCallback(() => {
    if (frame.current) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = 0;
      const field = input.current;
      const under = mirror.current;
      if (!field || !under) return;
      under.style.transform = `translateX(${-field.scrollLeft}px)`;
    });
  }, []);

  React.useEffect(
    () => () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
    },
    []
  );

  React.useEffect(() => {
    if (!open) {
      setText("");
      setDrafts(null);
      setOverruled(null);
      setShelf(false);
      setListening(false);
      setNote(null);
      setFiles([]);
      return undefined;
    }
    const id = window.setTimeout(() => input.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [open]);

  /* THE ARC. The pill does not vanish and a panel appear — one object travels.
     The rect is read once, before the first frame, and handed to the vendored
     keyframes as four custom properties. */
  React.useLayoutEffect(() => {
    if (!open) {
      setArc(null);
      setLanded(false);
      return;
    }
    const here = box.current;
    if (!here || !from) {
      setArc({});
      return;
    }
    const to = here.getBoundingClientRect();
    setArc({
      "--co-dx": `${from.left + from.width / 2 - (to.left + to.width / 2)}px`,
      "--co-dy": `${from.top + from.height / 2 - (to.top + to.height / 2)}px`,
      "--co-sx": from.width / to.width,
      "--co-sy": from.height / to.height,
    } as React.CSSProperties);
  }, [open, from]);

  React.useEffect(() => {
    if (!open || landed) return undefined;
    const id = window.setTimeout(() => setLanded(true), 520);
    return () => window.clearTimeout(id);
  }, [open, landed]);

  const cut = React.useCallback((from_: number, to: number) => {
    setText((was) => was.slice(0, from_) + was.slice(to));
    input.current?.focus();
  }, []);

  const insert = React.useCallback((snippet: string) => {
    if (!snippet) return;
    setText((was) => {
      if (!was) return snippet;
      /* Opening a new part is the one snippet that belongs at the end. */
      if (snippet.startsWith("/")) return `${was.replace(/\s+$/, "")} ${snippet}`;
      /* An attribute belongs to the task, so it is written into the sentence
         rather than onto the end of the last part. */
      const at = was.indexOf("/");
      const body = at < 0 ? was : was.slice(0, at);
      const parts = at < 0 ? "" : was.slice(at);
      const joined = body.trim() ? `${body.replace(/\s+$/, "")} ${snippet}` : snippet;
      return parts ? `${joined} ${parts}` : joined;
    });
    window.setTimeout(() => input.current?.focus(), 20);
  }, []);

  const commit = React.useCallback(
    (line?: string) => {
      const said = (line ?? text).trim();
      if (!said) return;
      const draft = coDraft(coParse(said, now, vocabulary), now, {
        note,
        files,
      });
      onCreate(overruled ? { ...draft, kind: overruled } : draft);
      setNote(null);
      setFiles([]);
      /* What was made leaves the line and goes to where it will live. The line
         stays, because nobody captures exactly one thing. */
      setFlight(draft.title);
      window.setTimeout(() => setFlight(null), 460);
      /* Keyed on a counter, so a second create restarts the discharge rather
         than being swallowed by the first one still playing. */
      setSending((n) => n + 1);
      setText("");
      setOverruled(null);
      input.current?.focus();
    },
    [text, now, vocabulary, note, files, overruled, onCreate]
  );

  const hear = React.useCallback(() => {
    setListening(true);
    window.setTimeout(() => {
      setListening(false);
      setDrafts([...HEARD]);
    }, 1700);
  }, []);

  if (!open) return null;

  /* THE VERDICT, THEN WHAT IT IS MADE OF. Order is the argument: the type
     first, then every facet the line said, then what the app supplied. */
  const said: {
    key: string;
    tone: string;
    glyph?: IconType;
    value: string;
    span: { from: number; to: number };
  }[] = [];
  const { found } = parse;
  if (found.date)
    said.push({
      key: "date",
      tone: TONES.date,
      glyph: LuCalendar,
      value: found.date.label,
      span: found.date.span,
    });
  if (found.time)
    said.push({
      key: "time",
      tone: TONES.time,
      glyph: LuClock,
      value: found.time.label,
      span: found.time.span,
    });
  if (found.duration)
    said.push({
      key: "duration",
      tone: TONES.duration,
      glyph: LuHourglass,
      value: found.duration.label,
      span: found.duration.span,
    });
  if (found.deadline)
    said.push({
      key: "deadline",
      tone: TONES.deadline,
      glyph: LuCalendarClock,
      value: found.deadline.label,
      span: found.deadline.span,
    });
  if (found.repeat)
    said.push({
      key: "repeat",
      tone: TONES.repeat,
      glyph: LuRepeat,
      value: found.repeat.label,
      span: found.repeat.span,
    });
  if (found.priority)
    said.push({
      key: "priority",
      tone: TONES.priority,
      glyph: LuFlag,
      value: found.priority.label,
      span: found.priority.span,
    });
  if (found.project)
    said.push({
      key: "project",
      tone: found.project.project.hue,
      value: found.project.label,
      span: found.project.span,
    });
  found.labels.forEach((label) =>
    said.push({
      key: `label:${label.span.from}`,
      tone: TONES.label,
      glyph: LuTag,
      value: label.name,
      span: label.span,
    })
  );

  const slash = text.indexOf("/");

  return (
    <div className="co-scrim" onMouseDown={onClose}>
      <div
        ref={box}
        className={`co-box${arc && !landed ? " co-arrive" : ""}${
          text.trim() || listening ? " is-live" : ""
        }`}
        style={{ visibility: arc ? "visible" : "hidden", ...(arc ?? {}) }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {sending ? (
          <span key={sending} className="co-discharge" aria-hidden="true" />
        ) : null}
        {flight ? <span className="co-flight">{flight}</span> : null}

        {drafts ? (
          <CoDrafts
            drafts={drafts}
            now={now}
            vocabulary={vocabulary}
            onDrop={(index) =>
              setDrafts((all) =>
                all ? all.filter((_, each) => each !== index) : all
              )
            }
            onAccept={() => {
              drafts.forEach((line) =>
                onCreate(coDraft(coParse(line, now, vocabulary), now))
              );
              setDrafts(null);
            }}
            onCancel={() => setDrafts(null)}
          />
        ) : null}

        <CoShelf
          open={shelf}
          onPick={(entry) => {
            setShelf(false);
            if (entry.does === "note") {
              setNote((was) => (was === null ? "" : was));
              return;
            }
            if (entry.does === "file") {
              picker.current?.click();
              return;
            }
            insert(entry.insert);
          }}
        />

        {/* A real picker, because an attachment that does nothing is
            decoration. The files travel with the task on the draft. */}
        <input
          ref={picker}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            const chosen = Array.from(event.target.files ?? []).map(
              (file) => file.name
            );
            if (chosen.length) setFiles((was) => [...was, ...chosen]);
            event.target.value = "";
          }}
        />

        {/* The description: a second line, under the one you are typing, in the
            document body size — it is prose, not an attribute. */}
        {note !== null ? (
          <div
            className="co-note"
            style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
          >
            <span
              aria-hidden="true"
              style={{
                flex: "none",
                display: "grid",
                placeItems: "center",
                width: 20,
                height: 22,
                color: "var(--text-quaternary)",
              }}
            >
              <Glyph of={LuAlignLeft} size={13} />
            </span>
            <textarea
              autoFocus
              value={note}
              rows={2}
              spellCheck={false}
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(event) => {
                /* Escape drops an empty description rather than closing the
                   composer: the shell owns Escape, and this is the one thing
                   in front of it. */
                if (event.key === "Escape" && !note.trim()) {
                  event.stopPropagation();
                  setNote(null);
                }
              }}
              placeholder="What this is about"
              style={{
                flex: 1,
                minWidth: 0,
                margin: 0,
                padding: 0,
                border: 0,
                outline: "none",
                resize: "none",
                background: "transparent",
                font: "var(--type-body)",
                color: "var(--text-primary)",
              }}
            />
            <IconButton
              label="Drop the description"
              icon={<Glyph of={LuX} size={13} />}
              onClick={() => setNote(null)}
            />
          </div>
        ) : null}

        {listening ? (
          <div
            style={{ display: "flex", alignItems: "center", gap: 11, height: 44 }}
          >
            <span className="co-bars" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
                <i key={bar} style={{ animationDelay: `${bar * 0.09}s` }} />
              ))}
            </span>
            <span
              style={{ font: "var(--type-ui)", color: "var(--text-secondary)" }}
            >
              Listening — say everything you need to get done.
            </span>
            <span style={{ marginLeft: "auto" }}>
              <IconButton
                label="Stop"
                icon={<Glyph of={LuX} size={15} />}
                onClick={() => setListening(false)}
              />
            </span>
          </div>
        ) : (
          <div className="co-line">
            <CoUnderlay ref={mirror} parse={parse} projectHue={projectHue} />
            <input
              ref={input}
              className="co-input"
              value={text}
              spellCheck={false}
              placeholder="Call Anna tomorrow 3pm — or say it"
              onChange={(event) => {
                setText(event.target.value);
                followScroll();
              }}
              onScroll={followScroll}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  commit();
                }
              }}
            />
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            position: "relative",
          }}
        >
          <button
            type="button"
            aria-label="Everything the line does not say"
            title="Everything the line does not say"
            aria-expanded={shelf}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => setShelf((was) => !was)}
            style={{
              flex: "none",
              display: "grid",
              placeItems: "center",
              width: 30,
              height: 30,
              border: 0,
              cursor: "default",
              borderRadius: "var(--radius-md)",
              background: shelf ? "var(--fill-3)" : "var(--fill-2)",
              color: "var(--text-secondary)",
            }}
          >
            <Glyph of={LuPlus} size={15} />
          </button>

          <span
            className="scroll-inner"
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 5,
              overflowX: "auto",
              padding: "1px 0",
            }}
          >
            {/* The verdict first: what is about to be made. Pressing it
                overrules the inference, which is faster than choosing from a
                menu you have to read first. */}
            <button
              type="button"
              title="Overrule the verdict"
              onClick={() =>
                setOverruled(
                  KIND_ORDER[(KIND_ORDER.indexOf(kind) + 1) % KIND_ORDER.length]
                )
              }
              style={{
                flex: "none",
                display: "flex",
                border: 0,
                padding: 0,
                background: "transparent",
                cursor: "default",
              }}
            >
              <CoChip
                tone="var(--text-secondary)"
                glyph={KINDS[kind].glyph}
                said={overruled !== null}
              >
                {KINDS[kind].label}
              </CoChip>
            </button>

            {said.map((chip) => (
              <CoChip
                key={chip.key}
                tone={chip.tone}
                glyph={chip.glyph}
                said
                clearLabel={`Drop ${chip.value}`}
                onClear={() => cut(chip.span.from, chip.span.to)}
              >
                {chip.value}
              </CoChip>
            ))}

            {parse.parts.length ? (
              <CoChip
                tone={TONES.parts}
                glyph={LuListPlus}
                said
                clearLabel="Drop the parts"
                onClear={() => cut(slash, text.length)}
              >
                {`0/${parse.parts.length}`}
              </CoChip>
            ) : null}

            {/* Nothing said a day, so the app supplies one — and says so by
                being grey rather than coloured. */}
            {!found.date && !found.repeat ? (
              <CoChip tone={TONES.date} glyph={LuCalendar} said={false}>
                Today
              </CoChip>
            ) : null}
            {!found.project ? (
              <CoChip tone={TONES.project} said={false}>
                No project
              </CoChip>
            ) : null}

            {files.map((file, index) => (
              <CoChip
                key={`${file}${index}`}
                tone={TONES.file}
                glyph={LuPaperclip}
                said
                clearLabel={`Drop ${file}`}
                onClear={() =>
                  setFiles((all) => all.filter((_, each) => each !== index))
                }
              >
                {file}
              </CoChip>
            ))}
          </span>

          <span
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <IconButton
              label="Close"
              icon={<Glyph of={LuX} size={16} />}
              onClick={onClose}
            />
            {text.trim() ? (
              <button
                type="button"
                onClick={() => commit()}
                className="co-go"
                aria-label="Create it"
                title="Create it"
              >
                <Glyph of={LuArrowUp} size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={hear}
                className="co-go"
                aria-label="Dictate"
                title="Say several at once"
              >
                <Glyph of={LuAudioLines} size={16} />
              </button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
