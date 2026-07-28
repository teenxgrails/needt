export interface CalendarItemClickProps {
  taskId?: string;
  extendedProps?: { taskId?: string };
}

/**
 * Calendar task blocks use `taskId:chunkIndex` as their calendar engine id.
 * Resolve the canonical task id regardless of whether calendar engine has
 * flattened or retained the original extended props.
 */
export function resolveCalendarItemId(
  props: CalendarItemClickProps,
  calendarItemId: string
) {
  return (
    props.taskId ||
    props.extendedProps?.taskId ||
    calendarItemId.split(":", 1)[0]
  );
}
