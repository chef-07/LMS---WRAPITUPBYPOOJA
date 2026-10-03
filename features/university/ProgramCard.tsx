import Link from 'next/link';
import { ProgressBar } from '@/components/ui/primitives';
import { DEPARTMENTS } from '@/lib/types';
import type { ProgramView } from '@/lib/university';

export function ProgramCard({ p }: { p: ProgramView }) {
  const pct = p.coursesTotal ? Math.round((p.coursesDone / p.coursesTotal) * 100) : 0;
  const current = p.levels.find((l) => !l.done);
  return (
    <Link href={`/programs/${p.slug}`} className="card program-card">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span className="school-emoji tone-violet" aria-hidden="true">
          {p.emoji}
        </span>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>{p.title}</h2>
          <div className="muted small">
            {p.levels.length} level{p.levels.length === 1 ? '' : 's'} · {p.department ? DEPARTMENTS[p.department] : 'Everyone'}
          </div>
        </div>
      </div>
      {p.description && <p className="muted small" style={{ margin: 0 }}>{p.description}</p>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {!p.isPublished && <span className="chip draft">Draft</span>}
        {p.levels.map((l) => (
          <span key={l.level} className={`chip ${l.done ? 'live' : ''}`}>
            {l.done ? '✓ ' : ''}
            {l.level}
          </span>
        ))}
      </div>
      <ProgressBar pct={pct} label={`${p.title} progress`} />
      <div className="small muted">
        {p.coursesDone} of {p.coursesTotal} courses certified{current ? ` · now: ${current.level}` : p.levels.length ? ' · all levels done 🎉' : ''}
      </div>
    </Link>
  );
}
