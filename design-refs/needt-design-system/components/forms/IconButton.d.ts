import type { IconName } from "../icons/Icon";

/** Square glyph-only button: the theme toggle (bordered) and the +/⋯ affordances (borderless). */
export interface IconButtonProps {
  icon: IconName;
  /** Box size. 34 for the bordered toolbar button; 20–24 for borderless affordances. */
  size?: number;
  iconSize?: number;
  /** false gives the borderless variant used in sidebar section headers and column headers. */
  bordered?: boolean;
  /** Required accessible name — the button has no text. */
  label?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
