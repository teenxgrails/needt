import type { IconName } from "../icons/Icon";

/**
 * The product's text button. There is no filled/primary button anywhere in Needt —
 * every action button is a hairline-bordered or ghost control.
 */
export interface ButtonProps {
  children?: React.ReactNode;
  /** Leading glyph from the Needt icon set, rendered at 15px. */
  icon?: IconName;
  /** secondary = hairline border (Filter/Sort). ghost = no border. dashed = full-width "Add new" row. */
  variant?: "secondary" | "ghost" | "dashed";
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
