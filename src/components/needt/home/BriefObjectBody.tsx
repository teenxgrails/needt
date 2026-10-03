"use client";

/* THE BRIEF'S RENDERER — one object, drawn once, read by both forms.
 *
 * Ported from `Brief.jsx`'s `Body`. `ProseForm` and `CanvasForm` both call
 * this for every object they hold, so a checklist item or a Marey chart never
 * has two implementations that can drift.
 */
import * as React from "react";

import { LuImage, LuMail } from "react-icons/lu";

import { Glyph } from "../shell/chrome";

import { BRIEF_AUTHORS, type BriefObject, briefAuthor } from "./brief-types";

/** Needt's objects type themselves in, character by character — the way they
 * actually arrive, not a decoration. */
export function BriefTyped({
  text,
  color,
  speed = 18,
  onDone,
}: {
  text: string;
  color: string;
  speed?: number;
  onDone?: () => void;
}) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (n >= text.length) {
      onDone?.();
      return undefined;
    }
    const id = window.setTimeout(() => setN(n + 1), speed);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, text]);
  return (
    <span style={{ color }}>
      {text.slice(0, n)}
      {n < text.length ? (
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 2,
            height: "0.9em",
            marginLeft: 1,
            verticalAlign: "-0.1em",
            background: color,
          }}
        />
      ) : null}
    </span>
  );
}

/** The small mark in the margin that carries authorship without a byline.
 * `you` writes silently — no mark. */
export function BriefAuthorMark({ author }: { author: string }) {
  const a = briefAuthor(author);
  if (author === "you" || !(author in BRIEF_AUTHORS)) return null;
  return (
    <span
      title={a.name}
      style={{
        display: "grid",
        placeItems: "center",
        width: 20,
        height: 20,
        flex: "none",
        color: a.mark,
        font: "var(--type-meta-medium)",
        fontSize: 10,
      }}
    >
      ●
    </span>
  );
}

/** The Marey chart: plan is a straight line because an even rate IS a
 * straight line — nothing is modelled, the geometry is the claim. */
