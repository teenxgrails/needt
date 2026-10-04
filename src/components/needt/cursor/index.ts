/* The cursor's public surface. A caller mounts `<AgentCursor />` into the
   shell's slot, keeps the handle it is handed, and gives it runs. */
export { AgentCursor, type AgentCursorProps } from "./AgentCursor";
export { AgentMarks, type AgentMarksProps } from "./AgentMarks";
export {
  ARC_MAX_PX,
  ARC_SHARE,
  CORNER_GUTTER,
  MARK_DOT,
  MARK_GUTTER,
  MARK_MIN_INSET,
  PILL,
  REACH_BASE_MS,
  REACH_DOUBLING_MS,
  REACH_MAX_MS,
  REACH_MIN_MS,
  REACH_SCALE_PX,
  acEase,
  homePoint,
  markPoint,
  nextSide,
  planReach,
  reachAt,
  reachDone,
  reachMs,
  withinClip,
  type ArcSide,
  type Box,
  type Point,
  type ReachPlan,
} from "./motion";
export { placeFirstUnplaced, scriptedRuns, startFocus } from "./scripted";
export type {
  AgentAct,
  AgentCursorHandle,
  AgentMark,
  AgentMarkSpec,
  AgentRun,
  AgentRunSource,
  AgentStep,
} from "./types";
