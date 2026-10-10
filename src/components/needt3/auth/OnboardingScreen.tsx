"use client";

/* ONBOARDING (prototype OnboardingScreen, owner-approved 08.10.26): five steps
   that end in the product doing its one trick. Everything a step decides is
   written when you leave it, through the same APIs the rest of the app uses:
     use      -> settings prefs.uses
     setup    -> auto-schedule settings (working hours), settings.timeZone
     sidebar  -> settings prefs.sidebarTiles (every place id, in order)
     first    -> a real task (POST /api/tasks), left for the scheduler
     finish   -> prefs.onboarded = true, then Home
   Skip saves nothing further and goes Home. Nothing here creates an account
   or enters a credential.

   Not ported, and why: the real Composer inside step 4 (it belongs to the
   composer lane; a plain field with the same Enter-to-add stands in), the
   prototype's parser and first-slot planner (the server's scheduler owns
   placement; step 5 shows what it returned), half-hour working hours (the
   schema stores whole hours), and the in-flow calendar OAuth mock (connecting
   leaves for the provider's own consent screen). */
import * as React from "react";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import {
  LuArrowLeft,
  LuCheck,
  LuSparkles,
} from "react-icons/lu";

import { NeedtPicker } from "@/components/ui/needt-picker";

import { logger } from "@/lib/logger";
import { useConnections } from "@/lib/needt3/hooks/connections";
import { fetchJson, sendJson } from "@/lib/needt3/hooks/core";
import { useSettings, useUpdateSettings } from "@/lib/needt3/hooks/settings";
import { useCreateTask } from "@/lib/needt3/hooks/tasks";
import type { V3Task } from "@/lib/needt3/map";
import { qk } from "@/lib/needt3/query-keys";
import { THEMES, type ThemeChoice } from "@/lib/needt3/theme";
import { useOnline } from "@/lib/needt3/use-online";
import { notify } from "@/lib/notifications";

import { useNeedt3Ui } from "@/store/needt3-ui";

import { Art, type ArtName } from "../menu/Art";
import {
  GlassCard,
  PwDateCard,
  PwMiniEvent,
  PwMiniHabit,
  PwMiniTask,
  PxDots,
  PxSky,
} from "../scenes";
import { PLACES } from "../shell/places";
import { NeedtLockup } from "../wordmark";
import { SidebarGame } from "./SidebarGame";
import {
  HOUR_CHOICES,
  STEPS,
  STEP_IDS,
  STEP_SKY,
  badHours,
  clampStep,
  goTo,
  hhmm,
  startOrder,
  stepIndex,
} from "./onboarding-steps";

const LOG_SOURCE = "needt3-onboarding";

const HEAD: Record<(typeof STEP_IDS)[number], React.ReactNode> = {
  use: (
    <>
      What will you use Needt <em>for</em>?
    </>
  ),
  setup: (
    <>
      Your calendar and <em>hours</em>
    </>
  ),
  sidebar: (
    <>
      Make your <em>sidebar</em>
    </>
  ),
  first: (
    <>
      Your first <em>task</em>
    </>
  ),
  placed: (
    <>
      Here’s where Needt <em>put</em> it
    </>
  ),
};

const USES: ReadonlyArray<readonly [string, string, string, ArtName]> = [
  ["work", "Work", "Projects, meetings and the tasks between them", "work"],
  [
    "personal",
    "Personal",
    "Errands, habits and the things you keep meaning to do",
    "home",
  ],
  [
    "side",
    "Side business",
    "Listings, orders and the work around a second income",
    "stack",
  ],
];

/** Calendars with a real connect flow today. Apple (CalDAV) needs its own form. */
const CALS: ReadonlyArray<{
  id: string;
  provider: string;
  title: string;
  sub: string;
  art: ArtName;
  href: string | null;
}> = [
  {
    id: "google",
    provider: "google",
    title: "Google Calendar",
    sub: "Two-way sync with your Google account",
    art: "event",
    href: "/api/calendar/google/auth",
  },
  {
    id: "apple",
    provider: "caldav",
    title: "Apple Calendar",
    sub: "iCloud calendars — connect from Settings",
    art: "calendarfile",
    href: null,
  },
  {
    id: "outlook",
    provider: "outlook",
    title: "Outlook",
    sub: "Microsoft 365 or Outlook.com",
    art: "mail",
    href: "/api/calendar/outlook/auth",
  },
];

