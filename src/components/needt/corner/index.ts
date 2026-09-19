/* The corner's public surface. The shell needs `<NeedtCorner />`; anything
   that raises a notice needs `useNotify`. Nothing else should be reached for. */
export { NeedtCorner, type NeedtCornerProps } from "./NeedtCorner";
export { ChatCorner, type ChatCornerProps } from "./ChatCorner";
export {
  NotificationStack,
  NOTICE_KINDS,
  type NotificationStackProps,
} from "./NotificationStack";
export { NeedtNoticeProvider, useNotify, useNoticeStack } from "./notices";
export {
  CHAT_PROMPTS,
  ISLAND_NOTES,
  SEED_CHAT,
  fixtureNotices,
  scriptedAgent,
  type IslandNote,
} from "./scripted";
export {
  DISMISS_MS,
  FOLD_DIM,
  FOLD_SCALE,
  LEAVE_MS,
  STACK_KEPT,
  STACK_SHOWN,
  foldAt,
  foldTransform,
  keep,
  shown,
  startDismissClock,
  type DismissClock,
  type Fold,
} from "./stack";
export type {
  CornerAgent,
  CornerMessage,
  CornerReply,
  Notice,
  NoticeAct,
  NoticeApi,
  NoticeKind,
  NoticePayload,
  NoticeStack,
} from "./types";
