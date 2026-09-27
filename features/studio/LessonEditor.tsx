'use client';
import { useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import type { StudioLesson } from '@/lib/admin';
import { clock } from '@/lib/format';
import { updateLesson } from './actions';
import { PracticalEditor } from './PracticalEditor';
import { QuizEditor } from './QuizEditor';
import { VideoField } from './VideoField';

export function LessonEditor({ lesson, onClose }: { lesson: StudioLesson; onClose: () => void }) {
  const [f, setF] = useState({
    title: lesson.title,
    slug: lesson.slug,
    summary: lesson.summary,
    video: lesson.videoId ? `https://youtu.be/${lesson.videoId}` : '',
    duration: lesson.durationSource === 'admin' && lesson.durationSeconds ? clock(lesson.durationSeconds) : '',
    completionMode: lesson.completionMode,
    minWatchPct: Math.round(lesson.minWatchPct * 100),
    isPublished: lesson.isPublished,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const { pending, error, run } = useAction();
  const p = `le-${lesson.id}`;

  return (
    <div className="lesson-editor">
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateLesson({ id: lesson.id, ...f }), onClose);
      }}
    >
      <div className="form-row">
        <div className="field">
          <label htmlFor={`${p}-title`}>Lesson title</label>
          <input id={`${p}-title`} required value={f.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${p}-slug`}>Web address</label>
          <input id={`${p}-slug`} required value={f.slug} onChange={(e) => set('slug', e.target.value)} />
          <span className="hint">/learn/…/{f.slug || '…'}</span>
        </div>
      </div>

      <VideoField id={`${p}-video`} value={f.video} onChange={(v) => set('video', v)} />

      <div className="form-row">
        <div className="field">
          <label htmlFor={`${p}-dur`}>Length (optional)</label>
          <input id={`${p}-dur`} value={f.duration} onChange={(e) => set('duration', e.target.value)} placeholder="12:30" />
          <span className="hint">
            {lesson.durationSource === 'browser' && lesson.durationSeconds
              ? `The player measured ${clock(lesson.durationSeconds)}. Leave empty to keep it.`
              : 'Leave empty; the player measures it the first time someone watches.'}
          </span>
        </div>
        <div className="field">
          <span className="label">Visibility</span>
          <label className="check" style={{ alignSelf: 'flex-start' }}>
            <input type="checkbox" checked={f.isPublished} onChange={(e) => set('isPublished', e.target.checked)} />
            Show this lesson to learners
          </label>
        </div>
      </div>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 6 }}>
          How is it completed?
        </legend>
        <div className="form-row">
          <label className="radio-card">
            <input type="radio" name={`${p}-mode`} checked={f.completionMode === 'watch'} onChange={() => set('completionMode', 'watch')} />
            <span>
              <b>By watching</b>
              <span className="muted small" style={{ display: 'block' }}>
                Completes after they genuinely watch{' '}
                <input
                  aria-label="Percent to watch"
                  type="number"
                  min={10}
                  max={100}
                  step={5}
                  value={f.minWatchPct}
                  onChange={(e) => set('minWatchPct', Number(e.target.value))}
                  style={{ width: 64, height: 30, padding: '2px 6px', borderRadius: 8, border: '1px solid var(--rule)' }}
                />
                % of it. Skipping ahead doesn’t count.
              </span>
            </span>
          </label>
          <label className="radio-card">
            <input type="radio" name={`${p}-mode`} checked={f.completionMode === 'manual'} onChange={() => set('completionMode', 'manual')} />
            <span>
              <b>Learner ticks it</b>
              <span className="muted small" style={{ display: 'block' }}>
                For short clips or reading. “Mark complete” works any time.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor={`${p}-sum`}>What they’ll learn (optional)</label>
        <textarea id={`${p}-sum`} value={f.summary} onChange={(e) => set('summary', e.target.value)} maxLength={2000} placeholder="Shown under the video." />
      </div>

      {error && (
        <p className="notice err" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save lesson'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </form>
      <details className="editor-section" open={!!lesson.quiz}>
        <summary>
          📝 Quiz {lesson.quiz ? `· ${lesson.quiz.questions.length} ${lesson.quiz.questions.length === 1 ? 'question' : 'questions'} · pass ${lesson.quiz.passPct}%` : '· none yet'}
        </summary>
        <QuizEditor lessonId={lesson.id} quiz={lesson.quiz} />
      </details>
      <details className="editor-section" open={!!lesson.practical}>
        <summary>📷 “Show your wrap” practical {lesson.practical ? '· set' : '· none yet'}</summary>
        <PracticalEditor lessonId={lesson.id} practical={lesson.practical} />
      </details>
    </div>
  );
}
