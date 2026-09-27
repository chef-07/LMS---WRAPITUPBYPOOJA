import { describe, expect, test } from 'vitest';
import { badgesFor } from '@/lib/badges';

describe('badgesFor', () => {
  test('nothing earned for a new starter', () => {
    expect(badgesFor({ counts: {}, bestStreak: 0 }).filter((b) => b.earned)).toEqual([]);
  });
  test('thresholds', () => {
    const earned = (counts: Record<string, number>, bestStreak = 0) =>
      badgesFor({ counts, bestStreak }).filter((b) => b.earned).map((b) => b.key);
    expect(earned({ 'quiz.passed': 4 })).not.toContain('quiz-whiz');
    expect(earned({ 'quiz.passed': 5 })).toContain('quiz-whiz');
    expect(earned({ 'live.attended': 3, 'challenge.won': 1 })).toEqual(['live-learner', 'winner']);
    expect(earned({}, 7)).toEqual(['streak-7']);
  });
});
