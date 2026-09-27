import { Settings } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export const metadata = { title: 'Settings' };

export default function SettingsPage() {
  return <ComingSoon title="Settings" icon={Settings} phase="Phase 6" body="Notification preferences and email reminders." />;
}
