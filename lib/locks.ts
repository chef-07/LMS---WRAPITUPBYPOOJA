/**
 * Module locking, mirrored by the SQL function `lesson_locked()` (which is
 * what actually enforces it). A module is locked when:
 * - a required quiz (with questions) in an earlier module is not passed, or
 * - it drips: it opens `dripDays` after the learner's start (their batch
 *   start, else the day they joined), in India time.
 * Practicals never lock: a slow review must not stop anyone learning.
 */
export type LockModule = { id: string; title: string; requiredQuizIds: string[]; dripDays: number };

export type LockReason = { kind: 'quiz'; module: string } | { kind: 'drip'; opensOn: string };
export type LockState = { locked: boolean; reason: LockReason | null };

/** "2026-10-01" + 7 → "2026-10-08" (dates only, no time zones involved). */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's date in India (the business runs on IST), e.g. "2026-09-27". */
export function indiaToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

export function moduleLocks(
  modules: LockModule[],
  passedQuizIds: ReadonlySet<string>,
  clock?: { startDate: string; today: string },
): Record<string, LockState> {
  const out: Record<string, LockState> = {};
  let blockedBy: string | null = null;
  for (const m of modules) {
    let reason: LockReason | null = blockedBy ? { kind: 'quiz', module: blockedBy } : null;
    if (!reason && clock && m.dripDays > 0) {
      const opensOn = addDays(clock.startDate, m.dripDays);
      if (clock.today < opensOn) reason = { kind: 'drip', opensOn };
    }
    out[m.id] = { locked: reason !== null, reason };
    if (blockedBy === null && m.requiredQuizIds.some((q) => !passedQuizIds.has(q))) blockedBy = m.title;
  }
  return out;
}
