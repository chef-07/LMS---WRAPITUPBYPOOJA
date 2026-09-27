/** "Perfect Box Wrap (Level 1)" → "perfect-box-wrap-level-1". */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A pasted link in a web-address field is almost always a mistake (the
 * YouTube link went in the wrong box). Refuse it rather than slugging
 * "https-youtu-be-abc".
 */
export function looksLikeUrl(input: string): boolean {
  const s = input.trim().toLowerCase();
  return /^(https?:\/\/|www\.)/.test(s) || /\.(com|in|be|net|org)(\/|$)/.test(s);
}

/** Adds -2, -3… until the slug is not taken. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  const root = base || 'lesson';
  if (!set.has(root)) return root;
  for (let i = 2; ; i++) {
    const candidate = `${root}-${i}`;
    if (!set.has(candidate)) return candidate;
  }
}
