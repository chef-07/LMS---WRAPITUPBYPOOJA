'use client';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { ProgressBar } from '@/components/ui/primitives';
import { useAction } from '@/components/ui/useAction';
import { deleteCampaign, saveCampaign } from '@/features/university/actions';
import { DEPARTMENTS, type Department } from '@/lib/types';
import type { CampaignAdmin as Campaign, CourseOption } from '@/lib/university';
import { Pace } from './Pace';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const plus = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

type Fields = { title: string; emoji: string; description: string; dueOn: string; departments: Department[]; courseIds: string[] };

function CampaignFields({ f, setF, courses, idPrefix }: { f: Fields; setF: (f: Fields) => void; courses: CourseOption[]; idPrefix: string }) {
  return (
    <>
      <div className="form-row" style={{ gridTemplateColumns: '72px minmax(0, 1fr)' }}>
        <div className="field">
          <label htmlFor={`${idPrefix}-emoji`}>Emoji</label>
          <input id={`${idPrefix}-emoji`} value={f.emoji} maxLength={8} onChange={(e) => setF({ ...f, emoji: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-title`}>Campaign</label>
          <input id={`${idPrefix}-title`} required value={f.title} maxLength={120} placeholder="Diwali 2026 refresher" onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-desc`}>Why it matters now</label>
        <textarea id={`${idPrefix}-desc`} value={f.description} maxLength={1000} placeholder="Hamper orders start next week. Refresh cellophane and courier packing." onChange={(e) => setF({ ...f, description: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-due`}>Due</label>
        <input id={`${idPrefix}-due`} type="date" required value={f.dueOn} onChange={(e) => setF({ ...f, dueOn: e.target.value })} />
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 6 }}>
          Teams (none ticked = everyone)
        </legend>
        <div className="checks">
          {(Object.keys(DEPARTMENTS) as Department[]).map((d) => (
            <label key={d} className="check">
              <input type="checkbox" checked={f.departments.includes(d)} onChange={(e) => setF({ ...f, departments: e.target.checked ? [...f.departments, d] : f.departments.filter((x) => x !== d) })} />
              {DEPARTMENTS[d]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 6 }}>
          Courses to refresh
        </legend>
        <div className="checks">
          {courses.map((c) => (
            <label key={c.id} className="check">
              <input type="checkbox" checked={f.courseIds.includes(c.id)} onChange={(e) => setF({ ...f, courseIds: e.target.checked ? [...f.courseIds, c.id] : f.courseIds.filter((x) => x !== c.id) })} />
              {c.title}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

export function NewCampaignForm({ courses }: { courses: CourseOption[] }) {
  const fresh = (): Fields => ({ title: '', emoji: '✨', description: '', dueOn: plus(today(), 14), departments: [], courseIds: [] });
  const [f, setF] = useState<Fields>(fresh);
  const { pending, error, run } = useAction();
  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveCampaign(f), () => setF(fresh()));
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16 }}>New campaign</h2>
      <CampaignFields f={f} setF={setF} courses={courses} idPrefix="ncp" />
      {error && <p className="notice err" role="alert" style={{ margin: 0 }}>{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Launch campaign'}
      </button>
    </form>
  );
}

export function CampaignCard({ c, courses, todayIso }: { c: Campaign; courses: CourseOption[]; todayIso: string }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState<Fields>({ title: c.title, emoji: c.emoji, description: c.description, dueOn: c.dueOn, departments: c.departments, courseIds: c.courseIds });
  const act = useAction();
  const finished = c.rows.filter((r) => r.status === 'done').length;
  const names = c.courseIds.map((id) => courses.find((x) => x.id === id)?.title).filter(Boolean);
  const sorted = [...c.rows].sort((a, b) => a.pct - b.pct || a.name.localeCompare(b.name));
  return (
    <section className="card">
      <div className="card-head">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
          <span style={{ fontSize: 28 }} aria-hidden="true">
            {c.emoji}
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0 }}>{c.title}</h2>
            <div className="muted small">
              Due {c.dueOn}
              {c.dueOn < todayIso ? ' (ended)' : ''} · {c.departments.length ? c.departments.map((d) => DEPARTMENTS[d]).join(', ') : 'Everyone'} · {finished}/{c.rows.length} finished
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" className="icon-sm" aria-label={`Edit ${c.title}`} aria-expanded={editing} onClick={() => setEditing(!editing)}>
            <Pencil size={16} />
          </button>
          <ConfirmButton label={`Delete ${c.title}`} title={`Delete “${c.title}”?`} body="Nobody’s progress is lost; the campaign card and reminders just stop." confirmLabel="Delete" onConfirm={() => act.run(() => deleteCampaign({ id: c.id }))}>
            <Trash2 size={16} />
          </ConfirmButton>
        </div>
      </div>
      <p className="small" style={{ margin: '0 0 10px' }}>
        {names.join(' · ')}
      </p>
      {editing && (
        <form
          className="form"
          style={{ marginBottom: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            act.run(() => saveCampaign({ id: c.id, ...f }), () => setEditing(false));
          }}
        >
          <CampaignFields f={f} setF={setF} courses={courses} idPrefix={`cp-${c.id}`} />
          <button className="btn btn-primary btn-sm" type="submit" disabled={act.pending} style={{ alignSelf: 'flex-start' }}>
            Save campaign
          </button>
        </form>
      )}
      {sorted.length === 0 ? (
        <p className="muted small" style={{ margin: 0 }}>Nobody in these teams yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col" className="hide-sm">Team</th>
                <th scope="col">Progress</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.userId}>
                  <td>
                    <b>{r.name}</b>
                  </td>
                  <td className="hide-sm muted">{r.department ? DEPARTMENTS[r.department] : '—'}</td>
                  <td style={{ minWidth: 120 }}>
                    <ProgressBar pct={r.pct} label={`${r.name} progress`} />
                    <span className="muted small">
                      {r.done}/{r.total} lessons
                    </span>
                  </td>
                  <td>
                    <Pace status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {act.error && <p className="notice err" role="alert" style={{ margin: '8px 0 0' }}>{act.error}</p>}
    </section>
  );
}
