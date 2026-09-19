"use client";

/* THE RICH BLOCK — the object the whole product is about.
 *
 * One component, four weights. A task is the same object wherever it is met,
 * so it wears the same tile, the same risk ink, the same age ladder and the
 * same money pair on a calendar grid and in a table.
 *
 * WHAT CARRIES WHAT
 *   hue       the PROJECT owns it, so the colour on screen is the person's own
 *             data rather than a palette decision.
 *   edge      MOVABILITY, and nothing else: a fixed block wears a 1.5px
 *             hairline in its hue, a movable one 1px at a lower alpha. Status
 *             never rides the edge — status is a 6px dot.
 *   tile      WHERE IT CAME FROM: the source's mark when there is one, the
 *             glyph for the kind of thing when there is not.
 *   payload   one row per fact, in a fixed order, each shown only if it fits
 *             whole — so height is derived from content, never chosen.
 *
 * Every measurement comes from `rb-layout`; nothing here computes a height.
 * Everything it draws comes from `rb-shape`; nothing here resolves a project.
 */
import * as React from "react";

import {
  RB_TILE,
  type RbFact,
  type RbWeight,
  rbLayout,
  rbZoneFacts,
} from "./rb-layout";
import {
  type RbShape,
  rbAgeInk,
  rbDur,
  rbFactSource,
  rbMoney,
} from "./rb-shape";
import {
  RB_SOURCES,
  RbCheckbox,
  RbEntry,
  RbGlyph,
  RbPill,
  RbPreview,
  RbTile,
  isGlyphName,
} from "./ui";

/* No project is a state, and it has a colour of its own: an opaque grey mixed
   against the surface, never a level of the text ladder. A ladder token is an
   alpha, and mixing one with transparent multiplies the two until the edge
   disappears. */
const RB_NEUTRAL_HUE =
  "color-mix(in oklab, var(--foreground) 42%, var(--surface-raised))";
const RB_NEUTRAL_GLYPH = "list-checks" as const;

const ELLIPSIS: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const DEFAULT_COLS =
  "15px minmax(0, 1fr) minmax(0, 160px) 68px 72px minmax(0, 110px)";

export interface RichBlockProps {
  /** What the block draws, already resolved by `rbShape`. */
  block: RbShape;
  weight: RbWeight;
  /** The height the surface affords. `null` is the request to fit. */
  height?: number | null;
  /** The width the surface affords, for the content-by-width ladder. */
  width?: number | null;
  /** The explicit form of `height == null`. */
  fit?: boolean;
  /** A dark ground wants a quieter edge: the same ink reads brighter there. */
  dark?: boolean;
  /**
   * A finger, not a pointer. The drawn marks keep their measured sizes — the
   * press targets grow instead, so no row reflows. PORT.md §3 requires every
   * tap target to clear 44px, and a 15px checkbox does not.
   */
  touch?: boolean;
  /** Minutes left, where the now-line crosses this block. */
  remaining?: number | null;
  /** The workspace table's shared column track, for `weight="row"`. */
  cols?: string;
  onOpen?: () => void;
  onToggle?: () => void;
  onToggleTask?: (index: number) => void;
}

/** A 6px status dot. Status is never an edge and never a glyph. */
function RbDot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: "none",
        width: size,
        height: size,
        borderRadius: size,
        background: color,
      }}
    />
  );
}

