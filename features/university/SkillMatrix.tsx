'use client';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useAction } from '@/components/ui/useAction';
import { deleteSkill, saveSkill, setSkillGrant } from '@/features/university/actions';
import { DEPARTMENTS, type Department } from '@/lib/types';
import type { CourseOption, Person, Skill, SkillCell } from '@/lib/university';

export function SkillMatrix({ skills, people, cells, canEdit }: { skills: Skill[]; people: Person[]; cells: Record<string, SkillCell>; canEdit: boolean }) {
  const [dept, setDept] = useState<Department | 'all'>('all');
  const act = useAction();
  const rows = people.filter((p) => dept === 'all' || p.department === dept);
  const cols = skills.filter((s) => dept === 'all' || s.department === null || s.department === dept);

  return (
    <section className="card">
      <div className="card-head" style={{ flexWrap: 'wrap' }}>
        <h2>Who can do what</h2>
        <div className="pills" role="group" aria-label="Filter by team">
          <button type="button" className="pill-btn" aria-pressed={dept === 'all'} onClick={() => setDept('all')}>
            Everyone
          </button>
          {(Object.keys(DEPARTMENTS) as Department[]).map((d) => (
            <button key={d} type="button" className="pill-btn" aria-pressed={dept === d} onClick={() => setDept(d)}>
              {DEPARTMENTS[d]}
            </button>
          ))}
        </div>
      </div>
      <div className="legend" style={{ marginBottom: 10 }}>
        <span>
          <span className="cell-btn signed">✓</span> Signed off
        </span>
        <span>
          <span className="cell-btn ready">1/1</span> Courses done, ready for sign-off
        </span>
        <span>
          <span className="cell-btn">0/1</span> Still learning
        </span>
      </div>
      {cols.length === 0 || rows.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>{cols.length === 0 ? 'No skills for this team yet.' : 'Nobody in this team yet.'}</p>
      ) : (
        <div className="table-scroll">
          <table className="matrix">
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: 'left' }}>
                  Person
                </th>
                {cols.map((s) => (
                  <th key={s.id} scope="col">
                    <span className="skill-h" title={s.description}>
                      <span className="em" aria-hidden="true">
                        {s.emoji}
                      </span>
                      {s.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <th scope="row">
                    {p.name}
                    <div className="muted small" style={{ fontWeight: 400 }}>
                      {p.department ? DEPARTMENTS[p.department] : 'No team'}
                      {p.role === 'trainer' ? ' · Trainer' : ''}
                    </div>
                  </th>
                  {cols.map((s) => {
                    const c = cells[`${s.id}:${p.id}`] ?? { granted: null, coursesDone: 0, coursesTotal: s.courseIds.length };
                    const progress = c.coursesTotal ? `${c.coursesDone}/${c.coursesTotal}` : '—';
                    if (c.granted) {
                      return (
                        <td key={s.id}>
                          <ConfirmButton
                            className="cell-btn signed"
                            label={`${p.name}: ${s.name}, signed off${c.granted.by ? ` by ${c.granted.by}` : ''}. Take back`}
                            title={`Take back ${s.name} from ${p.name}?`}
                            body="Use this if they need a refresher before doing this job alone. You can sign them off again any time."
                            confirmLabel="Take back"
                            disabled={act.pending}
                            onConfirm={() => act.run(() => setSkillGrant({ skillId: s.id, userId: p.id, granted: false }))}
                          >
                            ✓
                          </ConfirmButton>
                        </td>
                      );
                    }
                    const ready = c.coursesTotal > 0 && c.coursesDone === c.coursesTotal;
                    return (
                      <td key={s.id}>
                        <button
                          type="button"
                          className={`cell-btn${ready ? ' ready' : ''}`}
                          disabled={act.pending}
                          aria-label={`Sign off ${p.name} on ${s.name} (${progress} courses certified)`}
                          title={ready ? 'Ready: click to sign off' : 'Click to sign off anyway (e.g. an experienced hire)'}
                          onClick={() => act.run(() => setSkillGrant({ skillId: s.id, userId: p.id, granted: true }))}
                        >
                          {progress}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {act.error && <p className="notice err" role="alert" style={{ margin: '8px 0 0' }}>{act.error}</p>}
      {!canEdit && <p className="muted small" style={{ margin: '10px 0 0' }}>Only Pooja can add or change skills; trainers sign people off.</p>}
    </section>
  );
}

type Fields = { name: string; emoji: string; description: string; department: Department | null; courseIds: string[] };

function SkillFields({ f, setF, courses, idPrefix }: { f: Fields; setF: (f: Fields) => void; courses: CourseOption[]; idPrefix: string }) {
  return (
    <>
      <div className="form-row" style={{ gridTemplateColumns: '72px minmax(0, 1fr)' }}>
        <div className="field">
          <label htmlFor={`${idPrefix}-emoji`}>Emoji</label>
          <input id={`${idPrefix}-emoji`} value={f.emoji} maxLength={8} onChange={(e) => setF({ ...f, emoji: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-name`}>Skill</label>
          <input id={`${idPrefix}-name`} required value={f.name} maxLength={80} placeholder="Wedding trousseau packing" onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-desc`}>What it means in practice</label>
        <input id={`${idPrefix}-desc`} value={f.description} maxLength={300} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-dept`}>Team</label>
        <select id={`${idPrefix}-dept`} value={f.department ?? ''} onChange={(e) => setF({ ...f, department: (e.target.value || null) as Department | null })}>
          <option value="">Everyone</option>
          {Object.entries(DEPARTMENTS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 6 }}>
          Courses that teach it
        </legend>
        <div className="checks">
          {courses.map((c) => (
            <label key={c.id} className="check">
              <input type="checkbox" checked={f.courseIds.includes(c.id)} onChange={(e) => setF({ ...f, courseIds: e.target.checked ? [...f.courseIds, c.id] : f.courseIds.filter((x) => x !== c.id) })} />
              {c.title}
            </label>
          ))}
        </div>
        <span className="hint">When someone holds every one of these certificates, their cell turns yellow: ready for a trainer to sign off.</span>
      </fieldset>
    </>
  );
}

export function NewSkillForm({ courses }: { courses: CourseOption[] }) {
  const blank: Fields = { name: '', emoji: '⭐', description: '', department: null, courseIds: [] };
  const [f, setF] = useState<Fields>(blank);
  const { pending, error, run } = useAction();
  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveSkill(f), () => setF(blank));
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16 }}>New skill</h2>
      <SkillFields f={f} setF={setF} courses={courses} idPrefix="ns" />
      {error && <p className="notice err" role="alert" style={{ margin: 0 }}>{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Add skill'}
      </button>
    </form>
  );
}

export function SkillList({ skills, courses }: { skills: Skill[]; courses: CourseOption[] }) {
  return (
    <section className="card">
      <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>Skills</h2>
      {skills.length === 0 ? (
        <p className="muted small" style={{ margin: 0 }}>No skills yet.</p>
      ) : (
        <div className="list">
          {skills.map((s) => (
            <SkillRow key={s.id} s={s} courses={courses} />
          ))}
        </div>
      )}
    </section>
  );
}

function SkillRow({ s, courses }: { s: Skill; courses: CourseOption[] }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState<Fields>({ name: s.name, emoji: s.emoji, description: s.description, department: s.department, courseIds: s.courseIds });
  const act = useAction();
  const names = s.courseIds.map((id) => courses.find((c) => c.id === id)?.title).filter(Boolean);
  return (
    <div style={{ borderTop: '1px solid var(--hair)', padding: '10px 0' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 22 }} aria-hidden="true">
          {s.emoji}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{s.name}</b>
          <div className="muted small">
            {s.department ? DEPARTMENTS[s.department] : 'Everyone'} · {names.length ? names.join(', ') : 'No courses linked'}
          </div>
        </div>
        <button type="button" className="icon-sm" aria-label={`Edit ${s.name}`} aria-expanded={editing} onClick={() => setEditing(!editing)}>
          <Pencil size={16} />
        </button>
        <ConfirmButton label={`Delete ${s.name}`} title={`Delete “${s.name}”?`} body="Every sign-off for this skill goes too." confirmLabel="Delete" onConfirm={() => act.run(() => deleteSkill({ id: s.id }))}>
          <Trash2 size={16} />
        </ConfirmButton>
      </div>
      {editing && (
        <form
          className="form"
          style={{ marginTop: 10 }}
          onSubmit={(e) => {
            e.preventDefault();
            act.run(() => saveSkill({ id: s.id, ...f }), () => setEditing(false));
          }}
        >
          <SkillFields f={f} setF={setF} courses={courses} idPrefix={`s-${s.id}`} />
          <button className="btn btn-primary btn-sm" type="submit" disabled={act.pending} style={{ alignSelf: 'flex-start' }}>
            Save skill
          </button>
        </form>
      )}
      {act.error && <p className="notice err" role="alert" style={{ margin: '8px 0 0' }}>{act.error}</p>}
    </div>
  );
}
