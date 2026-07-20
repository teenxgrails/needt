export const BOARD_VIEW_TYPES = [
  "table",
  "board",
  "list",
  "timeline",
  "calendar",
  "gallery",
] as const;

export type BoardViewType = (typeof BOARD_VIEW_TYPES)[number];

export function isBoardViewType(value: string | null): value is BoardViewType {
  return BOARD_VIEW_TYPES.includes(value as BoardViewType);
}

export function boardViewStorageKey(boardId: string): string {
  return `needt:board:${boardId}:view`;
}
