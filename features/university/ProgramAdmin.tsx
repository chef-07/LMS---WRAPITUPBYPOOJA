'use client';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useAction } from '@/components/ui/useAction';
import { deleteProgram, saveProgram, saveProgramLevel } from '@/features/university/actions';
import { slugify } from '@/lib/slug';
import { DEPARTMENTS, type Department } from '@/lib/types';
import type { CourseLevel, CourseOption, ProgramAdmin } from '@/lib/university';

const LEVELS: CourseLevel[] = ['Trainee', 'Associate', 'Senior', 'Master'];

type Fields = { slug: string; title: string; emoji: string; description: string; department: Department | null; isPublished: boolean };
const blank: Fields = { slug: '', title: '', emoji: '🎓', description: '', department: null, isPublished: false };

function ProgramFields({ f, setF, idPrefix, autoSlug }: { f: Fields; setF: (f: Fields) => void; idPrefix: string; autoSlug: boolean }) {
  return (
    <>
      <div className="form-row" style={{ gridTemplateColumns: '72px minmax(0, 1fr)' }}>
        <div className="field">
          <label htmlFor={`${idPrefix}-emoji`}>Emoji</label>
          <input id={`${idPrefix}-emoji`} value={f.emoji} maxLength={8} onChange={(e) => setF({ ...f, emoji: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-title`}>Program name</label>
          <input
            id={`${idPrefix}-title`}
            required
            value={f.title}
            maxLength={120}
            placeholder="Wrapping Artisan"
            onChange={(e) => setF({ ...f, title: e.target.value, slug: autoSlug ? slugify(e.target.value) : f.slug })}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-slug`}>Web address</label>
        <input id={`${idPrefix}-slug`} required value={f.slug} maxLength={60} onChange={(e) => setF({ ...f, slug: e.target.value })} />
        <span className="hint">/programs/{f.slug || '…'}</span>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-desc`}>What it prepares someone for</label>
        <textarea id={`${idPrefix}-desc`} value={f.description} maxLength={1000} onChange={(e) => setF({ ...f, description: e.target.value })} />
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
      <label className="check" style={{ alignSelf: 'flex-start' }}>
        <input type="checkbox" checked={f.isPublished} onChange={(e) => setF({ ...f, isPublished: e.target.checked })} /> Published (the team can see it)
      </label>
    </>
  );
}

export function NewProgramForm() {
  const [f, setF] = useState<Fields>(blank);
  const { pending, error, run } = useAction();
  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveProgram(f), () => setF(blank));
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16 }}>New program</h2>
      <ProgramFields f={f} setF={setF} idPrefix="np" autoSlug />
      {error && <p className="notice err" role="alert" style={{ margin: 0 }}>{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Create program'}
      </button>
    </form>
  );
}

export function ProgramEditor({ p, courses }: { p: ProgramAdmin; courses: CourseOption[] }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Fields>({ slug: p.slug, title: p.title, emoji: p.emoji, description: p.description, department: p.department, isPublished: p.isPublished });
  const act = useAction();
  const courseCount = new Set(p.levels.flatMap((l) => l.courseIds)).size;
  return (
    <section className="card">
      <div className="card-head">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
          <span className="school-emoji tone-violet" aria-hidden="true">
            {p.emoji}
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0 }}>{p.title}</h2>
            <div className="muted small">
              {p.department ? DEPARTMENTS[p.department] : 'Everyone'} · {p.levels.length} level{p.levels.length === 1 ? '' : 's'} · {courseCount} course{courseCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className={`chip ${p.isPublished ? 'live' : 'draft'}`}>{p.isPublished ? 'Published' : 'Draft'}</span>
          <ConfirmButton label={`Delete ${p.title}`} title={`Delete “${p.title}”?`} body="The courses stay. Batches using this program keep going without one. XP already earned stays." confirmLabel="Delete" onConfirm={() => act.run(() => deleteProgram({ id: p.id }))}>
            <Trash2 size={16} />
          </ConfirmButton>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {LEVELS.map((level) => (
          <LevelEditor key={level} programId={p.id} level={level} current={p.levels.find((l) => l.level === level) ?? null} courses={courses} />
        ))}
      </div>

      <div className="form-actions" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />} Edit details
        </button>
        <Link className="btn btn-ghost btn-sm" href={`/programs/${p.slug}`}>
          Preview
        </Link>
      </div>
      {open && (
        <form
          className="form"
          style={{ marginTop: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            act.run(() => saveProgram({ id: p.id, ...f }), () => setOpen(false));
          }}
        >
          <ProgramFields f={f} setF={setF} idPrefix={`p-${p.id}`} autoSlug={false} />
          <button className="btn btn-primary" type="submit" disabled={act.pending} style={{ alignSelf: 'flex-start' }}>
            {act.pending ? 'Saving…' : 'Save details'}
          </button>
        </form>
      )}
      {act.error && <p className="notice err" role="alert" style={{ margin: '8px 0 0' }}>{act.error}</p>}
    </section>
  );
}

function LevelEditor({ programId, level, current, courses }: { programId: string; level: CourseLevel; current: ProgramAdmin['levels'][number] | null; courses: CourseOption[] }) {
  const [title, setTitle] = useState(current?.title ?? '');
  const [picked, setPicked] = useState<string[]>(current?.courseIds ?? []);
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useAction();
  const names = picked.map((id) => courses.find((c) => c.id === id)?.title).filter(Boolean);
  const idp = `lv-${programId}-${level}`;
  return (
    <div className="rung" style={{ padding: 12 }}>
      <div className="rung-head" style={{ marginBottom: open ? 10 : 0 }}>
        <span className="rung-num" aria-hidden="true">
          {LEVELS.indexOf(level) + 1}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{level}</b>
          {current?.title && <span className="muted"> · {current.title}</span>}
          <div className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {names.length ? names.join(', ') : 'No courses yet'}
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Close' : current ? 'Edit' : 'Add courses'}
        </button>
      </div>
      {open && (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveProgramLevel({ programId, level, title, courseIds: picked }), () => setOpen(false));
          }}
        >
          <div className="field">
            <label htmlFor={`${idp}-title`}>Level name (optional)</label>
            <input id={`${idp}-title`} value={title} maxLength={120} placeholder="Clean basics" onChange={(e) => setTitle(e.target.value)} />
          </div>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="label" style={{ marginBottom: 6 }}>
              Courses in this level
            </legend>
            <div className="checks">
              {courses.map((c) => (
                <label key={c.id} className="check">
                  <input
                    type="checkbox"
                    checked={picked.includes(c.id)}
                    onChange={(e) => setPicked(e.target.checked ? [...picked, c.id] : picked.filter((x) => x !== c.id))}
                  />
                  {c.title}
                </label>
              ))}
            </div>
            <span className="hint">Untick everything and save to remove the level.</span>
          </fieldset>
          {error && <p className="notice err" role="alert" style={{ margin: 0 }}>{error}</p>}
          <button className="btn btn-primary btn-sm" type="submit" disabled={pending} style={{ alignSelf: 'flex-start' }}>
            {pending ? 'Saving…' : `Save ${level}`}
          </button>
        </form>
      )}
    </div>
  );
}
