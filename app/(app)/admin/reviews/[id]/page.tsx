import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { ReviewForm } from '@/features/reviews/ReviewForm';
import { getReviewDetail, requireFacultyPage } from '@/lib/admin';
import { averageScore } from '@/lib/rubric';
import { DEPARTMENTS } from '@/lib/types';

export const metadata: Metadata = { title: 'Review' };

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireFacultyPage();
  const d = await getReviewDetail((await params).id, viewer.id);
  if (!d) notFound();
  const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(d.createdAt));

  return (
    <div className="page">
      <PageHeader
        title={`${d.learner} · ${d.lessonTitle}`}
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Reviews', href: '/admin/reviews' }, { label: d.learner }]}
        actions={
          <Link className="btn btn-ghost" href={d.lessonHref}>
            Open lesson
          </Link>
        }
      />
      <div className="content">
        <div className="col">
          <section className="card">
            <div className="muted small" style={{ marginBottom: 8 }}>
              {d.courseTitle}
              {d.department && ` · ${DEPARTMENTS[d.department]}`} · sent {when}
            </div>
            <p style={{ margin: '0 0 12px' }}>
              <b>Brief:</b> {d.brief}
            </p>
            {d.photoUrls.length > 0 ? (
              <div className="photos" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {d.photoUrls.map((u, i) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer" title="Open full size">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt={`Photo ${i + 1} from ${d.learner}`} />
                  </a>
                ))}
              </div>
            ) : (
              <p className="muted">{d.link ? 'No photos. They sent a video link.' : 'No photos attached.'}</p>
            )}
            {d.link && (
              <p style={{ margin: '12px 0 0' }}>
                <a href={d.link} target="_blank" rel="noreferrer" style={{ color: 'var(--violet-deep)', fontWeight: 700 }}>
                  Watch their video ↗
                </a>
              </p>
            )}
            {d.note && <p className="muted" style={{ margin: '12px 0 0' }}>“{d.note}”</p>}
          </section>

          {d.history.length > 0 && (
            <section className="card">
              <h2 style={{ marginTop: 0, fontSize: 15 }}>Earlier tries</h2>
              <ol className="timeline">
                {d.history.map((h) => (
                  <li key={h.id}>
                    <div className="muted small">
                      {h.status === 'redo' ? 'Redo' : h.status === 'approved' ? 'Approved' : 'Waiting'}
                      {h.review && ` · ${h.review.reviewerName} · ${averageScore(h.review.scores) ?? '–'}/5`}
                    </div>
                    {h.review?.comment && <p style={{ margin: '4px 0 0' }}>{h.review.comment}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
        <aside className="col rail">
          {d.status !== 'submitted' ? (
            <p className="notice ok" style={{ margin: 0 }}>
              Already reviewed.
            </p>
          ) : d.isOwn ? (
            <p className="notice err" style={{ margin: 0 }}>
              This is your own work. Ask another trainer to review it.
            </p>
          ) : (
            <ReviewForm submissionId={d.id} rubric={d.rubric} />
          )}
        </aside>
      </div>
    </div>
  );
}
