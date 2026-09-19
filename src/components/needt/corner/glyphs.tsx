/* THE CORNER'S GLYPHS.
 *
 * The prototype resolved icon names through a host-side registry, because a
 * classic script cannot import. Production can, so the set is closed and an
 * unknown name is a type error rather than a blank square at runtime.
 */
import * as React from "react";

import {
  LuArrowUp,
  LuCalendarCheck,
  LuCheck,
  LuChevronDown,
  LuClock,
  LuFlame,
  LuKeyboard,
  LuLink,
  LuListPlus,
  LuMessageCircle,
  LuMoon,
  LuMoveRight,
  LuSparkles,
  LuTriangleAlert,
  LuUser,
  LuWandSparkles,
  LuX,
} from "react-icons/lu";

const GLYPHS = {
  "arrow-up": LuArrowUp,
  "calendar-check": LuCalendarCheck,
  check: LuCheck,
  "chevron-down": LuChevronDown,
  clock: LuClock,
  flame: LuFlame,
  keyboard: LuKeyboard,
  link: LuLink,
  "list-plus": LuListPlus,
  "message-circle": LuMessageCircle,
  moon: LuMoon,
  "move-right": LuMoveRight,
  sparkles: LuSparkles,
  "triangle-alert": LuTriangleAlert,
  user: LuUser,
  "wand-sparkles": LuWandSparkles,
  x: LuX,
} as const;

export type CornerGlyphName = keyof typeof GLYPHS;

export function CornerGlyph({
  name,
  size = 15,
}: {
  name: CornerGlyphName;
  size?: number;
}) {
  const Glyph = GLYPHS[name];
  return <Glyph size={size} aria-hidden="true" />;
}

/**
 * The plate a glyph sits on: the hue lives here and nowhere else, at 14–15%
 * with the tone as the glyph's colour. Never a solid fill — a plate is not a
 * mark.
 */
export function CornerPlate({
  glyph,
  tone,
  size = 30,
  mix = 15,
}: {
  glyph: CornerGlyphName;
  /** A token reference: `var(--accent)`, `var(--destructive)`. */
  tone: string;
  size?: number;
  mix?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: "none",
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: "var(--radius-md)",
        color: tone,
        background: `color-mix(in oklab, ${tone} ${mix}%, transparent)`,
      }}
    >
      <CornerGlyph name={glyph} size={15} />
    </span>
  );
}
