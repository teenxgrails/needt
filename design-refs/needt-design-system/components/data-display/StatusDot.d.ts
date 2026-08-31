export type Status = "todo" | "progress" | "review" | "done";

/** 8px column-status dot. The dot carries the colour so the heading text can stay neutral. */
export interface StatusDotProps {
  status?: Status;
  size?: number;
  style?: React.CSSProperties;
}
export declare function StatusDot(props: StatusDotProps): JSX.Element;
