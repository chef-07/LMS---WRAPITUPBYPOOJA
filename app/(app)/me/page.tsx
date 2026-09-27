import { UserRound } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export const metadata = { title: 'My profile' };

export default function MePage() {
  return <ComingSoon title="My profile" icon={UserRound} phase="Phase 4" body="Your photo, department, badges, certificates and certified skills." />;
}
