'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Cover, EmptyState, ProgressBar } from '@/components/ui/primitives';
import { minutesLabel } from '@/lib/format';
import { coursePercent } from '@/lib/progress';
import type { CourseCard, School } from '@/lib/types';
import { SearchX } from 'lucide-react';

export function CourseGrid({ schools, cards, initialSchool }: { schools: School[]; cards: CourseCard[]; initialSchool: string | null }) {
  const [school, setSchool] = useState<string | null>(initialSchool);
  const [q, setQ] = useState('');
  const shown = useMemo(
    () =>
      cards.filter(
        (c) => (!school || c.school.slug === school) && (!q.trim() || `${c.title} ${c.school.name}`.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [cards, school, q],
  );
  const current = schools.find((s) => s.slug === school);

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="pills" role="group" aria-label="Filter by school">
          <button type="button" className="pill-btn" aria-pressed={!school} onClick={() => setSchool(null)}>
            All schools
          </button>
          {schools.map((s) => (
            <button key={s.slug} type="button" className="pill-btn" aria-pressed={school === s.slug} onClick={() => setSchool(s.slug)}>
              {s.emoji} {s.name.replace(/^School of /, '')}
            </button>
          ))}
        </div>
        <div className="field" style={{ minWidth: 220 }}>
          <label htmlFor="course-search" className="sr-only">
            Search courses
          </label>
          <input id="course-search" placeholder="Search courses" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {current && (
        <div className={`card school-card tone-${current.tone}`}>
          <span className="school-emoji" aria-hidden="true">
            {current.emoji}
          </span>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>{current.name}</h2>
            <p className="muted" style={{ margin: '2px 0 0' }}>
              {current.blurb}
            </p>
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="card">
          <EmptyState icon={SearchX} title="No courses here yet" body="Try another school, or clear the search." />
        </div>
      ) : (
        <div className="grid-4">
          {shown.map((c) => {
            const pct = coursePercent(c.completedCount, c.lessonCount);
            return (
              <Link key={c.id} href={`/schools/${c.slug}`} className="card course-card">
                <Cover videoId={c.coverVideoId} emoji={c.school.emoji} tone={c.school.tone} alt="" />
                <span className={`chip tone-${c.school.tone}`} style={{ alignSelf: 'flex-start' }}>
                  {c.level}
                </span>
                <h3>{c.title}</h3>
                <div className="course-meta">
                  <span>{c.lessonCount} lessons</span>
                  <span>{minutesLabel(c.durationSeconds)}</span>
                  <span>{pct === 100 ? '✓ Done' : pct > 0 ? `${pct}%` : 'Not started'}</span>
                </div>
                <ProgressBar pct={pct} label={`${c.title} progress`} />
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
