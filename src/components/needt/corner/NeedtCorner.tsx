"use client";

/* THE CORNER — one mount, three registers.
 *
 * Bottom-right is the one place this product speaks from. The pill, the island
 * and the panel are one element at three sizes; the notification stack is the
 * only separate object, and it stands on the same gutter directly above the
 * pill so the two read as one voice rather than two.
 *
 * The shell mounts this once, inside the `.needt-v2` scope and inside a
 * positioned ancestor — both children place themselves against it.
 */
import * as React from "react";

import { ChatCorner } from "./ChatCorner";
import { NotificationStack } from "./NotificationStack";
import { NeedtNoticeProvider, useNotify } from "./notices";
import type { CornerAgent, NoticePayload } from "./types";

export interface NeedtCornerProps {
  /** The shell hides the corner while the room belongs to something else. */
  hidden?: boolean;
  /** Whatever is answering. Defaults to the scripted stand-in. */
  agent?: CornerAgent;
  /** An act's `go`: a screen the shell knows how to reach. */
  onGo?: (screen: string) => void;
  /**
   * Notices to raise once, on mount. Empty by default: a product that greets
   * you with notifications has told you nothing and spent your attention
   * doing it. `fixtureNotices()` fills this for a preview.
   */
  seed?: readonly NoticePayload[];
}

function Corner({ hidden, agent, onGo, seed }: NeedtCornerProps) {
  const { notify } = useNotify();

  /* The panel registers its own way in, so a notification's `say` goes through
     exactly the path a typed line does. */
  const say = React.useRef<((line: string) => void) | null>(null);
  const takeSay = React.useCallback((fn: (line: string) => void) => {
    say.current = fn;
  }, []);

  const raised = React.useRef(false);
  React.useEffect(() => {
    if (raised.current || !seed?.length) return;
    raised.current = true;
    seed.forEach((payload) => notify(payload));
  }, [seed, notify]);

  return (
    <>
      <NotificationStack
        hidden={hidden}
        onSay={(line) => say.current?.(line)}
        onGo={onGo}
      />
      <ChatCorner hidden={hidden} agent={agent} onReady={takeSay} />
    </>
  );
}

export function NeedtCorner(props: NeedtCornerProps) {
  return (
    <NeedtNoticeProvider>
      <Corner {...props} />
    </NeedtNoticeProvider>
  );
}
