'use client';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, Video, VideoOff, X } from 'lucide-react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useAction } from '@/components/ui/useAction';
import type { StudioLesson, StudioModule } from '@/lib/admin';
import { clock } from '@/lib/format';
import { addLesson, deleteLesson, deleteModule, moveLesson, moveModule, updateModule } from './actions';
import { LessonEditor } from './LessonEditor';
import { VideoField } from './VideoField';

export function ModuleCard({ mod, index, count }: { mod: StudioModule; index: number; count: number }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(mod.title);
  const [drip, setDrip] = useState(mod.dripDays);
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newVideo, setNewVideo] = useState('');
  const act = useAction();
  const add = useAction();

  return (
    <section className="card module-card" aria-label={`Module ${index + 1}: ${mod.title}`}>
      <div className="module-head">
        {editing ? (
          <form
            className="form-row"
            style={{ flex: 1, alignItems: 'end' }}
            onSubmit={(e) => {
              e.preventDefault();
              act.run(() => updateModule({ id: mod.id, title, dripDays: drip }), () => setEditing(false));
            }}
          >
            <div className="field">
              <label htmlFor={`m-${mod.id}-t`}>Module title</label>
              <input id={`m-${mod.id}-t`} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor={`m-${mod.id}-d`}>Unlocks after (days)</label>
                <input id={`m-${mod.id}-d`} type="number" min={0} max={365} value={drip} onChange={(e) => setDrip(Number(e.target.value))} />
              </div>
              <button className="icon-sm" type="submit" aria-label="Save module" disabled={act.pending}>
                <Check size={18} />
              </button>
              <button className="icon-sm" type="button" aria-label="Cancel" onClick={() => setEditing(false)}>
                <X size={18} />
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="grow" style={{ flex: 1, minWidth: 0 }}>
              <div className="syllabus-mod" style={{ padding: 0 }}>Module {index + 1}</div>
              <div style={{ fontWeight: 700 }}>{mod.title}</div>
              {mod.dripDays > 0 && <div className="muted small">Unlocks {mod.dripDays} days after a learner joins their batch</div>}
            </div>
            <div className="row-actions">
              <button className="icon-sm" type="button" aria-label="Move module up" disabled={index === 0 || act.pending} onClick={() => act.run(() => moveModule({ id: mod.id, dir: 'up' }))}>
                <ArrowUp size={17} />
              </button>
              <button className="icon-sm" type="button" aria-label="Move module down" disabled={index === count - 1 || act.pending} onClick={() => act.run(() => moveModule({ id: mod.id, dir: 'down' }))}>
                <ArrowDown size={17} />
              </button>
              <button className="icon-sm" type="button" aria-label="Rename module" onClick={() => setEditing(true)}>
                <Pencil size={16} />
              </button>
              <ConfirmButton
                label={`Delete module ${mod.title}`}
                title={`Delete “${mod.title}”?`}
                body={
                  mod.lessons.length
                    ? `Its ${mod.lessons.length} ${mod.lessons.length === 1 ? 'lesson' : 'lessons'} and everyone’s progress on them go too. The YouTube videos themselves are not touched.`
                    : 'The module is empty.'
                }
                confirmLabel="Delete module"
                onConfirm={() => act.run(() => deleteModule({ id: mod.id }))}
              >
                <Trash2 size={16} />
              </ConfirmButton>
            </div>
          </>
        )}
      </div>
      {act.error && (
        <p className="notice err" role="alert" style={{ margin: '10px 16px 0' }}>
          {act.error}
        </p>
      )}

      <div className="module-body">
        {mod.lessons.length === 0 && !adding && <p className="muted small">No lessons yet.</p>}
        <div className="list">
          {mod.lessons.map((l, i) => (
            <LessonRow
              key={l.id}
              lesson={l}
              first={i === 0}
              last={i === mod.lessons.length - 1}
              open={openLesson === l.id}
              onToggle={() => setOpenLesson((o) => (o === l.id ? null : l.id))}
            />
          ))}
        </div>

        {adding ? (
          <form
            className="lesson-editor form"
            onSubmit={(e) => {
              e.preventDefault();
              add.run(() => addLesson({ moduleId: mod.id, title: newTitle, video: newVideo }), () => {
                setNewTitle('');
                setNewVideo('');
                setAdding(false);
              });
            }}
          >
            <div className="field">
              <label htmlFor={`nl-${mod.id}`}>Lesson title</label>
              <input id={`nl-${mod.id}`} required autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Sharp corners, every time" />
            </div>
            <VideoField id={`nlv-${mod.id}`} value={newVideo} onChange={setNewVideo} />
            {add.error && (
              <p className="notice err" role="alert" style={{ margin: 0 }}>
                {add.error}
              </p>
            )}
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={add.pending}>
                {add.pending ? 'Adding…' : 'Add lesson'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden="true" /> Add lesson
          </button>
        )}
      </div>
    </section>
  );
}

function LessonRow({ lesson: l, first, last, open, onToggle }: { lesson: StudioLesson; first: boolean; last: boolean; open: boolean; onToggle: () => void }) {
  const act = useAction();
  return (
    <div>
      <div className="list-row">
        <span title={l.videoId ? 'Has a video' : 'No video yet'} className={l.videoId ? 'vid-ok' : 'vid-missing'} style={{ display: 'grid', placeItems: 'center' }}>
          {l.videoId ? <Video size={18} aria-label="Has a video" /> : <VideoOff size={18} aria-label="No video yet" />}
        </span>
        <div className="grow">
          <div className="title">{l.title}</div>
          <div className="muted small">
            {l.durationSeconds ? clock(l.durationSeconds) : 'length unknown'} ·{' '}
            {l.completionMode === 'watch' ? `watch ${Math.round(l.minWatchPct * 100)}%` : 'learner ticks'}
            {!l.isPublished && ' · hidden'}
            {l.quiz && ` · 📝 quiz (${l.quiz.questions.length})`}
            {l.practical && ' · 📷 practical'}
          </div>
        </div>
        {!l.isPublished && <span className="chip draft">Hidden</span>}
        <div className="row-actions">
          <button className="icon-sm" type="button" aria-label={`Move ${l.title} up`} disabled={first || act.pending} onClick={() => act.run(() => moveLesson({ id: l.id, dir: 'up' }))}>
            <ArrowUp size={17} />
          </button>
          <button className="icon-sm" type="button" aria-label={`Move ${l.title} down`} disabled={last || act.pending} onClick={() => act.run(() => moveLesson({ id: l.id, dir: 'down' }))}>
            <ArrowDown size={17} />
          </button>
          <button className="icon-sm" type="button" aria-label={`Edit ${l.title}`} aria-expanded={open} onClick={onToggle}>
            <Pencil size={16} />
          </button>
          <ConfirmButton
            label={`Delete ${l.title}`}
            title={`Delete “${l.title}”?`}
            body="Everyone’s progress and notes on this lesson go too. The YouTube video itself is not touched."
            confirmLabel="Delete lesson"
            onConfirm={() => act.run(() => deleteLesson({ id: l.id }))}
          >
            <Trash2 size={16} />
          </ConfirmButton>
        </div>
      </div>
      {act.error && (
        <p className="notice err" role="alert" style={{ margin: '0 0 8px' }}>
          {act.error}
        </p>
      )}
      {open && <LessonEditor lesson={l} onClose={onToggle} />}
    </div>
  );
}
