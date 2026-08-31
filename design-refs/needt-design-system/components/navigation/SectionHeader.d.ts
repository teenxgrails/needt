/** Collapsible group heading inside the sidebar (File, Apps). */
export interface SectionHeaderProps {
  /** Group name — rendered uppercase with wide tracking. */
  label: string;
  expanded?: boolean;
  onToggle?: () => void;
  /** Show the +/⋯ affordances. */
  actions?: boolean;
  style?: React.CSSProperties;
}
export declare function SectionHeader(props: SectionHeaderProps): JSX.Element;
