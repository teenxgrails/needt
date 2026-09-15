/* THE PHONE SHELL, as one import.
 *
 * `MobileShell` is the whole product at 402×874 — exported for a caller to
 * mount, the same convention every other `*Screen` in this app follows.
 * Nothing in this directory reaches into `DesignPreview.tsx` or a route.
 */
export { MobileShell, type MobileShellProps, type MobileStage } from "./MobileShell";

export { MobileHeader, type MobileHeaderProps } from "./MobileHeader";
export { MobileHabitStrip, type MobileHabitStripProps } from "./MobileHabitStrip";
export { MobileHome, type MobileHomeProps } from "./MobileHome";
export { MobileCalendarDay, type MobileCalendarDayProps } from "./MobileCalendarDay";
export { MobileWorkspace, type MobileWorkspaceProps } from "./MobileWorkspace";
export { MobileDocs } from "./MobileDocs";
export { MobileComposer, type MobileComposerDraft, type MobileComposerProps } from "./MobileComposer";
export { MobileTaskSheet, type MobileTaskSheetProps } from "./MobileTaskSheet";
export { MobileQueueSheet, type MobileQueueSheetProps } from "./MobileQueueSheet";
export { MobileSettings, type MobileRailLanguage, type MobileSettingsProps } from "./MobileSettings";
export { MobileAuthScreen, type MobileAuthMode, type MobileAuthScreenProps } from "./MobileAuthScreen";
export { MobileOnboarding, type MobileOnboardingProps } from "./MobileOnboarding";
export { MobileTabBar, type MobileTabBarProps } from "./MobileTabBar";
export { MobileSheet, type MobileSheetProps } from "./MobileSheet";

export {
  AUTH_BUTTON_HEIGHT,
  COMPOSER_HIT_SIZE,
  DAY_STRIP_CELL,
  FAB_SIZE,
  HABIT_CHIP_HEIGHT,
  HEADER_BUTTON_SIZE,
  MOBILE_STRIP_AFTER,
  MOBILE_STRIP_BEFORE,
  MOBILE_TAP_MIN,
  MOBILE_TABS,
  QUEUE_BUTTON_HEIGHT,
  SETTINGS_ROW_MIN_HEIGHT,
  TAB_ITEM_HEIGHT,
  TASK_SHEET_ROW_HEIGHT,
  meetsTapMin,
  mobileDayLists,
  mobileDayStrip,
  mobileDueOffset,
  mobileDueTodayCount,
  mobileDuration,
  mobileGroupByProject,
  mobileQueue,
  mobileQueueMinutes,
  type MobileDayLists,
  type MobileProjectGroup,
  type MobileStripDay,
  type MobileTabDef,
  type MobileTabId,
} from "./mobile-logic";