const USE_ROWS: Record<
  string,
  ReadonlyArray<readonly [string, string | null]>
> = {
  work: [
    ["Draft the launch brief", "Work"],
    ["Reply to Tom", "Mailbox"],
  ],
  personal: [
    ["Pick up the prints", "Errand"],
    ["Call mum", null],
  ],
  side: [
    ["List the boots on Ricardo", "Side"],
    ["Ship order #2041", "Side"],
  ],
};

function Row({
  art,
  title,
  sub,
  on,
  onClick,
  delay,
  multi,
  compact,
  disabled,
}: {
  art: ArtName;
  title: string;
  sub: string;
  on: boolean;
  onClick: () => void;
  delay?: number;
  multi?: boolean;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={
        "ax-row nx-swap" +
        (on ? " is-on" : "") +
        (compact ? " is-compact" : "") +
        " auth-row-row"
      }
      style={{
        animationDelay: (delay || 0) + "ms",
        background: on ? "var(--fill-accent)" : "var(--surface-raised)",
        boxShadow: on
          ? "inset 0 0 0 1.5px var(--accent)"
          : "var(--shadow-ring)",
      }}
    >
      <span className="auth-row-row-2">
        <Art name={art} size={compact ? 30 : 38} />
      </span>
      <span className="auth-row-col">
        <span className="auth-row-text">{title}</span>
        <span className="auth-row-text-2">{sub}</span>
      </span>
      <span
        aria-hidden="true"
        className="auth-row-grid"
        style={{
          borderRadius: multi ? 6 : 10,
          background: on ? "var(--accent)" : "transparent",
          boxShadow: on ? "none" : "inset 0 0 0 1.5px var(--text-muted)",
        }}
      >
        {on ? <LuCheck size={12} /> : null}
      </span>
    </button>
  );
}

function Select({
  value,
  options,
  onChange,
  label,
  invalid,
  wide,
}: {
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (v: string) => void;
  label: string;
  invalid?: boolean;
  wide?: boolean;
}) {
  /* The one product picker (check:ui-contracts retires a bare select). */
  return (
    <span
      className={
        "auth-select" +
        (wide ? " is-wide" : "") +
        (invalid ? " is-invalid" : "")
      }
    >
      <NeedtPicker
        value={value}
        options={options.map(([v, l]) => ({ value: v, label: l }))}
        onValueChange={onChange}
        ariaLabel={label}
        triggerVariant="field"
      />
    </span>
  );
}

