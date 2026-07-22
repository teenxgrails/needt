"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import { ArrowUpRight, X } from "lucide-react";

import { cn } from "@/lib/utils";

type CompanionEmotion =
  | "calm"
  | "attentive"
  | "thinking"
  | "happy"
  | "concerned";

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
    if (!finePointer.matches) return;

    const onPointerMove = (event: PointerEvent) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const root = rootRef.current;
        const orb = orbRef.current;
        if (!root || !orb) return;
        const bounds = orb.getBoundingClientRect();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;
        const x = Math.max(-1, Math.min(1, (event.clientX - centerX) / 360));
        const y = Math.max(-1, Math.min(1, (event.clientY - centerY) / 280));
        root.style.setProperty("--companion-look-x", `${x * 3.4}px`);
        root.style.setProperty("--companion-look-y", `${y * 2.8}px`);
        root.style.setProperty("--companion-head-x", `${x * 5}px`);
        root.style.setProperty("--companion-head-y", `${y * 4}px`);
      });
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
        <span className="needt-ai-mist needt-ai-mist-cyan" aria-hidden />
        <span className="needt-ai-mist needt-ai-mist-blue" aria-hidden />
        <span className="needt-ai-mist needt-ai-mist-violet" aria-hidden />
        <span className="needt-ai-mist needt-ai-mist-core" aria-hidden />

        <svg
          className="needt-ai-face relative z-10 h-full w-full"
          viewBox="0 0 100 100"
          role="img"
          aria-label="Calm Needt assistant face"
        >
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
            <circle cx="34" cy="47" r="2.25" />
            <circle cx="66" cy="47" r="2.25" />
          </g>
          <path className="needt-ai-nose" d="M49 50 L49 61 L57 61" />
          <path
            className="needt-ai-mouth needt-ai-mouth-calm"
            d="M45.5 70 Q50 71.4 54.5 69.8"
          />
          <path
            className="needt-ai-mouth needt-ai-mouth-thinking"
            d="M45.5 70 Q50 68.5 54.5 70"
          />
          <path
            className="needt-ai-mouth needt-ai-mouth-happy"
            d="M44.5 68.8 Q50 72.5 55.5 68.7"
          />
          <path
            className="needt-ai-mouth needt-ai-mouth-concerned"
            d="M45.5 71 Q50 67.8 54.5 71"
          />
        </svg>
      </button>
    </div>
  );
}
