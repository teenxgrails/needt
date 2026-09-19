"use client";

/* THE HANDLER — the other half of `keys.ts`, and the only one.
 *
 * It reads `NEEDT_KEYS`, so every binding it fires is a row the sheet prints.
 * Nothing here knows a keystroke by name.
 *
 * PORT.md §8's React rule is the reason for the ref: a handler that closes
 * over `screen` early-returns on a screen you have already left, and the
 * defect comes back every time someone forgets a dependency array. The
 * listener is registered once and reads the live handlers through a ref, so
 * there is no dependency array to forget.
 */
import * as React from "react";

import {
  NEEDT_SEQUENCE_LEADS,
  NEEDT_SEQUENCE_MS,
  type NeedtKeyAction,
  matchNeedtKey,
  matchNeedtSequence,
} from "./keys";

/** One door in. The shell decides what each action means. */
export type NeedtKeyHandler = (action: NeedtKeyAction) => void;

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return /^(input|textarea|select)$/i.test(target.tagName);
}

export function useNeedtKeys(onAction: NeedtKeyHandler): void {
  const live = React.useRef(onAction);
  live.current = onAction;

  React.useEffect(() => {
    /* The lead key lives in the effect rather than in state: a sequence in
       flight is not something anything renders, and putting it in state would
       repaint the whole shell on the way to "g". */
    let lead = "";
    let leadAt = 0;

    function onKeyDown(event: KeyboardEvent) {
      const typing = isTyping(event.target);
      const bare = !typing && !event.metaKey && !event.ctrlKey && !event.altKey;

      if (bare) {
        const letter = event.key.toLowerCase();
        if (lead && Date.now() - leadAt < NEEDT_SEQUENCE_MS) {
          const row = matchNeedtSequence(lead, letter);
          lead = "";
          if (row?.action) {
            event.preventDefault();
            live.current(row.action);
            return;
          }
        }
        if (NEEDT_SEQUENCE_LEADS.has(letter)) {
          lead = letter;
          leadAt = Date.now();
          return;
        }
        lead = "";
      }

      const row = matchNeedtKey(event, { typing });
      if (!row?.action) return;
      event.preventDefault();
      live.current(row.action);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
