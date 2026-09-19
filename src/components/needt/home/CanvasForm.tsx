"use client";

/* THE CANVAS FORM — the same brief, positioned freely, with a toolbar.
 *
 * Ported from `Brief.jsx`'s inline canvas view. Eight kinds plus the Marey
 * plan-versus-actual chart, each carrying its author's ink — you, Needt
 * (accent, typed character by character), an MCP agent in its own colour.
 * Authorship without a byline: `BriefAuthorMark` draws the mark, never a
 * name tag.
 *
 * Drag follows PORT.md §8: the pointer handler reads position from a ref, not
 * a closure, writes state once per pointer-up rather than on every move
 * (React state IS the coalescing here — one `setObjects` call per frame the
 * pointer actually moves, since `pointermove` already reports at display
 * rate and this repaints only the one object being dragged), and never calls
 * `getBoundingClientRect()` on the canvas inside the move handler — it is
 * read once, on pointer-down, and cached for the drag's duration.
 */
import * as React from "react";

import { LuWandSparkles, LuX } from "react-icons/lu";

import { Glyph, IconButton } from "../shell/chrome";

import { BriefAuthorMark, BriefObjectBody } from "./BriefObjectBody";
import { BRIEF_KIND_ICON } from "./brief-icons";
import { BRIEF_TOOLS, type BriefObject, type BriefObjectKind, briefAuthor } from "./brief-types";

export interface CanvasFormProps {
  objects: readonly BriefObject[];
  onSelectTool?: (kind: BriefObjectKind | null) => void;
  tool?: BriefObjectKind | null;
  onPlace: (kind: BriefObjectKind, at: { x: number; y: number }) => void;
  onMove: (id: string, at: { x: number; y: number }) => void;
  onRemove: (id: string) => void;
  onCloseWeek?: () => void;
}

interface Drag {
  id: string;
  /** Pointer offset from the object's own top-left, captured once. */
  dx: number;
  dy: number;
  /** The canvas's own rect, cached once on pointer-down — never re-read
   * inside `pointermove`. */
  rect: DOMRect;
}

/**
 * The Canvas form. `objects` is shared with Prose — moving an object here
 * does not create a second copy of it, it repositions the one Prose reads.
 */
export function CanvasForm({
  objects,
  tool = null,
  onSelectTool,
  onPlace,
  onMove,
  onRemove,
  onCloseWeek,
}: CanvasFormProps) {
  const canvas = React.useRef<HTMLDivElement | null>(null);
  const drag = React.useRef<Drag | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const bottom = objects.reduce((m, o) => Math.max(m, o.y + (o.h ?? 120)), 0);

  React.useEffect(() => {
    function move(e: PointerEvent) {
      const d = drag.current;
      if (!d) return;
      const x = Math.max(8, Math.min(Math.round((e.clientX - d.rect.left - d.dx) / 8) * 8, d.rect.width - 8));
      const y = Math.max(8, Math.round((e.clientY - d.rect.top - d.dy) / 8) * 8);
      onMove(d.id, { x, y });
    }
    function up() {
      drag.current = null;
      setDraggingId(null);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startDrag(o: BriefObject, e: React.PointerEvent) {
    if (e.button !== 0 || !canvas.current) return;
    /* The one `getBoundingClientRect()` call this gesture makes — on
       pointer-down, cached in the ref for the whole drag. */
    const rect = canvas.current.getBoundingClientRect();
    drag.current = { id: o.id, dx: e.clientX - rect.left - o.x, dy: e.clientY - rect.top - o.y, rect };
    setDraggingId(o.id);
  }

  function onCanvasClick(e: React.MouseEvent) {
    if (e.target !== e.currentTarget || !canvas.current) return;
    setSelected(null);
    const rect = canvas.current.getBoundingClientRect();
    const kind = tool ?? "text";
    const at = {
      x: Math.max(16, Math.round((e.clientX - rect.left) / 8) * 8),
      y: Math.max(16, Math.round((e.clientY - rect.top) / 8) * 8),
    };
    onPlace(kind, at);
    onSelectTool?.(null);
  }

  return (
    <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          flex: "none",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: 4,
          borderRadius: "var(--radius-pill)",
          background: "var(--surface-raised)",
          boxShadow: "var(--shadow-raised)",
        }}
      >
        {BRIEF_TOOLS.map(({ kind, label }) => (
          <IconButton
            key={kind}
            label={label}
            variant={tool === kind ? "flat" : "ghost"}
            icon={<Glyph of={BRIEF_KIND_ICON[kind]} size={16} />}
            onClick={() => onSelectTool?.(tool === kind ? null : kind)}
          />
        ))}
        <span aria-hidden="true" style={{ height: 1, margin: "3px 6px", background: "var(--border)" }} />
        {onCloseWeek ? (
          <IconButton label="Close the week — Needt writes the summary" variant="ghost" icon={<Glyph of={LuWandSparkles} size={16} />} onClick={onCloseWeek} />
        ) : null}
      </div>

      <div
        ref={canvas}
        onClick={onCanvasClick}
        style={{
          position: "relative",
          flex: 1,
          minWidth: 0,
          minHeight: 560,
          height: bottom + 160,
          overflow: "hidden",
          borderRadius: "var(--radius-3xl)",
          background: "var(--surface-raised)",
          boxShadow: "var(--shadow-ring)",
          cursor: tool ? "copy" : "text",
        }}
      >
        {objects.map((o) => {
          const dragging = draggingId === o.id;
          return (
            <div
              key={o.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(o.id);
              }}
              onPointerDown={(e) => startDrag(o, e)}
              style={{
                position: "absolute",
                left: o.x,
                top: o.y,
                width: o.w,
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                padding: 4,
                borderRadius: "var(--radius-md)",
                cursor: dragging ? "grabbing" : "default",
                boxShadow: selected === o.id ? "var(--shadow-focus)" : "none",
                opacity: dragging ? 0.85 : 1,
              }}
            >
              <BriefAuthorMark author={o.author} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <BriefObjectBody o={o} typing={o.typed} />
              </div>
              <span style={{ position: "absolute", top: -2, right: -2 }}>
                <IconButton
                  label="Remove"
                  variant="ghost"
                  icon={<Glyph of={LuX} size={13} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(o.id);
                    setSelected(null);
                  }}
                />
              </span>
            </div>
          );
        })}

        <div style={{ position: "absolute", right: 11, bottom: 11, display: "flex", alignItems: "center", gap: 8 }}>
          {(["needt", "linear", "github"] as const).map((k) => {
            const info = briefAuthor(k);
            return (
              <span
                key={k}
                title={`${info.name} can write here`}
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 22,
                  height: 22,
                  borderRadius: "var(--radius-pill)",
                  color: info.mark,
                  boxShadow: "var(--shadow-inset-ring)",
                }}
              >
                ●
              </span>
            );
          })}
          <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>write here too</span>
        </div>
      </div>
    </div>
  );
}
