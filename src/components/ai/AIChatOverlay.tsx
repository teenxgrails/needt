"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

interface AIChatOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIChatOverlay({ open, onOpenChange }: AIChatOverlayProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
          onMouseDown={() => onOpenChange(false)}
        >
          <motion.aside
            className="m-2 flex h-[calc(100vh-1rem)] w-full max-w-[420px] flex-col rounded-md border border-[#323234] bg-[#1A1D1E] text-white shadow-2xl"
            initial={prefersReducedMotion ? false : { x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { x: 32, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex h-11 items-center justify-between border-b border-[#323234] px-3">
              <div>
                <div className="text-sm font-medium">AI Chat</div>
                <div className="text-[11px] text-[#9AA0A6]">
                  Compact assistant
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-[#9AA0A6] hover:bg-[#2B2F31] hover:text-white"
                title="Close AI chat"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </header>
            <div className="flex flex-1 items-center justify-center px-8 text-center">
              <div>
                <div className="text-sm font-medium">
                  Chat agent wiring is next.
                </div>
                <p className="mt-2 text-[13px] leading-5 text-[#9AA0A6]">
                  This overlay is connected to the Motion shell; provider-gated
                  streaming chat lands in the agent phase.
                </p>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
