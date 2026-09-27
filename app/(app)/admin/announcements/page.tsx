import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { AnnouncementRow, NewAnnouncement } from '@/features/announcements/AnnouncementAdmin';
import { requireAdminPage } from '@/lib/admin';
import { getAnnouncementsAdmin } from '@/lib/team-life';

export const metadata: Metadata = { title: 'Announcements' };

export default async function AnnouncementsPage() {
  await requireAdminPage();
  const list = await getAnnouncementsAdmin();
  return (
    <div className="page">
      <PageHeader title="Announcements" crumbs={[{ label: 'Home', href: '/' }, { label: 'Announcements' }]} />
      <div className="content">
        <section className="card">
          {list.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Nothing posted yet.</p>
          ) : (
            <div className="list">
              {list.map((a) => (
                <AnnouncementRow key={a.id} a={a} />
              ))}
            </div>
          )}
        </section>
        <aside className="col rail">
          <NewAnnouncement />
          <p className="muted small" style={{ margin: 0 }}>
            The newest pinned announcement shows at the top of everyone’s dashboard until they tap “Got it”.
          </p>
        </aside>
      </div>
    </div>
  );
}
