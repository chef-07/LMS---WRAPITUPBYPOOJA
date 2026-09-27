import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { LiveForm } from '@/features/live/LiveForm';
import { sessionWhen } from '@/features/live/format';
import { requireFacultyPage } from '@/lib/admin';
import { getLessonOptions, getLiveSessions } from '@/lib/team-life';

export const metadata: Metadata = { title: 'Live sessions' };

export default async function AdminLivePage() {
  const viewer = await requireFacultyPage();
  const [{ upcoming, past }, lessons] = await Promise.all([getLiveSessions(viewer), getLessonOptions()]);
  const all = [...upcoming, ...past];
  return (
    <div className="page">
      <PageHeader title="Live sessions" crumbs={[{ label: 'Home', href: '/' }, { label: 'Live', href: '/live' }, { label: 'Manage' }]} />
      <div className="content">
        <section className="card">
          {all.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Nothing scheduled yet.</p>
          ) : (
            <div className="list">
              {all.map((s) => (
                <Link key={s.id} href={`/admin/live/${s.id}`} className="list-row" style={{ color: 'inherit' }}>
                  <div className="grow">
                    <div className="title">{s.title}</div>
                    <div className="muted small">{sessionWhen(s.startsAt, s.endsAt)}</div>
                  </div>
                  <span className={`chip ${upcoming.includes(s) ? 'live' : 'draft'}`}>{upcoming.includes(s) ? 'Upcoming' : 'Past'}</span>
                  <ChevronRight size={18} className="muted" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </section>
        <aside className="col rail">
          <section className="card">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Schedule a session</h2>
            <LiveForm lessons={lessons} />
          </section>
        </aside>
      </div>
    </div>
  );
}
