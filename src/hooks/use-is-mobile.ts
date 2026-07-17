"use client";

import { useEffect, useState } from "react";

/**
 * True when the viewport is below the given breakpoint (default 768px, the
 * app's `md`). SSR-safe: returns false until mounted so server and first
 * client render agree, then updates on mount and resize.
 */
export function useIsMobile(breakpointPx = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [breakpointPx]);

  return isMobile;
}
