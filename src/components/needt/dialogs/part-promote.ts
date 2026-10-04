/* THE PROMOTION RULE — PORT.md §4.
 *
 * "A part is a piece of its task: it toggles inside the parent, never takes a
 * place in the day, and has exactly one action — promotion to a task of its
 * own. That is the only way a second level enters the model, and it is
 * deliberate: two levels is a project, and projects have Workspace."
 *
 * So this function is the entire rule, stated once as data in and data out,
 * rather than as an event handler wired straight into the dialog — a rule
 * this load-bearing earns its own file and its own tests, independent of
 * whatever markup happens to call it.
 *
 * A promoted task carries the parent's project: it is still the same body of
 * work, just no longer nested under it. It never carries a `parts` array of
 * its own — a promoted part becomes a task, not a task with its own parts,
 * because a second level of nesting is what makes something a project
 * instead, and a project belongs to Workspace, not to another task.
 */
import type { NeedtTask } from "@/lib/needt/types";

export interface PartPromotion {
  /** The source task, with the promoted part removed from `parts`. */
  task: NeedtTask;
  /** A new, independent task made from the part. */
  promoted: NeedtTask;
}

/**
 * Promote `task.parts[index]` to a task of its own.
 *
 * Returns `null` — rather than throwing — when there is nothing to promote:
 * no parts at all (`undefined`/`null`), or an index outside the list. A
 * promotion the caller cannot sensibly ask for is a no-op, not an error.
 */
export function promotePart(
  task: NeedtTask,
  index: number,
  promotedId: string
): PartPromotion | null {
  const parts = task.parts;
  if (!parts || index < 0 || index >= parts.length) return null;
  const part = parts[index];
  const remaining = parts.slice(0, index).concat(parts.slice(index + 1));

  return {
    task: { ...task, parts: remaining },
    promoted: {
      id: promotedId,
      title: part.title,
      done: part.done,
      project: task.project ?? null,
    },
  };
}
