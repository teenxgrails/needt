/** Initials avatar on the indigo→violet gradient. No photo avatars exist in the product. */
export interface AvatarProps {
  /** Two uppercase letters, e.g. "PB". */
  initials: string;
  /** 18 on cards, 20 default, 34 in the team switcher. Font size is derived (size × 0.42). */
  size?: number;
  style?: React.CSSProperties;
}
export declare function Avatar(props: AvatarProps): JSX.Element;
