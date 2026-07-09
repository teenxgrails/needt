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

    window.addEventListener("mina:ai-action", onAction);
    return () => window.removeEventListener("mina:ai-action", onAction);
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
      className="pointer-events-none fixed left-[52%] top-[48%] z-[70] flex items-center gap-2 rounded-md border border-[#323234] bg-[#262627] px-3 py-2 text-xs text-white"
      initial={{ opacity: 0, x: -80, y: -40, scale: 0.96 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [-80, -20, 70, 120],
        y: [-40, -4, 18, 34],
        scale: [0.96, 1, 1, 0.98],
      }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      <Sparkles className="h-4 w-4 text-[#8EA2FF]" strokeWidth={1.75} />
      {cursor.label}
    </motion.div>
  );
}
