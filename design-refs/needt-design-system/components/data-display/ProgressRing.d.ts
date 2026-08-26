/** Tiny subtask-completion ring in a task card's meta row. Turns green at 100%. */
export interface ProgressRingProps {
  /** 0–100, clamped. */
  value: number;
  /** 15 in the product. */
  size?: number;
  /** Ring thickness in px. */
  stroke?: number;
  style?: React.CSSProperties;
}
export declare function ProgressRing(props: ProgressRingProps): JSX.Element;
