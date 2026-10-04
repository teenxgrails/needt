"use client";

/* SETUP — the same five steps as the desktop, one per screen instead of a
 * column with a rail.
 *
 * Ported from `MobileAuth.jsx`'s `MbSetup`. THE STEP MACHINE IS IMPORTED, NOT
 * REWRITTEN: `onboardingReducer`, `ONBOARDING_STEPS`, `canAdvanceOnboardingStep`
 * and `onboardingCapturedCount` all come from `../auth/onboarding-steps` — the
 * same framework-free module the desktop's `OnboardingScreen` drives. Order,
 * the per-step requirement, and "going back keeps what was entered" are that
 * module's own guarantees, unit-tested there; this file only draws the five
 * screens, one at a time, with a progress strip and a count instead of the
 * desktop's rail beside the step — a phone has no room for a list beside the
 * step it is on.
 */
import * as React from "react";

import { LuArrowRight, LuCalendar } from "react-icons/lu";

import {
  ONBOARDING_STEPS,
  ONBOARDING_VIEWS,
  ONBOARDING_VIEW_KIND,
  canAdvanceOnboardingStep,
  initialOnboardingState,
  onboardingReducer,
} from "../auth/onboarding-steps";
import { Miniature } from "../home";
import { Glyph } from "../shell/chrome";
import { AUTH_BUTTON_HEIGHT } from "./mobile-logic";

export interface MobileOnboardingProps {
  onDone: () => void;
  /** Opens straight onto a given step — the palette's own "jump to setup". */
  startStep?: number;
}

