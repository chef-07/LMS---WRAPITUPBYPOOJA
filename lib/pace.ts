/** Pure date and pace helpers for batches and campaigns (unit-tested). */

/** Whole days from a to b (both plain dates). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export type PaceStatus = 'done' | 'on-track' | 'behind' | 'overdue' | 'not-started';

/**
 * Where someone stands against a window: done at 100%, overdue once the
 * end date has passed, behind when more than 15 points under the
 * straight-line pace for the days gone.
 */
export function paceStatus(pct: number, start: string, end: string, today: string): PaceStatus {
  if (pct >= 100) return 'done';
  if (today > end) return 'overdue';
  const total = Math.max(1, daysBetween(start, end));
  const gone = Math.min(total, Math.max(0, daysBetween(start, today)));
  const expected = (gone / total) * 100;
  if (pct === 0 && expected < 15) return 'not-started';
  return pct + 15 >= expected ? 'on-track' : 'behind';
}
