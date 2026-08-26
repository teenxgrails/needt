/** The workspace switcher pinned to the top of the sidebar. */
export interface TeamSwitcherProps {
  /** Workspace name, e.g. "David Visuals". */
  team: string;
  /** Two-letter initials for the avatar. */
  initials: string;
  /** Eyebrow above the name. Defaults to "Team". */
  label?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function TeamSwitcher(props: TeamSwitcherProps): JSX.Element;
