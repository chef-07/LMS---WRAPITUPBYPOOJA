/**
 * Signed unsubscribe links: /unsubscribe?u=<user>&k=<kind>&t=<signature>.
 * The signature is an HMAC of the user and kind under the app's CRON_SECRET,
 * so a link only ever switches off one kind of email for one person.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const UNSUB_KINDS = ['reminders', 'streak', 'digest'] as const;
export type UnsubKind = (typeof UNSUB_KINDS)[number];

export function signUnsub(userId: string, kind: UnsubKind, secret: string): string {
  return createHmac('sha256', secret).update(`unsubscribe:${userId}:${kind}`).digest('base64url').slice(0, 32);
}

export function verifyUnsub(userId: string, kind: string, token: string, secret: string): kind is UnsubKind {
  if (!secret || !(UNSUB_KINDS as readonly string[]).includes(kind)) return false;
  const want = Buffer.from(signUnsub(userId, kind as UnsubKind, secret));
  const got = Buffer.from(token);
  return got.length === want.length && timingSafeEqual(got, want);
}

export function unsubscribeUrl(siteUrl: string, userId: string, kind: UnsubKind, secret: string): string {
  const q = new URLSearchParams({ u: userId, k: kind, t: signUnsub(userId, kind, secret) });
  return `${siteUrl.replace(/\/$/, '')}/unsubscribe?${q}`;
}
