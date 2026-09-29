import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getCatalogue } from '../data';
import { indiaToday } from '../locks';
import { PREF_OF, planEmails, type EmailPlan, type Job, type Snapshot } from '../reminders';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isDemo } from '../supabase/config';
import { renderEmail } from './render';
import { emailReady, sendMany, type OutMail } from './send';
import { unsubscribeUrl, type UnsubKind } from './token';

/** Unlocks the job's database functions and signs unsubscribe links. Set it in Vercel; Vercel Cron sends it too. */
export const CRON_SECRET = process.env.CRON_SECRET ?? '';
export const cronReady = () => CRON_SECRET.length >= 32;
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/** The job has no signed-in user: it talks to the database as "anon" and the key lets it in. */
const jobClient = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function demoSnapshot(): Promise<Snapshot> {
  const { courses } = await getCatalogue();
  const today = indiaToday();
  const day = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const ago = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
  const base = { createdAt: ago(60), startOn: day(-60), reminders: true, streak: true, digest: true };
  return {
    today,
    people: [
      { id: 'u0', email: 'pooja@example.com', name: 'Pooja', role: 'admin', department: null, ...base },
      { id: 'u1', email: 'riya@example.com', name: 'Riya Sharma', role: 'trainer', department: 'artisan', ...base },
      { id: 'u2', email: 'aman@example.com', name: 'Aman Verma', role: 'member', department: 'sales', ...base },
    ],
    courses: courses.map((c) => ({ id: c.id, slug: c.slug, title: c.title, departments: [], modules: c.modules.map((m) => ({ id: m.id, title: m.title, dripDays: m.dripDays, lessons: m.lessons.map((l) => ({ id: l.id, slug: l.slug, title: l.title })) })) })),
    completions: [],
    activityDays: { u1: [day(-2), day(-1)], u2: [day(-12)] },
    xp: {},
    lastActive: { u2: ago(12) },
    certificates: [],
    waitingReviews: [{ id: 'demo-sub-1', userId: 'u2', title: 'The hidden-tape method', createdAt: ago(3) }],
    redo: [],
    failedQuizzes: [],
    cohorts: [],
    campaigns: [],
    live: [],
    emailLog: [],
  };
}

export async function loadSnapshot(): Promise<Snapshot> {
  if (isDemo) return demoSnapshot();
  const { data, error } = await jobClient().rpc('cron_snapshot', { p_key: CRON_SECRET });
  if (error) throw new Error(`cron_snapshot: ${error.message}`);
  return data as Snapshot;
}

export function toMail(plan: EmailPlan): OutMail {
  const site = siteUrl();
  const kind: UnsubKind = PREF_OF[plan.kind];
  // Without the secret there is nothing to sign links with: point at Settings instead.
  if (!cronReady()) return { to: plan.to, subject: plan.subject, ...renderEmail(plan, { siteUrl: site, unsubscribeUrl: `${site}/settings` }) };
  const page = unsubscribeUrl(site, plan.userId, kind, CRON_SECRET);
  // One-click unsubscribe (RFC 8058): mail apps POST straight to this address.
  const oneClick = page.replace('/unsubscribe?', '/api/email/unsubscribe?');
  const { html, text } = renderEmail(plan, { siteUrl: site, unsubscribeUrl: page });
  return { to: plan.to, subject: plan.subject, html, text, headers: { 'List-Unsubscribe': `<${oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };
}

export type JobSummary = {
  job: Job;
  today: string;
  emailReady: boolean;
  dryRun: boolean;
  planned: { to: string; kind: EmailPlan['kind']; subject: string; items: string[] }[];
  sent: number;
  failed: { to: string; error: string }[];
  skipped: number;
};

/**
 * One run: plan, claim each (person, kind, day) so a retry never doubles
 * up, send, then record how each one went.
 */
export async function runJob(job: Job, opts: { dryRun: boolean }): Promise<JobSummary> {
  const snap = await loadSnapshot();
  const plans = planEmails(snap, job, Date.now());
  const dryRun = opts.dryRun || isDemo || !emailReady();
  const summary: JobSummary = {
    job,
    today: snap.today,
    emailReady: emailReady(),
    dryRun,
    planned: plans.map((p) => ({ to: p.to, kind: p.kind, subject: p.subject, items: p.items.map((i) => i.text) })),
    sent: 0,
    failed: [],
    skipped: 0,
  };
  if (dryRun || plans.length === 0) return summary;

  const sb = jobClient();
  const claim = await sb.rpc('cron_claim_emails', { p_key: CRON_SECRET, p_rows: plans.map((p) => ({ userId: p.userId, kind: p.kind })) });
  if (claim.error) throw new Error(`cron_claim_emails: ${claim.error.message}`);
  const claimed = new Set(((claim.data ?? []) as { user_id: string; kind: string }[]).map((r) => `${r.user_id}:${r.kind}`));
  const mine = plans.filter((p) => claimed.has(`${p.userId}:${p.kind}`));
  summary.skipped = plans.length - mine.length;

  const results = await sendMany(mine.map(toMail));
  const rows = mine.map((p, i) => {
    const r = results[i]!;
    if (r.ok) summary.sent++;
    else summary.failed.push({ to: p.to, error: r.error });
    return { userId: p.userId, kind: p.kind, error: r.ok ? null : r.error };
  });
  const done = await sb.rpc('cron_finish_emails', { p_key: CRON_SECRET, p_rows: rows });
  if (done.error) console.error('cron_finish_emails', done.error);
  return summary;
}
