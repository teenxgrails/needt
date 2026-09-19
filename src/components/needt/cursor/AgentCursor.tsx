"use client";

/* THE AGENT'S CURSOR — the app's own hand, visible.
 *
 * When something in the product moves by itself, the person is left with a
 * changed screen and no account of who changed it. A visible cursor answers
 * that in the only way that cannot be misread: it goes to the thing and does
 * the thing, in the open, at human speed. What it does is small and undoable,
 * which is what makes doing it in front of you safe.
 *
 * The maths of the reach is in `motion.ts` and is not repeated here. What this
 * file owns is frames and elements, and three rules about them that PORT.md §5
 * calls not optional:
 *
 * ONE rAF, AND THE POSITION GOES STRAIGHT TO THE ELEMENT. Through React state
 * the cursor tree re-renders 120 times a second; through `left`/`top` the
 * browser redoes layout on every one of those frames. Here a single frame
 * callback writes one `translate3d` per moving element and no component
 * re-renders at all. The trip is driven by REAL TIME, so it takes the same
 * 540ms on a 60Hz screen and a 144Hz one, and a dropped frame costs nothing
 * but a frame.
 *
 * IT EMERGES FROM THE CHAT BUTTON AND RETURNS INTO IT — scale 0.2 → 1 over
 * 300ms before the first reach. A cursor that is simply present on frame one
 * has no origin, and an agent with no origin reads as something already loose
 * in the app rather than something you asked for.
 *
 * HOME IS THE CORNER, NOT THE ELEMENT — see `homePoint`. It is measured once
 * per run, off the shell, and never inside a frame.
 *
 * IT FINISHES WHAT IT STARTED. A half-done action is a worse state than either
 * end of it — a task neither placed nor left alone — so a second run asked for
 * mid-flight is refused rather than queued over the top of the first.
 *
 * WITH `prefers-reduced-motion`, THE HAND DOES NOT FLY. The change still
 * happens and the mark is still left; what is dropped is the travel, which is
 * the part that was only ever narration.
 *
 * The cursor is white and unnamed: it is the app acting, and the app does not
 * need a face. Which agent asked is already said in the corner, in its ink.
 */
import * as React from "react";

import { newDate } from "@/lib/date-utils";

import { AgentMarks } from "./AgentMarks";
import {
  boxOf,
  centreOf,
  prefersStillness,
  pressOn,
  typeInto,
  viewportBox,
} from "./dom";
import {
  type ArcSide,
  type Point,
  type ReachPlan,
  homePoint,
  nextSide,
  planReach,
  reachAt,
} from "./motion";
import type {
  AgentCursorHandle,
  AgentMark,
  AgentRun,
  AgentStep,
} from "./types";

/** Out of the button, into the room, and back. */
const EMERGE_MS = 300;
const RETURN_MS = 260;
/** The press: down, act, up. */
const PRESS_MS = 140;
/** What a step waits after its act, unless it says otherwise. */
const SETTLE_MS = 420;
/** Picking a thing up and putting it down are both deliberate. */
const CARRY_MS = 320;
/** A character, and the pause at the end of a line. */
const TYPE_MS = 34;
const TYPED_MS = 260;
/** A carried card is a thumbnail of the row, never the whole row. */
const CARRY_MAX = { w: 240, h: 96 };

type Phase = "in" | "live" | "out";

interface Held {
  readonly w: number;
  readonly h: number;
  readonly title: string;
}

interface Active {
  readonly run: AgentRun;
  readonly settle: () => void;
  /**
   * Asked for at the moment the run starts, and carried for its whole length:
   * a run must not change its mind about whether it is flying halfway through,
   * and the render needs the same answer the effect acted on.
   */
  readonly still: boolean;
}

let marked = 0;
function markId(): string {
  marked += 1;
  return `mark-${marked}`;
}

