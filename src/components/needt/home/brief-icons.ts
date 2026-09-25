/* One icon per object kind, shared by the Canvas toolbar and the Prose slash
 * menu so the two vocabularies stay the same list twice, per PORT.md §3. */
import type { IconType } from "react-icons";
import {
  LuHash,
  LuHeading,
  LuImage,
  LuListChecks,
  LuMail,
  LuPenLine,
  LuQuote,
  LuSquare,
  LuTrendingUp,
  LuType,
} from "react-icons/lu";

import type { BriefObjectKind } from "./brief-types";

export const BRIEF_KIND_ICON: Readonly<Record<BriefObjectKind, IconType>> = Object.freeze({
  text: LuType,
  heading: LuHeading,
  checklist: LuListChecks,
  image: LuImage,
  drawing: LuPenLine,
  card: LuSquare,
  metric: LuHash,
  marey: LuTrendingUp,
  email: LuMail,
  quote: LuQuote,
});
