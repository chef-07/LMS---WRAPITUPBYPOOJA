import { describe, expect, test } from 'vitest';
import { csvCell, toCsv } from '@/lib/csv';
import { buildReport, istDate, weekStart, type ReportInput } from '@/lib/report';

const NOW = Date.parse('2026-09-27T06:00:00Z'); // Sunday, 11:30 India time
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

function input(over: Partial<ReportInput> = {}): ReportInput {
  return {
    today: '2026-09-27',
    now: NOW,
    people: [
      { id: 'riya', name: 'Riya', email: 'riya@x.in', role: 'member', department: 'artisan', createdAt: ago(60) },
      { id: 'aman', name: 'Aman', email: 'aman@x.in', role: 'member', department: 'sales', createdAt: ago(60) },
      { id: 'kavya', name: 'Kavya', email: 'kavya@x.in', role: 'member', department: 'artisan', createdAt: ago(10) },
    ],
    courses: [
      { id: 'welcome', title: 'Welcome', departments: [], lessonIds: ['w1', 'w2'] },
      { id: 'wrap', title: 'Box wrap', departments: ['artisan'], lessonIds: ['b1', 'b2'] },
    ],
    completions: [
      { userId: 'riya', lessonId: 'w1', completedAt: ago(1) },
      { userId: 'riya', lessonId: 'w2', completedAt: ago(2) },
      { userId: 'riya', lessonId: 'b1', completedAt: ago(9) },
      { userId: 'aman', lessonId: 'w1', completedAt: ago(40) },
    ],
    xp: [
      { userId: 'riya', xp: 50 },
      { userId: 'riya', xp: 200 },
    ],
    lastActive: [
      { userId: 'riya', at: ago(1) },
      { userId: 'aman', at: ago(30) },
    ],
    certificates: [{ userId: 'riya', courseId: 'welcome', issuedAt: ago(1) }],
    waitingReviews: [
      { id: 'r1', userId: 'riya', title: 'Sharp corners', createdAt: ago(4) },
      { id: 'r2', userId: 'riya', title: 'Hidden tape', createdAt: ago(1) },
    ],
    batches: [{ userId: 'kavya', title: 'October batch', status: 'behind', endsOn: '2026-10-20' }],
    campaigns: [{ userId: 'aman', title: 'Diwali refresher', status: 'overdue', dueOn: '2026-09-25' }],
    ...over,
  };
}

describe('dates', () => {
  test('India date and Monday weeks', () => {
    expect(istDate('2026-09-27T20:00:00Z')).toBe('2026-09-28'); // 01:30 next day in India
    expect(weekStart('2026-09-27')).toBe('2026-09-21'); // Sunday → the Monday before
    expect(weekStart('2026-09-21')).toBe('2026-09-21');
  });
});

describe('buildReport', () => {
  const r = buildReport(input());
  test('people: assigned lessons follow the department', () => {
    const riya = r.people.find((p) => p.id === 'riya')!;
    expect([riya.lessonsDone, riya.lessonsAssigned, riya.pct, riya.certificates, riya.xp, riya.risk]).toEqual([3, 4, 75, 1, 250, 'active']);
    const aman = r.people.find((p) => p.id === 'aman')!;
    expect([aman.lessonsDone, aman.lessonsAssigned, aman.pct, aman.risk]).toEqual([1, 2, 50, 'stalled']);
  });
  test('kpis', () => {
    expect(r.kpis).toEqual({ learners: 3, activeThisWeek: 1, lessons30d: 3, certificates30d: 1, certificatesTotal: 1, waitingReviews: 2, oldestReviewDays: 4 });
  });
  test('weekly lessons land in Monday weeks', () => {
    expect(r.weeks).toHaveLength(8);
    expect(r.weeks.at(-1)).toEqual({ start: '2026-09-21', lessons: 2 });
    expect(r.weeks.at(-2)).toEqual({ start: '2026-09-14', lessons: 1 });
    expect(r.weeks.reduce((s, w) => s + w.lessons, 0)).toBe(4); // Aman's lesson 40 days ago is inside the 8 weeks
  });
  test('attention: overdue first, then the rest by name', () => {
    expect(r.attention.map((a) => [a.severity, a.who, a.what])).toEqual([
      ['high', 'Aman', 'Overdue: Diwali refresher'],
      ['medium', 'Aman', 'No learning for 30 days'],
      ['medium', 'Kavya', 'Behind in October batch'],
      ['medium', 'Kavya', 'Hasn’t started yet'],
      ['medium', 'Riya', 'Practical waiting 4 days for review'],
    ]);
  });
  test('departments and courses', () => {
    expect(r.departments).toEqual([
      { key: 'artisan', people: 2, active: 1, avgPct: 38, certificates: 1, attention: 1 },
      { key: 'sales', people: 1, active: 0, avgPct: 50, certificates: 0, attention: 1 },
    ]);
    expect(r.courses).toEqual([
      { id: 'welcome', title: 'Welcome', assigned: 3, started: 2, certified: 1, avgPct: 50 },
      { id: 'wrap', title: 'Box wrap', assigned: 2, started: 1, certified: 0, avgPct: 25 },
    ]);
  });
});

describe('csv', () => {
  test('quotes, escapes and defuses formulas', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('-5 wraps')).toBe("'-5 wraps");
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell(null)).toBe('');
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('﻿a,b\r\n1,x\r\n');
  });
});
