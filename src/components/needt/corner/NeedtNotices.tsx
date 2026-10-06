"use client";

/* THE PRODUCT'S NOTIFICATIONS, in the corner the design speaks from.
 *
 * `NeedtCorner` composes the stack with `ChatCorner`, the design's chat pill.
 * The application already has a companion and a chat overlay of its own in
 * that corner, so only the stack is mounted here — two pills would be two
 * products.
 *
 * `.needt-v2` with a `data-theme` is the scope the design's tokens resolve
 * in, and `.nf-stack` is positioned against the nearest positioned ancestor,
 * so this supplies both. The frame takes no pointer events; the cards inside
 * it take their own.
 */
import * as React from "react";

import { useResolvedTheme } from "../use-resolved-theme";
import { NotificationStack } from "./NotificationStack";
import { setNoticeSink } from "./bridge";
import { NeedtNoticeProvider, useNotify } from "./notices";

/** Hands the mounted stack to the plain-function facade, and takes it back. */
function Sink() {
  const api = useNotify();
  React.useEffect(() => {
    setNoticeSink(api);
    return () => setNoticeSink(null);
  }, [api]);
  return null;
}

export function NeedtNotices() {
  const theme = useResolvedTheme();

  return (
    <NeedtNoticeProvider>
      <Sink />
      <div
        className="needt-v2"
        data-theme={theme}
        /* The companion is draggable and keeps clear of anything marked
           this way; a card it sat on top of could not be read or dismissed. */
        data-assistant-avoid
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 480,
          pointerEvents: "none",
        }}
      >
        <NotificationStack />
      </div>
    </NeedtNoticeProvider>
  );
}
