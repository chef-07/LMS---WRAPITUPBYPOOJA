import { NextResponse } from 'next/server';
import { RISK_LABEL } from '@/lib/admin-shared';
import { toCsv } from '@/lib/csv';
import { getViewer } from '@/lib/data';
import { indiaToday } from '@/lib/locks';
import { PACE_LABEL } from '@/lib/pace';
import { getReport } from '@/lib/reports';
import { DEPARTMENTS } from '@/lib/types';

const team = (d: keyof typeof DEPARTMENTS | null) => (d ? DEPARTMENTS[d] : '');

/** CSV downloads for the Reports page. Faculty only; RLS limits the rows again. */
export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (viewer.role !== 'admin' && viewer.role !== 'trainer') return NextResponse.json({ error: 'Only trainers and admins can download reports.' }, { status: 403 });

  const type = new URL(req.url).searchParams.get('type');
  const r = await getReport();
  let csv: string;
  if (type === 'people') {
    csv = toCsv(
      ['Name', 'Email', 'Role', 'Team', 'Lessons done', 'Lessons assigned', 'Completion %', 'Certificates', 'XP', 'Last learned', 'Status', 'Batch', 'Batch pace'],
      r.people.map((p) => [p.name, p.email, p.role, team(p.department), p.lessonsDone, p.lessonsAssigned, p.pct, p.certificates, p.xp, p.lastActive?.slice(0, 10) ?? '', RISK_LABEL[p.risk], p.batch ?? '', p.batchStatus ? PACE_LABEL[p.batchStatus] : '']),
    );
  } else if (type === 'courses') {
    csv = toCsv(['Course', 'Assigned', 'Started', 'Certified', 'Average progress %'], r.courses.map((c) => [c.title, c.assigned, c.started, c.certified, c.avgPct]));
  } else if (type === 'attention') {
    csv = toCsv(['Priority', 'Who', 'What', 'Detail'], r.attention.map((a) => [a.severity === 'high' ? 'Urgent' : 'Check in', a.who, a.what, a.detail]));
  } else {
    return NextResponse.json({ error: 'Unknown report.' }, { status: 400 });
  }
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="wrapitup-${type}-${indiaToday()}.csv"`,
      'cache-control': 'private, no-store',
    },
  });
}
