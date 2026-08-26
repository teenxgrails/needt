export type IconName =
  | "home" | "check-square" | "file" | "folder" | "calendar" | "message" | "credit-card"
  | "zap" | "users" | "user-cog" | "workflow" | "store" | "building" | "id" | "search"
  | "chevron-up-down" | "chevron-right" | "chevron-down" | "plus" | "more" | "filter"
  | "sort" | "paperclip" | "comment" | "clock" | "sun" | "moon";

/**
 * The Needt icon set: 24×24 stroke-only glyphs that inherit currentColor.
 */
export interface IconProps {
  /** Glyph name. */
  name: IconName;
  /** Rendered box in px. 13–15 inline in text, 16 in buttons, 18 in nav rows. */
  size?: number;
  /** Stroke weight. Never change from 1.6 unless matching a specific mock. */
  strokeWidth?: number;
  /** Overrides currentColor. Prefer inheriting from the parent. */
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}
export declare function Icon(props: IconProps): JSX.Element;
export declare const iconPaths: Record<IconName, unknown[]>;
export declare const iconNames: IconName[];
