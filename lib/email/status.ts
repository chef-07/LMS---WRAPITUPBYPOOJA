import 'server-only';
import { isDemo } from '../supabase/config';
import { supabaseServer } from '../supabase/server';
import type { Viewer } from '../types';
import { cronReady } from './jobs';
import { EMAIL_FROM, emailReady } from './send';

export type EmailPrefs = { reminders: boolean; streak: boolean; digest: boolean };
const ALL_ON: EmailPrefs = { reminders: true, streak: true, digest: true };

/** No row means everything is on. */
export async function getMyEmailPrefs(viewer: Viewer): Promise<EmailPrefs> {
  if (isDemo) return ALL_ON;
  const sb = await supabaseServer();
  const { data } = await sb.from('email_prefs').select('reminders, streak, digest').eq('user_id', viewer.id).maybeSingle();
  return data ?? ALL_ON;
}

export type EmailStatus = {
  sending: boolean;
  from: string;
  job: boolean;
  week: { sent: number; failed: number };
  lastSentAt: string | null;
  lastError: string | null;
};

/** For the admin card in Settings: is email set up, and how has the last week gone? */
export async function getEmailStatus(): Promise<EmailStatus> {
  const base = { sending: emailReady(), from: EMAIL_FROM, job: cronReady(), week: { sent: 0, failed: 0 }, lastSentAt: null, lastError: null };
  if (isDemo) return base;
  const sb = await supabaseServer();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data } = await sb.from('email_log').select('status, error, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(1000);
  const rows = data ?? [];
  return {
    ...base,
    week: { sent: rows.filter((r) => r.status === 'sent').length, failed: rows.filter((r) => r.status === 'failed').length },
    lastSentAt: rows.find((r) => r.status === 'sent')?.created_at ?? null,
    lastError: rows.find((r) => r.status === 'failed')?.error ?? null,
  };
}
