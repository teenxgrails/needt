/* COLUMNS' OWN ARITHMETIC — capacity, shed, and the AI order's score.
 *
 * Ported from the rule in `ColumnsScreen.jsx`'s `caColumns`/`caShed`, kept
 * pure and decoupled from `NeedtTask` so it can be tested and reasoned about
 * without the task model. `ColumnsScreen.tsx` is the only caller that knows
 * what a `NeedtTask` is; this file only knows minutes and days.
 */

export interface ShedCandidate {
  id: string | number;
  estMinutes: number;
  /** Days until due, or `null` for nothing to weigh against. */
  dueInDays: number | null;
}

export interface ShedResult<T extends ShedCandidate = ShedCandidate> {
  overMinutes: number;
  /** What would leave, in the order it would leave — named before anything
   *  moves, per the owner's rule that a silent bulk move is a defect. */
  moves: T[];
}

/**
 * WHAT LEAVES A DAY THAT DOES NOT FIT.
 *
 * Two candidate sets, and the one that takes LESS time out of the day wins —
 * a single covering task is not preferred on principle, only when it is
 * actually the cheaper way to clear the day. A tie goes to the smaller set,
 * because one move is easier to accept than two. Within a set, the latest
 * deadline goes first, then the smallest, so the day gives up what it can
 * most afford rather than what is heaviest.
 */
export function computeShed<T extends ShedCandidate>(
  open: readonly T[],
  roomMinutes: number | null
): ShedResult<T> | null {
  if (roomMinutes == null) return null;
  const load = open.reduce((n, t) => n + t.estMinutes, 0);
  const over = load - roomMinutes;
  if (over <= 0) return null;

  const far = (t: T) => (t.dueInDays == null ? 99 : t.dueInDays);
  const pool = [...open].sort(
    (a, b) => far(b) - far(a) || a.estMinutes - b.estMinutes
  );

  const accrued: T[] = [];
  let left = over;
  for (const t of pool) {
    if (left <= 0) break;
    accrued.push(t);
    left -= t.estMinutes;
  }

  const single = pool.find((t) => t.estMinutes >= over) ?? null;
  const total = (set: readonly T[]) =>
    set.reduce((n, t) => n + t.estMinutes, 0);
  const best =
    single &&
    (total([single]) < total(accrued) ||
      (total([single]) === total(accrued) && accrued.length > 1))
      ? [single]
      : accrued;

  return { overMinutes: over, moves: best };
}

/**
 * Today's capacity is what is LEFT of today — the remaining minutes between
 * now and the working day's own end — never the whole day's free hours. Any
 * other day gets its full free-hours allowance.
 */
export function capacityMinutes(
  isToday: boolean,
  nowHour: number,
  workEndHour: number,
  freeHoursOtherwise: number
): number {
  if (!isToday) return freeHoursOtherwise * 60;
  return Math.max(0, (workEndHour - nowHour) * 60);
}

export interface CapacityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

function clockMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

/** Capacity from the saved default work schedule, including split days. */
export function capacityMinutesForWindows(
  windows: readonly CapacityWindow[],
  dayOfWeek: number,
  isToday: boolean,
  nowHour: number
): number {
  const nowMinutes = nowHour * 60;
  return windows
    .filter((window) => window.dayOfWeek === dayOfWeek)
    .reduce((total, window) => {
      const start = clockMinutes(window.startTime);
      const end = clockMinutes(window.endTime);
      const availableStart = isToday ? Math.max(start, nowMinutes) : start;
      return total + Math.max(0, end - availableStart);
    }, 0);
}

export type ColumnsPriority = "now" | "soon" | "later" | "none";

/** The ring is the priority. Overdue and at-risk are both "now" — a
 *  deadline about to be missed reads the same as one already missed. */
export function priorityOf(
  overdue: boolean,
  atRisk: boolean,
  dueInDays: number | null
): ColumnsPriority {
  if (overdue || atRisk) return "now";
  if (dueInDays != null && dueInDays <= 2) return "soon";
  if (dueInDays != null && dueInDays <= 5) return "later";
  return "none";
}

/**
 * The AI order's score — not a ranking anyone has to trust blindly, because
 * `reasonFor` below states why in words for the same inputs.
 */
export function scoreOf(
  overdue: boolean,
  hasParts: boolean,
  dueInDays: number | null,
  estMinutes: number | null
): number {
  const dueScore =
    60 - Math.min(dueInDays == null ? 60 : dueInDays * 8, 60);
  const shortScore = estMinutes ? Math.max(0, 20 - estMinutes / 5) : 0;
  return (overdue ? 100 : 0) + (hasParts ? 10 : 0) + dueScore + shortScore;
}

/** Why the AI order put a task where it did — the same sentence the card
 *  shows, so the order can always be read back in words. */
export function reasonFor(
  overdue: boolean,
  partsStarted: number | null,
  partsTotal: number | null,
  estMinutes: number | null,
  hasValue: boolean
): string | null {
  if (overdue) return "Overdue, and nothing else moves until it is closed";
  if (partsTotal && partsStarted)
    return `Already started: ${partsStarted} of ${partsTotal} parts closed`;
  if (estMinutes != null && estMinutes >= 180)
    return "The longest thing here — it needs the day's biggest gap";
  if (estMinutes != null && estMinutes <= 20)
    return "Short enough to clear before the long work starts";
  if (hasValue) return "Money waiting on one action";
  return null;
}
