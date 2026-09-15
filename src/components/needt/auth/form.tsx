"use client";

/* AUTH'S OWN FORM ROW PRIMITIVES.
 *
 * The generated token sheet already draws the whole family — `.nt-form`,
 * `.nt-row`, `.nt-input`, `.nt-select-trigger`, `.nt-switch` — PORT.md §0's
 * one form-label column among them. Nothing wraps them into React yet
 * anywhere in the app (`ChatCorner` and `FocusControl` both write `nt-input`
 * on a bare `<input>` directly), so these four small components exist to
 * keep this screen's own markup from repeating the same four class names
 * six times. They are local to `auth/` — Settings will draw its own when it
 * is built, the same way this file does now.
 *
 * `Select` is a native `<select>` wearing `.nt-select-trigger`, not a full
 * listbox: the one interactive listbox in the app
 * (`src/components/ui/needt-picker.tsx`) lives outside `.needt-v2` and is
 * off-limits here. A native control is a deliberate simplification for two
 * minor onboarding fields, not a second picker.
 */
import * as React from "react";

import { TriggerCaret } from "../shell/chrome";

export function Row({
  label,
  hint,
  error,
  stacked = false,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  stacked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={stacked ? "nt-row nt-row-stacked" : "nt-row"}>
      <span className="nt-row-label" title={label}>
        {label}
      </span>
      <div className="nt-row-control">{children}</div>
      {hint ? <span className="nt-row-hint">{hint}</span> : null}
      {error ? <span className="nt-row-error">{error}</span> : null}
    </div>
  );
}

export function Group({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="nt-form-group">
      {title ? <div className="nt-form-group-title">{title}</div> : null}
      {children}
    </div>
  );
}

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export function Select({
  value,
  options,
  onChange,
  width,
  label,
}: {
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  width?: number;
  /** Accessible name — the visible label already sits in the row. */
  label: string;
}) {
  return (
    <span className="nt-select" style={width ? { width } : undefined}>
      <select
        aria-label={label}
        className="nt-select-trigger"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ appearance: "none", paddingRight: 28 }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      >
        <TriggerCaret />
      </span>
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name for the hidden checkbox. */
  label: string;
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
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="nt-switch-track">
        <span className="nt-switch-knob" />
      </span>
    </label>
  );
}
