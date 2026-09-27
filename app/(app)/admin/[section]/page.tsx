import { Wand2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import { ComingSoon } from '@/components/ui/ComingSoon';

const SECTIONS: Record<string, { title: string; phase: string; body: string }> = {
  reports: { title: 'Reports', phase: 'Phase 7', body: 'Completion by department, overdue learners, CSV export.' },
};

export default async function AdminPlaceholder({ params }: { params: Promise<{ section: string }> }) {
  const s = SECTIONS[(await params).section];
  if (!s) notFound();
  return <ComingSoon title={s.title} icon={Wand2} phase={s.phase} body={s.body} />;
}
