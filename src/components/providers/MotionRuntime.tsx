"use client";

import { useEffect } from "react";

export function MotionRuntime() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      const enabled = !document.hidden && !reduced.matches;
      document.documentElement.dataset.needtMotion = enabled ? "on" : "off";
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);
  return null;
}
