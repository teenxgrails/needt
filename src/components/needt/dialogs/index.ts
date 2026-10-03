/* The dialogs, as one import: the task editor, the command palette, and the
   help and bug sheets. None of these are mounted anywhere — see PORT.md's
   build note — so a caller wires them into a screen or a shell slot itself. */
export { TaskDialog, type TaskDialogProps } from "./TaskDialog";
export { CommandPalette, type CommandPaletteProps } from "./CommandPalette";
export { HelpSheet, type HelpSheetProps } from "./HelpSheet";
export { BugSheet, type BugSheetProps, type BugReport } from "./BugSheet";
export { NEEDT_HELP, type HelpTopic, type HelpRule } from "./help-content";
export { paletteMatch, paletteScore, type PaletteHit } from "./palette-match";
export { promotePart, type PartPromotion } from "./part-promote";
