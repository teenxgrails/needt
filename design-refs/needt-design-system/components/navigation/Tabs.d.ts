/** View switcher in the page header (Board / List / Timeline / Due Tasks). */
export interface TabsProps {
  tabs: string[];
  value: string;
  onChange?: (tab: string) => void;
  style?: React.CSSProperties;
}
export declare function Tabs(props: TabsProps): JSX.Element;
