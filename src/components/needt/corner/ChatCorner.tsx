"use client";

/* CHAT — one object, three registers of one voice.
 *
 * Closed it is a pill. Open it is a panel. And between the two there is a
 * third state the product needed and did not have: the ISLAND, where the same
 * object swells for a few seconds to say one thing, then goes back to being a
 * pill.
 *
 * The island is not a toast. A toast is a second object that appears beside
 * the thing it belongs to, which is why toasts are ignored — nothing on screen
 * changed, something new merely arrived. Here the object you already know
 * grows, carries the message, and shrinks: the MOTION is the notice, and the
 * place it happens is the place you would have asked the question from.
 *
 * It is rare on purpose. The first arrives well after the app has settled,
 * they are minutes apart after that, and it never fires while the panel is
 * open or the agent is mid-run. A hint that fires often is an interruption
 * with a friendly voice.
 *
 * Three widths, three heights, one element: 116×40 → 376×54 → 392×496, with
 * the radius travelling with them so all three read as the same object.
 */
import * as React from "react";

import { CornerButton, CornerIconButton } from "./controls";
import { CornerGlyph, CornerPlate } from "./glyphs";
import {
  CHAT_PROMPTS,
  ISLAND_NOTES,
  type IslandNote,
  SEED_CHAT,
  scriptedAgent,
} from "./scripted";
import type { CornerAgent, CornerMessage } from "./types";

/** The pill, closed. */
const PILL = { w: 116, h: 40 };
/** The island, speaking. */
const ISLAND = { w: 376, h: 54 };
/** The panel, open. */
const PANEL = { w: 392, h: 496 };

/** Well after the app has settled. */
const FIRST_NOTE_MS = 9000;
/** Minutes apart after that. */
const EVERY_NOTE_MS = 75000;
/** Long enough to read two lines twice, short enough to be gone before it
 *  becomes furniture. */
const NOTE_LIFE_MS = 7000;

let composed = 0;
function messageId(): string {
  composed += 1;
  return `msg-${composed}`;
}

