import { describe, expect, test } from 'vitest';
import { daysBetween, paceStatus } from '@/lib/pace';

describe('daysBetween', () => {
  test('counts whole days across months', () => {
    expect(daysBetween('2026-09-27', '2026-10-04')).toBe(7);
    expect(daysBetween('2026-10-04', '2026-09-27')).toBe(-7);
    expect(daysBetween('2026-10-01', '2026-10-01')).toBe(0);
  });
});

describe('paceStatus', () => {
  const start = '2026-10-01';
  const end = '2026-10-29'; // 28 days
  test('done wins, even after the deadline', () => {
    expect(paceStatus(100, start, end, '2026-11-15')).toBe('done');
  });
  test('overdue once the deadline has passed', () => {
    expect(paceStatus(90, start, end, '2026-10-30')).toBe('overdue');
  });
  test('not started early on, with nothing done', () => {
    expect(paceStatus(0, start, end, '2026-10-02')).toBe('not-started');
  });
  test('on track within 15 points of a straight line', () => {
    // Half-way through: 50% expected.
    expect(paceStatus(40, start, end, '2026-10-15')).toBe('on-track');
    expect(paceStatus(34, start, end, '2026-10-15')).toBe('behind');
  });
  test('the last day still counts as on time', () => {
    expect(paceStatus(90, start, end, end)).toBe('on-track');
  });
});
