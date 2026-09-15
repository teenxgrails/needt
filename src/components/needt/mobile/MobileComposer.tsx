"use client";

/* THE COMPOSER — the line at the bottom, the plus growing the sheet upward.
 *
 * Ported from `Mobile.jsx`'s `MbComposer`. Same object as the desktop's
 * (`../composer`), in the shape a phone already has: the line stays put, the
 * `+` opens the sheet TALLER instead of a menu laid over it, and what the
 * line understood comes back as chips you can clear. The parser itself is
 * the shared `coParse`/`coDraft` — this file only draws the bar, exactly as
 * `Mobile.jsx`'s own composer drew its own chips and its own `+` shelf rather
 * than importing the desktop's `Composer` component.
 *
 * VENDORED CLASSES, NOT REDECLARED. `.co-box`, `.co-shelf`, `.co-shelf-inner`,
 * `.co-shelf-body`, `.co-input` and `.co-go` are the shared sheet's own rules
 * (`src/styles/needt-motion.css`) — PORT.md §4's own cautionary tale is this
 * exact button: a shell that re-declared the two-minute entry's rules ended
 * up with the hover state and no base rule under it. This file wears the
 * same class names the desktop composer wears and adds no rule of its own.
 *
 * ONE DELIBERATE GAP FROM "44PX EVERYWHERE": `.co-go` is a shared, already-
 * vendored 32×32 control (the desktop composer's own send button, unchanged
 * here). Resizing it would mean forking the class this file is bound not to
 * redeclare, so the fix is a larger invisible hit area around it rather than
 * a bigger button — the visible mark stays the one the design system draws.
 */
import * as React from "react";

import type { IconType } from "react-icons";
import {
  LuAlignLeft,
  LuArrowUp,
  LuCalendarClock,
  LuFlag,
  LuHourglass,
  LuListPlus,
  LuPaperclip,
  LuPlus,
  LuRepeat,
  LuTag,
} from "react-icons/lu";

import { today as fixtureToday } from "@/lib/needt/fixture";

import { type CoFacetKind, type CoParse, coParse } from "../composer";
import { Glyph } from "../shell/chrome";
import { COMPOSER_GO_SIZE, COMPOSER_HIT_SIZE } from "./mobile-logic";

const TONES: Readonly<Record<CoFacetKind, string>> = Object.freeze({
  date: "var(--accent)",
  time: "var(--accent)",
  duration: "var(--text-tertiary)",
  deadline: "var(--destructive)",
  repeat: "var(--info)",
  priority: "var(--destructive)",
  project: "var(--accent)",
  label: "var(--success)",
});

interface ShelfEntry {
  readonly label: string;
  readonly glyph: IconType;
  readonly tone: string;
  readonly does: "note" | "file" | "insert";
  readonly insert: string;
}

/* The eight facets, twice: this list and the said-chips below share the same
 * eight names as the desktop's own shelf, so the vocabulary a person learns
 * on one shell still applies on the other. */
