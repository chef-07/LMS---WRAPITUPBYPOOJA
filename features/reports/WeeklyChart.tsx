'use client';
import { useState } from 'react';
import type { Week } from '@/lib/report';

const label = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** A clean top for a count axis whose half-way tick is a whole number too: 2, 4, 6, 10, 20, 40, 60, 100… */
function niceMax(n: number): number {
  const half = Math.max(1, n / 2);
  const pow = 10 ** Math.floor(Math.log10(half));
  for (const m of [1, 2, 3, 5, 10]) if (m * pow >= half) return 2 * Math.max(1, Math.round(m * pow));
  return 20 * pow;
}

/** Lessons finished per week: one series, so no legend; hover or focus a column for its value. */
export function WeeklyChart({ weeks }: { weeks: Week[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...weeks.map((w) => w.lessons), 1));
  const ticks = [max, max / 2, 0];
  const total = weeks.reduce((s, w) => s + w.lessons, 0);
  return (
    <figure className="wchart" style={{ margin: 0 }}>
      <div className="wchart-plot" role="group" aria-label={`Lessons finished per week, last ${weeks.length} weeks: ${total} in total`}>
        <div className="wchart-axis" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t}>{t.toLocaleString('en-IN')}</span>
          ))}
        </div>
        <div className="wchart-area">
          {ticks.map((t) => (
            <i key={t} className="wchart-grid" style={{ bottom: `${(t / max) * 100}%` }} aria-hidden="true" />
          ))}
          {weeks.map((w, i) => {
            const isLast = i === weeks.length - 1;
            return (
              <div
                key={w.start}
                className="wchart-col"
                role="img"
                tabIndex={0}
                aria-label={`Week of ${label(w.start)}: ${w.lessons} lesson${w.lessons === 1 ? '' : 's'}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <div className="wchart-bar" style={{ height: `${(w.lessons / max) * 100}%` }} data-on={active === i || undefined}>
                  {isLast && active === null && w.lessons > 0 && <span className="wchart-cap">{w.lessons}</span>}
                </div>
                {active === i && (
                  <div className="wchart-tip" role="status">
                    <b>{w.lessons}</b> lesson{w.lessons === 1 ? '' : 's'}
                    <span>week of {label(w.start)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="wchart-x" aria-hidden="true">
        {weeks.map((w, i) => (
          <span key={w.start}>{i % 2 === weeks.length % 2 || i === weeks.length - 1 ? label(w.start) : ''}</span>
        ))}
      </div>
      <details className="small" style={{ marginTop: 8 }}>
        <summary className="muted">Show as a table</summary>
        <table className="data-table" style={{ marginTop: 6 }}>
          <thead>
            <tr>
              <th scope="col">Week of</th>
              <th scope="col" style={{ textAlign: 'right' }}>
                Lessons finished
              </th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.start}>
                <td>{label(w.start)}</td>
                <td className="num">{w.lessons}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
