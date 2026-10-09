"use client";

import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  useState,
} from "react";

import { FiArrowRight } from "react-icons/fi";

import { useDesignV3 } from "@/components/needt3/root/V3Root";
import { useNeedtReducedMotion } from "@/components/providers/MotionRuntime";

import { useProjects } from "@/lib/needt3/hooks/projects";

import { TaskCheck } from "./TaskCheck";
import { DeskMeta, LineMeta, PartCount, TaskValue } from "./chips";
import { type TaskData, taskView } from "./view";

export type { TaskData } from "./view";
export { taskView } from "./view";

export interface TaskProps {
  task: TaskData;
  layout?: "row" | "card" | "block";
  onToggle?: (id: string) => void;
  onOpen?: (id: string, task: TaskData) => void;
  draggable?: boolean;
  dense?: boolean;
  density?: "desk" | "touch" | "agenda" | "mini" | "preview";
  dragProps?: (task: TaskData, mode: "place") => HTMLAttributes<HTMLDivElement>;
  late?: boolean;
  phase?: "strike" | "collapse" | "out";
  back?: boolean;
  hideProject?: boolean;
  compact?: boolean;
  stacked?: boolean;
  label?: string;
  note?: string;
  children?: ReactNode;
  box?: {
    h?: number;
    w?: number;
    padTop?: number;
    tight?: boolean;
    cascade?: boolean;
  };
  lit?: boolean;
  selected?: boolean;
  events?: HTMLAttributes<HTMLDivElement>;
  className?: string;
  style?: CSSProperties;
}

export function Task(props: TaskProps) {
  const v3 = useDesignV3();
  return v3 ? <TaskContent {...props} /> : null;
}

