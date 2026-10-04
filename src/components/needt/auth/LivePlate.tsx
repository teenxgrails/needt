"use client";

/* THE LIVE PLATE — a miniature day that keeps placing blocks.
 *
 * Ported from `LivePlate` in
 * `Content height and label fixes/needt-app/AuthScreen.jsx`. Desktop pairs
 * the sign-in / setup form with a real rendered day beside it — not an
 * illustration (PORT.md §3's "Auth + onboarding" line, and the top of the
 * prototype file's own comment). Blocks arrive on their own delay via the
 * vendored `.mini-block` animation; the now-line creeps via `.mini-now`; both
 * classes and the `.auth-aurora` background are already scoped in
 * `needt-motion.css` — nothing here invents a class name.
 *
 * The header date is the fixture's own `today` (1 September 2026, a Tuesday)
 * run through `Intl.DateTimeFormat` for the weekday name and `isoWeekNumber`
 * for the week — the same values the prototype hardcoded as "01.09" /
 * "Tuesday · week 36", derived instead of duplicated.
 */
import * as React from "react";

import { today as fixtureToday } from "@/lib/needt/fixture";

import { isoWeekNumber } from "../home/logic";

interface MiniBlockSpec {
  readonly top: number;
  readonly h: number;
  readonly tone: string;
  readonly w: string;
  readonly delay: number;
  readonly event?: boolean;
}

/** Six seeded blocks, revealed in order by `placed`. */
const LIVE_PLATE_BLOCKS: readonly MiniBlockSpec[] = [
  { top: 6, h: 34, tone: "var(--info)", w: "78%", delay: 0 },
  { top: 44, h: 22, tone: "var(--success)", w: "64%", delay: 0.5, event: true },
  { top: 70, h: 40, tone: "var(--accent)", w: "86%", delay: 1 },
  { top: 114, h: 20, tone: "var(--text-muted)", w: "58%", delay: 1.5 },
  { top: 138, h: 30, tone: "var(--info)", w: "72%", delay: 2 },
  { top: 172, h: 26, tone: "var(--accent)", w: "66%", delay: 2.5 },
];

const HOUR_RULES = [0, 1, 2, 3, 4, 5];
const HOUR_LABELS = [8, 9, 10, 11, 12, 13];

export interface LivePlateProps {
  /** Working-hours band shades in once hours are known. */
  hours?: boolean;
  /** Connected calendars tint their own events. */
  calendars?: boolean;
  /** How many of the six seeded blocks have "arrived" yet. */
  placed?: number;
  /** The reference day the header shows. Defaults to the fixture's today. */
  now?: Date;
}

export function LivePlate({
  hours = false,
  calendars = false,
  placed = 6,
  now,
}: LivePlateProps) {
  const day = now ?? fixtureToday;
  const dd = String(day.getDate()).padStart(2, "0");
  const mm = String(day.getMonth() + 1).padStart(2, "0");
  const weekday = React.useMemo(
    () => new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(day),
    [day]
  );
  const week = React.useMemo(() => isoWeekNumber(day), [day]);

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        minWidth: 0,
        borderRadius: "var(--radius-3xl)",
        overflow: "hidden",
        background: "var(--fill-4)",
        boxShadow: "var(--shadow-ring)",
      }}
    >
      <div className="auth-aurora" aria-hidden="true" />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: 28,
          gap: 16,
        }}
      >
        <span style={{ display: "flex", alignItems: "baseline", gap: 11 }}>
          <span
            className="display"
            style={{
              fontSize: 34,
              lineHeight: 1,
              color: "var(--text-primary)",
            }}
          >
            {dd}.{mm}
          </span>
          <span
            style={{
              font: "var(--type-meta)",
              color: "var(--text-quaternary)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {weekday} · week {week}
          </span>
        </span>

        <div
          style={{
            position: "relative",
            flex: 1,
            minHeight: 0,
            borderRadius: "var(--radius-2xl)",
            background: "var(--surface-raised)",
            boxShadow: "var(--shadow-ring)",
            overflow: "hidden",
          }}
        >
          {hours ? (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "12%",
                height: "62%",
                background: "var(--fill-2)",
              }}
            />
          ) : null}
          {HOUR_RULES.map((i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 8 + i * 34,
                height: 1,
                background: "var(--border)",
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              left: 44,
              right: 16,
              top: 10,
              bottom: 10,
            }}
          >
            {LIVE_PLATE_BLOCKS.slice(0, placed).map((block, i) => (
              <span
                key={i}
                className="mini-block"
                style={{
                  position: "absolute",
                  left: 0,
                  top: block.top,
                  width: block.w,
                  height: block.h,
                  animationDelay: `${block.delay}s`,
                  display: "flex",
                  alignItems: "stretch",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  background:
                    block.event && calendars
                      ? `color-mix(in oklab, ${block.tone} 14%, var(--surface-raised))`
                      : "var(--surface-raised)",
                  boxShadow:
                    block.event && calendars
                      ? `color-mix(in oklab, ${block.tone} 32%, transparent) 0 0 0 1px`
                      : "var(--shadow-ring)",
                }}
              >
                <span style={{ width: 3, background: block.tone }} />
                <span
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 4,
                    padding: "0 8px",
                  }}
                >
                  <span
                    style={{
                      height: 3,
                      width: "56%",
                      borderRadius: 2,
                      background: "var(--fill-6)",
                    }}
                  />
                  {block.h > 26 ? (
                    <span
                      style={{
                        height: 3,
                        width: "34%",
                        borderRadius: 2,
                        background: "var(--fill-4)",
                      }}
                    />
                  ) : null}
                </span>
              </span>
            ))}
          </div>
          {HOUR_LABELS.map((h, i) => (
            <span
              key={h}
              style={{
                position: "absolute",
                left: 12,
                top: 4 + i * 34,
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--text-disabled)",
              }}
            >
              {h}:00
            </span>
          ))}
          <span className="mini-now" aria-hidden="true" />
        </div>

        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            font: "var(--type-meta)",
            color: "var(--text-muted)",
          }}
        >
          <span
            style={{
              width: 3,
              height: 12,
              borderRadius: 2,
              background: "var(--text-muted)",
            }}
          />
          Grey rail: fixed.
          <span
            style={{
              width: 3,
              height: 12,
              borderRadius: 2,
              background: "var(--info)",
              marginLeft: 8,
            }}
          />
          Coloured: the scheduler placed it and can move it again.
        </span>
      </div>
    </div>
  );
}
