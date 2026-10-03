export type Criterion = { key: string; label: string };

export const DEFAULT_RUBRIC: Criterion[] = [
  { key: 'corners', label: 'Sharp corners' },
  { key: 'tape', label: 'Hidden tape' },
  { key: 'ribbon', label: 'Ribbon & bow' },
  { key: 'neatness', label: 'Overall neatness' },
];

export const SCORE_LABELS: Record<number, string> = { 1: 'Redo', 2: 'Needs work', 3: 'Good', 4: 'Very good', 5: 'Perfect' };

/** Turns labels typed in Studio into stable criteria keys. */
export function toCriteria(labels: string[]): Criterion[] {
  const seen = new Set<string>();
  return labels
    .map((l) => l.trim())
    .filter(Boolean)
    .map((label) => {
      const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'criterion';
      let key = base;
      for (let i = 2; seen.has(key); i++) key = `${base}-${i}`;
      seen.add(key);
      return { key, label };
    });
}

export function averageScore(scores: Record<string, number>): number | null {
  const vals = Object.values(scores).filter((n) => Number.isFinite(n));
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}
