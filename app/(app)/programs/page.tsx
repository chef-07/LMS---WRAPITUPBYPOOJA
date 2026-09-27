import { GraduationCap } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export const metadata = { title: 'Programs' };

export default function ProgramsPage() {
  return <ComingSoon title="Programs" icon={GraduationCap} phase="Phase 5" body="Role tracks with levels (Trainee → Associate → Senior → Master). Finish a level to earn a certificate and a badge on your profile." />;
}
