export type TagColor = "blue" | "amber" | "purple";

/** Category label on a task card (Web / Saas / Mobile). */
export interface TagPillProps {
  /** Short single word. Sentence case, never uppercase. */
  label: string;
  /** blue = Web, amber = Saas, purple = Mobile. Colour is category-bound, not decorative. */
  color?: TagColor;
  style?: React.CSSProperties;
}
export declare function TagPill(props: TagPillProps): JSX.Element;