export function RichBlock({
  block,
  weight,
  height = null,
  width = null,
  fit = false,
  dark = false,
  touch = false,
  remaining = null,
  cols = DEFAULT_COLS,
  onOpen,
  onToggle,
  onToggleTask,
}: RichBlockProps) {
  const [hovered, setHovered] = React.useState(false);

  const source = block.source ? RB_SOURCES[block.source] : null;
  const atRisk = block.overdue || block.priority === "now";
  const projectHue = block.hue ?? RB_NEUTRAL_HUE;
  const hue = atRisk ? "var(--destructive)" : projectHue;
  const glyph =
    block.glyph && isGlyphName(block.glyph) ? block.glyph : RB_NEUTRAL_GLYPH;
  const riskWords =
    block.risk ?? (block.overdue ? "Past due" : "Must not slip");

  const plan = rbLayout({
    weight,
    height,
    width,
    fit,
    source: rbFactSource(block),
  });

  const parts = block.parts ?? [];
  const closed = parts.filter((part) => part.done).length;
  const whole = parts.length > 0 && closed === parts.length;

  const group = block.group ?? null;
  const left = group ? group.filter((task) => !task.done) : null;

  /* ── The row ───────────────────────────────────────────────────────────
     36px on hairlines with named columns, because it is the only arrangement
     you can scan by attribute: every date under Due, every estimate under Est,
     every amount under Value. */
  if (weight === "row") {
    return (
      <div
        data-drop="row"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: cols,
          alignItems: "center",
          gap: 8,
          minHeight: "var(--row-h, 36px)",
          padding: "0 6px",
          boxShadow: "var(--border) 0 -1px 0 0 inset",
          background: hovered ? "var(--fill-3)" : "transparent",
          transition: "background-color var(--transition-hover)",
        }}
      >
        {onToggle ? (
          <RbCheckbox
            done={block.done}
            hue={hue}
            label={`${block.done ? "Reopen" : "Complete"} ${block.title}`}
            hitSlop={touch ? 15 : 0}
            onToggle={onToggle}
          />
        ) : (
          <span />
        )}
        <span
          style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}
        >
          <RbTile
            hue={hue}
            glyph={glyph}
            mark={source ? block.source : null}
            size={16}
            locked={!block.movable}
          />
          <span
            onClick={onOpen}
            title={block.title}
            style={{
              minWidth: 0,
              font: "var(--type-ui)",
              color: block.done ? "var(--text-muted)" : rbAgeInk(block.age),
              textDecoration: block.done ? "line-through" : "none",
              ...ELLIPSIS,
            }}
          >
            {block.title}
          </span>
          {parts.length ? (
            <span
              title={`${closed} of ${parts.length} parts closed`}
              style={{
                flex: "none",
                display: "inline-flex",
                alignItems: "center",
                height: 18,
                padding: "0 5px",
                borderRadius: "var(--radius-xs)",
                font: "var(--type-meta-medium)",
                fontSize: 11,
                fontVariantNumeric: "tabular-nums",
                color: whole ? "var(--accent)" : "var(--text-muted)",
                background: whole ? "var(--fill-accent)" : "var(--fill-3)",
              }}
            >
              {closed}/{parts.length}
            </span>
          ) : null}
          {atRisk ? (
            <span
              style={{
                flex: "none",
                display: "flex",
                alignItems: "center",
                gap: 5,
                minWidth: 0,
              }}
            >
              <RbDot color="var(--destructive)" size={5} />
              <span
                style={{
                  font: "var(--type-meta)",
                  color: "var(--destructive)",
                  whiteSpace: "nowrap",
                }}
              >
                {riskWords}
              </span>
            </span>
          ) : null}
          {block.movedFrom ? (
            <span
              title={`The scheduler moved it from ${block.movedFrom}`}
              style={{
                flex: "none",
                display: "flex",
                alignItems: "center",
                gap: 4,
                font: "var(--type-meta)",
                color: "var(--text-quaternary)",
              }}
            >
              <RbGlyph name="arrow-right" size={11} />
              {block.movedFrom}
            </span>
          ) : null}
        </span>
        <span
          style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
        >
          <RbDot color={block.project ? projectHue : "var(--text-disabled)"} />
          <span
            style={{
              minWidth: 0,
              font: "var(--type-meta)",
              color: "var(--text-quaternary)",
              ...ELLIPSIS,
            }}
          >
            {block.where ?? "No project"}
          </span>
        </span>
        {block.noSlot ? (
          <span
            title="No rail: nothing to move. It closes when it closes."
            style={{ font: "var(--type-meta)", color: "var(--text-disabled)" }}
          >
            No slot
          </span>
        ) : (
          <span
            style={{
              font: "var(--type-meta)",
              color: block.overdue
                ? "var(--destructive)"
                : "var(--text-quaternary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {block.due ?? "—"}
          </span>
        )}
        <span
          style={{
            font: "var(--type-meta)",
            color: "var(--text-disabled)",
            fontVariantNumeric: "tabular-nums",
            textAlign: "right",
          }}
        >
          {block.est ? rbDur(block.est) : "—"}
        </span>
        <span
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "baseline",
            gap: 5,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {block.earned ? (
            <span
              title="Received"
              style={{
                font: "var(--type-meta-medium)",
                color: "var(--success)",
              }}
            >
              {rbMoney(block.earned)}
            </span>
          ) : null}
          {block.value ? (
            <span
              title={block.earned ? "Listed" : "Worth when it closes"}
              style={{
                font: "var(--type-meta)",
                color: block.earned
                  ? "var(--text-quaternary)"
                  : "var(--text-secondary)",
              }}
            >
              {rbMoney(block.value)}
            </span>
          ) : !block.earned ? (
            <span
              style={{
                font: "var(--type-meta)",
                color: "var(--text-disabled)",
              }}
            >
              {"—"}
            </span>
          ) : null}
        </span>
      </div>
    );
  }

  /* ── Declined ──────────────────────────────────────────────────────────
     It keeps its slot and says nothing, because the slot is the fact. */
  if (weight === "declined") {
    return (
      <span
        onClick={onOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          height: plan.height ?? undefined,
          padding: "0 11px",
          borderRadius: "var(--radius-lg)",
          background: "var(--fill-3)",
          color: "var(--text-tertiary)",
          cursor: "default",
          overflow: "hidden",
        }}
      >
        <RbGlyph name="eye-off" size={16} />
        <span
          style={{
            font: "var(--type-meta)",
            fontSize: 12,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.01em",
          }}
        >
          {block.from} <span style={{ opacity: 0.5 }}>{"›"}</span> {block.to}
        </span>
      </span>
    );
  }

  /* ── The chip ──────────────────────────────────────────────────────────
     Under 64px the block stops splitting into parts and becomes one mark plus
     one truncated line. The CLUSTER chip that names several blocks at once
     ("2 tasks · 1 event") belongs to the surface: a block cannot know its
     neighbours, and inventing a count here would be a second source of it. */
  if (plan.width.asChip) {
    return (
      <span
        onClick={onOpen}
        title={block.title}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          height: plan.height ?? undefined,
          minWidth: 0,
          padding: "0 5px",
          borderRadius: "var(--radius-md)",
          background: "var(--surface-raised)",
          boxShadow: `inset ${plan.width.rail}px 0 0 0 color-mix(in oklab, ${hue} ${
            block.movable ? (dark ? 30 : 42) : dark ? 46 : 62
          }%, transparent), var(--shadow-ring)`,
          cursor: "default",
          overflow: "hidden",
        }}
      >
        <RbDot color={hue} size={5} />
        <span
          style={{
            minWidth: 0,
            font: "var(--type-meta)",
            color: "var(--text-secondary)",
            ...ELLIPSIS,
          }}
        >
          {block.title}
        </span>
      </span>
    );
  }

  /* ── The block ─────────────────────────────────────────────────────────── */
  const open = plan.open;
  const fits = plan.fits;
  const tier = plan.heightTier;
  /* The ladder rations the HEADER, which is all a block short of the open
     threshold has left to give up. Once the payload is being spent, the meta
     the ladder would add is already a row of its own. */
  const showTime = open || tier !== "title";
  const timeInline = !open && tier === "title-time-inline";
  const showHeaderMeta = !open && tier === "title-time-meta";

  const lines = rbZoneFacts(plan.shown, "line");
  const controls = rbZoneFacts(plan.shown, "control");
  const meta = rbZoneFacts(plan.shown, "meta");
  const preview = plan.shown.find((fact) => fact.kind === "preview") ?? null;
  /* A group's tasks are not payload — they ARE the block, so they all render
     and the area scrolls rather than collapsing. */
  const tasks =
    group && open ? plan.budget.filter((f) => f.kind === "tasks") : [];

  const timeLabel = block.from ? null : block.est ? rbDur(block.est) : null;

  const renderFact = (fact: RbFact): React.ReactNode => {
    switch (fact.kind) {
      case "place":
        return (
          <RbPill key={fact.key} glyph="map-pin" hue={hue} strong>
            {block.place}
          </RbPill>
        );
      case "risk":
        return (
          <span
            key={fact.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              minWidth: 0,
              width: "100%",
            }}
          >
            <RbDot color="var(--destructive)" />
            <span
              style={{
                minWidth: 0,
                font: "var(--type-ui-medium)",
                color: "var(--text-primary)",
                ...ELLIPSIS,
              }}
            >
              {riskWords}
            </span>
          </span>
        );
      case "reason":
        return (
          <span
            key={fact.key}
            title={`Needt placed it here: ${block.reason}`}
            style={{
              display: "block",
              width: "100%",
              minWidth: 0,
              paddingLeft: 9,
              boxShadow: `inset 1.5px 0 0 0 color-mix(in oklab, ${hue} 55%, transparent)`,
              font: "var(--type-meta)",
              color: "var(--text-secondary)",
              ...ELLIPSIS,
            }}
          >
            {block.reason}
          </span>
        );
      case "moved":
        return (
          <span
            key={fact.key}
            title={`The scheduler moved this from ${block.movedFrom}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
              width: "100%",
            }}
          >
            <span
              aria-hidden="true"
              style={{ flex: "none", display: "flex", color: "var(--accent)" }}
            >
              <RbGlyph name="corner-down-right" size={12} />
            </span>
            <span
              style={{
                minWidth: 0,
                font: "var(--type-meta)",
                color: "var(--accent)",
                fontVariantNumeric: "tabular-nums",
                ...ELLIPSIS,
              }}
            >
              Moved from {block.movedFrom}
            </span>
          </span>
        );
      case "where":
        return (
          <span
            key={fact.key}
            style={{
              minWidth: 0,
              font: "var(--type-meta)",
              color: "var(--text-tertiary)",
              ...ELLIPSIS,
            }}
          >
            {block.where}
          </span>
        );
      case "reserve":
        return (
          <span
            key={fact.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
              width: "100%",
            }}
          >
            <RbDot
              color={
                block.reserve?.state === "late"
                  ? "var(--destructive)"
                  : block.reserve?.state === "tight"
                    ? "var(--info)"
                    : "var(--success)"
              }
            />
            <span
              style={{
                minWidth: 0,
                font: "var(--type-meta)",
                color: "var(--text-secondary)",
                ...ELLIPSIS,
              }}
            >
              {block.reserve?.text}
            </span>
          </span>
        );
      case "entry":
        return <RbEntry key={fact.key} label={block.entry ?? ""} hue={hue} />;
      case "link":
        return (
          <RbPill key={fact.key} glyph="link" hue={hue}>
            {block.link}
          </RbPill>
        );
      case "attachment":
        return (
          <RbPill key={fact.key} glyph="paperclip" hue={hue}>
            {block.attachment}
          </RbPill>
        );
      case "preview":
        return block.og ? <RbPreview key={fact.key} og={block.og} /> : null;
      case "note":
        return (
          <span
            key={fact.key}
            style={{
              display: "block",
              width: "100%",
              font: "var(--type-meta)",
              color: "var(--text-tertiary)",
              ...ELLIPSIS,
            }}
          >
            {block.note}
          </span>
        );
      case "tasks": {
        const task = group?.[fact.index ?? 0];
        if (!task) return null;
        const index = fact.index ?? 0;
        return (
          <span
            key={fact.key}
            onClick={(event) => {
              event.stopPropagation();
              onToggleTask?.(index);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              width: "100%",
              minWidth: 0,
              height: 26,
              padding: "0 7px",
              borderRadius: "var(--radius-sm)",
              background: "var(--fill-2)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flex: "none",
                width: 13,
                height: 13,
                borderRadius: 4,
                display: "grid",
                placeItems: "center",
                background: task.done ? hue : "transparent",
                boxShadow: task.done
                  ? "none"
                  : `inset 0 0 0 1.2px color-mix(in oklab, ${hue} 60%, var(--text-quaternary))`,
                color: "#fff",
              }}
            >
              {task.done ? <RbGlyph name="check" size={9} /> : null}
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                font: "var(--type-meta)",
                color: task.done
                  ? "var(--text-tertiary)"
                  : "var(--text-secondary)",
                textDecoration: task.done ? "line-through" : "none",
                ...ELLIPSIS,
              }}
            >
              {task.title}
            </span>
            <span
              style={{
                flex: "none",
                font: "var(--type-meta)",
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {task.est}m
            </span>
          </span>
        );
      }
      default:
        return null;
    }
  };

  /* THE EDGE. It carries movability and nothing else: a fixed block wears a
     1.5px hairline in its hue, a movable one 1px at a lower alpha. Quieter on
     dark, where the same ink reads brighter. A block with no rail at all says
     so by wearing only the ring. Under 90px the edge becomes a left rail
     instead, because that is where the checkbox used to be. */
  const edgeAlpha = block.movable ? (dark ? 30 : 42) : dark ? 46 : 62;
  const edgeWidth = block.movable ? 1 : 1.5;
  const railed = !plan.width.checkboxInFlow;
  const edge = atRisk
    ? "inset 0 0 0 2px var(--destructive), var(--shadow-ring)"
    : block.noSlot
      ? "var(--shadow-ring)"
      : railed
        ? `inset ${plan.width.rail}px 0 0 0 color-mix(in oklab, ${hue} ${edgeAlpha}%, transparent), var(--shadow-ring)`
        : `inset 0 0 0 ${edgeWidth}px color-mix(in oklab, ${hue} ${edgeAlpha}%, transparent), var(--shadow-ring)`;

  const showCheckbox =
    Boolean(onToggle) && (plan.width.checkboxInFlow || hovered);

  return (
    <span
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: fits ? "auto" : (plan.height ?? undefined),
        borderRadius: "var(--radius-lg)",
        cursor: "default",
        overflow: "hidden",
        paddingBottom: fits && !meta.length && !controls.length ? 8 : 0,
        /* Colour has one carrier per surface: the tile and the edge. The body
           stays `--surface-raised`, except an event, which has no project, so
           its calendar's hue tints the body instead. */
        background: block.event
          ? `color-mix(in oklab, ${hue} ${dark ? 13 : 16}%, var(--surface-raised))`
          : "var(--surface-raised)",
        boxShadow: edge,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: open ? "flex-start" : "center",
          gap: 9,
          padding: open ? "9px 10px 0" : `0 10px 0 ${railed ? 12 : 10}px`,
          flex: open ? "none" : 1,
          minWidth: 0,
        }}
      >
        {showCheckbox && onToggle ? (
          <span
            style={
              plan.width.checkboxInFlow
                ? { display: "flex", marginTop: open ? 10 : 0 }
                : {
                    /* Out of the flow: it overlays rather than stealing the
                       15px the title has left at this width. */
                    position: "absolute",
                    left: plan.width.rail + 3,
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 2,
                    display: "flex",
                  }
            }
          >
            <RbCheckbox
              done={block.done}
              hue={hue}
              label={`${block.done ? "Reopen" : "Complete"} ${block.title}`}
              hitSlop={touch ? 15 : 0}
              onToggle={onToggle}
            />
          </span>
        ) : null}
        {tier !== "title" || open ? (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              height: open ? RB_TILE : 24,
              flex: "none",
            }}
          >
            <RbTile
              hue={source ? source.hue : projectHue}
              glyph={glyph}
              mark={block.source}
              size={open ? RB_TILE : 24}
              locked={!block.movable && open}
            />
          </span>
        ) : null}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 1,
            justifyContent: "center",
          }}
        >
          <span
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
            }}
          >
            {atRisk ? (
              <span title={riskWords} style={{ display: "flex" }}>
                <RbDot color="var(--destructive)" />
              </span>
            ) : null}
            <span
              title={
                block.age && block.age >= 21
                  ? `Untouched for ${Math.round(block.age / 7)} weeks`
                  : undefined
              }
              style={{
                flex: 1,
                minWidth: 0,
                font: "var(--type-ui-medium)",
                color: block.done ? "var(--text-muted)" : rbAgeInk(block.age),
                textDecoration: block.done ? "line-through" : "none",
                ...ELLIPSIS,
              }}
            >
              {group && !open && left?.length ? left[0].title : block.title}
            </span>
            {/* MONEY. A task that is worth something says what it is worth,
                where a group says what it costs — the same trailing slot,
                because both answer "what does this block carry". Two sums make
                the margin real: what it is listed for, and what came in. */}
            {block.value ? (
              <span
                style={{
                  flex: "none",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 5,
                }}
              >
                {block.earned ? (
                  <span
                    title="Received"
                    style={{
                      font: "var(--type-ui-medium)",
                      color: "var(--success)",
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {rbMoney(block.earned)}
                  </span>
                ) : null}
                <span
                  title={block.earned ? "Listed" : "What it is worth"}
                  style={{
                    font: block.earned
                      ? "var(--type-meta)"
                      : "var(--type-ui-medium)",
                    color: block.earned
                      ? "var(--text-quaternary)"
                      : "var(--text-secondary)",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {rbMoney(block.value)}
                </span>
              </span>
            ) : null}
            {group && left ? (
              <span
                style={{
                  flex: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {!open ? (
                  <span
                    style={{
                      font: "var(--type-meta-medium)",
                      fontSize: 11,
                      fontVariantNumeric: "tabular-nums",
                      padding: "0 5px",
                      borderRadius: "var(--radius-xs)",
                      background: "var(--fill-3)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {group.length - left.length}/{group.length}
                  </span>
                ) : null}
                {/* The sum stays: it is what the block still costs the day, and
                    it goes down as tasks close — a quantity, not a tally. */}
                <span
                  style={{
                    font: "var(--type-meta-medium)",
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {rbDur(left.reduce((sum, task) => sum + task.est, 0))}
                </span>
              </span>
            ) : null}
            {/* Under 40px the time joins the title line, right-aligned at 11px,
                because a second line is a line that would be clipped. */}
            {timeInline && (block.from || timeLabel) ? (
              <span
                style={{
                  flex: "0 1 auto",
                  minWidth: 0,
                  font: "var(--type-meta)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "0.01em",
                  ...ELLIPSIS,
                }}
              >
                {block.from ?? timeLabel}
              </span>
            ) : null}
            {remaining != null ? (
              /* The hue lives in the PLATE and the ink comes from the text
                 ladder. Deriving both from one hue makes their separation
                 hue-dependent, and no pair of percentages satisfies five hues
                 at once. This way the contrast floor holds by construction,
                 including for a colour nobody has picked yet. */
              <span
                style={{
                  flex: "none",
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 6px",
                  borderRadius: "var(--radius-xs)",
                  background: `color-mix(in oklab, ${hue} 22%, var(--surface-raised))`,
                  font: "var(--type-meta-medium)",
                  fontSize: 10,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                }}
              >
                Left {remaining}m
              </span>
            ) : null}
          </span>
          {/* The chevron is the reference's one genuinely typographic idea: a
              time span reads as a direction, not as a subtraction. */}
          {showTime && !timeInline && (block.from || timeLabel) ? (
            <span
              style={{
                flex: "none",
                minWidth: 0,
                font: "var(--type-meta)",
                fontSize: 12,
                color: "var(--text-tertiary)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.01em",
                /* Narrow enough and the span runs past the block, which
                   `overflow: hidden` would cut mid-glyph. A fact is shown whole
                   or not shown, so it elides instead of being sliced. */
                ...ELLIPSIS,
              }}
            >
              {block.from ? (
                <>
                  {block.from} <span style={{ opacity: 0.45 }}>{"›"}</span>{" "}
                  {block.to}
                </>
              ) : (
                timeLabel
              )}
            </span>
          ) : null}
          {/* Past 70px a header that is not spending a payload can afford one
              meta line: the project dot, and what is left of the parts. */}
          {showHeaderMeta ? (
            <span
              style={{
                flex: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
              }}
            >
              {plan.width.showProjectDot ? (
                <RbDot
                  color={block.project ? projectHue : "var(--text-disabled)"}
                />
              ) : null}
              <span
                style={{
                  minWidth: 0,
                  font: "var(--type-meta)",
                  color: "var(--text-quaternary)",
                  ...ELLIPSIS,
                }}
              >
                {block.where ?? "No project"}
              </span>
              {parts.length ? (
                <span
                  title={`${closed} of ${parts.length} parts closed`}
                  style={{
                    flex: "none",
                    font: "var(--type-meta-medium)",
                    fontSize: 11,
                    fontVariantNumeric: "tabular-nums",
                    color: whole ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {closed}/{parts.length}
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
      </span>

      {/* What the block says about itself: a tight text stack, no pills. */}
      {lines.length ? (
        <span
          style={{
            flex: "none",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            padding: "6px 10px 0",
            minWidth: 0,
          }}
        >
          {lines.map(renderFact)}
        </span>
      ) : null}
      {/* A group's tasks are the block, so they scroll rather than collapse. */}
      {tasks.length ? (
        <span
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            padding: "6px 10px 8px",
            minWidth: 0,
          }}
        >
          {tasks.map(renderFact)}
        </span>
      ) : null}
      {controls.length ? (
        <span
          style={{
            flex: "none",
            display: "flex",
            gap: 6,
            padding: "8px 10px 0",
            minWidth: 0,
          }}
        >
          {controls.map(renderFact)}
        </span>
      ) : null}
      {preview ? (
        <span style={{ flex: "none", padding: "8px 10px 0" }}>
          {renderFact(preview)}
        </span>
      ) : null}
      {/* Metadata last, as a strip: where it lives, and what is attached. */}
      {meta.length ? (
        <span
          style={{
            flex: "none",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
            padding: "8px 10px 8px",
            minWidth: 0,
          }}
        >
          {meta.map(renderFact)}
        </span>
      ) : null}
    </span>
  );
}
