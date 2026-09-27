'use client';
import { useState } from 'react';
import { DEPARTMENTS, type Department, type LeaderRow } from '@/lib/types';

export function Leaderboard({ rows, viewerId, viewerDept }: { rows: LeaderRow[]; viewerId: string; viewerDept: Department | null }) {
  const [mine, setMine] = useState(false);
  const shown = (mine && viewerDept ? rows.filter((r) => r.department === viewerDept) : rows).slice(0, 8);
  return (
    <section className="card" aria-labelledby="board">
      <div className="card-head">
        <h2 id="board">Leaderboard</h2>
        {viewerDept && (
          <div className="seg" role="group" aria-label="Leaderboard scope">
            <button type="button" aria-pressed={!mine} onClick={() => setMine(false)}>
              All
            </button>
            <button type="button" aria-pressed={mine} onClick={() => setMine(true)} title={DEPARTMENTS[viewerDept]}>
              My team
            </button>
          </div>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="muted small">No XP yet. Finish a lesson to get on the board.</p>
      ) : (
        <ol className="board">
          {shown.map((r, i) => (
            <li key={r.userId} className={`${i === 0 ? 'first' : ''} ${r.userId === viewerId ? 'me' : ''}`}>
              <span className="rank">{i + 1}</span>
              <span style={{ fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
                {r.userId === viewerId && <span className="muted"> (you)</span>}
              </span>
              <span className="xp">{r.xp.toLocaleString('en-IN')} XP</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