const SHELF: readonly ShelfEntry[] = Object.freeze([
  {
    label: "Description",
    glyph: LuAlignLeft,
    tone: TONES.duration,
    does: "note",
    insert: "",
  },
  {
    label: "Attachment",
    glyph: LuPaperclip,
    tone: TONES.duration,
    does: "file",
    insert: "",
  },
  {
    label: "Parts",
    glyph: LuListPlus,
    tone: TONES.duration,
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

export interface MobileComposerDraft {
  text: string;
  parse: CoParse;
  note: string | null;
}

export interface MobileComposerProps {
  open: boolean;
  /** Opens with the shelf already up — the palette's own "capture" entry. */
  shelfOpen?: boolean;
  now?: Date;
  onClose: () => void;
  onCreate: (draft: MobileComposerDraft) => void;
}

function saidChips(
  parse: CoParse
): Array<{ key: string; glyph?: IconType; tone: string; value: string }> {
  const chips: Array<{
    key: string;
    glyph?: IconType;
    tone: string;
    value: string;
  }> = [];
  const { found } = parse;
  if (found.date)
    chips.push({ key: "date", tone: TONES.date, value: found.date.label });
  if (found.time)
    chips.push({ key: "time", tone: TONES.time, value: found.time.label });
  if (found.duration)
    chips.push({
      key: "duration",
      tone: TONES.duration,
      value: found.duration.label,
    });
  if (found.deadline)
    chips.push({
      key: "deadline",
      tone: TONES.deadline,
      value: found.deadline.label,
    });
  if (found.project)
    chips.push({
      key: "project",
      tone: TONES.project,
      value: found.project.label,
    });
  for (const label of found.labels) {
    chips.push({
      key: `label-${label.label}`,
      glyph: LuTag,
      tone: TONES.label,
      value: label.label,
    });
  }
  return chips;
}

export function MobileComposer({
  open,
  shelfOpen = false,
  now = fixtureToday,
  onClose,
  onCreate,
}: MobileComposerProps) {
  const [text, setText] = React.useState("");
  const [more, setMore] = React.useState(shelfOpen);
  const [note, setNote] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (open) {
      /* Focus lands as the sheet finishes travelling — focusing mid-transform
         makes the browser scroll to the field while it is still off screen. */
      const id = window.setTimeout(() => inputRef.current?.focus(), 300);
      return () => window.clearTimeout(id);
    }
    setMore(false);
    setNote(null);
    return undefined;
  }, [open]);

  const parse = coParse(text, now);
  const chips = saidChips(parse);

  function commit() {
    const line = text.trim();
    if (!line) return;
    onCreate({
      text: line,
      parse: coParse(line, now),
      note: note?.trim() ? note.trim() : null,
    });
    setText("");
    setNote(null);
    inputRef.current?.focus();
  }

  return (
    <div
      aria-hidden={!open}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 70,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      <span
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
          opacity: open ? 1 : 0,
          transition: "opacity 0.22s ease",
        }}
      />
      <div
        className={text.trim() ? "co-box is-live" : "co-box"}
        style={{
          position: "absolute",
          left: 8,
          right: 8,
          bottom: 8,
          width: "auto",
          borderRadius: "var(--radius-2xl)",
          transform: open ? "none" : "translateY(calc(100% + 16px))",
          transition: "transform 0.3s cubic-bezier(0.2, 0.78, 0.22, 1)",
        }}
      >
        <div className={more ? "co-shelf is-open" : "co-shelf"}>
          <div className="co-shelf-inner">
            <div className="co-shelf-body">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 2,
                }}
              >
                {SHELF.map((entry) => (
                  <button
                    key={entry.label}
                    type="button"
                    tabIndex={more ? 0 : -1}
                    onClick={() => {
                      setMore(false);
                      if (entry.does === "note") {
                        setNote((current) => current ?? "");
                        return;
                      }
                      if (entry.does === "file") return;
                      setText((current) =>
                        current
                          ? `${current.replace(/\s+$/, "")} ${entry.insert}`
                          : entry.insert
                      );
                      inputRef.current?.focus();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      height: 34,
                      padding: "0 8px 0 6px",
                      border: 0,
                      cursor: "default",
                      borderRadius: "var(--radius-md)",
                      background: "transparent",
                      minWidth: 0,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        flex: "none",
                        display: "grid",
                        placeItems: "center",
                        width: 22,
                        height: 22,
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

        <input
          ref={inputRef}
          className="co-input"
          value={text}
          spellCheck={false}
          placeholder="Call Anna tomorrow 3pm"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
          style={{
            position: "static",
            width: "100%",
            height: 38,
            color: "var(--text-primary)",
          }}
        />

        {note != null ? (
          <textarea
            autoFocus
            value={note}
            rows={2}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What this is about"
            style={{
              width: "100%",
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
        ) : null}

        <div
          style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
        >
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            aria-label={more ? "Fewer attributes" : "More attributes"}
            style={{
              flex: "none",
              display: "grid",
              placeItems: "center",
              width: COMPOSER_HIT_SIZE,
              height: COMPOSER_HIT_SIZE,
              border: 0,
              cursor: "default",
              borderRadius: "var(--radius-md)",
              background: more ? "var(--fill-3)" : "var(--fill-2)",
              color: "var(--text-secondary)",
            }}
          >
            <Glyph of={LuPlus} size={16} />
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
            }}
          >
            {chips.length ? (
              chips.map((chip) => (
                <span
                  key={chip.key}
                  style={{
                    flex: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    height: 26,
                    padding: "0 9px",
                    borderRadius: "var(--radius-pill)",
                    background: `color-mix(in oklab, ${chip.tone} 13%, var(--surface-raised))`,
                    boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${chip.tone} 30%, transparent)`,
                    color: chip.tone,
                  }}
                >
                  {chip.glyph ? <Glyph of={chip.glyph} size={12} /> : null}
                  <span
                    style={{
                      font: "var(--type-meta-medium)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {chip.value}
                  </span>
                </span>
              ))
            ) : (
              <span
                style={{
                  flex: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  height: 26,
                  padding: "0 9px",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--fill-accent)",
                  color: "var(--accent)",
                  font: "var(--type-meta-medium)",
                }}
              >
                Today
              </span>
            )}
          </span>
          {/* The invisible hit-slop around the vendored 32×32 `.co-go` — see
              the file header. The mark stays the design system's own. */}
          <span
            style={{
              flex: "none",
              display: "grid",
              placeItems: "center",
              width: COMPOSER_HIT_SIZE,
              height: COMPOSER_HIT_SIZE,
            }}
          >
            <button
              type="button"
              onClick={commit}
              className="co-go"
              aria-label="Create it"
              style={{ position: "relative" }}
            >
              {/* The slop has to be part of the button, not the span around it.
                  A wrapper that only reserves space looks like a 44px target
                  and behaves like a 32px one: every press in the margin lands
                  on nothing. This child extends the button past its own edge
                  and takes those presses; the drawn mark is untouched. */}
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: -(COMPOSER_HIT_SIZE - COMPOSER_GO_SIZE) / 2,
                }}
              />
              <Glyph of={LuArrowUp} size={16} />
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
