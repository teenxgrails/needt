import type { TagColor } from "../data-display/TagPill";

/** The board's task card: client line, title, tag row with assignee chip, and a divided meta footer. */
export interface TaskCardProps {
  /** Rendered as "Client: {client}". */
  client: string;
  title: string;
  tags?: { label: string; color: TagColor }[];
  assignee?: { name: string; initials: string };
  attachments: number;
  /** 0–100, shown as a ring plus a percentage. */
  progress: number;
  comments: number;
  /** Short relative due string, e.g. "4d". */
  due: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function TaskCard(props: TaskCardProps): JSX.Element;
