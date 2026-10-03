/* THE GLYPH REGISTRY.
 *
 * The prototype resolved icon names through a runtime loader; production does
 * not need one. The names a block can ask for are a closed set, so they are a
 * map from the name to the component and an unknown name is a type error
 * rather than a blank square at runtime.
 */
import * as React from "react";

import {
  LuArrowRight,
  LuBriefcase,
  LuCheck,
  LuComponent,
  LuCornerDownRight,
  LuEyeOff,
  LuGraduationCap,
  LuHeart,
  LuLink,
  LuListChecks,
  LuLock,
  LuMapPin,
  LuPackage,
  LuPaperclip,
} from "react-icons/lu";

const GLYPHS = {
  "arrow-right": LuArrowRight,
  briefcase: LuBriefcase,
  check: LuCheck,
  component: LuComponent,
  "corner-down-right": LuCornerDownRight,
  "eye-off": LuEyeOff,
  "graduation-cap": LuGraduationCap,
  heart: LuHeart,
  link: LuLink,
  "list-checks": LuListChecks,
  lock: LuLock,
  "map-pin": LuMapPin,
  package: LuPackage,
  paperclip: LuPaperclip,
} as const;

export type RbGlyphName = keyof typeof GLYPHS;

/** True when a project's authored glyph is one this build can draw. */
export function isGlyphName(name: string): name is RbGlyphName {
  return Object.prototype.hasOwnProperty.call(GLYPHS, name);
}

export function RbGlyph({
  name,
  size = 16,
}: {
  name: RbGlyphName;
  size?: number;
}) {
  const Icon = GLYPHS[name];
  return <Icon size={size} aria-hidden="true" />;
}