export interface AgentCursorProps {
  /**
   * The hand, handed over once — the same shape the corner's agent seam uses
   * to give the panel its way in. A caller keeps it and calls `run`.
   */
  onReady?: (hand: AgentCursorHandle) => void;
  /** The scope home is measured from. The app root, by default. */
  shellSelector?: string;
  /** For the record a mark carries. Injected so the clock stays testable. */
  now?: () => Date;
}

export function AgentCursor({
  onReady,
  shellSelector = ".needt-v2",
  now,
}: AgentCursorProps) {
  const [active, setActive] = React.useState<Active | null>(null);
  const [phase, setPhase] = React.useState<Phase>("in");
  const [press, setPress] = React.useState(false);
  const [say, setSay] = React.useState<string | null>(null);
  const [held, setHeld] = React.useState<Held | null>(null);
  const [marks, setMarks] = React.useState<readonly AgentMark[]>([]);

  /* The three things that move together: the arrow, what it carries, what it
     says. One write per frame each, and no render between them. */
  const root = React.useRef<HTMLDivElement | null>(null);
  const arrow = React.useRef<HTMLSpanElement | null>(null);
  const load = React.useRef<HTMLSpanElement | null>(null);
  const bubble = React.useRef<HTMLSpanElement | null>(null);

  /* Where the hand is, read from a ref rather than from a closure — §8's
     React rule. The side alternates across a run so a sequence of steps does
     not trace the same hook twice. */
  const at = React.useRef<Point>({ x: 0, y: 0 });
  const side = React.useRef<ArcSide>(-1);
  const running = React.useRef(false);
  const cut = React.useRef(false);
  const clock = React.useRef(now);
  clock.current = now;
  /* The handle must not change identity when a mark is left, or every caller
     that kept it would be handed a new one mid-run. The list is read through
     a ref for exactly that reason. */
  const ledger = React.useRef<readonly AgentMark[]>(marks);
  ledger.current = marks;

  const place = React.useCallback((x: number, y: number) => {
    at.current = { x, y };
    if (arrow.current) {
      arrow.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    if (load.current) {
      load.current.style.transform = `translate3d(${x + 15}px, ${y + 19}px, 0) rotate(-1.5deg)`;
    }
    if (bubble.current) {
      bubble.current.style.transform = `translate3d(${x + 22}px, ${y - 9}px, 0)`;
    }
  }, []);

  /* An element that has only just mounted — the caption, the carried card —
     has never been written to. Placing after every render costs three style
     writes and saves the frame where the label trails the arrow. */
  React.useLayoutEffect(() => {
    if (!active || active.still) return;
    place(at.current.x, at.current.y);
  });

  const hand = React.useMemo<AgentCursorHandle>(
    () => ({
      busy: () => running.current,
      run: (run: AgentRun) =>
        new Promise<void>((settle) => {
          if (running.current || run.steps.length === 0) {
            settle();
            return;
          }
          running.current = true;
          cut.current = false;
          setActive({ run, settle, still: prefersStillness() });
        }),
      stop: () => {
        cut.current = true;
      },
      marks: () => ledger.current,
      clearMarks: () => setMarks([]),
    }),
    []
  );

  const ready = React.useRef<((hand: AgentCursorHandle) => void) | undefined>(
    undefined
  );
  ready.current = onReady;
  /* Handed over once. `hand` closes over nothing that changes between runs
     except the mark list, which it reads through the same reference. */
  React.useEffect(() => {
    ready.current?.(hand);
  }, [hand]);

  React.useEffect(() => {
    if (!active) return undefined;

    let alive = true;
    let frame = 0;
    const timers = new Set<number>();
    const { run, settle, still } = active;

    function wait(ms: number, then: () => void) {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (alive) then();
      }, ms);
      timers.add(id);
    }

    /* Measured once, before the first frame: the corner does not move during
       a run, and asking for it again inside one would be §8's own defect. */
    const shell =
      boxOf(root.current?.closest(shellSelector) ?? null) ?? viewportBox();
    const home = homePoint(shell);

    function leaveMark(step: AgentStep) {
      const spec = step.mark;
      if (!spec) return;
      const stamp = clock.current ? clock.current() : newDate();
      setMarks((before) => [
        ...before,
        {
          id: markId(),
          target: spec.on ?? step.target,
          note: spec.note,
          at: stamp,
        },
      ]);
    }

    function finish() {
      if (!alive) return;
      setSay(null);
      setHeld(null);
      setPress(false);
      running.current = false;
      setActive(null);
      settle();
    }

    /* WITH STILLNESS ASKED FOR, THE HAND DOES NOT FLY. Every act still lands
       in order and every mark is still left; what is dropped is the travel and
       the arrow itself — nothing here is painted, because that was the
       narration rather than the change. */
    if (still) {
      let i = 0;
      const step = () => {
        if (!alive) return;
        if (cut.current || i >= run.steps.length) {
          finish();
          return;
        }
        const s = run.steps[i];
        i += 1;
        const el = document.querySelector(s.target);
        if (el) {
          apply(el, s, () => {
            leaveMark(s);
            wait(0, step);
          });
          return;
        }
        wait(0, step);
      };
      wait(0, step);
      return () => {
        alive = false;
        timers.forEach((id) => window.clearTimeout(id));
        if (running.current) {
          running.current = false;
          settle();
        }
      };
    }

    /* Both ends of the run are the corner. */
    place(home.x, home.y);
    setPhase("in");

    function reach(to: Point, then: () => void) {
      side.current = nextSide(side.current);
      const plan: ReachPlan = planReach(at.current, to, side.current);
      if (plan.length < 2) {
        place(to.x, to.y);
        then();
        return;
      }
      let t0 = 0;
      const step = (stamp: number) => {
        if (!alive) return;
        if (!t0) t0 = stamp;
        const elapsed = stamp - t0;
        const point = reachAt(plan, elapsed);
        place(point.x, point.y);
        if (elapsed >= plan.ms) {
          place(to.x, to.y);
          then();
          return;
        }
        frame = window.requestAnimationFrame(step);
      };
      frame = window.requestAnimationFrame(step);
    }

    /* One act, then the callback. The act is the same in both branches, which
       is why it is a function rather than a second copy of the switch. */
    function apply(el: Element, s: AgentStep, then: () => void) {
      switch (s.act.kind) {
        case "hold": {
          const box = boxOf(el);
          setPress(true);
          setHeld({
            w: Math.min(box ? box.right - box.left : CARRY_MAX.w, CARRY_MAX.w),
            h: Math.min(box ? box.bottom - box.top : CARRY_MAX.h, CARRY_MAX.h),
            title: s.act.title ?? (el.textContent ?? "").trim().slice(0, 40),
          });
          wait(CARRY_MS, then);
          return;
        }
        case "drop": {
          setPress(false);
          setHeld(null);
          wait(CARRY_MS, then);
          return;
        }
        case "type": {
          const text = s.act.text;
          /* Typed out one character at a time, because that is the app saying
             what it is writing. Under stillness it simply arrives. */
          if (still) {
            typeInto(el, text);
            wait(TYPED_MS, then);
            return;
          }
          let n = 0;
          const tick = () => {
            if (!alive) return;
            n += 1;
            typeInto(el, text.slice(0, n));
            if (n < text.length) wait(TYPE_MS, tick);
            else wait(TYPED_MS, then);
          };
          tick();
          return;
        }
        case "rest": {
          wait(s.afterMs ?? SETTLE_MS, then);
          return;
        }
        default: {
          /* click and tick are the same gesture; the press is what shows it. */
          setPress(true);
          wait(PRESS_MS, () => {
            pressOn(el);
            setPress(false);
            wait(s.afterMs ?? SETTLE_MS, then);
          });
        }
      }
    }

    function play(i: number) {
      if (!alive) return;
      if (cut.current || i >= run.steps.length) {
        /* Home, then into the button: the hand does not linger over the work
           and it does not vanish mid-air either. */
        setSay(null);
        setHeld(null);
        setPress(false);
        reach(home, () => {
          if (!alive) return;
          setPhase("out");
          wait(RETURN_MS, finish);
        });
        return;
      }

      const s = run.steps[i];
      /* Resolved now, not when the run was written, and measured once. A
         target that is not there is skipped: miming an act on nothing is
         worse than not going. */
      const el = document.querySelector(s.target);
      const box = boxOf(el);
      if (!el || !box) {
        play(i + 1);
        return;
      }

      setSay(s.say ?? null);
      reach(centreOf(box), () => {
        if (!alive) return;
        apply(el, s, () => {
          leaveMark(s);
          play(i + 1);
        });
      });
    }

    /* The emergence owns its own 300ms, and the first reach begins after it —
       the hand is out of the button before it goes anywhere. */
    wait(EMERGE_MS, () => {
      setPhase("live");
      play(0);
    });

    return () => {
      alive = false;
      window.cancelAnimationFrame(frame);
      timers.forEach((id) => window.clearTimeout(id));
      if (running.current) {
        running.current = false;
        settle();
      }
    };
  }, [active, place, shellSelector]);

  return (
    <>
      <AgentMarks marks={marks} shellSelector={shellSelector} />
      {active && !active.still ? (
        <div
          ref={root}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: "var(--z-splash)" as unknown as number,
            pointerEvents: "none",
          }}
        >
          {/* Everything the hand carries hangs off the same transform, so the
              label and the card cannot lag a frame behind the arrow. */}
          {held ? (
            <span
              ref={load}
              className="ac-load"
              style={{
                position: "fixed",
                left: 0,
                top: 0,
                width: held.w,
                height: held.h,
                willChange: "transform",
                display: "flex",
                alignItems: "center",
                padding: "0 11px",
                borderRadius: "var(--radius-lg)",
                background: "var(--surface-raised)",
                boxShadow: "var(--shadow-floating)",
                font: "var(--type-ui-medium)",
                color: "var(--text-primary)",
                overflow: "hidden",
              }}
            >
              {held.title}
            </span>
          ) : null}

          {say ? (
            <span
              ref={bubble}
              className="ac-say"
              style={{
                position: "fixed",
                left: 0,
                top: 0,
                maxWidth: 260,
                padding: "5px 9px",
                willChange: "transform",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-raised)",
                boxShadow: "var(--shadow-floating)",
                font: "var(--type-meta)",
                color: "var(--text-secondary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {say}
            </span>
          ) : null}

          {/* macOS proportions at macOS size: the system arrow is about 12×19pt,
              and a pointer larger than that stops reading as a pointer and
              starts reading as an illustration of one. The tip is the hot spot,
              so the press scales about it and nothing else moves. */}
          <span
            ref={arrow}
            className={`ac-arrow ac-${phase}${press ? " is-press" : ""}`}
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: 20,
              height: 24,
              willChange: "transform",
            }}
          >
            <svg
              width="20"
              height="24"
              viewBox="0 0 20 24"
              style={{
                display: "block",
                filter: "drop-shadow(0 2px 5px rgba(0, 0, 0, 0.45))",
              }}
            >
              <path
                d="M2.6 1.6 L2.6 18.2 L7 14.1 L9.8 20.5 L12.7 19.3 L10 13.1 L15.9 12.8 Z"
                fill="#fff"
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                d="M2.6 1.6 L2.6 18.2 L7 14.1 L9.8 20.5 L12.7 19.3 L10 13.1 L15.9 12.8 Z"
                fill="#111"
                stroke="rgba(0, 0, 0, 0.3)"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      ) : null}
    </>
  );
}
