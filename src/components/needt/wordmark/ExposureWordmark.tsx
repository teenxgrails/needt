"use client";

/* THE EXPOSURE WORDMARK — the name on a single variable-font axis.
 *
 * "Needt" in Exposure, one inline span per letter, animating only
 * `font-variation-settings` on `EXPO` (−100 → +100, resting 0). The font is
 * duplexed — every axis position shares one advance width — so nothing in
 * the layout can move when the axis animates and no width-lock machinery is
 * needed anywhere.
 *
 * FIVE MOTIONS, on the one axis, and the axis has two directions, which is
 * the whole idea: negative is ink flooding the counters, positive is light
 * burning the strokes away.
 *
 *   1 DEVELOP-IN  once on mount. floor → 0, 620ms, easeOutCubic-ish
 *                 cubic-bezier, 85ms stagger per letter. A print coming up
 *                 in the tray. A CSS animation, because nothing interrupts
 *                 it and — while it runs — a CSS animation outranks the
 *                 inline value the rAF loop writes underneath it.
 *   2 BUSY        a prop. → 55 over 300ms easeOut and hold; ← 0 over 400ms.
 *                 Capped at 55: past ~60 the strokes fragment and it reads
 *                 broken rather than lit. Busy overrides breathe and pulse.
 *   3 TORCH       pointer-driven. Distance to the cursor through a
 *                 smoothstep falloff over 180px, each letter driven onto its
 *                 target by a spring (220/26/1), never assigned directly —
 *                 the ~80ms lag is the whole effect.
 *   4 BREATHE     a loop: 0 → depth → 0 over 5200ms, ease-in-out, 260ms
 *                 phase offset per letter. That 1040ms spread across a
 *                 5200ms cycle is what makes it a travelling wave rather
 *                 than a synchronised throb.
 *   5 PULSE       a burst on top of breathe, in the OPPOSITE direction:
 *                 → +70 at 35% of 1300ms, easeOutExpo, 80ms stagger per
 *                 letter, every 6000ms. Breathe inks; pulse burns. That
 *                 contrast is the idea.
 *
 * All five generators, the torch target and the spring step are pure
 * functions in `./axis` — this file owns frames and elements, nothing else.
 *
 * COMPOSITION — one resolved value per letter per frame, in this order
 * (`composeAxisValue` in `./axis`):
 *
 *     base  = breathe(t) + pulse(t)
 *     torch = the spring's current value, itself lerped onto 0..ceiling
 *     value = clamp(base + torch, floor, roof)
 *     if (busy > 0)   value = the busy tween's current value
 *     if (developing) value = the CSS animation owns it; this component
 *                             never assigns during that window
 *
 * The breathe amplitude tweens to 0 over 250ms on pointerenter, so the torch
 * reads clean, and back to 1 over 400ms on leave — two motions at full
 * amplitude on one property would read as a bug, not as two features.
 *
 * SIZES. Full ±100 range at and above `EW_FULL_SIZE`; at the sidebar rail
 * (28px) the axis is clamped to −40…0, which disables pulse and torch there
 * by arithmetic (their ceiling is 0) rather than by a special case. Below
 * `EW_MIN_SIZE`: static, no loop, no listeners.
 *
 * FOCUS SESSIONS. `still` stops the breathing loop (and, with it, pulse,
 * which rides on breathe) — one thing holding still while everything else
 * breathes is what reads as attention. It does not disable the develop-in,
 * busy or torch — a session does not make the mark deaf to the pointer.
 *
 * PERFORMANCE (PORT.md §8). One rAF loop for the whole word, not one per
 * letter. The axis is written straight to each span's `style` — never
 * through React state, which would re-render on every frame. Phase is read
 * from a ref, not a closure, so a stale effect can never rewind the clock.
 * The loop stops outright when the element is offscreen, the tab is hidden,
 * reduced motion is requested, or nothing is left to resolve, and resumes at
 * the phase it stopped on rather than from zero — the clock only advances
 * while the loop runs.
 *
 * TWO TRAPS THIS FILE WORKS AROUND, both real and both silent when missed:
 *
 *   - `animation-delay` without `animation-fill-mode: both` leaves a letter
 *     at its resting value during its own delay and then snaps when the
 *     animation starts. The vendored `ew-develop` rule already carries
 *     `both`; this file still sets every letter's `--ew-from` so the
 *     animation starts from the SIZE'S OWN floor, not a hardcoded −100.
 *   - CSS animations outrank inline styles in the cascade. While
 *     `.is-developing` plays, every `el.style.fontVariationSettings` write
 *     from the rAF loop is silently swallowed. On hand-off this file writes
 *     each letter's currently-composed value inline BEFORE removing the
 *     class, so there is no frame where the letter reverts to a stale
 *     mount-time value once the animation stops owning it.
 *
 * REDUCED MOTION, offscreen, or a hidden tab: all five motions off, static
 * at `EXPO` 0.
 */
