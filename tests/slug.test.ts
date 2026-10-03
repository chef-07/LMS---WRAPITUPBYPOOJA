import { describe, expect, test } from 'vitest';
import { parseClock } from '@/lib/format';
import { looksLikeUrl, slugify, uniqueSlug } from '@/lib/slug';

describe('slugify', () => {
  test.each([
    ['The Perfect Box Wrap', 'the-perfect-box-wrap'],
    ['Bows & Ribbons (Level 2)', 'bows-and-ribbons-level-2'],
    ['  Diwali   hampers!! ', 'diwali-hampers'],
    ['Crème brûlée box', 'creme-brulee-box'],
    ['', ''],
  ])('%s', (input, out) => expect(slugify(input)).toBe(out));

  test('caps the length without a trailing dash', () => {
    const s = slugify('a '.repeat(80));
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith('-')).toBe(false);
  });
});

describe('looksLikeUrl', () => {
  test('catches pasted links', () => {
    expect(looksLikeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(looksLikeUrl('www.youtube.com/watch?v=x')).toBe(true);
    expect(looksLikeUrl('youtube.com/watch')).toBe(true);
  });
  test('allows normal addresses', () => {
    expect(looksLikeUrl('perfect-box-wrap')).toBe(false);
    expect(looksLikeUrl('diwali-2026')).toBe(false);
  });
});

describe('uniqueSlug', () => {
  test('adds a number when taken', () => {
    expect(uniqueSlug('corners', [])).toBe('corners');
    expect(uniqueSlug('corners', ['corners'])).toBe('corners-2');
    expect(uniqueSlug('corners', ['corners', 'corners-2'])).toBe('corners-3');
    expect(uniqueSlug('', [])).toBe('lesson');
  });
});

describe('parseClock', () => {
  test.each([
    ['12:30', 750],
    ['1:02:03', 3723],
    ['45', 2700],
    ['0:59', 59],
    ['', null],
    ['12:75', null],
    ['abc', null],
    ['1:2:3:4', null],
  ])('%s', (input, out) => expect(parseClock(input)).toBe(out));
});

import { riskOf } from '@/lib/admin-shared';

describe('riskOf', () => {
  const now = Date.parse('2026-09-27T12:00:00Z');
  const ago = (d: number) => new Date(now - d * 86_400_000).toISOString();
  test.each([
    [null, 'never'],
    [ago(0), 'active'],
    [ago(6.9), 'active'],
    [ago(7), 'idle'],
    [ago(21), 'stalled'],
    [ago(45), 'dormant'],
  ] as const)('%s → %s', (iso, risk) => expect(riskOf(iso, now)).toBe(risk));
});
