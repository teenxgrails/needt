import type { MoodboardCollaborationContext } from "@/services/moodboards/moodboard-collaboration-auth";
import type { PageCollaborationContext } from "@/services/pages/page-collaboration-auth";
import { MoodboardAccessRole, PageAccessRole } from "@prisma/client";

export type CollaborationContext =
  | PageCollaborationContext
  | MoodboardCollaborationContext;

export function isCollaborationReadOnly(context: CollaborationContext) {
  return context.resource === "moodboard"
    ? context.role === MoodboardAccessRole.VIEWER
    : context.role === PageAccessRole.VIEWER;
}
