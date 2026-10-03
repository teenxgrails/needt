"use client";

/* THE PROSE FORM — the week's brief as a written document.
 *
 * Ported from `Brief.jsx`'s `ProseBrief` plus its editing chrome
 * (`Editable`, `SlashMenu`, `SelectionBar`). Prose owns the page — `Home.tsx`
 * hides the date plate and week strip here, because a written brief is a
 * document, not a dashboard with a date on it.
 *
 * WHY HAND-ROLLED, NOT TIPTAP. The repository already runs TipTap in
 * `src/components/pages/` and it was evaluated first. It does not fit: that
 * integration is bound to a single flowing document schema plus a Y.js
 * collaboration binding specific to Pages, while a brief is a flat list of
 * heterogeneous OBJECTS — heading, checklist, metric, Marey chart, email
 * draft — that Canvas positions freely and Prose reads as a document. Fitting
 * that object model through TipTap's node schema would mean building a
 * second page-builder rather than reusing the first, for a shape TipTap does
 * not have a node for (a positioned canvas object). The prototype's technique
 * — an UNCONTROLLED `contentEditable` that reconciles with its object only on
 * blur, never on every keystroke — is what keeps React from fighting the
 * caret, and it is the same technique used here.
 *
 * `/` reads the caret's own `getBoundingClientRect()` once, in a `keyup`
 * handler (never inside `pointermove`, so PORT.md §8 does not apply here —
 * this is a discrete keystroke, not a drag), and opens the block menu there.
 * Selecting text raises the mark bar the same way, off `selectionchange`.
 */
import * as React from "react";
import { createPortal } from "react-dom";

import {
  LuBold,
  LuEraser,
  LuItalic,
  LuLink,
  LuList,
  LuStrikethrough,
  LuWandSparkles,
} from "react-icons/lu";

import { Glyph, IconButton, Menu, MenuItem, MenuLabel } from "../shell/chrome";

import { BriefObjectBody, BriefAuthorMark } from "./BriefObjectBody";
import { BRIEF_KIND_ICON } from "./brief-icons";
import { BRIEF_LOG } from "./brief-seed";
import { BRIEF_TOOLS, type BriefObject, type BriefObjectKind, briefAuthor } from "./brief-types";

export interface ProseFormProps {
  objects: readonly BriefObject[];
  onEdit: (id: string, value: string, index?: number) => void;
  onAdd: (kind: BriefObjectKind) => void;
  onRemove: (id: string) => void;
  onToggleItem: (id: string, index: number) => void;
  onCloseWeek?: () => void;
  /** Settings → "Author marks". Defaults to shown. */
  marks?: boolean;
  /** Settings → "Timeline". Defaults to shown. */
  timeline?: boolean;
}

interface SlashAt {
  x: number;
  y: number;
  node: HTMLElement | null;
  id?: string;
}

/** One editable block. Uncontrolled while the caret is inside it — writing
 * back on every keystroke would move the caret to the end of the line — and
 * reconciled with its object on blur and whenever the object's own text
 * changes from somewhere else (an agent writing, say). */
function Editable({
  html,
  placeholder,
  tag: Tag = "div",
  style,
  onCommit,
  onSlash,
  onEnter,
  onEmptyBackspace,
}: {
  html: string;
  placeholder: string;
  tag?: keyof React.JSX.IntrinsicElements;
  style?: React.CSSProperties;
  onCommit: (html: string) => void;
  onSlash?: (at: SlashAt) => void;
  onEnter?: () => void;
  onEmptyBackspace?: () => void;
}) {
  const el = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (el.current && document.activeElement !== el.current && el.current.innerHTML !== (html || "")) {
      el.current.innerHTML = html || "";
    }
  }, [html]);

  return React.createElement(Tag, {
    ref: el,
    className: "prose-block",
    contentEditable: true,
    suppressContentEditableWarning: true,
    "data-ph": placeholder,
    style: { outline: "none", minHeight: "1em", ...style },
    onBlur: () => onCommit((el.current as HTMLElement).innerHTML),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && onEnter) {
        e.preventDefault();
        onCommit((el.current as HTMLElement).innerHTML);
        onEnter();
      }
      if (e.key === "Backspace" && onEmptyBackspace && !(el.current as HTMLElement).innerText.trim()) {
        e.preventDefault();
        onEmptyBackspace();
      }
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key !== "/" || !onSlash) return;
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const r = sel.getRangeAt(0).getBoundingClientRect();
      onSlash({ x: r.left || 0, y: (r.bottom || 0) + 6, node: el.current });
    },
  });
}

