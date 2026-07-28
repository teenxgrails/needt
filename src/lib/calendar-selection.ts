/**
 * The subset of calendar engine's `DateSelectArg` we need to derive the date
 * range for the New Event modal. Kept minimal so the helper is trivially
 * unit-testable without constructing a full calendar engine selection.
 */
export interface SelectionInfo {
  start: Date;
  end: Date;
  allDay: boolean;
}

export interface SelectionRange {
  start: Date;
  end: Date;
  allDay: boolean;
}

interface SelectionInteraction {
  jsEvent?: { isTrusted: boolean } | null;
}

/**
 * calendar engine can emit `select` while restoring or recalculating its internal
 * selection during mount. Only a trusted browser event represents a selection
 * the user explicitly made in the grid.
 */
export function isExplicitCalendarSelection(
  selectInfo: SelectionInteraction
): boolean {
  return selectInfo.jsEvent?.isTrusted === true;
}

/**
 * Maps a calendar drag/click selection to the date range used to pre-fill the
 * New Event modal.
 *
 * Previously the views collapsed every all-day selection to a single day
 * (`allDay ? start : end`), so dragging across the all-day row could not create
 * a multi-day event (issue #79). calendar engine already reports an all-day
 * selection with an EXCLUSIVE end (the day after the last selected day), which
 * is exactly the convention used by the event store, the provider serializers
 * (Google/Outlook/CalDAV), and calendar engine's own all-day rendering. So we pass
 * the start and end through verbatim for all selections, all-day or timed. No
 * date arithmetic is performed, so there is no daylight-saving-time edge case.
 */
export function getSelectionRange(selectInfo: SelectionInfo): SelectionRange {
  return {
    start: selectInfo.start,
    end: selectInfo.end,
    allDay: selectInfo.allDay,
  };
}
