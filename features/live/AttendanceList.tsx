'use client';
import { useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import { markAttendance } from '@/features/team-life/actions';
import type { AttendanceRow } from '@/lib/team-life';
import { DEPARTMENTS } from '@/lib/types';

export function AttendanceList({ sessionId, rows }: { sessionId: string; rows: AttendanceRow[] }) {
  const { error, run } = useAction();
  // Tick at once; roll back if the save fails.
  const [marks, setMarks] = useState<Record<string, boolean>>(() => Object.fromEntries(rows.map((r) => [r.userId, r.present])));
  const present = Object.values(marks).filter(Boolean).length;
  const toggle = (userId: string, on: boolean) => {
    setMarks((m) => ({ ...m, [userId]: on }));
    run(() => markAttendance({ sessionId, userId, present: on }).then((res) => {
      if (!res.ok) setMarks((m) => ({ ...m, [userId]: !on }));
      return res;
    }));
  };
  return (
    <section className="card">
      <div className="card-head">
        <h2>Attendance</h2>
        <span className="chip live">
          {present} of {rows.length}
        </span>
      </div>
      <div className="list">
        {rows.map((r) => (
          <label key={r.userId} className="list-row" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={marks[r.userId] ?? false}
              onChange={(e) => toggle(r.userId, e.target.checked)}
              style={{ width: 20, height: 20, accentColor: 'var(--turquoise)' }}
            />
            <div className="grow">
              <div className="title">{r.name}</div>
              <div className="muted small">
                {r.department ? DEPARTMENTS[r.department] : 'Faculty'}
                {r.source === 'self' && ' · joined from the app'}
                {r.source === 'trainer' && ' · marked by a trainer'}
              </div>
            </div>
          </label>
        ))}
      </div>
      {error && <p className="notice err" style={{ margin: '8px 0 0' }}>{error}</p>}
    </section>
  );
}
