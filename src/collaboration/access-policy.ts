import {
  type MoodboardCollaborationContext,
  reauthorizeMoodboardCollaboration,
} from "@/services/moodboards/moodboard-collaboration-auth";
import {
  type PageCollaborationContext,
  reauthorizePageCollaboration,
} from "@/services/pages/page-collaboration-auth";
import { MoodboardAccessRole, PageAccessRole } from "@prisma/client";

export type CollaborationContext =
  | PageCollaborationContext
  | MoodboardCollaborationContext;

export function isCollaborationReadOnly(context: CollaborationContext) {
  return context.resource === "moodboard"
    ? context.role === MoodboardAccessRole.VIEWER
    : context.role === PageAccessRole.VIEWER;
}

export function reauthorizeCollaboration(
  context: CollaborationContext,
  documentName: string
) {
  return context.resource === "moodboard"
    ? reauthorizeMoodboardCollaboration(context, documentName)
    : reauthorizePageCollaboration(context, documentName);
}
