import { Award, CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { ProgressBar } from '@/components/ui/primitives';
import { getViewer } from '@/lib/data';
import { DEPARTMENTS } from '@/lib/types';
import { getProgram } from '@/lib/university';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const viewer = await getViewer();
  const p = viewer ? await getProgram(viewer, (await params).slug) : null;
  return { title: p?.title ?? 'Program' };
}

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const viewer = (await getViewer())!;
  const p = await getProgram(viewer, (await params).slug);
  if (!p) notFound();
  const currentIdx = p.levels.findIndex((l) => !l.done);
  return (
    <div className="page">
      <PageHeader title={p.title} crumbs={[{ label: 'Home', href: '/' }, { label: 'Programs', href: '/programs' }, { label: p.title }]} />
      <section className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="school-emoji tone-violet" style={{ width: 64, height: 64, fontSize: 32 }} aria-hidden="true">
          {p.emoji}
        </span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span className="chip tone-tangerine">{p.department ? DEPARTMENTS[p.department] : 'Everyone'}</span>
            {!p.isPublished && <span className="chip draft">Draft · only faculty see this</span>}
          </div>
          {p.description && <p style={{ margin: '0 0 8px' }}>{p.description}</p>}
          <ProgressBar pct={p.coursesTotal ? (p.coursesDone / p.coursesTotal) * 100 : 0} label="Program progress" />
          <div className="muted small" style={{ marginTop: 4 }}>
            {p.coursesDone} of {p.coursesTotal} courses certified
          </div>
        </div>
      </section>
      <ol className="ladder" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {p.levels.map((l, i) => (
          <li key={l.level} className={`rung${l.done ? ' done' : ''}`} aria-current={i === currentIdx ? 'step' : undefined}>
            <div className="rung-head">
              <span className="rung-num" aria-hidden="true">
                {l.done ? <CheckCircle2 size={18} /> : i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{l.level}</b>
                {l.title && <span className="muted"> · {l.title}</span>}
              </div>
              {l.done ? <span className="chip live">Level complete · +150 XP</span> : i === currentIdx ? <span className="chip tone-sunshine">You are here</span> : null}
            </div>
            <div className="list">
              {l.courses.map((c) => (
                <Link key={c.id} href={`/schools/${c.slug}`} className="list-row">
                  <span className={`school-emoji ${c.certified ? 'tone-turquoise' : 'tone-sky'}`} style={{ width: 40, height: 40, fontSize: 18 }} aria-hidden="true">
                    {c.certified ? <Award size={18} /> : '📘'}
                  </span>
                  <div className="grow">
                    <div className="title">{c.title}</div>
                    <div className="muted small">
                      {c.certified ? 'Certified' : `${c.completedCount} of ${c.lessonCount} lessons`}
                    </div>
                  </div>
                  <div style={{ width: 90 }}>
                    <ProgressBar pct={c.certified ? 100 : c.lessonCount ? (c.completedCount / c.lessonCount) * 100 : 0} label={`${c.title} progress`} />
                  </div>
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
