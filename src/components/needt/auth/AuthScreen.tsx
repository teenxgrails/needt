"use client";

/* SIGN IN / SIGN UP.
 *
 * Ported from `AuthScreen` in
 * `Content height and label fixes/needt-app/AuthScreen.jsx`. Composition is
 * the split PORT.md §3 calls out: the decision in one narrow column on the
 * left, a real running day on the right (`LivePlate`) — a demonstration, not
 * an illustration.
 *
 * This is a design port, not an auth implementation: the form submits to
 * `onSubmit`, a callback prop. No NextAuth, no route handler, no session.
 * `onSubmit` defaults to the prototype's own mock (a 900ms delay, one email
 * that is always "taken", one password that is always "wrong") so the
 * refusal states stay reachable without a caller wiring anything — a real
 * caller passes its own `onSubmit` and this default is never reached.
 */
import * as React from "react";

import type { IconType } from "react-icons";
import {
  LuApple,
  LuChrome,
  LuCircleAlert,
  LuEye,
  LuEyeOff,
  LuGithub,
} from "react-icons/lu";

import { ExposureWordmark as Wordmark } from "@/components/needt/wordmark";

import { Glyph, IconButton } from "../shell/chrome";
import { LivePlate } from "./LivePlate";

export type AuthMode = "login" | "signup";

/** Why the pair was refused. "taken": that email already has an account
 * (sign up). "wrong": the email and password do not match (sign in). */
export type AuthRefusalReason = "taken" | "wrong";

export interface AuthResult {
  readonly ok: boolean;
  readonly reason?: AuthRefusalReason;
}

export interface AuthScreenSeed {
  readonly mail?: string;
  readonly pass?: string;
  readonly refused?: AuthRefusalReason | null;
  readonly touched?: boolean;
}

export interface AuthScreenProps {
  mode: AuthMode;
  onMode: (mode: AuthMode) => void;
  /** Called once the pair is accepted. */
  onDone: () => void;
  /** Verifies the pair. Replace with real auth; the default below is the
   * prototype's own demo behaviour. */
  onSubmit?: (input: {
    mode: AuthMode;
    email: string;
    password: string;
  }) => Promise<AuthResult> | AuthResult;
  seed?: AuthScreenSeed;
  embedded?: boolean;
}

const MOCK_SUBMIT_DELAY_MS = 900;
/* The kit's own two reachable refusals, so both are demoable without a
 * server: one address that is always taken, one password that is always
 * wrong. */
const MOCK_TAKEN_EMAIL = "taken@needt.app";
const MOCK_CORRECT_PASSWORD = "needt2026";

async function defaultAuthSubmit({
  mode,
  email,
  password,
}: {
  mode: AuthMode;
  email: string;
  password: string;
}): Promise<AuthResult> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_SUBMIT_DELAY_MS);
  });
  if (mode === "signup" && email.trim().toLowerCase() === MOCK_TAKEN_EMAIL) {
    return { ok: false, reason: "taken" };
  }
  if (mode === "login" && password !== MOCK_CORRECT_PASSWORD) {
    return { ok: false, reason: "wrong" };
  }
  return { ok: true };
}

function OAuthButton({
  icon,
  children,
  onClick,
}: {
  icon: IconType;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="btn"
      onClick={onClick}
      style={{ width: "100%" }}
    >
      <Glyph of={icon} size={16} />
      {children}
    </button>
  );
}

