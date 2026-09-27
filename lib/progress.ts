/**
 * The rules for lesson progress, kept pure so they can be tested and so the
 * SQL function `save_lesson_progress` (supabase/migrations) can mirror them
 * line for line.
 *
 * Taken from Buildour (clamped, never-decreasing position; manual override;
 * resume a few seconds before the end) plus watch verification: a lesson in
 * `watch` mode completes only after the learner has genuinely watched
 * `minWatchPct` of it. Scrubbing to the end earns nothing, because the player
 * only credits forward movement of under a second per tick.
 */
export type CompletionMode = 'watch' | 'manual';

export type LessonRules = {
  durationSeconds: number;
  completionMode: CompletionMode;
  /** 0–1. Default 0.8. */
  minWatchPct: number;
};

export type ProgressState = {
  positionSeconds: number;
  watchSeconds: number;
  completed: boolean;
  /** Set when the learner un-ticks a lesson, so autosave does not re-tick it. */
  manuallyIncomplete: boolean;
};

export type ProgressUpdate = {
  positionSeconds: number;
  /** Seconds genuinely watched since the last report. */
  watchedDelta: number;
};

/** A report can never credit more than this, whatever the client claims. */
export const MAX_DELTA_PER_REPORT = 120;

export const EMPTY_PROGRESS: ProgressState = {
  positionSeconds: 0,
  watchSeconds: 0,
  completed: false,
  manuallyIncomplete: false,
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function watchTarget(rules: LessonRules): number {
  return Math.ceil(rules.durationSeconds * clamp(rules.minWatchPct, 0, 1));
}

export function hasWatchedEnough(state: ProgressState, rules: LessonRules): boolean {
  if (rules.durationSeconds <= 0) return false;
  return state.watchSeconds >= watchTarget(rules);
}

export function applyProgress(prev: ProgressState, update: ProgressUpdate, rules: LessonRules): ProgressState {
  const duration = Math.max(0, rules.durationSeconds);
  const position = duration > 0 ? clamp(Math.floor(update.positionSeconds), 0, duration) : Math.max(0, Math.floor(update.positionSeconds));
  const delta = clamp(Math.floor(update.watchedDelta), 0, MAX_DELTA_PER_REPORT);
  // Watch time can never exceed the video's length.
  const watchSeconds = duration > 0 ? Math.min(duration, prev.watchSeconds + delta) : prev.watchSeconds + delta;

  const next: ProgressState = {
    positionSeconds: position,
    watchSeconds,
    completed: prev.completed,
    manuallyIncomplete: prev.manuallyIncomplete,
  };

  // Completion is only ever set automatically, never cleared automatically.
  if (!next.completed && !next.manuallyIncomplete && rules.completionMode === 'watch' && hasWatchedEnough(next, rules)) {
    next.completed = true;
  }
  return next;
}

export type MarkResult = { ok: true; state: ProgressState } | { ok: false; reason: 'not_watched_enough' };

/** The learner ticking or un-ticking "Mark complete". */
export function markCompletion(prev: ProgressState, completed: boolean, rules: LessonRules): MarkResult {
  if (!completed) return { ok: true, state: { ...prev, completed: false, manuallyIncomplete: true } };
  if (rules.completionMode === 'watch' && !hasWatchedEnough(prev, rules)) {
    return { ok: false, reason: 'not_watched_enough' };
  }
  return { ok: true, state: { ...prev, completed: true, manuallyIncomplete: false } };
}

/** Where to start playback: from 0 if barely started, never in the last 5 seconds. */
export function resumePoint(positionSeconds: number, durationSeconds: number): number {
  if (positionSeconds < 5) return 0;
  if (durationSeconds > 0) return Math.max(0, Math.min(positionSeconds, durationSeconds - 5));
  return positionSeconds;
}

export function coursePercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(completed, total) / total) * 100);
}
