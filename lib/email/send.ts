import 'server-only';

/**
 * Email through Resend's HTTP API (https://resend.com/docs/api-reference).
 * Without RESEND_API_KEY nothing is sent: the daily job still works out
 * who would get what, so it can be checked with a dry run.
 */
const API = process.env.RESEND_API_URL || 'https://api.resend.com';
const KEY = process.env.RESEND_API_KEY ?? '';

/** Until your own domain is verified in Resend, its test sender only reaches your own address. */
export const EMAIL_FROM = process.env.EMAIL_FROM || 'Wrap It Up University <onboarding@resend.dev>';
export const emailReady = () => KEY.length > 0;

export type OutMail = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };
export type SendResult = { ok: true } | { ok: false; error: string };

async function post(path: string, body: unknown): Promise<SendResult> {
  try {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (res.ok) return { ok: true };
    const detail = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, error: `Resend ${res.status}: ${detail?.message ?? res.statusText}`.slice(0, 500) };
  } catch (e) {
    return { ok: false, error: `Could not reach Resend: ${e instanceof Error ? e.message : String(e)}`.slice(0, 500) };
  }
}

const shape = (m: OutMail) => ({ from: EMAIL_FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text, headers: m.headers });

export async function sendOne(mail: OutMail): Promise<SendResult> {
  if (!emailReady()) return { ok: false, error: 'Email is not set up yet (RESEND_API_KEY is missing).' };
  return post('/emails', shape(mail));
}

/** Sends up to 100 emails per request (Resend's batch limit); results line up with the input. */
export async function sendMany(mails: OutMail[]): Promise<SendResult[]> {
  const out: SendResult[] = [];
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100);
    const r = emailReady() ? await post('/emails/batch', chunk.map(shape)) : ({ ok: false, error: 'RESEND_API_KEY is missing.' } as const);
    out.push(...chunk.map(() => r));
  }
  return out;
}
