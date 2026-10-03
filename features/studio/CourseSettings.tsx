'use client';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useAction } from '@/components/ui/useAction';
import type { StudioCourse } from '@/lib/admin';
import { DEPARTMENTS, type Department, type School } from '@/lib/types';
import { deleteCourse, updateCourse } from './actions';

const LEVELS = ['Trainee', 'Associate', 'Senior', 'Master'] as const;

export function CourseSettings({ course, schools }: { course: StudioCourse; schools: School[] }) {
  const router = useRouter();
  const [f, setF] = useState({
    title: course.title,
    slug: course.slug,
    summary: course.summary,
    level: course.level,
    schoolId: course.schoolId,
    instructor: course.instructor,
    departments: course.departments,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const [saved, setSaved] = useState(false);
  const save = useAction();
  const del = useAction();
  const lessons = course.modules.reduce((s, m) => s + m.lessons.length, 0);

  const toggleDept = (d: Department) => set('departments', f.departments.includes(d) ? f.departments.filter((x) => x !== d) : [...f.departments, d]);

  return (
    <section className="card">
      <h2 style={{ marginTop: 0, fontSize: 16 }}>Course settings</h2>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          save.run(() => updateCourse({ id: course.id, ...f }), () => setSaved(true));
        }}
      >
        <div className="field">
          <label htmlFor="cs-title">Title</label>
          <input id="cs-title" required value={f.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cs-slug">Web address</label>
          <input id="cs-slug" required value={f.slug} onChange={(e) => set('slug', e.target.value)} />
          <span className="hint">/schools/{f.slug || '…'}</span>
        </div>
        <div className="field">
          <label htmlFor="cs-school">School</label>
          <select id="cs-school" value={f.schoolId} onChange={(e) => set('schoolId', e.target.value)}>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.emoji} {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="cs-level">Level</label>
            <select id="cs-level" value={f.level} onChange={(e) => set('level', e.target.value as (typeof LEVELS)[number])}>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cs-inst">Taught by</label>
            <input id="cs-inst" value={f.instructor} onChange={(e) => set('instructor', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="cs-sum">Summary</label>
          <textarea id="cs-sum" value={f.summary} onChange={(e) => set('summary', e.target.value)} maxLength={600} placeholder="One or two lines on what they’ll be able to do after." />
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label" style={{ marginBottom: 6 }}>
            Who is it for?
          </legend>
          <div className="checks">
            {(Object.keys(DEPARTMENTS) as Department[]).map((d) => (
              <label key={d} className="check">
                <input type="checkbox" checked={f.departments.includes(d)} onChange={() => toggleDept(d)} />
                {DEPARTMENTS[d]}
              </label>
            ))}
          </div>
          <span className="hint">None ticked = everyone. Trainers and admins always see every course.</span>
        </fieldset>
        {save.error && (
          <p className="notice err" role="alert" style={{ margin: 0 }}>
            {save.error}
          </p>
        )}
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={save.pending}>
            {save.pending ? 'Saving…' : 'Save settings'}
          </button>
          {saved && !save.pending && (
            <span className="small vid-ok" role="status">
              Saved
            </span>
          )}
        </div>
      </form>

      <hr style={{ border: 0, borderTop: '1px solid var(--hair)', margin: '20px 0 14px' }} />
      <ConfirmButton
        className="btn btn-ghost btn-sm"
        label="Delete course"
        title={`Delete “${course.title}”?`}
        body={`This removes ${course.modules.length} modules, ${lessons} lessons and everyone’s progress on them. It can’t be undone. The YouTube videos are not touched.`}
        confirmLabel="Delete course"
        onConfirm={() => del.run(() => deleteCourse({ id: course.id }), () => router.push('/admin'))}
      >
        <Trash2 size={15} aria-hidden="true" /> Delete course
      </ConfirmButton>
      {del.error && (
        <p className="notice err" role="alert" style={{ margin: '10px 0 0' }}>
          {del.error}
        </p>
      )}
    </section>
  );
}
