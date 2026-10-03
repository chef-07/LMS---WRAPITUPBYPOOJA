import { Eye } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { AddModule } from '@/features/studio/AddModule';
import { CourseSettings } from '@/features/studio/CourseSettings';
import { ModuleCard } from '@/features/studio/ModuleCard';
import { PublishButton } from '@/features/studio/PublishButton';
import { getSchoolsForStudio, getStudioCourse, requireAdminPage } from '@/lib/admin';
import { isDemo } from '@/lib/supabase/config';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = await getStudioCourse((await params).id);
  return { title: c ? `Edit ${c.title}` : 'Course' };
}

export default async function CourseBuilderPage({ params }: Params) {
  await requireAdminPage();
  const [course, schools] = await Promise.all([getStudioCourse((await params).id), getSchoolsForStudio()]);
  if (!course) notFound();
  const lessons = course.modules.flatMap((m) => m.lessons);
  const missing = lessons.filter((l) => !l.videoId).length;

  return (
    <div className="page">
      <PageHeader
        title={course.title}
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Studio', href: '/admin' }, { label: course.title }]}
        actions={
          <>
            <Link className="btn btn-ghost" href={`/schools/${course.slug}`}>
              <Eye size={17} aria-hidden="true" /> Preview
            </Link>
            <PublishButton id={course.id} published={course.isPublished} />
          </>
        }
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className={`chip ${course.isPublished ? 'live' : 'draft'}`}>{course.isPublished ? 'Published' : 'Draft: only faculty can see it'}</span>
        <span className="chip">
          {course.modules.length} modules · {lessons.length} lessons
        </span>
        {missing > 0 && <span className="chip warn">{missing} lessons still need a YouTube link</span>}
        {isDemo && <span className="chip off">Demo mode: changes won’t save</span>}
      </div>
      <div className="content">
        <div className="col">
          {course.modules.map((m, i) => (
            <ModuleCard key={m.id} mod={m} index={i} count={course.modules.length} />
          ))}
          <AddModule courseId={course.id} next={course.modules.length + 1} />
        </div>
        <aside className="col rail" style={{ position: 'static' }}>
          <CourseSettings course={course} schools={schools} />
        </aside>
      </div>
    </div>
  );
}
