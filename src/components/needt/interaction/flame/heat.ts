/* THE CATEGORY'S IMPULSE — a number the flame reads, not one it invents.
 *
 * Ported from `Flame.jsx`'s `impulseOf`. This is the one heat formula the
 * prototype actually defines, and it answers a CATEGORY's question — how
 * much has this group of tasks moved lately — not a single task's: parts
 * closed plus tasks closed, tasks weighted double, normalised over a horizon
 * of six. A cold category returns 0, and `Flame` draws nothing for it — a
 * measure that has a zero has to have one, so there is something to be
 * absent.
 *
 * `NeedtTask.heat` — the field a single task carries — is a different
 * number with no formula anywhere: not in the schema (`@/lib/needt/types`'s
 * own header marks it a three-state capability field), not in the
 * prototype's code, not in any brief. Do not reach for this function to
 * invent one for a task; it answers a different question than the one that
 * field is asking. See `./Flame.tsx`'s own note.
 */
import type { NeedtTask } from "@/lib/needt/types";

/** The horizon `impulseOf` normalises against — six weighted closes reaches
 *  full heat. Ported unchanged from the prototype's `/ 6`. */
export const IMPULSE_HORIZON = 6;

/** How much a task's own close counts, against a part's `1`. */
export const IMPULSE_TASK_WEIGHT = 2;

export function impulseOf(items: readonly NeedtTask[]): number {
  const parts = items.reduce(
    (sum, task) => sum + (task.parts ?? []).filter((part) => part.done).length,
    0
  );
  const closed = items.filter((task) => task.done).length;
  return Math.min((parts + closed * IMPULSE_TASK_WEIGHT) / IMPULSE_HORIZON, 1);
}
