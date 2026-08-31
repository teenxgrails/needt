/**
 * The one card shell in the system: 16px radius, hairline border, --surface fill, no resting shadow.
 */
export interface CardProps {
  children?: React.ReactNode;
  /** Adds the interactive treatment: border goes --border-strong and a 1px shadow appears. */
  hoverable?: boolean;
  padding?: string;
  style?: React.CSSProperties;
}
export declare function Card(props: CardProps): JSX.Element;
