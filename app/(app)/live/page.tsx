import { CalendarDays, CheckCircle2, PlayCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { DateBadge, EmptyState } from '@/components/ui/primitives';
import { JoinButton } from '@/features/live/JoinButton';
import { isLiveNow, sessionWhen } from '@/features/live/format';
import { getViewer } from '@/lib/data';
import { getLiveSessions } from '@/lib/team-life';

export const metadata: Metadata = { title: 'Live' };

export default async function LivePage() {
  const viewer = (await getViewer())!;
  const { upcoming, past } = await getLiveSessions(viewer);
  const faculty = viewer.role === 'admin' || viewer.role === 'trainer';
  return (
    <div className="page">
      <PageHeader
        title="Live trainings"
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Live' }]}
        actions={
          faculty && (
            <Link className="btn btn-primary" href="/admin/live">
              Schedule a session
            </Link>
          )
        }
      />
      <section className="col">
        <h2 className="section-label" style={{ margin: 0 }}>
          Coming up
        </h2>
        {upcoming.length === 0 ? (
          <div className="card">
            <EmptyState icon={CalendarDays} title="Nothing scheduled" body="Live trainings show up here with a join button that opens 15 minutes before the start." />
          </div>
        ) : (
          upcoming.map((s) => {
            const live = isLiveNow(s.startsAt, s.endsAt);
            return (
              <article key={s.id} className={`card live-card${live ? ' live-now' : ''}`}>
                <DateBadge iso={s.startsAt} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>
                    {s.title} {live && <span className="chip live">Live now</span>}
                  </h3>
                  <div className="muted small">
                    {sessionWhen(s.startsAt, s.endsAt)} · with {s.host}
                  </div>
                  {s.description && <p style={{ margin: '6px 0 0' }}>{s.description}</p>}
                </div>
                <JoinButton id={s.id} startsAt={s.startsAt} endsAt={s.endsAt} />
              </article>
            );
          })
        )}
      </section>
      {past.length > 0 && (
        <section className="col">
          <h2 className="section-label" style={{ margin: 0 }}>
            Past sessions
          </h2>
          <div className="card">
            <div className="list">
              {past.map((s) => (
                <div key={s.id} className="list-row">
                  <div className="grow">
                    <div className="title">{s.title}</div>
                    <div className="muted small">{sessionWhen(s.startsAt, s.endsAt)}</div>
                  </div>
                  {s.attended && (
                    <span className="chip live">
                      <CheckCircle2 size={13} aria-hidden="true" /> You attended
                    </span>
                  )}
                  {s.recording ? (
                    <Link className="btn btn-ghost btn-sm" href={s.recording.href}>
                      <PlayCircle size={14} aria-hidden="true" /> Watch recording
                    </Link>
                  ) : (
                    <span className="muted small">No recording</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
