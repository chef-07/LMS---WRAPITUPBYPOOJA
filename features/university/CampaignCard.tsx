import Link from 'next/link';
import { ProgressBar } from '@/components/ui/primitives';
import { opensOnLabel } from '@/lib/format';
import type { MyCampaign } from '@/lib/university';
import { daysLabel } from './Pace';

export function CampaignCard({ c }: { c: MyCampaign }) {
  const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
  const finished = c.done >= c.total;
  return (
    <section className="campaign" aria-label={`Campaign: ${c.title}`}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 26 }} aria-hidden="true">
          {c.emoji}
        </span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h3>{c.title}</h3>
          <div className="muted small">
            Due {opensOnLabel(c.dueOn)} · {finished ? 'finished 🎉' : daysLabel(c.daysLeft)}
          </div>
        </div>
        <span className={`pace ${finished ? 'done' : c.daysLeft < 0 ? 'overdue' : c.daysLeft <= 3 ? 'behind' : 'on-track'}`}>
          {c.done}/{c.total} lessons
        </span>
      </div>
      {c.description && <p className="small" style={{ margin: 0 }}>{c.description}</p>}
      <ProgressBar pct={pct} label={`${c.title} progress`} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {c.courses.map((course) => (
          <Link key={course.id} className="chip tone-violet" href={`/schools/${course.slug}`}>
            {course.completedCount >= course.lessonCount ? '✓ ' : ''}
            {course.title}
          </Link>
        ))}
      </div>
    </section>
  );
}
