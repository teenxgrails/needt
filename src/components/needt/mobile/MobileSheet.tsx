"use client";

/* THE SHEET — one shape for everything that comes up from the bottom edge.
 *
 * Ported from `Mobile.jsx`'s `MbSheet`. The queue, the task and settings all
 * open the same way, because a phone has one gesture for "here is more" — a
 * shelf sliding up from the edge you already touched to ask for it — and a
 * second shape for the same idea would just be a second thing to learn.
 */
import * as React from "react";

export interface MobileSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** A plain count ("3"), or "closed/total" for a task's own parts. */
  count?: number | string;
  meta?: string;
  /** Overrides the default scrollable padding — the queue and task sheets
   * both draw their own row padding and would otherwise double up. */
  padding?: string;
  children?: React.ReactNode;
}

export function MobileSheet({
  open,
  onClose,
  title,
  count,
  meta,
  padding,
  children,
}: MobileSheetProps) {
  return (
    <div
      aria-hidden={!open}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
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
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "84%",
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-2xl) var(--radius-2xl) 0 0",
          background: "var(--background)",
          boxShadow: "var(--shadow-floating)",
          transform: open ? "none" : "translateY(100%)",
          transition: "transform 0.28s cubic-bezier(0.2, 0.7, 0.2, 1)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "block",
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "var(--fill-6)",
            margin: "8px auto 4px",
          }}
        />
        {title ? (
          <header
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              padding: "8px 16px 11px",
              flex: "none",
            }}
          >
            <span
              style={{
                font: "var(--type-card-title)",
                fontSize: 15,
                color: "var(--text-primary)",
              }}
            >
              {title}
            </span>
            {count != null ? (
              <span
                style={{
                  font: "var(--type-meta)",
                  color: "var(--text-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {count}
              </span>
            ) : null}
            {meta ? (
              <span
                style={{
                  marginLeft: "auto",
                  font: "var(--type-meta)",
                  color: "var(--text-quaternary)",
                }}
              >
                {meta}
              </span>
            ) : null}
          </header>
        ) : null}
        <div
          className="scroll-inner"
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: padding ?? "0 16px 24px",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