function MareyChart({ o, color }: { o: BriefObject; color: string }) {
  const days = o.days ?? ["M", "T", "W", "T", "F", "S", "S"];
  const total = o.total ?? 20;
  const actual = o.actual ?? [];
  const W = 100;
  const H = 100;
  const px = (i: number) => (i / (days.length - 1)) * W;
  const py = (v: number) => H - (v / total) * H;
  const fact = actual.map((v, i) => `${px(i)},${py(v)}`).join(" ");
  const done = actual.length ? actual[actual.length - 1] : 0;
  const owed = (done / total) * 100;
  const should = ((actual.length - 1) / (days.length - 1)) * 100;
  const behind = Math.round(should - owed);
  const behindColor = behind > 6 ? "var(--destructive)" : color;
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            font: "400 26px/1 var(--font-display, var(--font-sans))",
            color: behindColor,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {done}
          <span style={{ color: "var(--text-quaternary)" }}>/{total}</span>
        </span>
        <span style={{ font: "var(--type-meta)", color: behind > 6 ? "var(--destructive)" : "var(--text-muted)" }}>
          {behind > 6 ? `${behind}% behind the even rate` : "on the rate"}
        </span>
      </span>
      <span style={{ position: "relative", display: "block", height: 96 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height="96" style={{ display: "block", overflow: "visible" }}>
          {actual.length > 1 ? (
            <polygon
              points={`0,100 ${fact} ${px(actual.length - 1)},${py((total * (actual.length - 1)) / (days.length - 1))}`}
              fill={behindColor}
              opacity="0.14"
            />
          ) : null}
          <line x1="0" y1={H} x2={W} y2="0" stroke="var(--text-disabled)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          {actual.length > 1 ? (
            <polyline points={fact} fill="none" stroke={behindColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          ) : null}
          {actual.map((v, i) => (
            <circle key={i} cx={px(i)} cy={py(v)} r="2.5" fill={behindColor} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      </span>
      <span style={{ display: "flex", justifyContent: "space-between" }}>
        {days.map((d, i) => (
          <span key={`${d}-${i}`} style={{ font: "var(--type-meta)", color: i < actual.length ? "var(--text-tertiary)" : "var(--text-disabled)" }}>
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

export interface BriefObjectBodyProps {
  o: BriefObject;
  /** True while a `typed` object is still being written in. */
  typing?: boolean;
  onTyped?: () => void;
  onToggleItem?: (index: number) => void;
}

/** Draws one object. The only place a `BriefObject` becomes pixels. */
export function BriefObjectBody({ o, typing, onTyped, onToggleItem }: BriefObjectBodyProps) {
  const a = briefAuthor(o.author);

  if (o.kind === "heading") {
    return <span style={{ font: "600 18px/22px var(--font-sans)", color: a.color }}>{o.text}</span>;
  }

  if (o.kind === "text") {
    return (
      <p style={{ margin: 0, font: "400 15px/22px var(--font-sans)", color: a.color, textWrap: "pretty" }}>
        {typing ? <BriefTyped text={o.text ?? ""} color={a.color} onDone={onTyped} /> : o.text}
      </p>
    );
  }

  if (o.kind === "checklist") {
    return (
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {(o.items ?? []).map((item, i) => (
          <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 26 }}>
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => onToggleItem?.(i)}
              style={{ margin: 0 }}
            />
            <span
              style={{
                font: "var(--type-body)",
                color: item.done ? "var(--text-muted)" : "var(--text-primary)",
                textDecoration: item.done ? "line-through" : "none",
              }}
            >
              {item.label}
            </span>
          </label>
        ))}
      </span>
    );
  }

  if (o.kind === "metric") {
    return (
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ font: "400 44px/1 var(--font-display, var(--font-sans))", color: a.color, fontVariantNumeric: "tabular-nums" }}>
          {o.value}
        </span>
        <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>{o.caption}</span>
      </span>
    );
  }

  if (o.kind === "marey") return <MareyChart o={o} color={a.color} />;

  if (o.kind === "card") {
    return (
      <span style={{ display: "flex", alignItems: "stretch", gap: 8, padding: 8, borderRadius: "var(--radius-md)", background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)" }}>
        <span style={{ width: 3, borderRadius: "var(--radius-pill)", background: o.tone ?? "var(--info)" }} />
        <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)" }}>{o.title}</span>
          <span style={{ font: "var(--type-meta)", color: "var(--text-quaternary)", fontVariantNumeric: "tabular-nums" }}>{o.meta}</span>
        </span>
      </span>
    );
  }

  if (o.kind === "quote") {
    return (
      <span style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 11, boxShadow: "var(--border) 2px 0 0 0 inset" }}>
        <span style={{ font: "400 15px/22px var(--font-sans)", fontStyle: "italic", color: "var(--text-secondary)" }}>{o.text}</span>
        <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>{o.source}</span>
      </span>
    );
  }

  if (o.kind === "image") {
    return (
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: o.w || 260,
          height: o.h || 150,
          borderRadius: "var(--radius-xl)",
          background: "var(--fill-3)",
          color: "var(--text-disabled)",
        }}
      >
        <Glyph of={LuImage} size={24} />
      </span>
    );
  }

  if (o.kind === "drawing") {
    return (
      <span
        style={{
          display: "block",
          width: o.w || 220,
          height: o.h || 120,
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-inset-ring)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <svg viewBox="0 0 220 120" width="100%" height="100%" aria-label="Sketch">
          <path d={o.path} fill="none" stroke="var(--text-quaternary)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  if (o.kind === "email") {
    return (
      <span style={{ display: "flex", flexDirection: "column", width: o.w || 320, borderRadius: "var(--radius-xl)", background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)", overflow: "hidden" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 11px", boxShadow: "var(--border) 0 -1px 0 0 inset" }}>
          <Glyph of={LuMail} size={14} />
          <span style={{ font: "var(--type-meta-medium)", color: "var(--text-primary)" }}>Draft</span>
          <span style={{ marginLeft: "auto", font: "var(--type-meta)", color: "var(--accent)" }}>Send</span>
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 4, padding: 11 }}>
          <span style={{ font: "var(--type-meta)", color: "var(--text-quaternary)" }}>To {o.to}</span>
          <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)" }}>{o.subject}</span>
          <span style={{ font: "var(--type-meta)", color: "var(--text-tertiary)", textWrap: "pretty" }}>{o.body}</span>
        </span>
      </span>
    );
  }

  return null;
}