/** The block menu — what a brief can hold, in the order a person reaches for
 * them; the same list the Canvas toolbar carries. */
function SlashMenu({
  at,
  onPick,
  onClose,
}: {
  at: SlashAt;
  onPick: (kind: BriefObjectKind) => void;
  onClose: () => void;
}) {
  React.useEffect(() => {
    function away() {
      onClose();
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: Math.min(at.x, window.innerWidth - 248),
        top: Math.min(at.y, window.innerHeight - 300),
        zIndex: "var(--z-dropdown)" as unknown as number,
        width: 240,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <Menu width={240}>
        <MenuLabel>Insert</MenuLabel>
        {BRIEF_TOOLS.map(({ kind, label }) => (
          <MenuItem key={kind} icon={<Glyph of={BRIEF_KIND_ICON[kind]} size={14} />} onClick={() => onPick(kind)}>
            {label}
          </MenuItem>
        ))}
      </Menu>
    </div>,
    document.body
  );
}

/** The mark bar. Appears over a selection and nowhere else; the one
 * pill-radius surface besides a toggle group. */
function SelectionBar({ scope }: { scope: React.RefObject<HTMLElement | null> }) {
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  React.useEffect(() => {
    function read() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return setRect(null);
      const node = sel.anchorNode;
      if (!node || !scope.current || !scope.current.contains(node.nodeType === 1 ? (node as Node) : node.parentNode)) {
        return setRect(null);
      }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (!r.width && !r.height) return setRect(null);
      setRect(r);
    }
    document.addEventListener("selectionchange", read);
    return () => document.removeEventListener("selectionchange", read);
  }, [scope]);

  if (!rect) return null;
  const mark = (cmd: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand(cmd, false);
  };
  const items: readonly [string, React.ComponentType<{ size?: number }>, string][] = [
    ["bold", LuBold, "Bold"],
    ["italic", LuItalic, "Italic"],
    ["strikeThrough", LuStrikethrough, "Strike"],
    ["insertUnorderedList", LuList, "List"],
  ];

  return createPortal(
    <div
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        left: Math.max(8, Math.min(rect.left + rect.width / 2 - 96, window.innerWidth - 200)),
        top: Math.max(8, rect.top - 44),
        zIndex: "var(--z-tooltip)" as unknown as number,
        display: "flex",
        alignItems: "center",
        gap: 2,
        height: 34,
        padding: "0 5px",
        borderRadius: "var(--radius-pill)",
        background: "var(--surface-raised)",
        boxShadow: "var(--shadow-floating)",
      }}
    >
      {items.map(([cmd, Icon, label]) => (
        <IconButton key={cmd} label={label} variant="ghost" icon={<Icon size={14} />} onClick={mark(cmd)} />
      ))}
      <span aria-hidden="true" style={{ width: 1, height: 16, margin: "0 3px", background: "var(--border)" }} />
      <IconButton
        label="Link"
        variant="ghost"
        icon={<Glyph of={LuLink} size={14} />}
        onClick={(e) => {
          e.preventDefault();
          const href = window.prompt("Link to");
          if (href) document.execCommand("createLink", false, href);
        }}
      />
      <IconButton label="Clear marks" variant="ghost" icon={<Glyph of={LuEraser} size={14} />} onClick={mark("removeFormat")} />
    </div>,
    document.body
  );
}

