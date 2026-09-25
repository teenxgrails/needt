"use client";

/* SETUP — five steps, chosen by recognising a layout.
 *
 * Ported from `OnboardingScreen` in
 * `Content height and label fixes/needt-app/AuthScreen.jsx`. The step order
 * and per-step body match the prototype one-to-one; the step MACHINE itself
 * (order, per-step requirement, back-preserves-answers) is `onboarding-steps`
 * — a pure reducer, unit-tested on its own. This file only renders it and
 * wires the two pieces of state that live above onboarding in the real app
 * (theme, drift) as props, exactly as the prototype receives them.
 *
 * The rail is the progress: five marks, the passed ones filled, the current
 * one wide — no percentages, five is countable. Skip bypasses every
 * requirement on every step, same as the prototype: it is there precisely
 * because calendars and first tasks are optional.
 */
import * as React from "react";

import {
  LuApple,
  LuArrowLeft,
  LuArrowRight,
  LuChrome,
  LuSparkles,
} from "react-icons/lu";

import { ExposureWordmark as Wordmark } from "@/components/needt/wordmark";

import type { SystemThemePair, ThemeMode } from "@/types/settings";

import { Miniature } from "../home/Miniature";
import { Glyph } from "../shell/chrome";
import { LivePlate } from "./LivePlate";
import { THEME_OPTIONS, ThemeThumb } from "./ThemeThumb";
import { Group, Row, Select, Toggle } from "./form";
import {
  ONBOARDING_STEPS,
  ONBOARDING_VIEWS,
  ONBOARDING_VIEW_KIND,
  type OnboardingDefaultView,
  canAdvanceOnboardingStep,
  initialOnboardingState,
  onboardingCapturedCount,
  onboardingReducer,
} from "./onboarding-steps";

const TIME_ZONE_OPTIONS = [
  { value: "cet", label: "CET — Berlin" },
  { value: "utc", label: "UTC" },
  { value: "est", label: "EST — New York" },
];

const WEEK_START_OPTIONS = [
  { value: "mon", label: "Monday" },
  { value: "sun", label: "Sunday" },
];

const CALENDAR_TONE: Readonly<Record<"apple" | "google", string>> = {
  apple: "var(--success)",
  google: "var(--info)",
};

export interface OnboardingScreenProps {
  /** Called with the chosen default view once setup finishes or is skipped. */
  onDone: (view: OnboardingDefaultView) => void;
  theme: ThemeMode;
  onTheme: (theme: ThemeMode) => void;
  /** Which theme "system" resolves to, light and dark. */
  pair: SystemThemePair;
  drift: boolean;
  onDrift: (drift: boolean) => void;
  embedded?: boolean;
  seed?: { step?: number };
}

