/** Page-header breadcrumb. Starts with a home glyph; the final segment is a --surface-2 chip. */
export interface BreadcrumbProps {
  /** Segment labels after the home glyph, e.g. ["Dashboard", "Overview"]. */
  items: string[];
  style?: React.CSSProperties;
}
export declare function Breadcrumb(props: BreadcrumbProps): JSX.Element;
