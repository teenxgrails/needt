"use client";

/* THE TWO-MINUTE SHELF — ported from `Minutes.jsx`. Lives on the gap it
 * offers, and nowhere else: an inbox of small things is another list to
 * visit, a gap that offers them is the same information at the moment it is
 * useful.
 *
 * `.mn-rule` / `.mn-box` / `.mn-label` / `.mn-shelf` are already vendored in
 * `src/styles/needt-*.css` (see `needt-motion.css`) — this component only
 * wears them.
 */
import * as React from "react";

import type { MinuteGap } from "./minute-gaps";
import type { CalendarEntry } from "./entries";
import { pickMinuteOffers, type MinuteCandidate } from "./minute-gaps";
import { topForHour } from "./geometry";

export interface MinuteBoxProps {
  gap: MinuteGap;
  /** Candidates already reduced to what the shelf needs to sort and cap. */
  candidates: readonly (MinuteCandidate & { entryRef: CalendarEntry })[];
  gridStart?: number;
  hourHeight?: number;
  onPick?: (entry: CalendarEntry, gap: MinuteGap) => void;
}

export function MinuteBox({
  gap,
  candidates,
  gridStart = 0,
  hourHeight,
  onPick,
}: MinuteBoxProps) {
  const [open, setOpen] = React.useState(false);
  const offers = React.useMemo(
    () => pickMinuteOffers(candidates, gap.minutes),
    [candidates, gap.minutes]
  );
  if (!offers.length) return null;

  const height = Math.max(gap.bandPx - 3, 12);
  /* Under 18px there is no room for a number between two rules — the length
     moves into the shelf, where it is stated in words. */
  const tight = height < 18;
  const top = topForHour(gap.start, gridStart, hourHeight) + 2;

  return (
    <span
      style={{
        position: "absolute",
        left: 8,
        right: 14,
        top,
        height,
        zIndex: 2,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        className="mn-box"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          width: "100%",
          height: "100%",
          border: 0,
          cursor: "default",
          borderRadius: "var(--radius-md)",
          background: "transparent",
          font: "var(--type-meta)",
          color: "var(--text-quaternary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span className="mn-rule" aria-hidden="true" />
        {tight ? null : (
          <span className="mn-label" style={{ whiteSpace: "nowrap" }}>
            {gap.minutes} min
          </span>
        )}
        <span className="mn-rule" aria-hidden="true" />
      </button>
      {open ? (
        <span
          className="mn-shelf"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: height + 4,
            zIndex: 40,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 176,
            padding: 5,
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-raised)",
            boxShadow: "var(--shadow-floating)",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              padding: "2px 5px 4px",
            }}
          >
            <span
              style={{
                font: "var(--type-meta-medium)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--text-quaternary)",
              }}
            >
              {gap.minutes} minutes
            </span>
          </span>
          {offers.map((offer) => (
            <button
              key={offer.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                onPick?.(offer.entryRef, gap);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                minHeight: 32,
                padding: "0 6px",
                border: 0,
                cursor: "default",
                borderRadius: "var(--radius-md)",
                background: "transparent",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span
                  style={{
                    font: "var(--type-meta-medium)",
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {offer.entry}
                </span>
                <span
                  style={{
                    font: "var(--type-meta)",
                    color: "var(--text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {offer.entryRef.title}
                </span>
              </span>
              <span
                style={{
                  flex: "none",
                  font: "var(--type-meta)",
                  color: "var(--text-disabled)",
                }}
              >
                2 min
              </span>
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}
