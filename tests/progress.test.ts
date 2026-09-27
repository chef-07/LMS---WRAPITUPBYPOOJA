import { describe, expect, test } from 'vitest';
import {
  EMPTY_PROGRESS,
  MAX_DELTA_PER_REPORT,
  applyProgress,
  coursePercent,
  markCompletion,
  resumePoint,
  type LessonRules,
} from '@/lib/progress';

const watch: LessonRules = { durationSeconds: 600, completionMode: 'watch', minWatchPct: 0.8 };
const manual: LessonRules = { ...watch, completionMode: 'manual' };

describe('applyProgress', () => {
  test('clamps the position to the video length', () => {
    expect(applyProgress(EMPTY_PROGRESS, { positionSeconds: 9999, watchedDelta: 0 }, watch).positionSeconds).toBe(600);
    expect(applyProgress(EMPTY_PROGRESS, { positionSeconds: -4, watchedDelta: 0 }, watch).positionSeconds).toBe(0);
  });

  test('scrubbing to the end does not complete a watch-mode lesson', () => {
    const s = applyProgress(EMPTY_PROGRESS, { positionSeconds: 600, watchedDelta: 0 }, watch);
    expect(s.completed).toBe(false);
  });

  test('a single report cannot credit more than the cap', () => {
    const s = applyProgress(EMPTY_PROGRESS, { positionSeconds: 600, watchedDelta: 10_000 }, watch);
    expect(s.watchSeconds).toBe(MAX_DELTA_PER_REPORT);
    expect(s.completed).toBe(false);
  });

  test('completes once 80% has genuinely been watched', () => {
    let s = EMPTY_PROGRESS;
    for (let t = 15; t <= 480; t += 15) s = applyProgress(s, { positionSeconds: t, watchedDelta: 15 }, watch);
    expect(s.watchSeconds).toBe(480);
    expect(s.completed).toBe(true);
  });

  test('completion is never cleared by a later save', () => {
    const done = { ...EMPTY_PROGRESS, watchSeconds: 600, completed: true };
    expect(applyProgress(done, { positionSeconds: 3, watchedDelta: 0 }, watch).completed).toBe(true);
  });

  test('manual-mode lessons never auto-complete', () => {
    const s = applyProgress(EMPTY_PROGRESS, { positionSeconds: 600, watchedDelta: 120 }, { ...manual, durationSeconds: 100 });
    expect(s.completed).toBe(false);
  });

  test('watch time never exceeds the duration', () => {
    const s = applyProgress({ ...EMPTY_PROGRESS, watchSeconds: 590 }, { positionSeconds: 600, watchedDelta: 60 }, watch);
    expect(s.watchSeconds).toBe(600);
  });
});

describe('markCompletion', () => {
  test('refuses to tick a watch-mode lesson that has not been watched', () => {
    expect(markCompletion(EMPTY_PROGRESS, true, watch)).toEqual({ ok: false, reason: 'not_watched_enough' });
  });

  test('allows ticking a manual lesson at any time', () => {
    const r = markCompletion(EMPTY_PROGRESS, true, manual);
    expect(r.ok && r.state.completed).toBe(true);
  });

  test('un-ticking sticks: autosave does not re-complete it', () => {
    const done = { ...EMPTY_PROGRESS, watchSeconds: 600, completed: true };
    const r = markCompletion(done, false, watch);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.completed).toBe(false);
    const after = applyProgress(r.state, { positionSeconds: 600, watchedDelta: 15 }, watch);
    expect(after.completed).toBe(false);
  });

  test('re-ticking clears the manual override', () => {
    const r = markCompletion({ ...EMPTY_PROGRESS, watchSeconds: 600, manuallyIncomplete: true }, true, watch);
    expect(r.ok && r.state).toMatchObject({ completed: true, manuallyIncomplete: false });
  });
});

describe('resumePoint and coursePercent', () => {
  test('resume rules', () => {
    expect(resumePoint(3, 600)).toBe(0);
    expect(resumePoint(120, 600)).toBe(120);
    expect(resumePoint(599, 600)).toBe(595);
  });

  test('percent is safe for empty courses', () => {
    expect(coursePercent(0, 0)).toBe(0);
    expect(coursePercent(3, 4)).toBe(75);
    expect(coursePercent(9, 4)).toBe(100);
  });
});
