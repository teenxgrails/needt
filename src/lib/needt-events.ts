export const NEEDT_AI_ACTION_EVENT = "needt:ai-action";
export const NEEDT_SCHEDULE_CHANGED_EVENT = "needt:schedule-changed";

// Read the previous event for one release so an already-open client can finish
// an in-flight action while the new bundle activates. New code emits Needt only.
export const LEGACY_AI_ACTION_EVENT = "flowday:ai-action";
