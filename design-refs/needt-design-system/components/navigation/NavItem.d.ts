import type { IconName } from "../icons/Icon";

/**
 * A sidebar navigation row.
 */
export interface NavItemProps {
  label: string;
  icon: IconName;
  /** Active row gets --surface-2, medium weight, and a full-strength icon. */
  active?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function NavItem(props: NavItemProps): JSX.Element;
