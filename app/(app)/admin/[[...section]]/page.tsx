import { Wand2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import { ComingSoon } from '@/components/ui/ComingSoon';
import { getViewer } from '@/lib/data';

const SECTIONS: Record<string, { title: string; phase: string; body: string }> = {
  '': { title: 'Studio', phase: 'Phase 2', body: 'Build courses: modules, lessons, paste a YouTube link, set watch rules, publish.' },
  team: { title: 'Team', phase: 'Phase 1b', body: 'Invite staff by email, set role and department, disable access when someone leaves.' },
  reviews: { title: 'Reviews', phase: 'Phase 4', body: 'Review practical submissions against a rubric: approve or ask for a redo.' },
  skills: { title: 'Skill matrix', phase: 'Phase 5', body: 'Who is certified for what, so you can assign orders in peak season.' },
  campaigns: { title: 'Campaigns', phase: 'Phase 5', body: 'Seasonal refreshers (Diwali, Rakhi, wedding season) with due dates and reminders.' },
  announcements: { title: 'Announcements', phase: 'Phase 6', body: 'Pinned notices on everyone’s dashboard, with read receipts.' },
  cohorts: { title: 'Cohorts', phase: 'Phase 5', body: 'New-joiner batches with drip-released modules.' },
  reports: { title: 'Reports', phase: 'Phase 7', body: 'Completion by department, overdue learners, CSV export.' },
};

export default async function AdminPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const viewer = await getViewer();
  if (!viewer || (viewer.role !== 'admin' && viewer.role !== 'trainer')) notFound();
  const key = (await params).section?.join('/') ?? '';
  const s = SECTIONS[key];
  if (!s) notFound();
  return <ComingSoon title={s.title} icon={Wand2} phase={s.phase} body={s.body} />;
}
