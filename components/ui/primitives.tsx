import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { shortDate } from '@/lib/format';
import { youtubeThumb } from '@/lib/youtube';
import type { Tone } from '@/lib/types';

export function Card({ title, action, children, className = '', style }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <section className={`card ${className}`} style={style}>
      {(title || action) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function StatTile({ icon: Icon, tone, value, label, sub }: { icon: LucideIcon; tone: Tone; value: ReactNode; label: string; sub?: string }) {
  return (
    <div className={`card stat tone-${tone}`}>
      <div className="stat-top">
        <span className="stat-icon">
          <Icon size={18} aria-hidden="true" />
        </span>
        {sub && <span className="muted small">{sub}</span>}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function DateBadge({ iso }: { iso: string }) {
  const d = shortDate(iso);
  return (
    <div className="datebadge" aria-hidden="true">
      <b>{d.month}</b>
      <span>{d.day}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={24} aria-hidden="true" />
      </div>
      <h3>{title}</h3>
      <p className="muted" style={{ margin: '0 auto 16px', maxWidth: 420 }}>
        {body}
      </p>
      {action}
    </div>
  );
}

/** A 16:9 cover: the YouTube thumbnail when there is one, else the school emoji on its tint. */
export function Cover({ videoId, emoji, tone, alt }: { videoId: string | null; emoji: string; tone: Tone; alt: string }) {
  return (
    <div className={`thumb tone tone-${tone}`}>
      {videoId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={youtubeThumb(videoId)} alt={alt} loading="lazy" />
      ) : (
        <span aria-hidden="true">{emoji}</span>
      )}
    </div>
  );
}
