"use client";

import type { ReactNode } from "react";

import { FiCloudOff, FiLock, FiRefreshCw } from "react-icons/fi";

import strings from "../../../../docs/port/prototype/port/strings/en.json";
import { useDesignV3 } from "../root/V3Root";
import { type SkeletonKind, StSkeleton } from "./StSkeleton";
import { type ScreenQuery, screenState } from "./status";

const copy = strings["states.jsx"];

export function StError({
  text = "Couldn’t load this — the server didn’t answer.",
  onRetry,
}: {
  text?: string;
  onRetry: () => unknown;
}) {
  return (
    <div className="st-error" role="alert" data-st-error>
      <span className="st-error-icon">
        <FiCloudOff size={16} aria-hidden />
      </span>
      <span className="st-error-text">{text}</span>
      <button
        type="button"
        className="nx-btn nx-btn-secondary nx-btn-sm"
        data-st-retry
        onClick={() => void onRetry()}
      >
        <FiRefreshCw size={13} aria-hidden />
        {copy.StError.retry}
      </button>
    </div>
  );
}

export function StNoAccess({
  title,
  kind = "document",
  owner,
}: {
  title?: string;
  kind?: string;
  owner?: { name: string; email: string };
}) {
  return (
    <div className="st-noaccess" role="alert" data-st-noaccess>
      <span className="st-noaccess-lock">
        <FiLock size={18} aria-hidden />
      </span>
      <span className="st-noaccess-title">
        You don&apos;t have access
        {title ? ` to “${title}”` : ` to this ${kind}`}
      </span>
      <span className="st-noaccess-body">
        {copy.StNoAccess.this} {kind}{" "}
        {copy.StNoAccess.was_shared_with_a_link_but_not_with_your}
      </span>
      {owner ? (
        <span className="st-noaccess-owner">
          <span
            className="st-avatar"
            style={{ width: 28, height: 28, fontSize: 12 }}
          >
            {owner.name
              .split(/\s+/)
              .map((word) => word[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <span className="state-no-access-stack">
            <span className="base-strong">{owner.name}</span>
            <span className="base-meta">
              {copy.StNoAccess.owner} {owner.email}
            </span>
          </span>
        </span>
      ) : null}
    </div>
  );
}

export function PlEmpty({
  art,
  title,
  line,
  action,
}: {
  art: ReactNode;
  title: string;
  line: string;
  action?: ReactNode;
}) {
  return (
    <div className="pl-empty pl-empty-col">
      {art}
      <span className="pl-empty-text">{title}</span>
      <span className="pl-line">{line}</span>
      {action ? <span className="pl-empty-text-3">{action}</span> : null}
    </div>
  );
}

export interface StScreenProps {
  query: ScreenQuery;
  kind: SkeletonKind;
  children: ReactNode;
  errorText?: string;
  title?: string;
}

export function StScreen({
  query,
  kind,
  children,
  errorText,
  title,
}: StScreenProps) {
  const enabled = useDesignV3();
  if (!enabled) return <>{children}</>;
  const state = screenState(query);
  if (state === "content") return <>{children}</>;
  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      data-st-state={state}
    >
      {state === "loading" ? (
        <StSkeleton kind={kind} />
      ) : state === "no-access" ? (
        <div className="st-center is-mid">
          <StNoAccess title={title} />
        </div>
      ) : (
        <div className="st-center">
          <StError
            text={
              state === "offline"
                ? "You’re offline — reconnect to load this."
                : errorText
            }
            onRetry={query.refetch}
          />
        </div>
      )}
    </div>
  );
}
