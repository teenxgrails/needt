"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import { ArrowUpRight, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ASSISTANT_POSITION_KEY,
  ASSISTANT_POSITION_RESET_EVENT,
  clampPoint,
  companionBounds,
  fromNormalized,
  isNormalizedAssistantPosition,
  toNormalized,
  type Point,
  type PositionBounds,
} from "@/lib/assistant-position";
import {
  LEGACY_AI_ACTION_EVENT,
  NEEDT_AI_ACTION_EVENT,
} from "@/lib/needt-events";

type CompanionEmotion = "calm" | "attentive" | "thinking" | "happy";

interface AICompanionProps {
  hidden?: boolean;
  onOpenChat: () => void;
}

const INTRO_SEEN_KEY = "needt-ai-companion-intro-seen";
const DEFAULT_POSITION = { x: 1, y: 0.82 };
const DRAG_THRESHOLD = 6;

type CompanionDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  origin: Point;
  dragging: boolean;
};

function readSafeAreaInset(edge: "top" | "bottom"): number {
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;padding-${edge}:env(safe-area-inset-${edge});`;
  document.body.appendChild(probe);
  const value = Number.parseFloat(
    edge === "top"
      ? window.getComputedStyle(probe).paddingTop
      : window.getComputedStyle(probe).paddingBottom
  );
  probe.remove();
  return Number.isFinite(value) ? value : 0;
}

function suggestionFor(pathname: string): string {
  if (pathname === "/today") return "Want help choosing today's main priority?";
  if (pathname === "/calendar")
    return "Want me to find a calm window for important work?";
  if (pathname === "/tasks")
    return "I can sort this list and suggest the next step.";
  if (pathname === "/focus")
    return "Want to start a short focus session together?";
  if (pathname.startsWith("/pages"))
    return "I can turn a note into a scheduled task.";
  if (pathname === "/mail")
    return "Want to see which messages should become tasks?";
  return "I'm here whenever you want to reshape the day.";
}

export function AICompanion({ hidden = false, onOpenChat }: AICompanionProps) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLButtonElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const positionFrameRef = useRef<number | null>(null);
  const positionRef = useRef<Point>({ x: 0, y: 0 });
  const boundsRef = useRef<PositionBounds | null>(null);
  const dragRef = useRef<CompanionDrag | null>(null);
  const suppressClickRef = useRef(false);
  const bubbleSideRef = useRef<"left" | "right">("left");
  const [message, setMessage] = useState<string | null>(null);
  const [emotion, setEmotion] = useState<CompanionEmotion>("calm");
  const [positioned, setPositioned] = useState(false);
  const [bubbleSide, setBubbleSide] = useState<"left" | "right">("left");

  const hideMessage = useCallback(() => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
    setMessage(null);
    setEmotion("calm");
  }, []);

  const revealMessage = useCallback(
    (
      nextMessage: string,
      nextEmotion: CompanionEmotion = "attentive",
      duration = 7600
    ) => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      setMessage(nextMessage);
      setEmotion(nextEmotion);
      hideTimerRef.current = window.setTimeout(hideMessage, duration);
    },
    [hideMessage]
  );

  const measureBounds = useCallback(() => {
    const sidebarWidth =
      Number.parseFloat(
        window
          .getComputedStyle(document.documentElement)
          .getPropertyValue("--needt-sidebar-width")
      ) || 244;
    const size = window.innerWidth < 640 ? 64 : 88;
    return companionBounds({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      size,
      sidebarWidth,
      mobileDockHeight: 68,
      safeTop: readSafeAreaInset("top"),
      safeBottom: readSafeAreaInset("bottom"),
    });
  }, []);

  const placeCompanion = useCallback((point: Point) => {
    const root = rootRef.current;
    const bounds = boundsRef.current;
    if (!root || !bounds) return point;

    const size = window.innerWidth < 640 ? 64 : 88;
    let next = clampPoint(point, bounds);
    const avoid = Array.from(
      document.querySelectorAll<HTMLElement>("[data-assistant-avoid]")
    )
      .filter((element) => element.offsetParent !== null)
      .map((element) => element.getBoundingClientRect());

    for (const rect of avoid) {
      const padding = 10;
      const overlaps =
        next.x < rect.right + padding &&
        next.x + size > rect.left - padding &&
        next.y < rect.bottom + padding &&
        next.y + size > rect.top - padding;
      if (!overlaps) continue;

      const candidates = [
        { x: rect.left - size - padding, y: next.y },
        { x: rect.right + padding, y: next.y },
        { x: next.x, y: rect.top - size - padding },
        { x: next.x, y: rect.bottom + padding },
      ].map((candidate) => clampPoint(candidate, bounds));
      next =
        candidates.sort(
          (a, b) =>
            Math.hypot(a.x - next.x, a.y - next.y) -
            Math.hypot(b.x - next.x, b.y - next.y)
        )[0] ?? next;
    }

    positionRef.current = next;
    root.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
    const nextSide =
      next.x + size / 2 > window.innerWidth / 2 ? "left" : "right";
    if (nextSide !== bubbleSideRef.current) {
      bubbleSideRef.current = nextSide;
      setBubbleSide(nextSide);
    }
    return next;
  }, []);

  const persistPosition = useCallback((point: Point) => {
    const bounds = boundsRef.current;
    if (!bounds) return;
    try {
      window.localStorage.setItem(
        ASSISTANT_POSITION_KEY,
        JSON.stringify(toNormalized(point, bounds))
      );
    } catch {
      // A strict privacy mode may disable localStorage. Dragging still works
      // for the current session.
    }
  }, []);

  useEffect(() => {
    if (hidden) return;
    boundsRef.current = measureBounds();
    let stored = DEFAULT_POSITION;
    try {
      const parsed = JSON.parse(
        window.localStorage.getItem(ASSISTANT_POSITION_KEY) || "null"
      );
      if (isNormalizedAssistantPosition(parsed)) stored = parsed;
    } catch {
      // Use the safe default when persisted data is unavailable or malformed.
    }
    placeCompanion(fromNormalized(stored, boundsRef.current));
    setPositioned(true);

    const onResize = () => {
      const previous = boundsRef.current;
      const normalized = previous
        ? toNormalized(positionRef.current, previous)
        : DEFAULT_POSITION;
      boundsRef.current = measureBounds();
      placeCompanion(fromNormalized(normalized, boundsRef.current));
    };
    const onReset = () => {
      try {
        window.localStorage.removeItem(ASSISTANT_POSITION_KEY);
      } catch {
        // Reset still applies in-memory.
      }
      boundsRef.current = measureBounds();
      placeCompanion(fromNormalized(DEFAULT_POSITION, boundsRef.current));
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.addEventListener(ASSISTANT_POSITION_RESET_EVENT, onReset);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener(ASSISTANT_POSITION_RESET_EVENT, onReset);
    };
  }, [hidden, measureBounds, placeCompanion]);

  useEffect(() => {
    if (hidden) return;
    let frame = 0;
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    const target = { x: 0, y: 0, distance: 0.52, angle: 0 };
    const current = { ...target };

    const renderFrame = () => {
      const root = rootRef.current;
      if (!root) {
        frame = 0;
        return;
      }

      current.x += (target.x - current.x) * 0.085;
      current.y += (target.y - current.y) * 0.085;
      current.distance += (target.distance - current.distance) * 0.055;
      const angleDelta = ((target.angle - current.angle + 540) % 360) - 180;
      current.angle += angleDelta * 0.07;

      root.style.setProperty("--companion-look-x", `${current.x * 1.8}px`);
      root.style.setProperty("--companion-look-y", `${current.y * 1.5}px`);
      root.style.setProperty("--companion-face-x", `${current.x * 6.5}px`);
      root.style.setProperty("--companion-face-y", `${current.y * 5.2}px`);
      root.style.setProperty(
        "--companion-face-rotate",
        `${current.x * 2.2}deg`
      );
      root.style.setProperty("--companion-head-x", `${current.x * 3.4}px`);
      root.style.setProperty("--companion-head-y", `${current.y * 2.8}px`);
      root.style.setProperty(
        "--companion-aura-angle",
        `${current.angle * 0.04}deg`
      );
      root.style.setProperty("--companion-cyan-x", `${current.x * 9.1}px`);
      root.style.setProperty("--companion-cyan-y", `${current.y * 7.7}px`);
      root.style.setProperty(
        "--companion-cyan-angle",
        `${current.angle * 0.16}deg`
      );
      root.style.setProperty("--companion-violet-x", `${current.x * -8.1}px`);
      root.style.setProperty("--companion-violet-y", `${current.y * -6.8}px`);
      root.style.setProperty(
        "--companion-violet-angle",
        `${current.angle * -0.13}deg`
      );
      root.style.setProperty("--companion-rose-x", `${current.x * -11.7}px`);
      root.style.setProperty("--companion-rose-y", `${current.y * -7.9}px`);
      root.style.setProperty(
        "--companion-rose-angle",
        `${current.angle * -0.2}deg`
      );
      root.style.setProperty(
        "--companion-saturation",
        (0.98 + current.distance * 0.2).toFixed(3)
      );
      root.style.setProperty(
        "--companion-distance",
        current.distance.toFixed(3)
      );
      root.style.setProperty(
        "--companion-cyan-opacity",
        (0.9 - current.distance * 0.22).toFixed(3)
      );
      root.style.setProperty(
        "--companion-violet-opacity",
        (0.42 + current.distance * 0.38).toFixed(3)
      );
      root.style.setProperty(
        "--companion-rose-opacity",
        Math.max(0.02, (current.distance - 0.42) * 0.72).toFixed(3)
      );

      const remaining =
        Math.abs(target.x - current.x) +
        Math.abs(target.y - current.y) +
        Math.abs(target.distance - current.distance) +
        Math.abs(((target.angle - current.angle + 540) % 360) - 180) / 180;

      if (remaining > 0.002) frame = window.requestAnimationFrame(renderFrame);
      else frame = 0;
    };

    const requestRender = () => {
      if (!frame) frame = window.requestAnimationFrame(renderFrame);
    };

    const onPointerMove = (event: PointerEvent) => {
      const orb = orbRef.current;
      if (!orb) return;
      const bounds = orb.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      target.x = Math.max(-1, Math.min(1, deltaX / 420));
      target.y = Math.max(-1, Math.min(1, deltaY / 340));
      target.distance = Math.max(
        0,
        Math.min(1, Math.hypot(deltaX, deltaY) / 820)
      );
      target.angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
      requestRender();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [hidden]);

  useEffect(() => {
    if (hidden) return;
    let introTimer: number | undefined;
    try {
      if (!window.sessionStorage.getItem(INTRO_SEEN_KEY)) {
        window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
        introTimer = window.setTimeout(
          () => revealMessage("I'm here. I can help plan your next step."),
          6200
        );
      }
    } catch {
      // Storage can be unavailable in strict privacy modes; the companion
      // still works through direct interaction.
    }

    const suggestionTimer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !message) {
        revealMessage(suggestionFor(pathname));
      }
    }, 105000);

    return () => {
      if (introTimer) window.clearTimeout(introTimer);
      window.clearInterval(suggestionTimer);
    };
  }, [hidden, message, pathname, revealMessage]);

  useEffect(() => {
    if (hidden) return;
    let completionTimer: number | undefined;
    const onAIAction = (event: Event) => {
      const detail = (event as CustomEvent<{ label?: string }>).detail;
      revealMessage(
        detail?.label || "Thinking through the plan…",
        "thinking",
        3200
      );
      completionTimer = window.setTimeout(
        () =>
          revealMessage(
            "Done. Take a look and see if it feels right.",
            "happy"
          ),
        1450
      );
    };

    window.addEventListener(NEEDT_AI_ACTION_EVENT, onAIAction);
    window.addEventListener(LEGACY_AI_ACTION_EVENT, onAIAction);
    return () => {
      if (completionTimer) window.clearTimeout(completionTimer);
      window.removeEventListener(NEEDT_AI_ACTION_EVENT, onAIAction);
      window.removeEventListener(LEGACY_AI_ACTION_EVENT, onAIAction);
    };
  }, [hidden, revealMessage]);

  useEffect(
    () => () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      if (positionFrameRef.current)
        window.cancelAnimationFrame(positionFrameRef.current);
      document.documentElement.style.removeProperty("user-select");
    },
    []
  );

  if (
    hidden ||
    pathname === "/chat" ||
    pathname === "/setup" ||
    pathname.startsWith("/auth")
  ) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      data-testid="needt-ai-companion"
      data-emotion={emotion}
      data-bubble-side={bubbleSide}
      className={cn(
        "needt-ai-companion fixed left-0 top-0 z-30 transition-opacity duration-150",
        positioned ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <div
        className={cn(
          "needt-ai-companion-message needt-overlay-depth absolute bottom-[calc(100%-8px)] w-[268px] rounded-2xl border border-[var(--popover-border)] p-3 text-left shadow-lg",
          bubbleSide === "left"
            ? "right-[70%] rounded-br-md"
            : "left-[70%] rounded-bl-md",
          message ? "is-visible" : "pointer-events-none"
        )}
        role="status"
        aria-live="polite"
      >
        <button
          type="button"
          onClick={hideMessage}
          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          aria-label="Dismiss suggestion"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <p className="pr-6 text-[13px] leading-5 text-[var(--text-primary)]">
          {message}
        </p>
        <button
          type="button"
          onClick={() => {
            hideMessage();
            onOpenChat();
          }}
          className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] px-2.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--button-secondary-bg-hover)]"
        >
          Ask Needt
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        ref={orbRef}
        type="button"
        aria-label="Open or move Needt assistant"
        aria-expanded={Boolean(message)}
        onClick={(event) => {
          if (suppressClickRef.current) {
            event.preventDefault();
            return;
          }
          if (message) hideMessage();
          else revealMessage(suggestionFor(pathname), "attentive", 10000);
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            origin: positionRef.current,
            dragging: false,
          };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          const deltaX = event.clientX - drag.startX;
          const deltaY = event.clientY - drag.startY;
          if (
            !drag.dragging &&
            Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD
          ) {
            return;
          }
          if (!drag.dragging) {
            drag.dragging = true;
            setEmotion("attentive");
            hideMessage();
            document.documentElement.style.userSelect = "none";
          }
          const next = {
            x: drag.origin.x + deltaX,
            y: drag.origin.y + deltaY,
          };
          if (positionFrameRef.current)
            window.cancelAnimationFrame(positionFrameRef.current);
          positionFrameRef.current = window.requestAnimationFrame(() => {
            placeCompanion(next);
            positionFrameRef.current = null;
          });
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          if (drag.dragging) {
            suppressClickRef.current = true;
            persistPosition(positionRef.current);
            window.setTimeout(() => {
              suppressClickRef.current = false;
            }, 0);
          }
          dragRef.current = null;
          document.documentElement.style.removeProperty("user-select");
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          document.documentElement.style.removeProperty("user-select");
        }}
        onKeyDown={(event) => {
          const directions: Record<string, Point> = {
            ArrowLeft: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 },
            ArrowUp: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 },
          };
          const direction = directions[event.key];
          if (!direction) return;
          event.preventDefault();
          const step = event.shiftKey ? 24 : 8;
          const next = placeCompanion({
            x: positionRef.current.x + direction.x * step,
            y: positionRef.current.y + direction.y * step,
          });
          persistPosition(next);
        }}
        onPointerEnter={() =>
          setEmotion((current) => (current === "calm" ? "attentive" : current))
        }
        onPointerLeave={() => {
          if (!message) setEmotion("calm");
        }}
        className="needt-ai-companion-orb group relative grid h-[88px] w-[88px] touch-none cursor-grab place-items-center rounded-full outline-none active:cursor-grabbing focus-visible:ring-1 focus-visible:ring-[var(--control-border)] max-sm:h-16 max-sm:w-16"
      >
        <span className="needt-ai-aura" aria-hidden>
          <span className="needt-ai-color-layer needt-ai-color-base" />
          <span className="needt-ai-color-layer needt-ai-color-cyan" />
          <span className="needt-ai-color-layer needt-ai-color-violet" />
          <span className="needt-ai-color-layer needt-ai-color-rose" />
        </span>

        <svg
          className="needt-ai-face relative z-10 h-full w-full"
          viewBox="0 0 100 100"
          role="img"
          aria-label="Calm Needt assistant face"
        >
          <g className="needt-ai-face-plane">
            <g className="needt-ai-brows">
              <path
                className="needt-ai-brow needt-ai-brow-left"
                d="M25 39 Q33 31 41 38"
              />
              <path
                className="needt-ai-brow needt-ai-brow-right"
                d="M59 38 Q67 31 75 39"
              />
            </g>
            <g className="needt-ai-eyes">
              <circle cx="34" cy="48" r="2.55" />
              <circle cx="66" cy="48" r="2.55" />
            </g>
            <path className="needt-ai-nose" d="M49 51 L49 64 L58 64" />
          </g>
        </svg>
      </button>
    </div>
  );
}
