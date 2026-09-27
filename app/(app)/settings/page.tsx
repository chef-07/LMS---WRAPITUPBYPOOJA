import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { CaptionsPref } from '@/features/settings/CaptionsPref';
import { InstallApp } from '@/features/settings/InstallApp';
import { ProfileForm } from '@/features/settings/ProfileForm';
import { getViewer } from '@/lib/data';
import { isDemo } from '@/lib/supabase/config';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const viewer = (await getViewer())!;
  return (
    <div className="page">
      <PageHeader title="Settings" crumbs={[{ label: 'Home', href: '/' }, { label: 'Settings' }]} />
      <div className="content">
        <div className="col">
          <ProfileForm viewer={viewer} demo={isDemo} />
        </div>
        <aside className="col rail">
          <InstallApp />
          <CaptionsPref />
        </aside>
      </div>
    </div>
  );
}
