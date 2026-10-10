"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";

import {
  PHONE_MEDIA_QUERY,
  type PhoneUi,
  resolvePhoneUi,
} from "@/lib/needt3/phone-ui";

const PhoneUiContext = createContext<PhoneUi>("desktop");
export const PhoneUiProvider = PhoneUiContext.Provider;

/**
 * Which UI the frame is drawing now ("phone" | "desktop"). A screen that has
 * a phone layout of its own reads this; the route component itself stays
 * mounted when it changes, only what it chooses to draw differs.
 */
export function usePhoneUi() {
  return useContext(PhoneUiContext);
}

/**
 * The UI to draw: the server's pick on the first render (so hydration matches),
 * then the width (`matchMedia`, 700 px) unless the `needt-ui` cookie pinned a
 * side. The first read happens in a layout effect, before paint, so a tablet
 * the server guessed wrong never shows the wrong chrome. Only the chrome
 * changes with this value (see ShellFrame).
 */
export function useResolvedPhoneUi(initial: PhoneUi, forced: boolean): PhoneUi {
  const [narrow, setNarrow] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    if (forced || typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(PHONE_MEDIA_QUERY);
    setNarrow(mq.matches);
    const read = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, [forced]);
  return resolvePhoneUi({ initial, forced, narrow });
}
