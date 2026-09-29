import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { CaptionsPref } from '@/features/settings/CaptionsPref';
import { EmailAdmin } from '@/features/settings/EmailAdmin';
import { EmailPrefs } from '@/features/settings/EmailPrefs';
import { InstallApp } from '@/features/settings/InstallApp';
import { ProfileForm } from '@/features/settings/ProfileForm';
import { getViewer } from '@/lib/data';
import { getEmailStatus, getMyEmailPrefs } from '@/lib/email/status';
import { isDemo } from '@/lib/supabase/config';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const viewer = (await getViewer())!;
  const isAdmin = viewer.role === 'admin';
  const [prefs, status] = await Promise.all([getMyEmailPrefs(viewer), isAdmin ? getEmailStatus() : null]);
  return (
    <div className="page">
      <PageHeader title="Settings" crumbs={[{ label: 'Home', href: '/' }, { label: 'Settings' }]} />
      <div className="content">
        <div className="col">
          <ProfileForm viewer={viewer} demo={isDemo} />
          <EmailPrefs prefs={prefs} isAdmin={isAdmin} email={viewer.email} />
          {status && <EmailAdmin status={status} />}
        </div>
        <aside className="col rail">
          <InstallApp />
          <CaptionsPref />
        </aside>
      </div>
    </div>
  );
}
