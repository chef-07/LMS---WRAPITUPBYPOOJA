import { CalendarDays } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export const metadata = { title: 'Live' };

export default function LivePage() {
  return <ComingSoon title="Live" icon={CalendarDays} phase="Phase 6" body="Live trainings on Google Meet. The join link opens 15 minutes before start, and recordings become lessons." />;
}
