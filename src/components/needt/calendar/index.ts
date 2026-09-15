/* The calendar, as one import. Exported for a caller to mount — nothing in
   this directory mounts itself. */
export {
  CalendarScreen,
  type CalendarOpts,
  type CalendarScreenProps,
  type CalendarView,
} from "./CalendarScreen";
export { WeekGrid, type WeekGridProps } from "./WeekGrid";
export { DayColumn, type DayColumnProps } from "./DayColumn";
export { MonthView, type MonthViewProps } from "./MonthView";
export { ColumnsScreen, type ColumnsScreenProps } from "./ColumnsScreen";
export { SequenceView, type SequenceViewProps } from "./SequenceView";
export { CalendarBlock, type CalendarBlockProps } from "./CalendarBlock";
export { CollapsedChip, type CollapsedChipProps } from "./CollapsedChip";
export { HourGutter, type HourGutterProps } from "./HourGutter";
export { NowLine, type NowLineProps } from "./NowLine";
export { MinuteBox, type MinuteBoxProps } from "./Minutes";

export {
  type CalendarEntry,
  entriesOnDay,
  entryDueDate,
  entryEndHour,
  entryMinutes,
  isPlaceable,
} from "./entries";

export {
  CASCADE_INDENT_PX,
  type OverlapItem,
  type OverlapOpts,
  type OverlapSlot,
  buildOverlapClusters,
  columnPixelWidth,
  intervalsOverlap,
  isCascade,
  layoutOverlap,
  overlapSlotBox,
} from "./overlap";

export {
  BLOCK_MIN_HEIGHT_PX,
  DEFAULT_WORK_END_HOUR,
  DEFAULT_WORK_START_HOUR,
  GRID_END_HOUR,
  GRID_START_HOUR,
  GUTTER_WIDTH_PX,
  HOUR_HEIGHT_PX,
  SNAP_HOUR,
  WEEK_VISIBLE_DAYS,
  columnWidth,
  daysInMonth,
  daysRange,
  formatClock,
  heightForDuration,
  hourOfDay,
  initialScrollLeft,
  initialScrollTop,
  type MonthCell,
  monthGridCells,
  nonWorkingRanges,
  snapToGrid,
  topForHour,
} from "./geometry";

export {
  MINUTE_FLOOR_PX,
  MINUTE_GAP_MAX_HOURS,
  MINUTE_GAP_MIN_HOURS,
  MINUTE_LEAST_PX,
  type MinuteBusyItem,
  type MinuteCandidate,
  type MinuteGap,
  findMinuteGaps,
  pickMinuteOffers,
} from "./minute-gaps";

export {
  type ColumnsPriority,
  type ShedCandidate,
  type ShedResult,
  capacityMinutes,
  computeShed,
  priorityOf,
  reasonFor,
  scoreOf,
} from "./columns-logic";
