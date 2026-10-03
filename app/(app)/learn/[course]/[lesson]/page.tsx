import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { ProgressBar } from '@/components/ui/primitives';
import { LessonView, type Tab } from '@/features/lesson/LessonView';
import { getLessonPage, getViewer } from '@/lib/data';
import { coursePercent } from '@/lib/progress';
import { isDemo } from '@/lib/supabase/config';

type Params = { params: Promise<{ course: string; lesson: string }> };
type Search = { searchParams: Promise<{ tab?: string; t?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await params;
  const data = await getLessonPage(p.course, p.lesson);
  return { title: data?.lesson.title ?? 'Lesson' };
}

export default async function LessonPage({ params, searchParams }: Params & Search) {
  const p = await params;
  const sp = await searchParams;
  const tab = ['notes', 'files', 'discussion', 'assignment'].includes(sp.tab ?? '') ? (sp.tab as Tab) : null;
  const t = sp.t && /^\d{1,5}$/.test(sp.t) ? Number(sp.t) : null;
  const [data, viewer] = await Promise.all([getLessonPage(p.course, p.lesson), getViewer()]);
  if (!data || !viewer) notFound();
  const all = data.course.modules.flatMap((m) => m.lessons);
  const done = all.filter((l) => l.completed).length;

  return (
    <div className="page">
      <PageHeader
        title={data.lesson.title}
        crumbs={[{ label: 'Schools', href: '/schools' }, { label: data.course.title, href: `/schools/${data.course.slug}` }, { label: data.lesson.title }]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="muted small">
              {done} of {all.length} complete
            </span>
            <div style={{ width: 120 }}>
              <ProgressBar pct={coursePercent(done, all.length)} label="Course progress" />
            </div>
          </div>
        }
      />
      <LessonView key={data.lesson.id} data={data} demo={isDemo} watermark={`${viewer.fullName} · ${viewer.email}`} viewerId={viewer.id} isFaculty={viewer.role !== 'member'} initialTab={tab} startAtOverride={t} />
    </div>
  );
}
