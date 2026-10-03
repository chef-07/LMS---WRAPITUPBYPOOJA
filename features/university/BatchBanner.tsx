import Link from 'next/link';
import { ProgressBar } from '@/components/ui/primitives';
import { opensOnLabel } from '@/lib/format';
import type { MyBatch } from '@/lib/university';
import { Pace, daysLabel } from './Pace';

export function BatchBanner({ b }: { b: MyBatch }) {
  const pct = b.program && b.program.total ? Math.round((b.program.done / b.program.total) * 100) : 0;
  return (
    <section className="batch-banner" aria-label="Your batch">
      <span style={{ fontSize: 30 }} aria-hidden="true">
        🧑‍🎓
      </span>
      <div className="grow">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <b>{b.title}</b>
          {b.status && <Pace status={b.status} />}
        </div>
        <div className="muted small">
          {b.day === 0 ? `Starts ${opensOnLabel(b.startsOn)}` : `Day ${Math.min(b.day, b.totalDays)} of ${b.totalDays}`} · finish by {opensOnLabel(b.endsOn)} ({daysLabel(b.daysLeft)})
        </div>
        {b.program && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <ProgressBar pct={pct} label={`${b.program.title} progress`} />
            <span className="small">
              <Link href={`/programs/${b.program.slug}`} style={{ fontWeight: 600, color: 'var(--violet-deep)' }}>
                {b.program.title}
              </Link>{' '}
              · {b.program.done} of {b.program.total} lessons
            </span>
          </div>
        )}
      </div>
      {b.nextUnlock && (
        <div className="small" style={{ maxWidth: 240 }}>
          🔓 Next up: <b>{b.nextUnlock.module}</b> ({b.nextUnlock.course}) opens {opensOnLabel(b.nextUnlock.opensOn)}
        </div>
      )}
    </section>
  );
}
