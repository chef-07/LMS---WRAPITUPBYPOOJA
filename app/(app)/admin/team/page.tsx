import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { InviteForm } from '@/features/team/InviteForm';
import { TeamList } from '@/features/team/TeamList';
import { getTeam, requireFacultyPage } from '@/lib/admin';
import { isDemo } from '@/lib/supabase/config';

export const metadata: Metadata = { title: 'Team' };

export default async function TeamPage() {
  const viewer = await requireFacultyPage();
  const { members, invites } = await getTeam();
  const canEdit = viewer.role === 'admin';
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

  return (
    <div className="page">
      <PageHeader title="Team" crumbs={[{ label: 'Home', href: '/' }, { label: 'Team' }]} />
      {isDemo && <span className="chip off" style={{ alignSelf: 'flex-start' }}>Demo mode: sample people, changes won’t save</span>}
      <div className="content">
        <TeamList members={members} invites={invites} viewerId={viewer.id} canEdit={canEdit} />
        {canEdit && (
          <aside className="col rail">
            <InviteForm loginUrl={`${site}/login`} />
          </aside>
        )}
      </div>
    </div>
  );
}
