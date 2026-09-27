export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { getViewer } from '@/lib/data';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
