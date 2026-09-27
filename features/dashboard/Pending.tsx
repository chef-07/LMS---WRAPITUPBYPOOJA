import { Camera, ChevronRight, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import type { PendingItem } from '@/lib/types';

/** Redo requests and quizzes not passed yet. Hidden when there is nothing to do. */
export function Pending({ items }: { items: PendingItem[] }) {
  if (!items.length) return null;
  return (
    <section className="card" aria-labelledby="pending">
      <div className="card-head">
        <h2 id="pending">Pending for you</h2>
        <span className="chip warn">{items.length}</span>
      </div>
      <div className="list">
        {items.slice(0, 6).map((p) => (
          <Link key={`${p.kind}-${p.id}`} href={p.href} className="list-row" style={{ color: 'inherit' }}>
            <span className={`stat-icon tone-${p.kind === 'redo' ? 'tangerine' : 'violet'}`} aria-hidden="true">
              {p.kind === 'redo' ? <Camera size={17} /> : <HelpCircle size={17} />}
            </span>
            <div className="grow">
              <div className="title">{p.title}</div>
              <div className="muted small">{p.detail}</div>
            </div>
            <ChevronRight size={18} className="muted" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
