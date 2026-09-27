/**
 * Module locking, mirrored by the SQL function `lesson_locked()` (which is
 * what actually enforces it). A module is locked while any *required* quiz
 * with questions in an earlier module is not yet passed. Practicals never
 * lock: a slow review must not stop anyone learning.
 */
export type LockModule = { id: string; title: string; requiredQuizIds: string[] };

export type LockState = { locked: boolean; blockedBy: string | null };

export function moduleLocks(modules: LockModule[], passedQuizIds: ReadonlySet<string>): Record<string, LockState> {
  const out: Record<string, LockState> = {};
  let blockedBy: string | null = null;
  for (const m of modules) {
    out[m.id] = { locked: blockedBy !== null, blockedBy };
    if (blockedBy === null && m.requiredQuizIds.some((q) => !passedQuizIds.has(q))) blockedBy = m.title;
  }
  return out;
}
