/* THE INTERACTION LAYER'S PUBLIC SURFACE — drag, the drift clock, and the
 * category flame, ported from `Content height and label fixes/needt-app/`
 * per PORT.md §5 (drag), the Drift entry of §3 and `Drift.jsx` (drift), and
 * `Flame.jsx` (the flame).
 *
 * Nothing here is mounted, and `DesignPreview.tsx` is untouched — a caller
 * takes the hook and the components below and wires them into a screen.
 */

/* ── Drag ─────────────────────────────────────────────────────────────── */
export {
  DRAG_SNAP_HOURS,
  DRAG_THRESHOLD_PX,
  blockedLanding,
  describeDropTarget,
  formatDragTime,
  isDragItem,
  resolveDropTarget,
  sameDropTarget,
  snapDragTime,
  timelineTimeAt,
  type DayDropTarget,
  type DragBlockingItem,
  type DragPoint,
  type DropAttrs,
  type DropTarget,
  type FocusDropTarget,
  type RowDropTarget,
  type TimelineDropTarget,
  type TimelineGeometry,
} from "./drag/geometry";
export { DropRectCache, dropTargetAt, scrollerAt } from "./drag/dom";
export {
  useDrag,
  type DragState,
  type ReturningState,
  type UseDragResult,
} from "./drag/useDrag";
export { DragGhost, type DragGhostProps } from "./drag/DragGhost";

/* ── Drift ────────────────────────────────────────────────────────────── */
export {
  driftAt,
  sunTimes,
  type DriftLevels,
  type DriftPlace,
  type SunTimes,
} from "./drift/sun";
export { DRIFT_STOPS, mixHex, type DriftStop } from "./drift/palette";
export {
  useDrift,
  type DriftResult,
  type UseDriftOptions,
} from "./drift/useDrift";

/* ── Flame ────────────────────────────────────────────────────────────── */
export { IMPULSE_HORIZON, IMPULSE_TASK_WEIGHT, impulseOf } from "./flame/heat";
export { Flame, type FlameProps } from "./flame/Flame";
