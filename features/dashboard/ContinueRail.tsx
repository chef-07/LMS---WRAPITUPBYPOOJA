import { PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { Cover, ProgressBar } from '@/components/ui/primitives';
import { minutesLabel } from '@/lib/format';
import { coursePercent } from '@/lib/progress';
import type { CourseCard } from '@/lib/types';

function ago(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function resumeHref(c: CourseCard) {
  return c.lastLesson ? `/learn/${c.slug}/${c.lastLesson.slug}` : `/schools/${c.slug}`;
}

export function ContinueRail({ courses }: { courses: CourseCard[] }) {
  if (!courses.length) return null;
  const [first, ...rest] = courses;
  if (!first) return null;
  const pct = coursePercent(first.completedCount, first.lessonCount);
  return (
    <section aria-labelledby="continue" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 id="continue" className="section-label" style={{ margin: 0 }}>
        Pick up where you left off
      </h2>
      <div className="card resume-wide">
        <Cover videoId={first.coverVideoId} emoji={first.school.emoji} tone={first.school.tone} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>{first.title}</h3>
              <div className="muted small">
                {first.lastLesson ? `Stopped on “${first.lastLesson.title}”` : 'Not started'} · {ago(first.lastActivityAt)}
              </div>
            </div>
            <Link className="btn btn-primary" href={resumeHref(first)}>
              <PlayCircle size={18} aria-hidden="true" /> Resume
            </Link>
          </div>
          <ProgressBar pct={pct} label={`${first.title} progress`} />
          <div className="muted small" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {first.completedCount} of {first.lessonCount} lessons · {pct}%
            </span>
            <span>{minutesLabel(first.remainingSeconds)} left</span>
          </div>
        </div>
      </div>
      {rest.length > 0 && (
        <div className="grid-3">
          {rest.slice(0, 6).map((c) => {
            const p = coursePercent(c.completedCount, c.lessonCount);
            return (
              <Link key={c.id} href={resumeHref(c)} className="card course-card">
                <span className={`chip tone-${c.school.tone}`} style={{ alignSelf: 'flex-start' }}>
                  {c.school.emoji} {c.school.name}
                </span>
                <h3>{c.title}</h3>
                <ProgressBar pct={p} label={`${c.title} progress`} />
                <span className="muted small">
                  {c.completedCount}/{c.lessonCount} lessons · {minutesLabel(c.remainingSeconds)} left
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