import * as React from "react";

import {
  EW_BUSY_CEILING,
  EW_BUSY_DOWN_MS,
  EW_BUSY_UP_MS,
  EW_DEVELOP_MS,
  EW_DEVELOP_STAGGER_MS,
  EW_MIN_SIZE,
  EW_PULSE,
  EW_RADIUS,
  EW_SPRING,
  type SpringState,
  axisRangeForSize,
  breatheAt,
  composeAxisValue,
  ewClamp,
  ewEaseOutCubic,
  liftFor,
  pulseAt,
  springSettled,
  springStep,
  torchTargetAt,
} from "./axis";

export type ExposureWordmarkMode = "still" | "breathe" | "breathe+pulse";

export interface ExposureWordmarkProps {
  /** Rendered font size in px. The font is duplexed, so this is the only
   *  thing that ever changes the mark's footprint. */
  size?: number;
  /** A focus session is running, so the mark holds still — see the file
   *  banner. Same name and meaning as `Wordmark`'s `still` prop. */
  still?: boolean;
  /** Each letter's breathe/pulse a beat behind the one before it, so the
   *  swell travels rather than arriving everywhere at once. Off synchronises
   *  every letter, the way a still photograph of one breath would. */
  wave?: boolean;
  /** The word to render and the accessible name. Same prop as `Wordmark`. */
  title?: string;
  /** The idle motion once develop-in has handed over. `"still"` parks the
   *  axis at 0 without looping; the scheduler's `busy` prop still overrides
   *  it either way. */
  mode?: ExposureWordmarkMode;
  /** The scheduler is writing. Overrides breathe, pulse and torch alike. */
  busy?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface Clock {
  /** Elapsed animation time in ms — the ONLY clock this component reads,
   *  so a paused loop resumes exactly where it left off. */
  t: number;
  pulseAt: number;
  amp: number;
  ampTo: number;
  ampFrom: number;
  ampAt: number;
  ampDur: number;
  busy: number;
  busyFrom: number;
  busyAt: number;
  busyDur: number;
}

function freshClock(): Clock {
  return {
    t: 0,
    pulseAt: -1e9,
    amp: 1,
    ampTo: 1,
    ampFrom: 1,
    ampAt: 0,
    ampDur: 250,
    busy: 0,
    busyFrom: 0,
    busyAt: 0,
    busyDur: EW_BUSY_UP_MS,
  };
}

export function ExposureWordmark({
  size = 46,
  still = false,
  wave = true,
  title = "Needt",
  mode = "breathe",
  busy = false,
  className,
  style,
}: ExposureWordmarkProps) {
  const px = size;
  const text = title || "Needt";
  const letters = React.useMemo(() => text.split(""), [text]);
  const form: ExposureWordmarkMode = still ? "still" : mode;

  const host = React.useRef<HTMLDivElement | null>(null);
  const spans = React.useRef<Array<HTMLSpanElement | null>>([]);
  const torch = React.useRef<SpringState[]>([]);
  const clock = React.useRef<Clock>(freshClock());
  const frame = React.useRef(0);
  const last = React.useRef(0);

  const [onScreen, setOnScreen] = React.useState(true);
  const [awake, setAwake] = React.useState(
    typeof document === "undefined" || !document.hidden
  );
  const [calm, setCalm] = React.useState(false);
  const [developing, setDeveloping] = React.useState(false);

  const { floor, roof, ceiling } = axisRangeForSize(px);
  const live = onScreen && awake && !calm && px >= EW_MIN_SIZE;
  const looping =
    live && !still && (form === "breathe" || form === "breathe+pulse");
  const pulsing = live && looping && form === "breathe+pulse" && ceiling > 0;

  React.useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    function read() {
      setCalm(q.matches);
    }
    read();
    q.addEventListener("change", read);
    return () => q.removeEventListener("change", read);
  }, []);

  React.useEffect(() => {
    function read() {
      setAwake(!document.hidden && document.visibilityState !== "hidden");
    }
    read();
    document.addEventListener("visibilitychange", read);
    window.addEventListener("focus", read);
    window.addEventListener("pageshow", read);
    return () => {
      document.removeEventListener("visibilitychange", read);
      window.removeEventListener("focus", read);
      window.removeEventListener("pageshow", read);
    };
  }, []);

  /* Visibility is measured from the node's own rect and only ever PARKS the
     loop on a confirmed offscreen reading — IntersectionObserver is one more
     signal, never the source of truth, because a gate that starts closed is
     one failed measurement away from a dead wordmark. */
  React.useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    let alive = true;
    let queued = 0;
    function shown(): boolean | null {
      const r = el?.getBoundingClientRect();
      if (!el || !r || !r.height) return null;
      const h = window.innerHeight || document.documentElement.clientHeight;
      const w = window.innerWidth || document.documentElement.clientWidth;
      if (!h || !w) return null;
      const vis = Math.min(r.bottom, h) - Math.max(r.top, 0);
      return r.right > 0 && r.left < w && vis / r.height >= 0.25;
    }
    function measure() {
      if (!alive) return;
      const v = shown();
      if (v === null) {
        window.requestAnimationFrame(measure);
        return;
      }
      setOnScreen(v);
    }
    function onScroll() {
      if (queued) return;
      queued = window.requestAnimationFrame(() => {
        queued = 0;
        measure();
      });
    }
    measure();
    window.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", onScroll, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure).catch(() => undefined);
    }
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(() => measure(), { threshold: 0.25 });
      io.observe(el);
    }
    return () => {
      alive = false;
      if (queued) window.cancelAnimationFrame(queued);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      if (io) io.disconnect();
    };
  }, []);

  /* One resolved value for letter `i`, at the clock's current time — the
     single source both the per-frame loop and the develop-in hand-off read,
     so the two can never disagree about what "now" looks like. */
  const resolve = React.useCallback(
    (i: number): number => {
      const c = clock.current;
      const s = torch.current[i];
      const idx = wave ? i : 0;
      const base = looping
        ? breatheAt(c.t, idx) * c.amp +
          (pulsing ? pulseAt(c.t - c.pulseAt, idx) : 0)
        : 0;
      return composeAxisValue({
        breathe: base,
        pulse: 0,
        torch: s ? s.v : 0,
        floor,
        roof,
        busy: c.busy,
      });
    },
    [looping, pulsing, wave, floor, roof]
  );
  /* PORT.md §8: read "where we are" from a ref, not from a closure. The
     develop-in hand-off below fires from a timeout set up once on mount, so
     it must not close over whichever `resolve` existed at that moment — a
     prop change in the interim (mode, busy) would then hand off a stale
     read. */
  const resolveRef = React.useRef(resolve);
  resolveRef.current = resolve;

  function write(i: number, v: number) {
    const el = spans.current[i];
    if (!el) return;
    el.style.fontVariationSettings = `"EXPO" ${Math.round(v * 10) / 10}`;
    /* One fixed light: the source never moves, only the height the letter
       stands off the page does. */
    el.style.setProperty("--ew-lift", String(liftFor(v)));
  }

  function ensureSprings() {
    for (let i = 0; i < letters.length; i++) {
      if (!torch.current[i]) torch.current[i] = { v: 0, vel: 0, target: 0 };
    }
  }

  function stop() {
    if (frame.current) {
      window.cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
  }

  /* ONE loop, one resolved value per letter per frame. It runs while
     anything is unresolved and stops itself otherwise, so a still wordmark
     costs nothing and a looping one costs exactly one rAF. */
  const run = React.useCallback(() => {
    if (frame.current) return;
    last.current = performance.now();
    const step = (now: number) => {
      const dt = Math.min(now - last.current, 1000 / 30);
      last.current = now;
      if (document.hidden) {
        frame.current = 0;
        return;
      }
      const c = clock.current;
      c.t += dt;

      if (c.amp !== c.ampTo) {
        const t = ewClamp((c.t - c.ampAt) / c.ampDur, 0, 1);
        c.amp = c.ampFrom + (c.ampTo - c.ampFrom) * ewEaseOutCubic(t);
        if (t >= 1) c.amp = c.ampTo;
      }
      const busyTo = busy ? Math.min(EW_BUSY_CEILING, ceiling) : 0;
      if (c.busy !== busyTo) {
        const t = ewClamp((c.t - c.busyAt) / c.busyDur, 0, 1);
        c.busy = c.busyFrom + (busyTo - c.busyFrom) * ewEaseOutCubic(t);
        if (t >= 1) c.busy = busyTo;
      }

      if (pulsing && c.t - c.pulseAt >= EW_PULSE.every) c.pulseAt = c.t;

      let moving = looping || c.amp !== c.ampTo || c.busy !== busyTo;
      for (let i = 0; i < letters.length; i++) {
        const s = torch.current[i];
        if (!s) continue;
        const next = springStep(s, dt, EW_SPRING);
        if (!springSettled(next)) {
          moving = true;
          torch.current[i] = next;
        } else {
          torch.current[i] = { v: next.target, vel: 0, target: next.target };
        }
        if (!developing) write(i, resolve(i));
      }

      if (moving) frame.current = window.requestAnimationFrame(step);
      else frame.current = 0;
    };
    frame.current = window.requestAnimationFrame(step);
  }, [busy, ceiling, developing, letters.length, looping, pulsing, resolve]);

  /* Mount: attach the engine and prove it by writing the resting value. */
  React.useEffect(() => {
    ensureSprings();
    for (let i = 0; i < letters.length; i++) write(i, 0);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letters.length]);

  /* DEVELOP-IN: once, the first time this wordmark becomes live. The class
     plays the CSS animation; this effect only owns the hand-off back to the
     rAF loop once it is done. */
  const developed = React.useRef(false);
  React.useEffect(() => {
    if (!live || developed.current) return undefined;
    developed.current = true;
    setDeveloping(true);
    const total = EW_DEVELOP_MS + letters.length * EW_DEVELOP_STAGGER_MS + 40;
    const id = window.setTimeout(() => {
      /* TRAP: the CSS animation has been outranking every inline write this
         whole time, so the inline value each span carries is only as fresh
         as the rAF loop's last (swallowed) write. Resolve and write the
         CURRENT value for every letter now, before the class comes off, so
         there is no frame where a letter reverts to its mount-time value. */
      ensureSprings();
      for (let i = 0; i < letters.length; i++) write(i, resolveRef.current(i));
      setDeveloping(false);
    }, total);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, letters.length]);

  /* The loop is bound to the conditions, not to a trigger: offscreen or
     hidden stops it dead, and the clock stops with it, so it resumes in
     phase rather than from zero. */
  React.useEffect(() => {
    ensureSprings();
    if (!live) {
      stop();
      return undefined;
    }
    if (looping || busy) run();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, looping, pulsing, busy, form, ceiling, floor, run]);

  React.useEffect(() => {
    const c = clock.current;
    c.busyFrom = c.busy;
    c.busyAt = c.t;
    c.busyDur = busy ? EW_BUSY_UP_MS : EW_BUSY_DOWN_MS;
    if (live) run();
  }, [busy, live, run]);

  function amplitudeTo(v: number, dur: number) {
    const c = clock.current;
    c.ampFrom = c.amp;
    c.ampTo = v;
    c.ampAt = c.t;
    c.ampDur = dur;
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!live || developing || busy || ceiling <= 0) return;
    ensureSprings();
    for (let i = 0; i < letters.length; i++) {
      const el = spans.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      const s = torch.current[i];
      torch.current[i] = {
        ...s,
        target: torchTargetAt(d, EW_RADIUS, ceiling),
      };
    }
    run();
  }

  function onEnter() {
    if (!live || ceiling <= 0) return;
    /* The breathe amplitude steps aside so the torch reads clean. */
    amplitudeTo(0, 250);
    run();
  }

  function onLeave() {
    if (!live) return;
    ensureSprings();
    for (let i = 0; i < letters.length; i++) {
      const s = torch.current[i];
      torch.current[i] = { ...s, target: 0 };
    }
    amplitudeTo(1, 400);
    run();
  }

  const sculpted = px >= 22;
  const classes = [
    "font-display",
    sculpted ? "ew-sculpt" : "",
    looping ? "ew-leans" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={host}
      role="img"
      aria-label={text}
      className={classes}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{
        display: "block",
        margin: 0,
        fontSize: px,
        lineHeight: 1.1,
        color: "var(--text-primary)",
        cursor: "default",
        /* The vendored `.font-display` rule names "Exposure VAR"; the face
           is actually registered as "Exposure" in globals.css (see the
           report for this mismatch). Set explicitly so the mark never
           silently falls back to the Georgia serif, which has no axis. */
        fontFamily: '"Exposure", Georgia, serif',
        ...style,
      }}
    >
      <span aria-hidden="true">
        {letters.map((ch, i) => (
          <span
            key={i}
            ref={(el) => {
              spans.current[i] = el;
            }}
            className={`ew-letter${developing ? " is-developing" : ""}`}
            style={
              {
                animationDelay: developing
                  ? `${i * EW_DEVELOP_STAGGER_MS}ms`
                  : undefined,
                "--ew-from": floor,
              } as React.CSSProperties
            }
          >
            {ch}
          </span>
        ))}
      </span>
    </div>
  );
}

/** Re-exported so a demo (a frame-strip, a Storybook-style lab) can draw the
 *  five published shapes from the same source this component runs on. */
export {
  EW_BREATHE,
  EW_BUSY_CEILING as EW_BUSY_MAX,
  EW_FULL_SIZE,
  EW_MAX,
  EW_MIN_SIZE,
  EW_PULSE,
  EW_RADIUS,
  EW_SPRING,
  breatheAt,
  developInAt,
  pulseAt,
} from "./axis";
