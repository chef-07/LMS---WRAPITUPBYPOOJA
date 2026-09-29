import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { CRON_SECRET, cronReady } from '@/lib/email/jobs';
import { verifyUnsub } from '@/lib/email/token';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isDemo } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

/**
 * Switches one kind of email off for one person. Mail apps POST here for
 * one-click unsubscribe (List-Unsubscribe-Post); the /unsubscribe page's
 * button posts here too. A GET (a link preview or scanner) changes nothing.
 */
export async function POST(req: Request) {
  const q = new URL(req.url).searchParams;
  const [u, k, t] = [q.get('u') ?? '', q.get('k') ?? '', q.get('t') ?? ''];
  const back = (status: string) => NextResponse.redirect(new URL(`/unsubscribe?${new URLSearchParams({ k, status })}`, req.url), 303);
  if (!cronReady() || !verifyUnsub(u, k, t, CRON_SECRET)) return q.get('from') === 'page' ? back('invalid') : NextResponse.json({ error: 'Invalid link.' }, { status: 400 });
  if (!isDemo) {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await sb.rpc('cron_unsubscribe', { p_key: CRON_SECRET, p_user: u, p_kind: k });
    if (error) {
      console.error('cron_unsubscribe', error);
      return q.get('from') === 'page' ? back('error') : NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 });
    }
  }
  return q.get('from') === 'page' ? back('done') : NextResponse.json({ ok: true });
}

export function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.redirect(new URL(`/unsubscribe${url.search}`, req.url), 303);
}