function TaskContent(props: TaskProps) {
  const {
    task,
    layout = "row",
    onToggle,
    onOpen,
    dragProps,
    hideProject,
    compact,
    stacked,
    phase,
    back,
    label,
    note,
    children,
    box = {},
    lit,
    selected,
    events,
    style,
    className = "",
  } = props;
  const reduced = useNeedtReducedMotion();
  const projects = useProjects();
  const [hot, setHot] = useState(false);
  const [focused, setFocused] = useState(false);
  const v = taskView(task, projects.data);
  const density = props.density ?? (props.dense ? "mini" : "desk");
  const late = props.late ?? (layout === "card" && v.overdue);
  const open = () => onOpen?.(task.id, task);
  const openProps: HTMLAttributes<HTMLDivElement> = onOpen
    ? {
        role: "button",
        tabIndex: 0,
        onClick: open,
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        onKeyDown: (event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open();
          }
        },
      }
    : {};
  const toggle = onToggle ? () => onToggle(task.id) : undefined;
  const check = (
    <TaskCheck key={task.id} on={v.done || !!phase} onClick={toggle} />
  );
  const hue = v.event
    ? "var(--text-tertiary)"
    : v.hue || "color-mix(in oklab, var(--foreground) 42%, var(--surface-raised))";
  const identity = {
    "data-task": v.event ? undefined : v.id,
    "data-ctx": v.event ? undefined : "task",
    "data-ctx-id": v.event ? undefined : v.id,
  };
  const motionStyle: CSSProperties = reduced
    ? { animation: "none", transition: "none" }
    : { animationFillMode: "backwards" };

  if (layout === "block") {
    const h = box.h ?? Math.max((v.len / 60) * 52 - 3, 20);
    const pt = box.padTop || 0;
    const short = v.len < 30 || h - pt < 34;
    const lines = Math.max(1, Math.floor((h - pt - (box.tight ? 5 : 23)) / 15));
    const fitTime =
      (box.w ?? 999) - 15 >= 38 + Math.min(v.title.length, 6) * 6.4;
    const shadow =
      [
        lit ? "var(--shadow-raised)" : null,
        box.cascade ? "var(--surface-raised) 0 0 0 1px" : null,
        selected ? "var(--accent) 0 0 0 1.5px inset" : null,
      ]
        .filter(Boolean)
        .join(", ") || "none";
    return (
      <div
        {...identity}
        {...openProps}
        {...events}
        className={`tk-block ${className}`}
        style={{
          padding: `${(short ? 2 : 5) + pt}px 6px 2px 9px`,
          background: v.event
            ? lit
              ? "var(--fill-5)"
              : "var(--fill-4)"
            : `color-mix(in oklch, ${hue} ${lit ? 22 : 14}%, var(--surface-raised))`,
          boxShadow: shadow,
          opacity: v.done ? 0.5 : 1,
          transform: lit && !reduced ? "translateY(-1px)" : "none",
          transition:
            "background-color 140ms ease, box-shadow 140ms ease, transform 140ms ease",
          ...style,
          ...motionStyle,
          outline: focused ? "2px solid var(--accent)" : undefined,
          outlineOffset: focused ? 2 : undefined,
        }}
      >
        <span
          aria-hidden="true"
          className="tk-block-rail"
          style={{ background: hue }}
        />
        {short ? (
          <div className="tk-block-line">
            {fitTime ? <span className="tk-block-time">{v.time}</span> : null}
            <span className={`tk-block-ltitle${v.done ? " is-done" : ""}`}>
              {v.title}
            </span>
          </div>
        ) : (
          <>
            <div
              className={`tk-block-title${v.done ? " is-done" : ""}`}
              style={{ WebkitLineClamp: lines }}
            >
              {v.title}
            </div>
            {!box.tight ? (
              <div className="tk-block-range">{v.range}</div>
            ) : null}
          </>
        )}
      </div>
    );
  }

  if (layout === "card") {
    if (density === "preview")
      return (
        <div
          {...identity}
          {...openProps}
          className={`tk-prev ${className}`}
          style={style}
        >
          {check}
          <span className={`tk-prev-title${v.done ? " is-done" : ""}`}>
            {v.title}
          </span>
          <span className="tk-prev-where">
            {v.projectName || "Inbox"} · {v.due || "later"}
          </span>
        </div>
      );
    if (density === "touch")
      return (
        <div {...identity} className={`tk-tcard ${className}`} style={style}>
          <span
            aria-hidden="true"
            className="tk-tcard-rail"
            style={{ background: v.projectName ? hue : "var(--text-muted)" }}
          />
          <span className="tk-tcard-head">
            {label ? <span className="tk-label">{label}</span> : null}
            <span className="tk-tcard-meta">
              <LineMeta view={v} late={late} />
            </span>
          </span>
          <div {...openProps} className="tk-tcard-title">
            {v.title}
          </div>
          {note ? <span className="tk-tcard-note">{note}</span> : null}
          {children ? <span className="tk-tcard-acts">{children}</span> : null}
        </div>
      );
    return (
      <div
        {...identity}
        className={`hd-card nx-swap tk-card ${className}`}
        style={{
          background: `color-mix(in oklab, ${v.hue || "var(--text-muted)"} 22%, var(--background))`,
          ...style,
          ...motionStyle,
        }}
      >
        <div aria-label={label} className="tk-card-plate">
          <div className="tk-card-label">
            <span>{label}</span>
            <span className="tk-card-right">
              {late && v.due ? (
                <span className="tk-late" title={v.lateTitle}>
                  {v.due}
                </span>
              ) : v.time ? (
                <span>{v.time}</span>
              ) : null}
              {v.minutes ? <span>{v.dur}</span> : null}
              {v.projectName ? (
                <span className="tk-card-proj">
                  <span
                    aria-hidden="true"
                    className="tk-dot"
                    style={{ background: hue }}
                  />
                  <span className="tk-clip">{v.projectName}</span>
                </span>
              ) : null}
            </span>
          </div>
          <div className="tk-card-text">
            <div {...openProps} title={v.title} className="tk-card-title">
              {v.title}
            </div>
            {note ? (
              <div title={note} className="tk-card-note">
                {note}
              </div>
            ) : null}
          </div>
          {children ? <div className="tk-card-acts">{children}</div> : null}
        </div>
      </div>
    );
  }

  if (density === "touch")
    return (
      <div
        {...identity}
        {...openProps}
        className={`mb-row tk-touch ${className}`}
        style={{
          opacity: phase === "out" ? 0 : 1,
          transition: "opacity 220ms ease",
          ...style,
          ...motionStyle,
        }}
      >
        <span className="tk-touch-check">
          <TaskCheck
            key={task.id}
            touch
            on={v.done || !!phase}
            onClick={toggle}
          />
        </span>
        <span className="tk-touch-body">
          <span className="tk-touch-line">
            <span
              className={`tk-touch-title${v.done || phase ? " is-done" : ""}`}
            >
              {v.title}
            </span>
            <PartCount view={v} />
            <TaskValue view={v} />
          </span>
          <LineMeta view={v} late={late} hideProject={hideProject} />
        </span>
      </div>
    );
  if (density === "mini")
    return (
      <div
        {...identity}
        {...openProps}
        className={`tk-mini ${className}`}
        style={style}
      >
        {check}
        <span
          title={v.title}
          className={`tk-mini-title${v.done ? " is-done" : ""}`}
        >
          {v.title}
        </span>
        {!compact && v.minutes ? (
          <span className="tk-mini-dur">{v.dur}</span>
        ) : null}
      </div>
    );
  if (density === "agenda")
    return (
      <div
        {...identity}
        {...openProps}
        className={`tk-agenda${hot ? " is-hot" : ""}${v.done ? " is-done" : ""} ${className}`}
        onMouseEnter={() => setHot(true)}
        onMouseLeave={() => setHot(false)}
        style={style}
      >
        {compact ? null : (
          <span className={`tk-ag-time${v.at == null ? " is-allday" : ""}`}>
            {v.time ?? "All day"}
          </span>
        )}
        <span
          aria-hidden="true"
          className="tk-rail"
          style={{ background: hue }}
        />
        <div className={`tk-ag-body${stacked ? " is-stacked" : ""}`}>
          {compact ? (
            <span className="tk-ag-ctime">
              {v.time ?? "All day"}
              {v.minutes ? (
                <span className="tk-ag-cdur"> · {v.durLong}</span>
              ) : null}
            </span>
          ) : null}
          <span className={`tk-ag-title${v.done ? " is-done" : ""}`}>
            {v.title}
          </span>
          {compact ? null : (
            <span className="tk-ag-meta">
              {v.minutes ? v.durLong : null}
              <span
                className="tk-ag-chip"
                style={{
                  background: `color-mix(in oklch, ${hue} 12%, var(--fill-2))`,
                }}
              >
                <span
                  aria-hidden="true"
                  className="tk-dot"
                  style={{ background: hue }}
                />
                <span className="tk-clip">
                  {v.event ? v.calendarName : v.projectName || "Inbox"}
                </span>
              </span>
            </span>
          )}
        </div>
      </div>
    );
  return (
    <div
      className={`hd-row${phase === "collapse" ? " is-collapsing" : ""}${phase ? " is-striking" : ""}${back ? " nx-swap" : ""} ${className}`}
      style={{ ...style, ...motionStyle }}
    >
      <div>
        <div
          {...(props.draggable && dragProps ? dragProps(task, "place") : {})}
        >
          <div
            {...identity}
            {...openProps}
            className={`tk-desk${hot ? " is-hot" : ""}`}
            onMouseEnter={() => setHot(true)}
            onMouseLeave={() => setHot(false)}
          >
            {check}
            <span className="tk-desk-body">
              <span
                title={v.title}
                className={`hd-title tk-desk-title${phase ? " is-struck" : ""}${v.done ? " is-done" : ""}${v.done && !phase ? " is-crossed" : ""}`}
              >
                {v.title}
              </span>
              <PartCount view={v} />
              <TaskValue view={v} />
            </span>
            <DeskMeta
              view={v}
              late={late}
              hot={hot}
              hideProject={hideProject}
            />
          </div>
          {v.entry && (!v.done || phase) ? (
            <div className="tk-entry">
              <FiArrowRight size={12} aria-hidden="true" />
              {v.entry}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
