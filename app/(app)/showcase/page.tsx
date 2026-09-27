import { Sparkles } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export const metadata = { title: 'Showcase' };

export default function ShowcasePage() {
  return <ComingSoon title="Showcase" icon={Sparkles} phase="Phase 6" body="Wrap of the Week challenges and a wall of the team's best work. Post a photo, get reactions, win XP." />;
}