export function OnboardingScreen({
  onDone,
  theme,
  onTheme,
  pair,
  drift,
  onDrift,
  embedded = false,
  seed,
}: OnboardingScreenProps) {
  const [dir, setDir] = React.useState<1 | -1>(1);
  const [planning, setPlanning] = React.useState(false);
  const [state, dispatch] = React.useReducer(
    onboardingReducer,
    seed?.step ?? 0,
    initialOnboardingState
  );
  const { index, answers } = state;
  const step = ONBOARDING_STEPS[index];
  const canGoNext = canAdvanceOnboardingStep(step.id, answers);
  const filled = onboardingCapturedCount(answers.captured);

  function back() {
    setDir(-1);
    dispatch({ type: "back" });
  }
  function advance() {
    setDir(1);
    dispatch({ type: "advance" });
  }
  function finish() {
    setPlanning(true);
    window.setTimeout(() => onDone(answers.view), 1100);
  }

  return (
    <div
      className="auth-enter"
      style={
        embedded
          ? {
              position: "relative",
              height: "100%",
              display: "flex",
              gap: 20,
              padding: 20,
              background: "var(--background)",
            }
          : {
              position: "fixed",
              inset: 0,
              zIndex: "var(--z-modal)" as unknown as number,
              display: "flex",
              gap: 20,
              padding: 20,
              background: "var(--background)",
            }
      }
    >
      <div
        style={{
          flex: "0 0 auto",
          width: 392,
          display: "flex",
          flexDirection: "column",
          padding: "0 40px",
        }}
      >
        <Wordmark size={54} />

        {/* The rail IS the progress: five marks, passed ones filled, the
            current one wide. No percentages — five is countable. */}
        <div style={{ display: "flex", gap: 6, padding: "28px 0 21px" }}>
          {ONBOARDING_STEPS.map((s, n) => (
            <span
              key={s.id}
              style={{
                height: 3,
                flex: n === index ? "2 1 0" : "1 1 0",
                borderRadius: 2,
                background: n <= index ? "var(--accent)" : "var(--fill-4)",
                transition: "flex 0.32s ease, background-color 0.32s ease",
              }}
            />
          ))}
        </div>

        <div
          key={step.id}
          className={
            "scroll-inner " + (dir > 0 ? "step-enter" : "step-enter-back")
          }
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            paddingRight: 2,
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
            Step {index + 1} of {ONBOARDING_STEPS.length}
          </span>
          <h1
            style={{
              margin: "6px 0 6px",
              font: "var(--type-page-title)",
              color: "var(--text-primary)",
            }}
          >
            {step.title}
          </h1>
          <p
            style={{
              margin: "0 0 21px",
              font: "var(--type-ui)",
              color: "var(--text-muted)",
            }}
          >
            {step.sub}
          </p>

          {step.id === "you" ? (
            <div className="nt-form">
              <Group title="About you">
                <Row label="Name">
                  <input
                    className="nt-input"
                    value={answers.name}
                    onChange={(event) =>
                      dispatch({
                        type: "patch",
                        partial: { name: event.target.value },
                      })
                    }
                    style={{ maxWidth: 220 }}
                  />
                </Row>
                <Row label="Time zone">
                  <Select
                    label="Time zone"
                    value={answers.timeZone}
                    options={TIME_ZONE_OPTIONS}
                    onChange={(value) =>
                      dispatch({ type: "patch", partial: { timeZone: value } })
                    }
                    width={220}
                  />
                </Row>
              </Group>

              {/* Five miniatures of a real day rather than five words — System
                  first, because agreeing with the machine is the right
                  default and the rest are a preference. */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  paddingTop: 5,
                }}
              >
                <span
                  style={{
                    font: "var(--type-meta-medium)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Theme
                </span>
                <div style={{ display: "flex", gap: 11, flexWrap: "wrap" }}>
                  {THEME_OPTIONS.map(({ id, label }) => (
                    <ThemeThumb
                      key={id}
                      id={id}
                      label={label}
                      active={theme === id}
                      onPick={onTheme}
                      pair={pair}
                    />
                  ))}
                </div>
                <Row
                  label="Follow the day"
                  hint="Paper warms toward sunset; after dusk the dark side takes over."
                >
                  <Toggle
                    checked={drift}
                    onChange={onDrift}
                    label="Follow the day"
                  />
                </Row>
              </div>
            </div>
          ) : null}

          {step.id === "hours" ? (
            <div className="nt-form">
              <Group title="Working hours">
                <Row label="Day starts">
                  <input
                    className="nt-input"
                    type="time"
                    value={answers.hoursStart}
                    onChange={(event) =>
                      dispatch({
                        type: "patch",
                        partial: { hoursStart: event.target.value },
                      })
                    }
                    style={{ width: 120 }}
                  />
                </Row>
                <Row label="Day ends">
                  <input
                    className="nt-input"
                    type="time"
                    value={answers.hoursEnd}
                    onChange={(event) =>
                      dispatch({
                        type: "patch",
                        partial: { hoursEnd: event.target.value },
                      })
                    }
                    style={{ width: 120 }}
                  />
                </Row>
                <Row label="Week starts">
                  <Select
                    label="Week starts"
                    value={answers.weekStart}
                    options={WEEK_START_OPTIONS}
                    onChange={(value) =>
                      dispatch({
                        type: "patch",
                        partial: { weekStart: value === "sun" ? "sun" : "mon" },
                      })
                    }
                    width={140}
                  />
                </Row>
                <Row
                  label="Weekends"
                  hint="The scheduler leaves them alone unless you say otherwise."
                >
                  <Toggle
                    checked={answers.weekends}
                    onChange={(weekends) =>
                      dispatch({ type: "patch", partial: { weekends } })
                    }
                    label="Let the scheduler use weekends"
                  />
                </Row>
              </Group>
            </div>
          ) : null}

          {step.id === "view" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {ONBOARDING_VIEWS.map(({ id, label, note }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    dispatch({ type: "patch", partial: { view: id } })
                  }
                  aria-pressed={answers.view === id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 8,
                    border: 0,
                    cursor: "default",
                    textAlign: "left",
                    borderRadius: "var(--radius-lg)",
                    background:
                      answers.view === id
                        ? "var(--fill-accent)"
                        : "var(--fill-2)",
                    transition: "background-color var(--transition-hover)",
                  }}
                >
                  <span
                    style={{
                      flex: "0 0 auto",
                      display: "flex",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      boxShadow:
                        answers.view === id
                          ? "var(--shadow-focus)"
                          : "var(--shadow-ring)",
                    }}
                  >
                    <Miniature kind={ONBOARDING_VIEW_KIND[id]} width={112} />
                  </span>
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        font: "var(--type-ui-medium)",
                        color:
                          answers.view === id
                            ? "var(--accent)"
                            : "var(--text-primary)",
                      }}
                    >
                      {label}
                    </span>
                    <span
                      style={{
                        font: "var(--type-meta)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {note}
                    </span>
                  </span>
                </button>
              ))}
              <p
                style={{
                  margin: 0,
                  font: "var(--type-meta)",
                  color: "var(--text-muted)",
                }}
              >
                This is what Needt opens on. All three stay available — Settings
                changes which one is first.
              </p>
            </div>
          ) : null}

          {step.id === "calendars" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                {
                  key: "apple" as const,
                  name: "Apple Calendar",
                  mail: "you@icloud.com",
                  icon: LuApple,
                  connected: answers.appleConnected,
                  field: "appleConnected" as const,
                },
                {
                  key: "google" as const,
                  name: "Google Calendar",
                  mail: "you@needt.app",
                  icon: LuChrome,
                  connected: answers.googleConnected,
                  field: "googleConnected" as const,
                },
              ].map((cal) => (
                <button
                  key={cal.key}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "patch",
                      partial: { [cal.field]: !cal.connected },
                    })
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    height: 52,
                    padding: "0 11px",
                    border: 0,
                    cursor: "default",
                    textAlign: "left",
                    borderRadius: "var(--radius-xl)",
                    background: cal.connected
                      ? "var(--fill-accent)"
                      : "var(--fill-2)",
                    transition: "background-color var(--transition-hover)",
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface-raised)",
                      boxShadow: "var(--shadow-ring)",
                    }}
                  >
                    <Glyph of={cal.icon} size={15} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        font: "var(--type-ui-medium)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {cal.name}
                    </span>
                    <span
                      style={{
                        font: "var(--type-meta)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {cal.mail}
                    </span>
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        background: CALENDAR_TONE[cal.key],
                      }}
                    />
                    <span
                      style={{
                        font: "var(--type-meta-medium)",
                        color: cal.connected
                          ? "var(--accent)"
                          : "var(--text-muted)",
                      }}
                    >
                      {cal.connected ? "Connected" : "Connect"}
                    </span>
                  </span>
                </button>
              ))}
              <p
                style={{
                  margin: "6px 0 0",
                  font: "var(--type-meta)",
                  color: "var(--text-muted)",
                }}
              >
                Events keep their calendar&apos;s colour. Tasks stay white and
                take a rail.
              </p>
            </div>
          ) : null}

          {step.id === "first" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {answers.captured.map((task, n) => (
                <span
                  key={n}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--text-disabled)",
                      width: 14,
                    }}
                  >
                    {n + 1}
                  </span>
                  <input
                    className="nt-input"
                    value={task}
                    placeholder={
                      n === 2
                        ? "One more thing on your mind"
                        : "Something you owe someone"
                    }
                    onChange={(event) => {
                      const next = [...answers.captured] as [
                        string,
                        string,
                        string,
                      ];
                      next[n] = event.target.value;
                      dispatch({ type: "patch", partial: { captured: next } });
                    }}
                    style={{ flex: 1 }}
                  />
                </span>
              ))}
              <p
                style={{
                  margin: "6px 0 0",
                  font: "var(--type-meta)",
                  color: "var(--text-muted)",
                }}
              >
                {filled} of 3 captured. Needt places them into your free hours —
                you can move any of them after.
              </p>
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingTop: 16,
          }}
        >
          {index > 0 ? (
            <button type="button" className="btn btn-flat" onClick={back}>
              <Glyph of={LuArrowLeft} size={16} />
              Back
            </button>
          ) : null}
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onDone(answers.view)}
            >
              Skip
            </button>
            {index < ONBOARDING_STEPS.length - 1 ? (
              <button
                type="button"
                className="btn btn-accent"
                onClick={advance}
                disabled={!canGoNext}
              >
                Next
                <Glyph of={LuArrowRight} size={16} />
              </button>
            ) : (
              <button type="button" className="btn btn-accent" onClick={finish}>
                {planning ? (
                  <>
                    <span
                      className="nt-spinner"
                      style={{ width: 14, height: 14 }}
                    />
                    Placing…
                  </>
                ) : (
                  <>
                    Plan my day
                    <Glyph of={LuSparkles} size={16} />
                  </>
                )}
              </button>
            )}
          </span>
        </div>
      </div>

      {/* The plate answers each step: hours shade in, calendars tint their
          events, captured tasks arrive as blocks. */}
      <LivePlate
        hours={index >= 1}
        calendars={
          index >= 3 && (answers.appleConnected || answers.googleConnected)
        }
        placed={[2, 3, 4, 5, 6][index]}
      />
    </div>
  );
}
