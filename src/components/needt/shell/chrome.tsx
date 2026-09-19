"use client";

/* THE CHROME PRIMITIVES — thin wrappers over the vendored classes.
 *
 * TWO CLASS FAMILIES, AND EVERY ELEMENT NEEDS BOTH. The vendored token sheet
 * styles `.nav-row`, `.card`, `.chip`, `.nt-dot` and `.btn-icon`; the vendored
 * motion sheet animates `.nt-nav-row`, `.nt-card`, `.nt-chip`,
 * `.nt-status-dot` and `.nt-icon-button`. They are the same five components
 * under two names, and an element wearing only one of the pair is either
 * unstyled or dead still. Both sheets are generated and must not be edited, so
 * the reconciliation lives here: every component below pins the pair, and
 * nothing outside this file should be writing either name by hand.
 *
 * These are deliberately not `src/components/ui/**` — that set reads a
 * different token set and lives outside `.needt-v2`.
 */
import * as React from "react";

import type { IconType } from "react-icons";
import { LuChevronDown } from "react-icons/lu";

/** A glyph, sized and pinned to outline by the token sheet's wrapper rule. */
export function Glyph({
  of: Icon,
  size = 16,
  filled = false,
}: {
  of: IconType;
  size?: number;
  filled?: boolean;
}) {
  return (
    <span
      data-needt-icon={filled ? "filled" : ""}
      aria-hidden="true"
      style={{ flex: "none", display: "block", width: size, height: size }}
    >
      <Icon size={size} />
    </span>
  );
}

/* ── NAV ROW ────────────────────────────────────────────────────────────── */

export function NavRow({
  label,
  icon,
  active = false,
  trailing,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="nav-row nt-nav-row"
      /* `aria-current` is what the token sheet fills and what the motion sheet
         animates; `data-active` is the motion sheet's second hook. */
      aria-current={active ? "page" : undefined}
      data-active={active ? "true" : undefined}
      onClick={onClick}
    >
      {icon}
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {trailing ? <span style={{ marginLeft: "auto" }}>{trailing}</span> : null}
    </button>
  );
}

/** The eyebrow over a group in the rail. 12px, the meta size. */
export function NavSection({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        height: 22,
        padding: "0 6px",
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
        {title}
      </span>
      {action}
    </div>
  );
}

/** Grey, italic, one size down — the token sheet's own empty state. */
export function SidebarHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="empty-hint" style={{ margin: 0, padding: "2px 6px" }}>
      {children}
    </p>
  );
}

/* ── COMMAND BAR ────────────────────────────────────────────────────────── */

/**
 * The capture field. Labelled with a verb, not a magnifier — and it is a
 * button, because pressing it opens the palette rather than focusing a box.
 */
export function CommandBar({
  label,
  caps,
  onClick,
}: {
  label: string;
  caps: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="command-bar"
      onClick={onClick}
      style={{ width: "100%", border: 0, cursor: "default", textAlign: "left" }}
    >
      <span style={{ minWidth: 0, flex: 1 }}>{label}</span>
      <kbd className="key-cap">{caps}</kbd>
    </button>
  );
}

/* ── SMALL MARKS ────────────────────────────────────────────────────────── */

export type NeedtTone = "accent" | "success" | "info" | "destructive";

/** A 6px mark. Solid accent is correct here and only here. */
export function Dot({ tone, title }: { tone?: NeedtTone; title?: string }) {
  return (
    <span className="nt-dot nt-status-dot" data-tone={tone} title={title} />
  );
}

export function Chip({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <span className={accent ? "chip nt-chip is-accent" : "chip nt-chip"}>
      {children}
    </span>
  );
}

/** A count, in the meta size and tabular so a column of them lines up. */
export function Count({ n }: { n: number }) {
  return (
    <span
      style={{
        font: "var(--type-meta)",
        color: "var(--text-muted)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {n}
    </span>
  );
}

export function IconButton({
  label,
  icon,
  variant = "ghost",
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  variant?: "ghost" | "flat" | "raised";
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const tail = variant === "raised" ? "" : ` btn-${variant}`;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`btn-icon nt-icon-button${tail}`}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

/** The face. A raised object at control size, wearing the person's own hue. */
export function Avatar({
  initials,
  name,
  hue,
  size = 24,
}: {
  initials: string;
  name: string;
  hue?: string;
  size?: number;
}) {
  return (
    <span
      className="raised"
      title={name}
      style={{
        flex: "none",
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: size,
        font: "var(--type-meta-medium)",
        fontSize: 11,
        color: hue ?? "var(--text-secondary)",
      }}
    >
      {initials}
    </span>
  );
}

/* ── MENU ───────────────────────────────────────────────────────────────── */

export function Menu({
  children,
  width,
}: {
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <div className="nt-menu" role="menu" style={width ? { width } : undefined}>
      {children}
    </div>
  );
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <div className="nt-menu-label">{children}</div>;
}

export function MenuSeparator() {
  return <div className="nt-menu-sep" />;
}

export function MenuItem({
  children,
  icon,
  shortcut,
  destructive = false,
  onClick,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  shortcut?: string;
  destructive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      /* The motion sheet cascades `.nt-menu [role="menuitem"]`, so the role is
         load-bearing as well as correct. */
      role="menuitem"
      className="nt-menu-item"
      onClick={onClick}
      style={destructive ? { color: "var(--destructive)" } : undefined}
    >
      {icon}
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      {shortcut ? <span className="nt-menu-shortcut">{shortcut}</span> : null}
    </button>
  );
}

/**
 * Anything hung off a trigger: a menu, a popover, either way up.
 *
 * `up` adds `.menu-up` / `.pop-up`, which is how the motion sheet knows to
 * grow the surface from the edge it is attached to — a control on the last row
 * of the rail has no room beneath it.
 */
export function Hung({
  open,
  up = false,
  kind,
  onDismiss,
  trigger,
  children,
}: {
  open: boolean;
  up?: boolean;
  kind: "menu" | "popover";
  onDismiss: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const wrap = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return undefined;
    function away(event: MouseEvent) {
      if (wrap.current && !wrap.current.contains(event.target as Node)) {
        onDismiss();
      }
    }
    function esc(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open, onDismiss]);

  const frame = up
    ? { bottom: "calc(100% + 6px)" as const }
    : { top: "calc(100% + 6px)" as const };

  return (
    <div
      ref={wrap}
      className={up ? (kind === "menu" ? "menu-up" : "pop-up") : undefined}
      style={{ position: "relative", display: "flex", width: "100%" }}
    >
      {trigger}
      {open ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            zIndex: "var(--z-dropdown)" as unknown as number,
            ...frame,
          }}
        >
          {kind === "menu" ? (
            <Menu>{children}</Menu>
          ) : (
            <div className="nt-popover">{children}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** The caret every trigger in the rail wears, so they read as one control. */
export function TriggerCaret() {
  return <Glyph of={LuChevronDown} size={14} />;
}
