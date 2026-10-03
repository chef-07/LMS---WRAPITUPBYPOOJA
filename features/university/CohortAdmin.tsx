'use client';
import { Pencil, Trash2, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { ProgressBar } from '@/components/ui/primitives';
import { useAction } from '@/components/ui/useAction';
import { deleteCohort, saveCohort, setCohortMember } from '@/features/university/actions';
import { DEPARTMENTS } from '@/lib/types';
import type { CohortView, Person } from '@/lib/university';
import { Pace } from './Pace';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const plus = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

type Fields = { title: string; startsOn: string; endsOn: string; programId: string | null };
type Programs = { id: string; title: string }[];

function CohortFields({ f, setF, programs, idPrefix }: { f: Fields; setF: (f: Fields) => void; programs: Programs; idPrefix: string }) {
  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-title`}>Batch name</label>
        <input id={`${idPrefix}-title`} required value={f.title} maxLength={120} placeholder="November 2026 joiners" onChange={(e) => setF({ ...f, title: e.target.value })} />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor={`${idPrefix}-start`}>Starts</label>
          <input id={`${idPrefix}-start`} type="date" required value={f.startsOn} onChange={(e) => setF({ ...f, startsOn: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-end`}>Finish by</label>
          <input id={`${idPrefix}-end`} type="date" required value={f.endsOn} onChange={(e) => setF({ ...f, endsOn: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-program`}>Program to finish</label>
        <select id={`${idPrefix}-program`} value={f.programId ?? ''} onChange={(e) => setF({ ...f, programId: e.target.value || null })}>
          <option value="">No program (just the drip timetable)</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export function NewCohortForm({ programs }: { programs: Programs }) {
  const fresh = (): Fields => ({ title: '', startsOn: today(), endsOn: plus(today(), 27), programId: null });
  const [f, setF] = useState<Fields>(fresh);
  const { pending, error, run } = useAction();
  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveCohort(f), () => setF(fresh()));
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16 }}>New batch</h2>
      <CohortFields f={f} setF={setF} programs={programs} idPrefix="nc" />
      {error && <p className="notice err" role="alert" style={{ margin: 0 }}>{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Create batch'}
      </button>
    </form>
  );
}

export function CohortCard({ c, people, programs }: { c: CohortView; people: (Person & { cohortId: string | null })[]; programs: Programs }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState<Fields>({ title: c.title, startsOn: c.startsOn, endsOn: c.endsOn, programId: c.programId });
  const [adding, setAdding] = useState('');
  const act = useAction();
  const candidates = people.filter((p) => p.cohortId !== c.id);
  const moving = candidates.find((p) => p.id === adding)?.cohortId;
  const phase = c.day === 0 ? 'Not started' : c.day > c.totalDays ? 'Finished' : `Day ${c.day} of ${c.totalDays}`;
  return (
    <section className="card">
      <div className="card-head">
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0 }}>{c.title}</h2>
          <div className="muted small">
            {c.startsOn} → {c.endsOn} · {phase} · {c.programTitle ?? 'No program'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" className="icon-sm" aria-label={`Edit ${c.title}`} aria-expanded={editing} onClick={() => setEditing(!editing)}>
            <Pencil size={16} />
          </button>
          <ConfirmButton label={`Delete ${c.title}`} title={`Delete “${c.title}”?`} body="People in it go back to their own timetable (drip counted from the day they joined)." confirmLabel="Delete" onConfirm={() => act.run(() => deleteCohort({ id: c.id }))}>
            <Trash2 size={16} />
          </ConfirmButton>
        </div>
      </div>

      {editing && (
        <form
          className="form"
          style={{ marginBottom: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            act.run(() => saveCohort({ id: c.id, ...f }), () => setEditing(false));
          }}
        >
          <CohortFields f={f} setF={setF} programs={programs} idPrefix={`c-${c.id}`} />
          <button className="btn btn-primary btn-sm" type="submit" disabled={act.pending} style={{ alignSelf: 'flex-start' }}>
            Save batch
          </button>
        </form>
      )}

      {c.members.length === 0 ? (
        <p className="muted small" style={{ margin: 0 }}>Nobody in this batch yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col" className="hide-sm">Team</th>
                <th scope="col">{c.programTitle ? 'Program' : 'Progress'}</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {c.members.map((m) => (
                <tr key={m.userId}>
                  <td>
                    <b>{m.name}</b>
                  </td>
                  <td className="hide-sm muted">{m.department ? DEPARTMENTS[m.department] : '—'}</td>
                  <td style={{ minWidth: 120 }}>
                    {m.total ? (
                      <>
                        <ProgressBar pct={m.pct} label={`${m.name} progress`} />
                        <span className="muted small">
                          {m.done}/{m.total} lessons
                        </span>
                      </>
                    ) : (
                      <span className="muted small">—</span>
                    )}
                  </td>
                  <td>{m.total ? <Pace status={m.status} /> : <span className="muted small">—</span>}</td>
                  <td className="num">
                    <ConfirmButton label={`Remove ${m.name}`} title={`Take ${m.name} out of ${c.title}?`} body="Their drip timetable goes back to counting from the day they joined." confirmLabel="Remove" onConfirm={() => act.run(() => setCohortMember({ cohortId: null, userId: m.userId }))}>
                      <UserMinus size={16} />
                    </ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        className="form-actions"
        style={{ marginTop: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (adding) act.run(() => setCohortMember({ cohortId: c.id, userId: adding }), () => setAdding(''));
        }}
      >
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor={`add-${c.id}`} className="sr-only">
            Add someone to {c.title}
          </label>
          <select id={`add-${c.id}`} value={adding} onChange={(e) => setAdding(e.target.value)}>
            <option value="">Add someone…</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.department ? ` · ${DEPARTMENTS[p.department]}` : ''}
                {p.cohortId ? ' (moves from another batch)' : ''}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-ghost" type="submit" disabled={!adding || act.pending}>
          {moving ? 'Move here' : 'Add'}
        </button>
      </form>
      {act.error && <p className="notice err" role="alert" style={{ margin: '8px 0 0' }}>{act.error}</p>}
    </section>
  );
}
