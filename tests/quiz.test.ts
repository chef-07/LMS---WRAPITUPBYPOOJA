import { describe, expect, test } from 'vitest';
import { normaliseCode } from '@/lib/certificate';
import { moduleLocks } from '@/lib/locks';
import { gradeQuiz, isPass, quizProblems, type KeyedQuestion } from '@/lib/quiz';
import { averageScore, toCriteria } from '@/lib/rubric';

const q = (id: string, correct: string): KeyedQuestion => ({
  id,
  kind: 'mcq',
  prompt: `Q ${id}`,
  explanation: `because ${id}`,
  options: ['a', 'b', 'c'].map((o) => ({ id: `${id}${o}`, label: o, isCorrect: o === correct, feedback: `fb ${id}${o}` })),
});

describe('gradeQuiz', () => {
  const qs = [q('1', 'a'), q('2', 'b'), q('3', 'c')];
  test('scores and passes at 70%', () => {
    const r = gradeQuiz(qs, { '1': '1a', '2': '2b', '3': '3a' }, 70);
    expect(r.score).toBe(2);
    expect(r.passed).toBe(false); // 66.7% < 70%
    expect(r.results[2]).toMatchObject({ correct: false, chosen: '3a', correctOptionId: '3c', feedback: 'fb 3a', explanation: 'because 3' });
  });
  test('all right passes', () => {
    expect(gradeQuiz(qs, { '1': '1a', '2': '2b', '3': '3c' }, 70).passed).toBe(true);
  });
  test('unanswered and foreign option ids count as wrong', () => {
    const r = gradeQuiz(qs, { '1': '2b' }, 70);
    expect(r.score).toBe(0);
    expect(r.results[0]!.chosen).toBeNull();
  });
  test('pass boundary is exact, not rounded', () => {
    expect(isPass(7, 10, 70)).toBe(true);
    expect(isPass(2, 3, 67)).toBe(false); // 66.67%
    expect(isPass(0, 0, 70)).toBe(false);
  });
});

describe('quizProblems', () => {
  const opt = (label: string, isCorrect = false) => ({ label, isCorrect });
  test('valid quiz', () => expect(quizProblems([{ prompt: 'Which tape?', options: [opt('a', true), opt('b')] }])).toBeNull());
  test('needs exactly one correct', () => {
    expect(quizProblems([{ prompt: 'Which?', options: [opt('a'), opt('b')] }])).toMatch(/exactly one/);
    expect(quizProblems([{ prompt: 'Which?', options: [opt('a', true), opt('b', true)] }])).toMatch(/exactly one/);
  });
  test('limits', () => {
    expect(quizProblems([])).toMatch(/at least one/);
    expect(quizProblems([{ prompt: 'Which?', options: [opt('a', true)] }])).toMatch(/two answers/);
    expect(quizProblems([{ prompt: 'Which?', options: [opt('a', true), opt(' ')] }])).toMatch(/empty/);
  });
});

describe('moduleLocks', () => {
  const mods = [
    { id: 'm1', title: 'Basics', requiredQuizIds: ['qa'] },
    { id: 'm2', title: 'Finishing', requiredQuizIds: [] },
    { id: 'm3', title: 'Advanced', requiredQuizIds: ['qc'] },
    { id: 'm4', title: 'Bonus', requiredQuizIds: [] },
  ];
  test('everything after an unpassed required quiz is locked', () => {
    const l = moduleLocks(mods, new Set());
    expect(l.m1).toEqual({ locked: false, blockedBy: null });
    expect(l.m2).toEqual({ locked: true, blockedBy: 'Basics' });
    expect(l.m4!.blockedBy).toBe('Basics');
  });
  test('passing unlocks up to the next unpassed quiz', () => {
    const l = moduleLocks(mods, new Set(['qa']));
    expect(l.m2!.locked).toBe(false);
    expect(l.m3!.locked).toBe(false);
    expect(l.m4).toEqual({ locked: true, blockedBy: 'Advanced' });
  });
});

describe('rubric and certificates', () => {
  test('criteria keys are unique and tidy', () => {
    expect(toCriteria(['Sharp corners', ' ', 'Sharp corners!'])).toEqual([
      { key: 'sharp-corners', label: 'Sharp corners' },
      { key: 'sharp-corners-2', label: 'Sharp corners!' },
    ]);
  });
  test('average', () => {
    expect(averageScore({ a: 4, b: 5, c: 3 })).toBe(4);
    expect(averageScore({})).toBeNull();
  });
  test('certificate codes', () => {
    expect(normaliseCode(' wiu-7a3f-90c2 ')).toBe('WIU-7A3F-90C2');
    expect(normaliseCode('WIU-7K3F-9Q2M')).toBeNull();
    expect(normaliseCode('drop table')).toBeNull();
  });
});
