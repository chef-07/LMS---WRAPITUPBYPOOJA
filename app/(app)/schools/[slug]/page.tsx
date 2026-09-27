import { CheckCircle2, PlayCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { Cover, ProgressBar } from '@/components/ui/primitives';
import { getCatalogue, getCourse, resumeLessonSlug } from '@/lib/data';
import { clock, minutesLabel } from '@/lib/format';
import { coursePercent } from '@/lib/progress';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = await getCourse((await params).slug);
  return { title: found?.course.title ?? 'Course' };
}

export default async function CoursePage({ params }: Params) {
  const { slug } = await params;
  const found = await getCourse(slug);
  if (!found) notFound();
  const { course, card } = found;
  const cat = await getCatalogue();
  const resume = resumeLessonSlug(course, cat.last[course.slug]?.lessonSlug ?? null);
  const pct = coursePercent(card.completedCount, card.lessonCount);
  const started = card.completedCount > 0 || !!card.lastLesson;

  return (
    <div className="page">
      <PageHeader
        title={course.title}
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Schools', href: '/schools' }, { label: card.school.name, href: `/schools?school=${card.school.slug}` }, { label: course.title }]}
        actions={
          resume && (
            <Link className="btn btn-primary" href={`/learn/${course.slug}/${resume}`}>
              <PlayCircle size={18} aria-hidden="true" /> {pct === 100 ? 'Watch again' : started ? 'Resume' : 'Start course'}
            </Link>
          )
        }
      />
      <div className="content">
        <div className="col">
          <section className="card">
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Syllabus</h2>
            {course.modules.map((m, i) => (
              <div key={m.id} style={{ marginBottom: 12 }}>
                <div className="syllabus-mod">
                  Module {i + 1} · {m.title}
                </div>
                {m.lessons.map((l) => (
                  <Link key={l.id} href={`/learn/${course.slug}/${l.slug}`} className="syllabus-row">
                    <span className={`tick${l.completed ? ' on' : ''}`} aria-hidden="true">
                      {l.completed && <CheckCircle2 size={12} strokeWidth={3} />}
                    </span>
                    <span style={{ flex: 1 }}>{l.title}</span>
                    <span className="muted small">{l.durationSeconds ? clock(l.durationSeconds) : ''}</span>
                    {l.completed && <span className="sr-only">(completed)</span>}
                  </Link>
                ))}
              </div>
            ))}
          </section>
        </div>
        <aside className="col rail">
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Cover videoId={card.coverVideoId} emoji={card.school.emoji} tone={card.school.tone} alt="" />
            <p style={{ margin: 0 }}>{course.summary}</p>
            <div className="course-meta">
              <span className={`chip tone-${card.school.tone}`}>{course.level}</span>
              <span>{card.lessonCount} lessons</span>
              <span>{minutesLabel(card.durationSeconds)}</span>
              <span>by {course.instructor}</span>
            </div>
            <ProgressBar pct={pct} label="Course progress" />
            <span className="muted small">
              {card.completedCount} of {card.lessonCount} lessons · {pct}%
            </span>
          </section>
        </aside>
      </div>
    </div>
  );
}
