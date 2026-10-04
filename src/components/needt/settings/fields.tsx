"use client";

/* THE FORM ROW — every control on this screen is one of these.
 *
 * PORT.md §0 rule 4 is the reason this file exists at all: "One form-label
 * column, `--form-label-w: 105px`, rows 32px; a label that does not fit gets
 * shortened, never the column widened." The vendored token sheet already
 * carries the class pair that enforces it (`.nt-row` / `.nt-row-label` /
 * `.nt-row-control` / `.nt-row-hint`, `src/styles/needt-ds-tokens.css`) — this
 * file is the one place that writes those class names for Settings and Docs,
 * so a row can never quietly grow its own column.
 *
 * Every control here is recessed (`.nt-input`, `.nt-select-trigger`), never a
 * solid accent fill (PORT.md §0 rule 3) — the one accent surface in this file
 * is the switch's ON state, which is `--fill-accent-strong` behind an accent
 * knob, not a solid fill.
 */
import * as React from "react";

import { LuCheck } from "react-icons/lu";

import { Glyph, Hung, MenuItem, TriggerCaret } from "../shell/chrome";

/** One row: a 105px label, a control, and an optional hint underneath the
 *  control column — never under the label. */
export function Row({
  label,
  hint,
  stacked = false,
  children,
}: {
  label: string;
  hint?: string;
  stacked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={stacked ? "nt-row nt-row-stacked" : "nt-row"}>
      <span className="nt-row-label">{label}</span>
      <span className="nt-row-control">{children}</span>
      {hint ? <span className="nt-row-hint">{hint}</span> : null}
    </div>
  );
}

/** A named group of rows. Groups are adjacent siblings on purpose — the
 *  vendored sheet spaces `.nt-form-group + .nt-form-group` itself
 *  (`--form-group-gap`), so nothing here repeats that distance by hand. */
export function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="nt-form-group">
      <div className="nt-form-group-title">{title}</div>
      {children}
    </div>
  );
}

export function SSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className="nt-switch"
      data-checked={checked ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="nt-switch-track">
        <span className="nt-switch-knob" />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}

export function SInput({
  value,
  onChange,
  suffix,
  width,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  width?: number;
  type?: "text" | "time" | "number";
  placeholder?: string;
}) {
  if (!suffix) {
    return (
      <input
        type={type}
        className="nt-input"
        value={value}
        placeholder={placeholder}
        style={{ width }}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  /* The suffix is drawn over the input rather than beside it in its own box,
     so the input keeps `.nt-input`'s own hover/focus states directly — a
     wrapper carrying the class instead would style a box that never takes
     focus. */
  return (
    <span style={{ position: "relative", display: "inline-block", width }}>
      <input
        type={type}
        className="nt-input"
        value={value}
        placeholder={placeholder}
        style={{ width: "100%", paddingRight: 34 }}
        onChange={(event) => onChange(event.target.value)}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          font: "var(--type-meta)",
          color: "var(--text-muted)",
          pointerEvents: "none",
        }}
      >
        {suffix}
      </span>
    </span>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function SSelect({
  value,
  onChange,
  options,
  width,
  placeholder = "Choose",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  width?: number;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const current = options.find((option) => option.value === value);
  return (
    <span className="nt-select" style={width ? { width } : undefined}>
      <Hung
        open={open}
        kind="menu"
        onDismiss={() => setOpen(false)}
        trigger={
          <button
            type="button"
            className="nt-select-trigger"
            aria-expanded={open}
            data-placeholder={current ? undefined : "true"}
            onClick={() => setOpen((v) => !v)}
          >
            <span
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {current?.label ?? placeholder}
            </span>
            <span className="nt-select-caret">
              <TriggerCaret />
            </span>
          </button>
        }
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            icon={
              option.value === value ? (
                <Glyph of={LuCheck} size={14} />
              ) : (
                <span style={{ display: "inline-block", width: 14 }} />
              )
            }
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Hung>
    </span>
  );
}

/** 12px, one line, no arrow — the vendored `.nt-tooltip`, wired up once so
 *  nothing else has to hand-roll the hover/focus-within toggle. */
export function STooltip({
  label,
  side = "top",
  children,
}: {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <span className="nt-tooltip-wrap">
      {children}
      <span className="nt-tooltip" data-side={side} role="tooltip">
        {label}
      </span>
    </span>
  );
}

/** A horizontal group of radios, for the one row in Settings that needs a
 *  mutually-exclusive choice wider than a switch (Alerts' channel). Built on
 *  the same `.nt-check` box the checkbox states share — a radio is a round
 *  checkbox, not a different control family. */
export function RadioRow({
  name,
  value,
  onChange,
  items,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  items: readonly SelectOption[];
}) {
  return (
    <span style={{ display: "flex", gap: 16 }}>
      {items.map((item) => (
        <label
          key={item.value}
          className="nt-check"
          data-checked={value === item.value ? "true" : undefined}
        >
          <input
            type="radio"
            name={name}
            checked={value === item.value}
            onChange={() => onChange(item.value)}
          />
          <span className="nt-check-box nt-radio-box">
            {value === item.value ? <Glyph of={LuCheck} size={10} /> : null}
          </span>
          {item.label}
        </label>
      ))}
    </span>
  );
}
