/* SOURCE MARKS.
 *
 * A source is a mark, not a decoration: it is here to say where the block came
 * from. Marks are drawn as their own geometry rather than fetched, so nothing
 * is bundled and nothing is requested at paint time.
 */
import * as React from "react";

import type { RbSourceId } from "../rb-shape";

export const RB_SOURCES: Readonly<
  Record<RbSourceId, { name: string; hue: string }>
> = Object.freeze({
  slack: { name: "Slack", hue: "#611F69" },
  google: { name: "Google Calendar", hue: "#4285F4" },
  apple: { name: "Apple Calendar", hue: "#8E8E93" },
  linear: { name: "Linear", hue: "#5E6AD2" },
});

/**
 * One source's mark at a size.
 *
 * Every path is a fill. The stroke-built glyph the first attempt used inherited
 * the fill the other marks need and vanished; keeping all four to one paint
 * model is what stops that recurring.
 */
export function RbMark({
  mark,
  size = 17,
}: {
  mark: RbSourceId;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true as const,
  };
  if (mark === "slack") {
    return (
      <svg {...common}>
        <path d="M5.1 15.1a2.1 2.1 0 1 1-2.1-2.1h2.1v2.1Zm1.1 0a2.1 2.1 0 0 1 4.2 0v5.3a2.1 2.1 0 0 1-4.2 0v-5.3Z" />
        <path d="M8.9 5.1a2.1 2.1 0 1 1 2.1-2.1v2.1H8.9Zm0 1.1a2.1 2.1 0 0 1 0 4.2H3.6a2.1 2.1 0 0 1 0-4.2h5.3Z" />
        <path d="M18.9 8.9a2.1 2.1 0 1 1 2.1 2.1h-2.1V8.9Zm-1.1 0a2.1 2.1 0 0 1-4.2 0V3.6a2.1 2.1 0 0 1 4.2 0v5.3Z" />
        <path d="M15.1 18.9a2.1 2.1 0 1 1-2.1 2.1v-2.1h2.1Zm0-1.1a2.1 2.1 0 0 1 0-4.2h5.3a2.1 2.1 0 0 1 0 4.2h-5.3Z" />
      </svg>
    );
  }
  if (mark === "google") {
    return (
      <svg {...common}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.3 2c.7 0 1.2.6 1.2 1.3v1.2h7V3.3c0-.7.5-1.3 1.2-1.3s1.3.6 1.3 1.3v1.2h.5A2.5 2.5 0 0 1 21 7v11.5A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5V7a2.5 2.5 0 0 1 2.5-2.5H6V3.3C6 2.6 6.6 2 7.3 2Zm-1.6 9.4v2.2h3v-2.2h-3Zm4.6 0v2.2h3.4v-2.2h-3.4Zm5 0v2.2h3v-2.2h-3Zm-9.6 3.8v2.2h3v-2.2h-3Zm4.6 0v2.2h3.4v-2.2h-3.4Z"
        />
      </svg>
    );
  }
  if (mark === "apple") {
    return (
      <svg {...common}>
        <path d="M16.4 12.6c0-2 1.6-3 1.7-3.1-.9-1.4-2.4-1.5-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.4 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.5 2 1-.1 1.4-.6 2.6-.6s1.5.6 2.6.6c1.1 0 1.8-1 2.4-2 .4-.6.7-1.3.9-2-1.6-.6-2.4-2.1-2.4-3.3Z" />
        <path d="M14.6 6.5c.6-.7.9-1.7.8-2.7-.9.1-1.9.6-2.5 1.3-.5.6-.9 1.6-.8 2.5 1 .1 1.9-.4 2.5-1.1Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3.2 14.3 9.7 20.8a9 9 0 0 1-6.5-6.5ZM3 11.6 12.4 21c.8-.1 1.6-.3 2.3-.6L3.6 9.3c-.3.7-.5 1.5-.6 2.3ZM4.5 7.7 16.3 19.5c.6-.4 1.1-.8 1.6-1.3L5.8 6.1c-.5.5-.9 1-1.3 1.6ZM7.4 4.6 19.4 16.6c1.6-2.3 1.9-5.3.7-7.9L15.3 3.9c-2.6-1.2-5.6-.9-7.9.7Z" />
    </svg>
  );
}
