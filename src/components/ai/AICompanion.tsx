"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import { ArrowUpRight, X } from "lucide-react";

import { cn } from "@/lib/utils";

type CompanionEmotion = "calm" | "attentive" | "thinking" | "happy";

interface AICompanionProps {
  hidden?: boolean;
  onOpenChat: () => void;
}

const INTRO_SEEN_KEY = "needt-ai-companion-intro-seen";

function suggestionFor(pathname: string): string {
  if (pathname === "/today") return "Want help choosing today's main priority?";
  if (pathname === "/calendar")
    return "Want me to find a calm window for important work?";
  if (pathname === "/tasks")
    return "I can sort this list and suggest the next step.";
  if (pathname === "/focus")
    return "Want to start a short focus session together?";
  if (pathname.startsWith("/boards"))
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
  const [message, setMessage] = useState<string | null>(null);
  const [emotion, setEmotion] = useState<CompanionEmotion>("calm");

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

    window.addEventListener("flowday:ai-action", onAIAction);
    return () => {
      if (completionTimer) window.clearTimeout(completionTimer);
      window.removeEventListener("flowday:ai-action", onAIAction);
    };
  }, [hidden, revealMessage]);

  useEffect(
    () => () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
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
      data-emotion={emotion}
      className="needt-ai-companion fixed bottom-6 right-6 z-30 max-lg:bottom-[calc(86px+env(safe-area-inset-bottom))] max-lg:right-4"
    >
      <div
        className={cn(
          "needt-ai-companion-message needt-overlay-depth absolute bottom-[calc(100%-8px)] right-[70%] w-[268px] rounded-2xl rounded-br-md border border-[var(--popover-border)] p-3 text-left shadow-lg",
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
        aria-label="Open Needt assistant"
        aria-expanded={Boolean(message)}
        onClick={() => {
          if (message) hideMessage();
          else revealMessage(suggestionFor(pathname), "attentive", 10000);
        }}
        onPointerEnter={() =>
          setEmotion((current) => (current === "calm" ? "attentive" : current))
        }
        onPointerLeave={() => {
          if (!message) setEmotion("calm");
        }}
        className="needt-ai-companion-orb group relative grid h-[116px] w-[116px] touch-manipulation place-items-center rounded-full outline-none focus-visible:ring-1 focus-visible:ring-[var(--control-border)] max-sm:h-[76px] max-sm:w-[76px]"
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