export function AuthScreen({
  mode,
  onMode,
  onDone,
  onSubmit = defaultAuthSubmit,
  seed,
  embedded = false,
}: AuthScreenProps) {
  const signup = mode !== "login";
  const [mail, setMail] = React.useState(seed?.mail ?? "");
  const [pass, setPass] = React.useState(seed?.pass ?? "");
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [refused, setRefused] = React.useState<AuthRefusalReason | null>(
    seed?.refused ?? null
  );
  const [touched, setTouched] = React.useState(!!seed?.touched);

  const short = pass.length > 0 && pass.length < 8;
  const badMail = touched && mail.length > 0 && mail.indexOf("@") < 1;
  const noMail = touched && mail.length === 0;

  /* Errors name the fix and sit under their own field. The refusal is about
   * the pair, not one field, so it sits above the button — where the
   * decision is. */
  async function submit() {
    if (busy) return;
    setTouched(true);
    if (!mail || mail.indexOf("@") < 1 || pass.length < 8) return;
    setBusy(true);
    const result = await onSubmit({ mode, email: mail, password: pass });
    setBusy(false);
    if (!result.ok) {
      setRefused(result.reason ?? null);
      return;
    }
    onDone();
  }

  const refusal =
    refused === "taken"
      ? "That address already has an account. Sign in instead."
      : refused === "wrong"
        ? "That email and password do not match."
        : null;

  return (
    <div
      className="auth-enter"
      style={
        embedded
          ? {
              position: "relative",
              height: "100%",
              display: "flex",
              gap: 0,
              padding: 20,
              background: "var(--background)",
            }
          : {
              position: "fixed",
              inset: 0,
              zIndex: "var(--z-modal)" as unknown as number,
              display: "flex",
              gap: 0,
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
          justifyContent: "center",
          padding: "0 40px",
        }}
      >
        <Wordmark size={64} />
        <h1
          style={{
            margin: "28px 0 6px",
            font: "var(--type-page-title)",
            color: "var(--text-primary)",
          }}
        >
          {signup ? "Create your account" : "Sign in"}
        </h1>
        <p
          style={{
            margin: "0 0 21px",
            font: "var(--type-ui)",
            color: "var(--text-muted)",
          }}
        >
          {signup
            ? "One planner for your calendar, your tasks and your projects."
            : "Welcome back. Your day is where you left it."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <OAuthButton icon={LuChrome} onClick={onDone}>
            Continue with Google
          </OAuthButton>
          <OAuthButton icon={LuApple} onClick={onDone}>
            Continue with Apple
          </OAuthButton>
          <OAuthButton icon={LuGithub} onClick={onDone}>
            Continue with GitHub
          </OAuthButton>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            margin: "21px 0",
          }}
        >
          <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span
            style={{ font: "var(--type-meta)", color: "var(--text-disabled)" }}
          >
            or
          </span>
          <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                font: "var(--type-meta-medium)",
                color: "var(--text-secondary)",
              }}
            >
              Email
            </span>
            <input
              className="nt-input"
              value={mail}
              aria-invalid={
                badMail || noMail || refused === "taken" ? "true" : undefined
              }
              onChange={(event) => {
                setRefused(null);
                setMail(event.target.value);
              }}
              placeholder="you@example.com"
            />
            {noMail ? (
              <span
                style={{
                  font: "var(--type-meta)",
                  color: "var(--destructive)",
                }}
              >
                Enter your email.
              </span>
            ) : badMail ? (
              <span
                style={{
                  font: "var(--type-meta)",
                  color: "var(--destructive)",
                }}
              >
                Include an @ in the address.
              </span>
            ) : null}
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                font: "var(--type-meta-medium)",
                color: "var(--text-secondary)",
              }}
            >
              Password
            </span>
            <span style={{ position: "relative", display: "flex" }}>
              <input
                className="nt-input"
                type={show ? "text" : "password"}
                value={pass}
                aria-invalid={short || refused === "wrong" ? "true" : undefined}
                onChange={(event) => {
                  setRefused(null);
                  setPass(event.target.value);
                }}
                placeholder="At least 8 characters"
                style={{ flex: 1, paddingRight: 36 }}
              />
              <span style={{ position: "absolute", right: 2, top: 2 }}>
                <IconButton
                  label={show ? "Hide password" : "Show password"}
                  variant="ghost"
                  icon={<Glyph of={show ? LuEyeOff : LuEye} size={14} />}
                  onClick={() => setShow((current) => !current)}
                />
              </span>
            </span>
            <span
              style={{
                font: "var(--type-meta)",
                color: short ? "var(--destructive)" : "var(--text-muted)",
              }}
            >
              {short
                ? "Use at least 8 characters."
                : "Must be at least 8 characters."}
            </span>
          </label>
          {refusal ? (
            <span
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                padding: "8px 11px",
                borderRadius: "var(--radius-lg)",
                background: "var(--fill-destructive)",
                font: "var(--type-meta)",
                color: "var(--destructive)",
              }}
            >
              <Glyph of={LuCircleAlert} size={13} />
              {refusal}
            </span>
          ) : null}
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => void submit()}
            disabled={busy}
            style={{ width: "100%" }}
          >
            {busy ? (
              <>
                <span
                  className="nt-spinner"
                  style={{ width: 14, height: 14 }}
                />
                Setting up your day…
              </>
            ) : signup ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </button>
          <p
            style={{
              margin: 0,
              textAlign: "center",
              font: "var(--type-meta)",
              color: "var(--text-muted)",
            }}
          >
            {signup ? "Already have an account? " : "New here? "}
            <button
              type="button"
              onClick={() => onMode(signup ? "login" : "signup")}
              style={{
                border: 0,
                background: "none",
                padding: 0,
                cursor: "default",
                font: "var(--type-meta-medium)",
                color: "var(--accent)",
              }}
            >
              {signup ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>

      <LivePlate hours calendars placed={6} />
    </div>
  );
}
