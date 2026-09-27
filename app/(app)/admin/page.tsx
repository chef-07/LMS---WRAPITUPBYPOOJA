import { AlertTriangle, BookPlus, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState } from '@/components/ui/primitives';
import { NewCourse } from '@/features/studio/NewCourse';
import { getSchoolsForStudio, getStudioRows, requireAdminPage } from '@/lib/admin';
import { DEPARTMENTS } from '@/lib/types';

export const metadata: Metadata = { title: 'Studio' };

export default async function StudioPage() {
  await requireAdminPage();
  const [rows, schools] = await Promise.all([getStudioRows(), getSchoolsForStudio()]);
  const drafts = rows.filter((r) => !r.isPublished).length;
  const missing = rows.reduce((s, r) => s + r.missingVideos, 0);

  return (
    <div className="page">
      <PageHeader title="Studio" crumbs={[{ label: 'Home', href: '/' }, { label: 'Studio' }]} actions={<NewCourse schools={schools} />} />
      <p className="muted" style={{ margin: 0 }}>
        {rows.length} courses · {drafts} {drafts === 1 ? 'draft' : 'drafts'}
        {missing > 0 && ` · ${missing} lessons still need a YouTube link`}
      </p>
      <section className="card">
        {rows.length === 0 ? (
          <EmptyState icon={BookPlus} title="No courses yet" body="Create your first course, add lessons, paste the YouTube links, then publish." />
        ) : (
          <div className="list">
            {rows.map((r) => (
              <Link key={r.id} href={`/admin/courses/${r.id}`} className="list-row" style={{ color: 'inherit' }}>
                <span className={`school-emoji tone-${r.school?.tone ?? 'tangerine'}`} style={{ width: 40, height: 40, fontSize: 20 }} aria-hidden="true">
                  {r.school?.emoji ?? '🎁'}
                </span>
                <div className="grow">
                  <div className="title">{r.title}</div>
                  <div className="muted small">
                    {r.school?.name ?? 'No school'} · {r.level} · {r.moduleCount} modules · {r.lessonCount} lessons
                    {r.departments.length > 0 && ` · for ${r.departments.map((d) => DEPARTMENTS[d]).join(', ')}`}
                  </div>
                </div>
                {r.missingVideos > 0 && (
                  <span className="chip warn">
                    <AlertTriangle size={13} aria-hidden="true" /> {r.missingVideos} without video
                  </span>
                )}
                <span className={`chip ${r.isPublished ? 'live' : 'draft'}`}>{r.isPublished ? 'Published' : 'Draft'}</span>
                <ChevronRight size={18} className="muted" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
