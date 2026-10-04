/* HOME — as one import.
 *
 * `Miniature` is the stable public surface: Settings and Auth import it
 * directly for their own thumbnails, independent of anything else here.
 */
export { Home, type HomeProps } from "./Home";
export { TodayForm, type TodayFormProps } from "./TodayForm";
export { BriefBoard, type BriefBoardProps, type BriefFormKind } from "./BriefBoard";
export { ProseForm, type ProseFormProps } from "./ProseForm";
export { CanvasForm, type CanvasFormProps } from "./CanvasForm";
export { FormSwitcher, type FormSwitcherProps, type HomeFormKind } from "./FormSwitcher";
export { HabitRail, type HabitRailProps } from "./HabitRail";
export { Wall, WallShade, type WallProps } from "./Wall";
export { WeekPlate, type WeekPlateProps } from "./WeekPlate";
export {
  Miniature,
  MINIATURE_WIDTH,
  MINIATURE_HEIGHT,
  type MiniatureKind,
  type MiniatureProps,
} from "./Miniature";
export {
  BriefObjectBody,
  BriefAuthorMark,
  BriefTyped,
  type BriefObjectBodyProps,
} from "./BriefObjectBody";
export {
  BRIEF_AUTHORS,
  BRIEF_TOOLS,
  briefAuthor,
  briefBlank,
  type BriefAuthorId,
  type BriefAuthorInfo,
  type BriefChecklistItem,
  type BriefObject,
  type BriefObjectKind,
} from "./brief-types";
export { BRIEF_KIND_ICON } from "./brief-icons";
export { BRIEF_SEED, BRIEF_LOG } from "./brief-seed";
export {
  HABIT_WINDOW_DAYS,
  WALL_LIP,
  WALL_PARKED_OPACITY,
  WALL_WIDTH,
  habitFieldDays,
  habitKeptRatio,
  habitWeekKept,
  homeParted,
  homePartOf,
  isoWeekNumber,
  wallGeometry,
  type HabitFieldDay,
  type HabitRatio,
  type HomePart,
  type HomePartedRow,
  type WallGeometry,
  type WallSide,
} from "./logic";