function ChatIsland({
  note,
  onAct,
  onDismiss,
}: {
  note: IslandNote;
  onAct: () => void;
  onDismiss: () => void;
}) {
  return (
    /* `.ci-body` arrives on a 0.1s delay (`needt-island-in`), so the two lines
       are laid out after the room exists rather than reflowing inside a 116px
       pill as it grows. */
    <div
      className="ci-body"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        height: "100%",
        padding: "0 8px 0 12px",
      }}
    >
      <CornerPlate glyph={note.glyph} tone={note.tone} mix={14} />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          textAlign: "left",
        }}
      >
        <span
          style={{
            font: "var(--type-ui-medium)",
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {note.title}
        </span>
        <span
          style={{
            font: "var(--type-meta)",
            color: "var(--text-tertiary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {note.body}
        </span>
      </span>
      {note.act ? (
        <CornerButton size="sm" variant="flat" onClick={onAct}>
          {note.act}
        </CornerButton>
      ) : null}
      <CornerIconButton label="Dismiss" variant="ghost" onClick={onDismiss}>
        <CornerGlyph name="x" size={13} />
      </CornerIconButton>
    </div>
  );
}

export interface ChatCornerProps {
  /** The shell hides the corner while the room belongs to something else. */
  hidden?: boolean;
  /** Whatever is answering. Defaults to the scripted stand-in. */
  agent?: CornerAgent;
  /** Registers a way for the rest of the corner to say a line into the panel. */
  onReady?: (say: (line: string) => void) => void;
}

export function ChatCorner({ hidden, agent, onReady }: ChatCornerProps) {
  const fallback = React.useRef<CornerAgent | null>(null);
  if (!fallback.current) fallback.current = scriptedAgent();
  const answering = agent ?? fallback.current;

  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] =
    React.useState<readonly CornerMessage[]>(SEED_CHAT);
  const [draft, setDraft] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const [note, setNote] = React.useState<IslandNote | null>(null);

  const seen = React.useRef(0);
  const field = React.useRef<HTMLInputElement>(null);
  const live = React.useRef(true);

  React.useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const send = React.useCallback(
    (text: string) => {
      const line = text.trim();
      if (!line) return;

      setMessages((m) =>
        m.concat([{ id: messageId(), from: "you", text: line }])
      );
      setDraft("");
      setThinking(true);

      void answering.respond(line).then((reply) => {
        if (!live.current) return;
        setThinking(false);
        setMessages((m) =>
          m.concat([{ id: messageId(), from: "needt", text: reply.text }])
        );
        /* When the answer is the agent going to do something, the panel gets
           out of the way of its own hand. */
        if (reply.acting) setOpen(false);
      });
    },
    [answering]
  );

  /* The corner has one voice: a notification's `say` arrives here and is
     indistinguishable from a typed line. */
  React.useEffect(() => {
    onReady?.((line: string) => {
      setOpen(true);
      send(line);
    });
  }, [onReady, send]);

  /* Rare, and never while you are reading the panel or being shown something
     by the agent: the island is for the quiet moments. */
  React.useEffect(() => {
    if (hidden) return undefined;
    let alive = true;

    function surface() {
      if (!alive || open || answering.busy()) return;
      setNote(ISLAND_NOTES[seen.current % ISLAND_NOTES.length]);
      seen.current += 1;
    }

    const first = setTimeout(surface, FIRST_NOTE_MS);
    const every = setInterval(surface, EVERY_NOTE_MS);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(every);
    };
  }, [hidden, open, answering]);

  /* It retracts on its own. */
  React.useEffect(() => {
    if (!note) return undefined;
    const id = setTimeout(() => setNote(null), NOTE_LIFE_MS);
    return () => clearTimeout(id);
  }, [note]);

  React.useEffect(() => {
    if (open && field.current) field.current.focus();
  }, [open]);

  const island = note !== null && !open;
  const size = open ? PANEL : island ? ISLAND : PILL;

  return (
    <div
      data-agent-anchor
      className={`chat-shell${island ? " is-island" : ""}`}
      style={{
        position: "absolute",
        right: 20,
        bottom: 20,
        zIndex: 500,
        opacity: hidden ? 0 : 1,
        transform: hidden ? "scale(0.7)" : "none",
        pointerEvents: hidden ? "none" : "auto",
        transformOrigin: "100% 100%",
        width: size.w,
        height: size.h,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: open ? "var(--radius-4xl)" : "var(--radius-floating)",
        background: "var(--surface-raised)",
        boxShadow: "var(--shadow-floating)",
        transition:
          "width 0.42s var(--ease-pop), height 0.42s var(--ease-pop), border-radius 0.42s var(--ease-pop), opacity 0.18s ease, transform 0.24s var(--ease-pop)",
      }}
    >
      {island && note ? (
        <ChatIsland
          note={note}
          onAct={() => {
            setNote(null);
            setOpen(true);
            if (note.say) send(note.say);
          }}
          onDismiss={() => setNote(null)}
        />
      ) : (
        <button
          type="button"
          data-agent-home
          onClick={() => setOpen(!open)}
          style={{
            flex: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: PILL.h,
            padding: "0 11px",
            border: 0,
            background: "transparent",
            cursor: "default",
            boxShadow: open ? "var(--border) 0 -1px 0 0 inset" : "none",
          }}
        >
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 20,
              height: 20,
              color: open ? "var(--accent)" : "var(--text-secondary)",
            }}
          >
            <CornerGlyph
              name={open ? "sparkles" : "message-circle"}
              size={16}
            />
          </span>
          <span
            style={{
              font: "var(--type-ui-medium)",
              color: "var(--text-primary)",
            }}
          >
            {open ? "Needt" : "Chat"}
          </span>
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {open ? (
              <CornerGlyph name="chevron-down" size={14} />
            ) : (
              <span
                style={{
                  font: "var(--type-meta)",
                  color: "var(--text-muted)",
                }}
              >
                ⌘J
              </span>
            )}
          </span>
        </button>
      )}

      {open ? (
        <>
          <div
            className="scroll-inner"
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              padding: "16px 16px 8px",
            }}
          >
            {messages.map((m) => (
              /* Yours is a raised card on the right, its is prose on the left:
                 a conversation reads as two voices only if they are set
                 differently, and the one you typed is the one that should look
                 like an object you placed. */
              <div
                key={m.id}
                className="chat-line"
                style={{
                  display: "flex",
                  justifyContent: m.from === "you" ? "flex-end" : "flex-start",
                }}
              >
                {m.from === "you" ? (
                  <span
                    style={{
                      maxWidth: "82%",
                      padding: "8px 11px",
                      borderRadius: "var(--radius-lg)",
                      background: "var(--fill-3)",
                      boxShadow: "var(--shadow-ring)",
                      font: "var(--type-ui)",
                      color: "var(--text-primary)",
                      textWrap: "pretty",
                    }}
                  >
                    {m.text}
                  </span>
                ) : (
                  <span
                    style={{
                      display: "flex",
                      gap: 9,
                      alignItems: "flex-start",
                      maxWidth: "94%",
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
                        borderRadius: "var(--radius-sm)",
                        background: "var(--fill-accent)",
                        color: "var(--accent)",
                      }}
                    >
                      <CornerGlyph name="sparkles" size={13} />
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        font: "var(--type-ui)",
                        lineHeight: "21px",
                        color: "var(--text-primary)",
                        textWrap: "pretty",
                      }}
                    >
                      {m.text}
                    </span>
                  </span>
                )}
              </div>
            ))}
            {thinking ? (
              <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                <span
                  aria-hidden="true"
                  style={{
                    flex: "none",
                    display: "grid",
                    placeItems: "center",
                    width: 22,
                    height: 22,
                    borderRadius: "var(--radius-sm)",
                    background: "var(--fill-accent)",
                    color: "var(--accent)",
                  }}
                >
                  <CornerGlyph name="sparkles" size={13} />
                </span>
                <span className="chat-dots" style={{ display: "flex", gap: 4 }}>
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            ) : null}
          </div>

          {/* Three things it can do, offered rather than described. They go
              once you have typed, because a suggestion beside your own
              sentence is noise. */}
          {!draft.trim() && !thinking ? (
            <div
              style={{
                flex: "none",
                display: "flex",
                gap: 6,
                padding: "0 16px 10px",
                flexWrap: "wrap",
              }}
            >
              {CHAT_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => send(prompt.say)}
                  style={{
                    height: 28,
                    padding: "0 11px",
                    border: 0,
                    cursor: "default",
                    borderRadius: "var(--radius-pill)",
                    background: "var(--fill-2)",
                    boxShadow: "var(--shadow-inset-ring)",
                    font: "var(--type-meta-medium)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          ) : null}

          <div
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 11,
              boxShadow: "var(--border) 0 1px 0 0 inset",
            }}
          >
            <input
              ref={field}
              className="nt-input"
              value={draft}
              placeholder="Ask, or tell it what to change"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send(draft);
              }}
              style={{ flex: 1 }}
            />
            {/* `btn-accent` is a 12% fill with the accent as the text colour.
                There is no solid-accent control in this system. */}
            <CornerIconButton
              label="Send"
              variant={draft.trim() ? "accent" : "ghost"}
              onClick={() => send(draft)}
            >
              <CornerGlyph name="arrow-up" size={16} />
            </CornerIconButton>
          </div>
        </>
      ) : null}
    </div>
  );
}
