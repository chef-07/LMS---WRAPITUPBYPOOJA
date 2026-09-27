import { Check } from 'lucide-react';
import Link from 'next/link';
import { ProgressBar } from '@/components/ui/primitives';
import type { FirstWeekStep } from '@/lib/types';

/** Only the next unfinished step gets a button. The card disappears when all are done. */
export function FirstWeek({ steps }: { steps: FirstWeekStep[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const next = steps.find((s) => !s.done);
  return (
    <section className="card" aria-labelledby="first-week">
      <div className="card-head">
        <h2 id="first-week">Your first week</h2>
        <span className="muted small">
          {done} of {steps.length}
        </span>
      </div>
      <ProgressBar pct={(done / steps.length) * 100} label="First week progress" />
      <ul className="steps" style={{ marginTop: 12 }}>
        {steps.map((s) => {
          const isNext = s === next;
          return (
            <li key={s.key} className={`step${s.done ? ' done' : ''}${isNext ? ' next' : ''}`}>
              <span className="step-check" aria-hidden="true">
                {s.done && <Check size={14} strokeWidth={3} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="step-title">
                  {s.title}
                  {s.done && <span className="sr-only"> (done)</span>}
                </div>
                {isNext && <div className="muted small">{s.hint}</div>}
              </div>
              {isNext && (
                <Link className="btn btn-primary btn-sm" href={s.cta.href}>
                  {s.cta.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
