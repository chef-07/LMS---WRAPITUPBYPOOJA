import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { AttendanceList } from '@/features/live/AttendanceList';
import { DeleteLive } from '@/features/live/DeleteLive';
import { LiveForm } from '@/features/live/LiveForm';
import { requireFacultyPage } from '@/lib/admin';
import { getLessonOptions, getLiveAdmin } from '@/lib/team-life';

export const metadata: Metadata = { title: 'Live session' };

export default async function AdminLiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireFacultyPage();
  const [data, lessons] = await Promise.all([getLiveAdmin((await params).id), getLessonOptions()]);
  if (!data) notFound();
  const s = data.session;
  const minutes = Math.round((new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60_000);
  return (
    <div className="page">
      <PageHeader title={s.title} crumbs={[{ label: 'Home', href: '/' }, { label: 'Live sessions', href: '/admin/live' }, { label: s.title }]} />
      <div className="content">
        <AttendanceList sessionId={s.id} rows={data.attendance} />
        <aside className="col rail">
          <section className="card">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Session details</h2>
            <LiveForm
              lessons={lessons}
              initial={{ id: s.id, title: s.title, host: s.host, description: s.description, startsAt: s.startsAt, durationMinutes: minutes, joinUrl: s.joinUrl ?? '', recordingLessonId: s.recordingLessonId }}
            />
            <hr style={{ border: 0, borderTop: '1px solid var(--hair)', margin: '18px 0 12px' }} />
            <DeleteLive id={s.id} title={s.title} />
          </section>
        </aside>
      </div>
    </div>
  );
}