export function MobileOnboarding({
  onDone,
  startStep = 0,
}: MobileOnboardingProps) {
  const [state, dispatch] = React.useReducer(
    onboardingReducer,
    initialOnboardingState(startStep)
  );
  const step = ONBOARDING_STEPS[state.index];
  const canAdvance = canAdvanceOnboardingStep(step.id, state.answers);
  const isLast = state.index === ONBOARDING_STEPS.length - 1;

  function next() {
    if (isLast) {
      onDone();
      return;
    }
    dispatch({ type: "advance" });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        padding: "8px 20px 20px",
        gap: 16,
      }}
    >
      <div
        style={{ flex: "none", display: "flex", alignItems: "center", gap: 8 }}
      >
        <span style={{ display: "flex", gap: 4, flex: 1 }}>
          {ONBOARDING_STEPS.map((s, index) => (
            <span
              key={s.id}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background:
                  index <= state.index ? "var(--accent)" : "var(--fill-3)",
              }}
            />
          ))}
        </span>
        <span
          style={{
            flex: "none",
            font: "var(--type-meta)",
            color: "var(--text-quaternary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {state.index + 1} of {ONBOARDING_STEPS.length}
        </span>
      </div>

      <div
        style={{
          flex: "none",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <span
          className="display"
          style={{
            fontSize: 27,
            lineHeight: 1.1,
            color: "var(--text-primary)",
          }}
        >
          {step.title}
        </span>
        <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>
          {step.sub}
        </span>
      </div>

      <div
        key={step.id}
        className="scroll-inner"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {step.id === "you" ? (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  font: "var(--type-meta-medium)",
                  color: "var(--text-secondary)",
                }}
              >
                What should Needt call you?
              </span>
              <input
                className="nt-input"
                value={state.answers.name}
                onChange={(event) =>
                  dispatch({
                    type: "patch",
                    partial: { name: event.target.value },
                  })
                }
                style={{ minHeight: 48 }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  font: "var(--type-meta-medium)",
                  color: "var(--text-secondary)",
                }}
              >
                Time zone
              </span>
              <input
                className="nt-input"
                defaultValue="Europe / Berlin"
                style={{ minHeight: 48 }}
              />
              <span
                style={{
                  font: "var(--type-meta)",
                  color: "var(--text-quaternary)",
                }}
              >
                Used for the day&apos;s start and the now-line.
              </span>
            </label>
          </>
        ) : null}

        {step.id === "hours" ? (
          <>
            <div style={{ display: "flex", gap: 11 }}>
              <label
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    font: "var(--type-meta-medium)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Day starts
                </span>
                <input
                  className="nt-input"
                  value={state.answers.hoursStart}
                  onChange={(event) =>
                    dispatch({
                      type: "patch",
                      partial: { hoursStart: event.target.value },
                    })
                  }
                  style={{ minHeight: 48 }}
                />
              </label>
              <label
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    font: "var(--type-meta-medium)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Day ends
                </span>
                <input
                  className="nt-input"
                  value={state.answers.hoursEnd}
                  onChange={(event) =>
                    dispatch({
                      type: "patch",
                      partial: { hoursEnd: event.target.value },
                    })
                  }
                  style={{ minHeight: 48 }}
                />
              </label>
            </div>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                minHeight: 48,
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  font: "var(--type-ui)",
                  color: "var(--text-primary)",
                }}
              >
                Weekends
              </span>
              <input
                type="checkbox"
                checked={state.answers.weekends}
                onChange={(event) =>
                  dispatch({
                    type: "patch",
                    partial: { weekends: event.target.checked },
                  })
                }
                style={{ width: 22, height: 22 }}
              />
            </span>
          </>
        ) : null}

        {step.id === "view" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {ONBOARDING_VIEWS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    dispatch({ type: "patch", partial: { view: option.id } })
                  }
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: 0,
                    border: 0,
                    background: "transparent",
                    cursor: "default",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      boxShadow:
                        state.answers.view === option.id
                          ? "rgba(var(--accent-rgb), 0.55) 0 0 0 1.5px inset"
                          : "var(--shadow-inset-ring)",
                    }}
                  >
                    <Miniature
                      kind={ONBOARDING_VIEW_KIND[option.id]}
                      width={104}
                    />
                  </span>
                  <span
                    style={{
                      font: "var(--type-meta-medium)",
                      textAlign: "left",
                      color:
                        state.answers.view === option.id
                          ? "var(--accent)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
            <span
              style={{
                font: "var(--type-meta)",
                color: "var(--text-muted)",
                textWrap: "pretty",
              }}
            >
              {
                ONBOARDING_VIEWS.find(
                  (option) => option.id === state.answers.view
                )?.note
              }{" "}
              You can change it any day.
            </span>
          </div>
        ) : null}

        {step.id === "calendars" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(
              [
                ["googleConnected", "Google Calendar"],
                ["appleConnected", "Apple Calendar"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  dispatch({
                    type: "patch",
                    partial: { [key]: !state.answers[key] },
                  })
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  minHeight: 56,
                  padding: "0 14px",
                  border: 0,
                  cursor: "default",
                  borderRadius: "var(--radius-xl)",
                  background: "var(--surface-raised)",
                  boxShadow: "var(--shadow-ring)",
                }}
              >
                <Glyph of={LuCalendar} size={18} />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: "left",
                    font: "var(--type-ui-medium)",
                    color: "var(--text-primary)",
                  }}
                >
                  {label}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    flex: "none",
                    display: "grid",
                    placeItems: "center",
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    background: state.answers[key]
                      ? "var(--accent)"
                      : "transparent",
                    boxShadow: state.answers[key]
                      ? "none"
                      : "inset 0 0 0 1.5px var(--text-disabled)",
                  }}
                />
              </button>
            ))}
            <span
              style={{
                font: "var(--type-meta)",
                color: "var(--text-muted)",
                textWrap: "pretty",
              }}
            >
              Events you already agreed to are the fixed part of the day. Needt
              places work around them.
            </span>
          </div>
        ) : null}

        {step.id === "first" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {state.answers.captured.map((value, index) => (
              <input
                key={index}
                className="nt-input"
                value={value}
                placeholder={
                  index
                    ? "Something else on your mind"
                    : "Something you owe someone"
                }
                onChange={(event) => {
                  const captured = [...state.answers.captured] as [
                    string,
                    string,
                    string,
                  ];
                  captured[index] = event.target.value;
                  dispatch({ type: "patch", partial: { captured } });
                }}
                style={{ minHeight: 48 }}
              />
            ))}
            <span
              style={{
                font: "var(--type-meta)",
                color: "var(--text-muted)",
                textWrap: "pretty",
              }}
            >
              Needt places these into your free hours as soon as you finish.
            </span>
          </div>
        ) : null}
      </div>

      <div style={{ flex: "none", display: "flex", gap: 8 }}>
        {state.index > 0 ? (
          <button
            type="button"
            onClick={() => dispatch({ type: "back" })}
            style={{
              flex: "none",
              minHeight: AUTH_BUTTON_HEIGHT,
              padding: "0 18px",
              border: 0,
              cursor: "default",
              borderRadius: "var(--radius-xl)",
              background: "var(--surface-raised)",
              boxShadow: "var(--shadow-raised)",
              font: "var(--type-ui-medium)",
              color: "var(--text-primary)",
            }}
          >
            Back
          </button>
        ) : null}
        <span style={{ flex: 1 }}>
          <button
            type="button"
            onClick={next}
            disabled={!canAdvance}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              minHeight: AUTH_BUTTON_HEIGHT,
              padding: "0 16px",
              border: 0,
              cursor: "default",
              borderRadius: "var(--radius-xl)",
              font: "var(--type-ui-medium)",
              background: "var(--fill-accent)",
              color: canAdvance ? "var(--accent)" : "var(--text-disabled)",
              opacity: canAdvance ? 1 : 0.6,
            }}
          >
            {isLast ? "Open Needt" : "Next"}
            <Glyph of={LuArrowRight} size={15} />
          </button>
        </span>
      </div>
    </div>
  );
}
