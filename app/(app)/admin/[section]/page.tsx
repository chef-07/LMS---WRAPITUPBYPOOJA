import { Wand2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import { ComingSoon } from '@/components/ui/ComingSoon';

const SECTIONS: Record<string, { title: string; phase: string; body: string }> = {
  skills: { title: 'Skill matrix', phase: 'Phase 5', body: 'Who is certified for what, so you can assign orders in peak season.' },
  campaigns: { title: 'Campaigns', phase: 'Phase 5', body: 'Seasonal refreshers (Diwali, Rakhi, wedding season) with due dates and reminders.' },
  announcements: { title: 'Announcements', phase: 'Phase 6', body: 'Pinned notices on everyone’s dashboard, with read receipts.' },
  cohorts: { title: 'Cohorts', phase: 'Phase 5', body: 'New-joiner batches with drip-released modules.' },
  reports: { title: 'Reports', phase: 'Phase 7', body: 'Completion by department, overdue learners, CSV export.' },
};

export default async function AdminPlaceholder({ params }: { params: Promise<{ section: string }> }) {
  const s = SECTIONS[(await params).section];
  if (!s) notFound();
  return <ComingSoon title={s.title} icon={Wand2} phase={s.phase} body={s.body} />;
}
