import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { CRON_SECRET, cronReady, runJob } from '@/lib/email/jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Params = { params: Promise<{ job: string }> };

/** Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". */
function authorised(req: Request): boolean {
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${CRON_SECRET}`);
  return cronReady() && got.length === want.length && timingSafeEqual(got, want);
}

/**
 * The daily email jobs (see vercel.json): "morning" sends reminders and the
 * Monday digest, "evening" the streak savers. Add ?dry=1 to see who would
 * get what without sending anything.
 */
export async function GET(req: Request, { params }: Params) {
  const { job } = await params;
  if (job !== 'morning' && job !== 'evening') return NextResponse.json({ error: 'Unknown job.' }, { status: 404 });
  if (!cronReady()) return NextResponse.json({ error: 'CRON_SECRET is not set up.' }, { status: 503 });
  if (!authorised(req)) return NextResponse.json({ error: 'Not allowed.' }, { status: 401 });
  try {
    const summary = await runJob(job, { dryRun: new URL(req.url).searchParams.get('dry') === '1' });
    console.log(`cron ${job}: planned ${summary.planned.length}, sent ${summary.sent}, failed ${summary.failed.length}, skipped ${summary.skipped}${summary.dryRun ? ' (dry run)' : ''}`);
    return NextResponse.json(summary);
  } catch (e) {
    console.error(`cron ${job} failed`, e);
    return NextResponse.json({ error: 'The job failed. See the function logs.' }, { status: 500 });
  }
}
