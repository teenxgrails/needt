import type { Status } from "../data-display/StatusDot";

/** Heading row above a board column: status dot, title, count, and +/⋯ affordances. */
export interface ColumnHeaderProps {
  title: string;
  status?: Status;
  count: number;
  style?: React.CSSProperties;
}
export declare function ColumnHeader(props: ColumnHeaderProps): JSX.Element;
