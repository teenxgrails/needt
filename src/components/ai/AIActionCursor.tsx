"use client";

import { useEffect, useState } from "react";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface CursorState {
  id: number;
  label: string;
}

export function AIActionCursor() {
  const prefersReducedMotion = useReducedMotion();
  const [cursor, setCursor] = useState<CursorState | null>(null);

  useEffect(() => {
    function onAction(event: Event) {
      const detail = (event as CustomEvent<{ label?: string }>).detail;
      setCursor({
        id: Date.now(),
        label: detail?.label || "AI updating planner",
      });
    }

    window.addEventListener("flowday:ai-action", onAction);
    return () => {
      window.removeEventListener("flowday:ai-action", onAction);
    };
  }, []);

  useEffect(() => {
    if (!cursor) return;
    const timer = window.setTimeout(() => setCursor(null), 1400);
    return () => window.clearTimeout(timer);
  }, [cursor]);

  if (!cursor || prefersReducedMotion) return null;

  return (
    <motion.div
      key={cursor.id}
      className="pointer-events-none fixed left-[52%] top-[48%] z-[70] flex items-center gap-2 rounded-md border border-[var(--border-control)] bg-[var(--surface-panel)] px-3 py-2 text-xs text-[var(--text-primary)]"
      initial={{ opacity: 0, x: -80, y: -40, scale: 0.96 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [-80, -20, 70, 120],
        y: [-40, -4, 18, 34],
        scale: [0.96, 1, 1, 0.98],
      }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      <Sparkles
        className="h-4 w-4 text-[var(--color-accent)]"
        strokeWidth={1.75}
      />
      <span>{cursor.label}</span>
      <motion.span
        className="ml-1 rounded border border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_16%,var(--surface-panel))] px-2 py-0.5 text-[10px] text-[var(--text-primary)]"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: [0, 1, 1, 0], x: [-8, 0, 18, 28] }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      >
        task chip
      </motion.span>
    </motion.div>
  );
}
