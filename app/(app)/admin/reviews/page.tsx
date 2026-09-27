import { Camera, ChevronRight, ClipboardCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState } from '@/components/ui/primitives';
import { getReviewQueue, requireFacultyPage } from '@/lib/admin';
import { initials } from '@/lib/format';
import { DEPARTMENTS } from '@/lib/types';

export const metadata: Metadata = { title: 'Reviews' };

function waited(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function ReviewsPage() {
  await requireFacultyPage();
  const queue = await getReviewQueue();
  return (
    <div className="page">
      <PageHeader title="Reviews" crumbs={[{ label: 'Home', href: '/' }, { label: 'Reviews' }]} />
      <p className="muted" style={{ margin: 0 }}>
        {queue.length ? `${queue.length} ${queue.length === 1 ? 'wrap is' : 'wraps are'} waiting, oldest first.` : 'Nothing waiting.'}
      </p>
      <section className="card">
        {queue.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="All caught up" body="When someone sends a “Show your wrap” practical, it lands here for scoring." />
        ) : (
          <div className="list">
            {queue.map((r) => (
              <Link key={r.id} href={`/admin/reviews/${r.id}`} className="list-row" style={{ color: 'inherit' }}>
                <span className="avatar sm" aria-hidden="true">
                  {initials(r.learner)}
                </span>
                <div className="grow">
                  <div className="title">
                    {r.learner} · {r.lessonTitle}
                  </div>
                  <div className="muted small">
                    {r.courseTitle}
                    {r.department && ` · ${DEPARTMENTS[r.department]}`} · sent {waited(r.createdAt)}
                    {r.attempt > 1 && ` · try ${r.attempt}`}
                  </div>
                </div>
                <span className="chip">
                  <Camera size={13} aria-hidden="true" /> {r.photoCount}
                </span>
                <ChevronRight size={18} className="muted" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