function ThemeSwitch() {
  const theme = useNeedt3Ui((s) => s.theme);
  const setTheme = useNeedt3Ui((s) => s.setTheme);
  const update = useUpdateSettings();
  return (
    <div
      className="auth-theme"
      role="radiogroup"
      aria-label="Theme"
      data-px-calm
    >
      {THEMES.map(([id, l]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={theme === id}
          className={"auth-theme-b" + (theme === id ? " is-on" : "")}
          data-ob-theme={id}
          onClick={() => {
            setTheme(id as ThemeChoice);
            void update.mutateAsync({ theme: id }).catch(() => undefined);
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/** Glass cards of the product beside the headline, per step. */
function StepArt({
  id,
  uses,
  hours,
}: {
  id: string;
  uses: string[];
  hours: string;
}) {
  const pin = (
    at: React.CSSProperties,
    delay: number,
    child: React.ReactNode
  ) => (
    <span
      className="nx-swap"
      style={{ position: "absolute", animationDelay: delay + "ms", ...at }}
    >
      {child}
    </span>
  );
  if (id === "sidebar") return null;
  if (id === "use") {
    const picked = uses.length ? uses : ["work"];
    const rows = picked.flatMap((u) => USE_ROWS[u] ?? []).slice(0, 4);
    return (
      <div className="axs-art" aria-hidden="true">
        {pin(
          { left: 0, top: 10 },
          60,
          <GlassCard
            width={262}
            caption={`Inbox · ${rows.length}`}
            pad={10}
            radius={20}
          >
            <span className="auth-stack-6">
              {rows.map(([t, c]) => (
                <PwMiniTask key={t} title={t} chip={c} />
              ))}
            </span>
          </GlassCard>
        )}
        {pin(
          { left: 190, top: 196 },
          140,
          <GlassCard width={238} caption="Habit · day 6" pad={10} radius={20}>
            <PwMiniHabit title="Shoot one roll" streak="6 days" />
          </GlassCard>
        )}
      </div>
    );
  }
  if (id === "setup") {
    return (
      <div className="axs-art" aria-hidden="true">
        {pin({ left: 0, top: 10 }, 60, <PwDateCard width={118} />)}
        {pin(
          { left: 134, top: 40 },
          120,
          <GlassCard
            width={250}
            pad={10}
            radius={20}
            caption={`Tue · your hours ${hours}`}
          >
            <span className="auth-stack-6">
              <PwMiniEvent
                time="08:00"
                title="Coffee · Kreis 5"
                hue="var(--demo-hue-green)"
              />
              <PwMiniEvent time="09:30" title="Standup" hue="var(--hue-blue)" />
              <PwMiniEvent
                time="12:00"
                title="Lunch with Ana"
                hue="var(--demo-hue-gray)"
              />
              <PwMiniEvent
                time="14:00"
                title="Shoot · Kreis 4"
                hue="var(--demo-hue-orange)"
              />
            </span>
          </GlassCard>
        )}
      </div>
    );
  }
  if (id === "first") {
    return (
      <div className="axs-art" aria-hidden="true">
        {pin(
          { left: 0, top: 16 },
          60,
          <GlassCard
            width={292}
            caption="Needt reads the words"
            pad={10}
            radius={20}
          >
            <span className="auth-stack-6">
              <PwMiniTask title="Plan the week" chip="30 min" />
              <PwMiniTask title="Pay the rent" chip="by Friday" />
              <PwMiniTask title="Draft the brief" chip="Work" />
            </span>
          </GlassCard>
        )}
      </div>
    );
  }
  return (
    <div className="axs-art" aria-hidden="true">
      {pin({ left: 0, top: 10 }, 60, <PwDateCard width={118} event={false} />)}
    </div>
  );
}

interface HoursRow {
  workHourStart?: number;
  workHourEnd?: number;
}

const ZONES = ["UTC", "Europe/Berlin", "Europe/London", "America/New_York"];
const zoneLabel = (z: string) => z.replace(/_/g, " ");

export function OnboardingScreen({ startAt }: { startAt?: string | null }) {
  const router = useRouter();
  const qc = useQueryClient();
  const online = useOnline();
  const settings = useSettings();
  const update = useUpdateSettings();
  const createTask = useCreateTask();
  const connections = useConnections();

  const [i, setI] = React.useState(() =>
    clampStep(stepIndex(startAt || "use"))
  );
  const [dir, setDir] = React.useState<1 | -1>(1);
  const [uses, setUses] = React.useState<string[]>(["work"]);
  const [start, setStart] = React.useState(9);
  const [end, setEnd] = React.useState(18);
  const [tz, setTz] = React.useState("");
  const [skipCal, setSkipCal] = React.useState(false);
  const [tiles, setTiles] = React.useState<string[]>(() =>
    PLACES.map((p) => p.id)
  );
  const [title, setTitle] = React.useState("");
  const [first, setFirst] = React.useState<V3Task | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [planning, setPlanning] = React.useState(false);
  const seeded = React.useRef(false);

  /* Start from what is already saved: hours from the scheduler's settings, the
     zone from settings (else this device's), the tile order from the prefs. */
  React.useEffect(() => {
    if (seeded.current || !settings.data) return;
    seeded.current = true;
    const s = settings.data;
    setTz(s.timeZone);
    setTiles(
      startOrder(
        PLACES.map((p) => p.id),
        s.prefs.sidebarTiles
      )
    );
    if (Array.isArray(s.prefs.uses))
      setUses(s.prefs.uses.filter((u): u is string => typeof u === "string"));
    void fetchJson<HoursRow>("/api/auto-schedule-settings")
      .then((row) => {
        if (typeof row.workHourStart === "number") setStart(row.workHourStart);
        if (typeof row.workHourEnd === "number") setEnd(row.workHourEnd);
      })
      .catch(() => undefined);
  }, [settings.data]);

  const step = STEPS[i];
  const id = step[0];
  const bad = badHours(start, end);
  const connected = new Set(
    (connections.data ?? [])
      .filter((c) => c.kind === "calendar")
      .map((c) => c.provider)
  );
  const zoneOptions: ReadonlyArray<readonly [string, string]> =
    React.useMemo(() => {
      const own = settings.data?.timeZone;
      const list = own && !ZONES.includes(own) ? [own, ...ZONES] : ZONES;
      return list.map((z) => [z, zoneLabel(z)] as const);
    }, [settings.data?.timeZone]);

  const setPref = React.useCallback(
    (patch: Record<string, unknown>) => {
      const cur =
        qc.getQueryData<{ prefs: Record<string, unknown> }>(qk.settings())
          ?.prefs ?? {};
      return update.mutateAsync({ prefs: { ...cur, ...patch } });
    },
    [qc, update]
  );

  /** What a step decided is written when you leave it (forward). */
  async function save(k: string) {
    try {
      if (k === "use") await setPref({ uses });
      if (k === "setup") {
        await sendJson("/api/auto-schedule-settings", "PATCH", {
          workHourStart: start,
          workHourEnd: end,
        });
        if (tz && tz !== settings.data?.timeZone)
          await update.mutateAsync({ timeZone: tz });
      }
      if (k === "sidebar") await setPref({ sidebarTiles: tiles });
    } catch (error) {
      void logger.warn(
        "Onboarding step not saved",
        {
          step: k,
          error: error instanceof Error ? error.message : String(error),
        },
        LOG_SOURCE
      );
      notify.error("Could not save that step. You can change it in Settings.");
    }
  }

  async function go(n: number) {
    const to = goTo({ from: i, to: n, start, end, hasFirst: !!first });
    if (to === null) return;
    if (to > i) for (let k = i; k < to; k++) await save(STEP_IDS[k]);
    setDir(to > i ? 1 : -1);
    setI(to);
  }

  async function addTask() {
    const t = title.trim();
    if (!t || adding || !online) return;
    setAdding(true);
    try {
      const { result } = await createTask.mutateAsync({
        draft: { title: t, estimatedMinutes: 30, auto: true },
      });
      setFirst(result);
      setDir(1);
      setI(stepIndex("placed"));
    } catch {
      /* the mutation already told the person and rolled back */
    } finally {
      setAdding(false);
    }
  }

  async function finish(skipped?: boolean) {
    if (planning) return;
    setPlanning(true);
    if (!skipped) await save(id);
    try {
      await setPref({ onboarded: true });
    } catch {
      /* Home still opens; setup can be shown again */
    }
    router.push("/today");
  }

  function connect(href: string) {
    /* Leaves for the provider's consent screen; what was chosen so far is kept. */
    void save("use")
      .then(() => save("setup"))
      .then(() => {
        window.location.assign(href);
      });
  }

  const hours = `${hhmm(start)}–${hhmm(end)}`;
  const hourOpts = HOUR_CHOICES.map((h) => [String(h), hhmm(h)] as const);

  return (
    <div
      className="auth-enter"
      data-onboarding-step={id}
      style={{ position: "fixed", inset: 0, zIndex: 950 }}
    >
      <PxSky variant={STEP_SKY[id]}>
        <div className="auth-onboarding-abs">
          <div className="auth-onboarding-row">
            <NeedtLockup small />
            <PxDots
              count={STEPS.length}
              index={i}
              onPick={(n) => void go(n)}
              label="Setup"
              names={STEPS.map((s) => s[1])}
              className="auth-onboarding-text"
            />
            <ThemeSwitch />
            <button
              type="button"
              className="axs-skip px-chip-btn"
              data-ob-skip
              onClick={() => void finish(true)}
            >
              Skip setup
            </button>
          </div>

          <div className="auth-onboarding-row-2">
            <div
              key={"h" + id}
              className={
                "axs-left ax-step nx-swap " +
                (dir > 0 ? "is-fwd" : "is-back") +
                " auth-onboarding-col"
              }
            >
              <span className="px-kicker auth-onboarding-el" data-px-calm>
                Step {i + 1} of {STEPS.length}
              </span>
              <h1
                className="px-display px-on-sky axs-h auth-onboarding-text-2"
                data-px-calm
              >
                {HEAD[id]}
              </h1>
              <p className="px-on-sky auth-onboarding-text-3" data-px-calm>
                {step[2]}
              </p>
              <StepArt id={id} uses={uses} hours={hours} />
            </div>

            <GlassCard
              pad={0}
              radius={24}
              strong
              width={520}
              className="axs-card auth-onboarding-card"
            >
              <div className="auth-onboarding-col-2">
                <div
                  key={id}
                  className={
                    "ax-step nx-swap scroll-inner " +
                    (dir > 0 ? "is-fwd" : "is-back") +
                    " auth-onboarding-col-3"
                  }
                >
                  {id === "use" ? (
                    <>
                      <span className="px-kicker auth-onboarding-el-2">
                        Pick any · one or more
                      </span>
                      <div
                        className="auth-stack-8"
                        role="group"
                        aria-label="What you use Needt for"
                      >
                        {USES.map(([uid, t, s, a], n) => (
                          <Row
                            key={uid}
                            art={a}
                            title={t}
                            sub={s}
                            multi
                            on={uses.includes(uid)}
                            delay={60 + n * 40}
                            onClick={() =>
                              setUses((l) =>
                                l.includes(uid)
                                  ? l.filter((x) => x !== uid)
                                  : [...l, uid]
                              )
                            }
                          />
                        ))}
                      </div>
                      {!uses.length ? (
                        <span className="auth-ob-hint">
                          Nothing picked is fine too — Needt starts neutral.
                        </span>
                      ) : null}
                    </>
                  ) : null}

                  {id === "setup" ? (
                    <>
                      <span className="px-kicker auth-onboarding-el-2">
                        Calendar · connect one, or skip
                      </span>
                      <div className="auth-stack-6">
                        {CALS.map((c, n) => {
                          const on = connected.has(c.provider);
                          return (
                            <Row
                              key={c.id}
                              compact
                              multi
                              art={c.art}
                              title={c.title}
                              sub={on ? "Connected" : c.sub}
                              on={on}
                              disabled={on || !c.href || !online}
                              delay={60 + n * 40}
                              onClick={() => c.href && connect(c.href)}
                            />
                          );
                        })}
                        <Row
                          compact
                          art="later"
                          title="Skip for now"
                          sub="Connect one later from Settings"
                          on={skipCal}
                          delay={180}
                          onClick={() => setSkipCal((v) => !v)}
                        />
                        {!online ? (
                          <p
                            className="auth-cal-offline"
                            role="status"
                            data-auth-offline
                          >
                            <span>
                              You’re offline — connecting a calendar needs a
                              connection. The rest of setup still works.
                            </span>
                          </p>
                        ) : null}
                      </div>
                      <span className="px-kicker auth-onboarding-el-2 auth-ob-gap">
                        Working hours
                      </span>
                      <div
                        className="auth-ob-hours nx-swap"
                        style={{ animationDelay: "220ms" }}
                      >
                        <div className="auth-ob-line">
                          <span className="auth-ob-label">Day</span>
                          <Select
                            label="Day starts"
                            value={String(start)}
                            options={hourOpts}
                            onChange={(v) => setStart(Number(v))}
                          />
                          <span className="auth-ob-to">to</span>
                          <Select
                            label="Day ends"
                            value={String(end)}
                            invalid={bad}
                            options={hourOpts}
                            onChange={(v) => setEnd(Number(v))}
                          />
                        </div>
                        {bad ? (
                          <span className="auth-error-text">
                            The day has to end at least an hour after it starts.
                          </span>
                        ) : null}
                        <div className="auth-ob-line">
                          <span className="auth-ob-label">Time zone</span>
                          <Select
                            wide
                            label="Time zone"
                            value={tz || zoneOptions[0][0]}
                            options={zoneOptions}
                            onChange={setTz}
                          />
                        </div>
                        <span className="auth-ob-hint">
                          Needt only places work inside these hours.
                        </span>
                      </div>
                    </>
                  ) : null}

                  {id === "sidebar" ? (
                    <SidebarGame order={tiles} onOrder={setTiles} />
                  ) : null}

                  {id === "first" ? (
                    <>
                      <span className="px-kicker auth-onboarding-el-2">
                        New task
                      </span>
                      <input
                        className="auth-field-input"
                        style={{
                          boxShadow: "var(--shadow-ring)",
                          padding: "0 14px",
                        }}
                        value={title}
                        autoFocus
                        placeholder="Plan the week"
                        aria-label="Task title"
                        data-ob-composer
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void addTask();
                        }}
                      />
                      <span className="auth-ob-hint">
                        Press Enter to add it — Needt finds it a free slot in
                        your hours.
                      </span>
                    </>
                  ) : null}

                  {id === "placed" && first ? (
                    <>
                      <span className="px-kicker auth-onboarding-el-2">
                        Your first task · your hours {hours}
                      </span>
                      <PwMiniTask
                        title={first.title}
                        chip={
                          first.estimatedMinutes
                            ? `${first.estimatedMinutes} min`
                            : null
                        }
                      />
                      <p className="auth-ob-why" data-ob-reason>
                        <LuSparkles size={14} />
                        <span>
                          {first.scheduledStart
                            ? `Needt placed it for ${first.scheduledStart.replace("T", " ")}, inside your hours.`
                            : "Needt places it in your first free slot inside these hours as soon as it has your calendar. You will see it on Home."}
                        </span>
                      </p>
                    </>
                  ) : null}
                </div>

                <div className="auth-onboarding-row-6">
                  {i > 0 ? (
                    <button
                      type="button"
                      className="axs-back"
                      data-axs-back
                      onClick={() => void go(i - 1)}
                    >
                      <LuArrowLeft size={15} />
                      Back
                    </button>
                  ) : null}
                  <span className="auth-onboarding-text-10" />
                  {id === "sidebar" ? (
                    <>
                      <button
                        type="button"
                        className="nx-btn nx-btn-text"
                        data-ob-sb-reset
                        disabled={
                          tiles.join() === PLACES.map((p) => p.id).join()
                        }
                        onClick={() => setTiles(PLACES.map((p) => p.id))}
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        className="nx-btn nx-btn-text"
                        data-ob-sb-skip
                        onClick={() => {
                          setTiles(PLACES.map((p) => p.id));
                          setDir(1);
                          setI(i + 1);
                        }}
                      >
                        Skip
                      </button>
                    </>
                  ) : null}
                  {id === "first" ? (
                    <>
                      <button
                        type="button"
                        className="nx-btn nx-btn-text"
                        data-ob-skip-task
                        onClick={() => void finish()}
                      >
                        Skip — open Needt
                      </button>
                      <button
                        type="button"
                        className="nx-btn nx-btn-primary axs-go"
                        data-axs-next
                        disabled={!title.trim() || adding || !online}
                        onClick={() => void addTask()}
                      >
                        {adding ? "Adding…" : "Add task"}
                      </button>
                    </>
                  ) : id === "placed" ? (
                    <button
                      type="button"
                      className="nx-btn nx-btn-primary axs-go"
                      data-axs-next
                      onClick={() => void finish()}
                    >
                      {planning ? "Opening…" : "Open my day"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="nx-btn nx-btn-primary axs-go"
                      data-axs-next
                      disabled={id === "setup" && bad}
                      onClick={() => void go(i + 1)}
                    >
                      Continue
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </PxSky>
    </div>
  );
}
