'use client';
import { useState } from 'react';
import { ProgressBar } from '@/components/ui/primitives';
import { RISK_LABEL } from '@/lib/admin-shared';
import type { PersonRow } from '@/lib/report';
import { DEPARTMENTS, type Department } from '@/lib/types';

type Sort = 'name' | 'progress' | 'quiet';

const since = (iso: string | null, now: number) => {
  if (!iso) return 'Never';
  const d = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
};

export function PeopleTable({ people, now }: { people: PersonRow[]; now: number }) {
  const [dept, setDept] = useState<Department | 'all'>('all');
  const [sort, setSort] = useState<Sort>('progress');
  const rows = people
    .filter((p) => dept === 'all' || p.department === dept)
    .sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : sort === 'progress' ? a.pct - b.pct || a.name.localeCompare(b.name) : (a.lastActive ?? '').localeCompare(b.lastActive ?? ''),
    );
  return (
    <section className="card">
      <div className="card-head" style={{ flexWrap: 'wrap' }}>
        <h2>Everyone</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="field">
            <label htmlFor="people-team" className="sr-only">
              Team
            </label>
            <select id="people-team" value={dept} onChange={(e) => setDept(e.target.value as Department | 'all')} style={{ height: 40 }}>
              <option value="all">All teams</option>
              {(Object.keys(DEPARTMENTS) as Department[]).map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENTS[d]}
                </option>
              ))}
            </select>
          </div>
          <div className="seg" role="group" aria-label="Sort by">
            {(
              [
                ['progress', 'Least done'],
                ['quiet', 'Quietest'],
                ['name', 'Name'],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>Nobody in this team yet.</p>
      ) : (
        <div className="table-scroll" role="region" aria-label="Everyone’s progress (scrolls sideways)" tabIndex={0}>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Progress</th>
                <th scope="col" className="hide-sm">Certificates</th>
                <th scope="col" className="hide-sm">XP</th>
                <th scope="col">Last learned</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.name}</b>
                    <div className="muted small">
                      {p.department ? DEPARTMENTS[p.department] : 'No team'}
                      {p.batch ? ` · ${p.batch}` : ''}
                    </div>
                  </td>
                  <td style={{ minWidth: 120 }}>
                    <ProgressBar pct={p.pct} label={`${p.name}: ${p.pct}% of their courses`} />
                    <span className="muted small">
                      {p.lessonsDone}/{p.lessonsAssigned} lessons · {p.pct}%
                    </span>
                  </td>
                  <td className="hide-sm num">{p.certificates}</td>
                  <td className="hide-sm num">{p.xp.toLocaleString('en-IN')}</td>
                  <td>
                    <span className="small">{since(p.lastActive, now)}</span>
                    {p.risk !== 'active' && <div className="muted small">{RISK_LABEL[p.risk]}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
