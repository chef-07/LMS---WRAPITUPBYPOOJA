import { CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { DateBadge, EmptyState } from '@/components/ui/primitives';
import { shortDate } from '@/lib/format';
import type { LiveSession } from '@/lib/types';

export function Upcoming({ sessions }: { sessions: LiveSession[] }) {
  return (
    <section className="card" aria-labelledby="upcoming">
      <div className="card-head">
        <h2 id="upcoming">Upcoming</h2>
        <Link href="/live">See all</Link>
      </div>
      {sessions.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nothing scheduled" body="Live trainings show up here." />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sessions.map((s) => (
            <li key={s.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <DateBadge iso={s.startsAt} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{s.title}</div>
                <div className="muted small">
                  {shortDate(s.startsAt).time} – {shortDate(s.endsAt).time} · {s.host}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
