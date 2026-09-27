import { FolderOpen } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export const metadata = { title: 'SOP Library' };

export default function SopsPage() {
  return <ComingSoon title="SOP Library" icon={FolderOpen} phase="Phase 6" body="Step cards, material lists, price sheets and WhatsApp reply templates with a copy button, ready on your phone at the work table." />;
}