/**
 * The Prose form. `objects` is shared with Canvas — editing here edits the
 * same list, so a line written in Prose is an object on Canvas and back.
 */
export function ProseForm({
  objects,
  onEdit,
  onAdd,
  onRemove,
  onToggleItem,
  onCloseWeek,
  marks = true,
  timeline = true,
}: ProseFormProps) {
  const heading = objects.find((o) => o.kind === "heading" && !o.tail);
  const texts = objects.filter((o) => o.kind === "text" && !o.tail);
  const metric = objects.find((o) => o.kind === "metric" && !o.tail);
  const list = objects.find((o) => o.kind === "checklist" && !o.tail);
  const cards = objects.filter((o) => (o.kind === "card" || o.kind === "email") && !o.tail);
  const tail = objects.filter((o) => o.tail);
  const sheet = React.useRef<HTMLElement | null>(null);
  const [slash, setSlash] = React.useState<SlashAt | null>(null);

  function pick(kind: BriefObjectKind) {
    if (slash?.node) {
      slash.node.innerHTML = slash.node.innerHTML.replace(/\/$/, "");
      if (slash.id) onEdit(slash.id, slash.node.innerHTML);
    }
    setSlash(null);
    onAdd(kind);
  }

  return (
    <article
      ref={sheet as React.RefObject<HTMLElement>}
      className="prose-sheet"
      style={{
        maxWidth: 980,
        width: "100%",
        margin: "12px auto 0",
        minHeight: "100%",
        padding: "40px 72px 0",
        display: "flex",
        flexDirection: "column",
        gap: 21,
      }}
    >
      <SelectionBar scope={sheet} />
      {slash ? <SlashMenu at={slash} onPick={pick} onClose={() => setSlash(null)} /> : null}

      <header style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
        <Editable
          tag="h2"
          html={heading ? (heading.text ?? "") : "Week 36 — the September batch"}
          placeholder="Name the week"
          style={{ margin: 0, flex: 1, minWidth: 0, font: "var(--type-page-title)", color: "var(--text-primary)", textWrap: "pretty" }}
          onCommit={(v) => heading && onEdit(heading.id, v)}
          onSlash={(at) => setSlash({ ...at, id: heading?.id })}
        />
        {metric ? (
          <span style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
            <span style={{ font: "400 30px/32px var(--font-display, var(--font-sans))", color: "var(--accent)", whiteSpace: "nowrap" }}>
              {metric.value}
            </span>
            <span style={{ font: "var(--type-meta)", lineHeight: "14px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              free, Monday to Friday
            </span>
          </span>
        ) : null}
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {texts.map((o) => (
          <Editable
            key={o.id}
            tag="p"
            html={o.text ?? ""}
            placeholder="Write, or press / for a block"
            style={{ margin: 0, font: "var(--type-body)", color: marks ? briefAuthor(o.author).color : "var(--text-primary)", textWrap: "pretty" }}
            onCommit={(v) => onEdit(o.id, v)}
            onSlash={(at) => setSlash({ ...at, id: o.id })}
            onEnter={() => onAdd("text")}
          />
        ))}
      </div>

      {timeline ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>Timeline</span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {BRIEF_LOG.map(([text, when], i) => (
              <div key={when} style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "7px 0 7px 16px", position: "relative" }}>
                <span aria-hidden="true" style={{ position: "absolute", left: 2, top: 14, width: 5, height: 5, borderRadius: 3, background: "var(--text-disabled)" }} />
                {i < BRIEF_LOG.length - 1 ? (
                  <span aria-hidden="true" style={{ position: "absolute", left: 4, top: 20, bottom: -2, width: 1, background: "var(--border)" }} />
                ) : null}
                <span style={{ flex: 1, minWidth: 0, font: "var(--type-body)", color: "var(--text-primary)", textWrap: "pretty" }}>{text}</span>
                <span style={{ flex: "none", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-quaternary)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {when}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {list ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>Open</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {(list.items ?? []).map((item, i) => (
              <span key={`${list.id}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 28 }}>
                <input type="checkbox" checked={item.done} onChange={() => onToggleItem(list.id, i)} style={{ margin: 0 }} />
                <Editable
                  html={item.label}
                  placeholder="A thing to close"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    font: "var(--type-body)",
                    color: item.done ? "var(--text-muted)" : "var(--text-primary)",
                    textDecoration: item.done ? "line-through" : "none",
                    textWrap: "pretty",
                  }}
                  onCommit={(v) => onEdit(list.id, v, i)}
                />
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {cards.length ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>Actions</span>
          {cards.map((o) => (
            <div key={o.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              {marks ? <BriefAuthorMark author={o.author} /> : null}
              <div style={{ flex: 1, minWidth: 0, maxWidth: 460 }}>
                <BriefObjectBody o={o} />
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {tail.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {tail.map((o) =>
            o.kind === "text" || o.kind === "heading" || o.kind === "quote" ? (
              <Editable
                key={o.id}
                tag={o.kind === "heading" ? "h3" : "p"}
                html={o.text ?? ""}
                placeholder={o.kind === "heading" ? "Heading" : "Write, or press / for a block"}
                style={
                  o.kind === "heading"
                    ? { margin: 0, font: "var(--type-card-title)", color: "var(--text-primary)" }
                    : o.kind === "quote"
                      ? { margin: 0, paddingLeft: 11, boxShadow: "var(--border) 1px 0 0 0 inset", font: "var(--type-body)", fontStyle: "italic", color: "var(--text-secondary)" }
                      : { margin: 0, font: "var(--type-body)", color: "var(--text-primary)", textWrap: "pretty" }
                }
                onCommit={(v) => onEdit(o.id, v)}
                onSlash={(at) => setSlash({ ...at, id: o.id })}
                onEnter={() => onAdd("text")}
                onEmptyBackspace={() => onRemove(o.id)}
              />
            ) : (
              <div key={o.id} style={{ maxWidth: 460 }}>
                <BriefObjectBody o={o} onToggleItem={(i) => onToggleItem(o.id, i)} />
              </div>
            )
          )}
        </div>
      ) : null}

      {/* The page keeps going under what is written: a hairline where the
          written part ends, then blank space that takes a caret. */}
      <div
        onClick={() => {
          const last = tail[tail.length - 1];
          if (last && last.kind === "text" && !(last.text ?? "").replace(/<[^>]*>/g, "").trim()) {
            const nodes = document.querySelectorAll<HTMLElement>(".prose-sheet .prose-block");
            if (nodes.length) {
              nodes[nodes.length - 1].focus();
              return;
            }
          }
          onAdd("text");
        }}
        style={{ flex: 1, minHeight: 320, marginTop: 4, paddingTop: 16, marginBottom: 0, cursor: "text", boxShadow: "var(--border) 0 1px 0 0 inset" }}
      >
        {tail.length ? null : <span style={{ font: "var(--type-body)", color: "var(--text-disabled)" }}>Write, or press / for a block</span>}
      </div>

      {onCloseWeek ? (
        <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCloseWeek();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              height: 32,
              padding: "0 11px 0 9px",
              border: 0,
              cursor: "default",
              borderRadius: "var(--radius-lg)",
              background: "var(--fill-accent)",
              color: "var(--accent)",
              font: "var(--type-ui-medium)",
            }}
          >
            <Glyph of={LuWandSparkles} size={14} />
            Close the week
          </button>
          <span style={{ flex: 1, minWidth: 220, font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>
            Needt writes what the week came to, in its own ink — you edit it like anything else here.
          </span>
        </div>
      ) : null}
    </article>
  );
}
