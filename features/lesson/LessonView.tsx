'use client';
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, ClipboardList, FileText, MessageCircle, NotebookPen, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EmptyState } from '@/components/ui/primitives';
import { YouTubePlayer, type ProgressReport } from '@/features/player/YouTubePlayer';
import { clock, minutesLabel } from '@/lib/format';
import {
  applyProgress,
  hasWatchedEnough,
  markCompletion,
  resumePoint,
  watchTarget,
  type LessonRules,
  type ProgressState,
} from '@/lib/progress';
import type { LessonPageData } from '@/lib/types';

type Tab = 'notes' | 'files' | 'discussion' | 'assignment';

export function LessonView({ data, demo, watermark }: { data: LessonPageData; demo: boolean; watermark: string }) {
  const { course, lesson, prev, next } = data;
  const [duration, setDuration] = useState(lesson.durationSeconds);
  const rules: LessonRules = { durationSeconds: duration, completionMode: lesson.completionMode, minWatchPct: lesson.minWatchPct };
  const rulesRef = useRef(rules);
  useEffect(() => {
    rulesRef.current = { durationSeconds: duration, completionMode: lesson.completionMode, minWatchPct: lesson.minWatchPct };
  }, [duration, lesson.completionMode, lesson.minWatchPct]);

  const [state, setState] = useState<ProgressState>(data.progress);
  const [message, setMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('notes');

  const api = `/api/lessons/${lesson.id}`;

  const onProgress = useCallback(
    (r: ProgressReport) => {
      // Apply the same rules locally so the UI reacts at once; the server
      // applies them again and its answer wins.
      setState((s) => applyProgress(s, { positionSeconds: r.position, watchedDelta: r.watched }, rulesRef.current));
      if (demo) return;
      const body = JSON.stringify({ position: r.position, watched: r.watched });
      if (r.beacon && navigator.sendBeacon) {
        navigator.sendBeacon(`${api}/progress`, new Blob([body], { type: 'text/plain' }));
        return;
      }
      void fetch(`${api}/progress`, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true })
        .then((res) => (res.ok ? res.json() : null))
        .then((row: ServerRow | null) => row && setState(fromRow(row)))
        .catch(() => {});
    },
    [api, demo],
  );

  const onDurationKnown = useCallback(
    (seconds: number) => {
      if (lesson.durationSeconds > 0) return;
      setDuration(seconds);
      if (!demo) void fetch(`${api}/duration`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seconds }) });
    },
    [api, demo, lesson.durationSeconds],
  );

  const setCompleted = async (completed: boolean) => {
    const local = markCompletion(state, completed, rules);
    if (!local.ok) {
      setMessage(`Watch at least ${Math.round(lesson.minWatchPct * 100)}% of the video first.`);
      return;
    }
    setMessage(null);
    setState(local.state);
    if (demo) return;
    const res = await fetch(`${api}/complete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ completed }) });
    if (res.ok) setState(fromRow((await res.json()) as ServerRow));
    else {
      setState(state);
      setMessage(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Could not save. Try again.');
    }
  };

  const target = watchTarget(rules);
  const watchedPct = duration > 0 ? Math.min(100, Math.round((state.watchSeconds / duration) * 100)) : 0;
  const canComplete = lesson.completionMode === 'manual' || hasWatchedEnough(state, rules);
  const lessons = course.modules.flatMap((m) => m.lessons);
  const doneCount = lessons.filter((l) => (l.id === lesson.id ? state.completed : l.completed)).length;
  const startAt = resumePoint(data.progress.positionSeconds, duration);

  return (
    <div className="content">
      <div className="col">
        {lesson.videoId ? (
          <YouTubePlayer
            videoId={lesson.videoId}
            startAt={startAt}
            title={lesson.title}
            watermark={watermark}
            onProgress={onProgress}
            onEnded={() => undefined}
            onDurationKnown={onDurationKnown}
          />
        ) : (
          <div className="player-empty">
            <div>
              <PlayCircle size={40} color="var(--violet)" aria-hidden="true" />
              <h3 style={{ margin: '8px 0 4px' }}>Video coming soon</h3>
              <p className="muted" style={{ margin: 0, maxWidth: 420 }}>
                This lesson doesn’t have a YouTube link yet. An admin can paste one in Studio.
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>{lesson.title}</h2>
            <div className="muted small">
              {lesson.moduleTitle} · {duration ? minutesLabel(duration) : 'length unknown'}
              {startAt > 0 && ` · resuming at ${clock(startAt)}`}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {state.completed ? (
              <button type="button" className="btn btn-ghost" onClick={() => void setCompleted(false)} title="Mark as not done">
                <CheckCircle2 size={18} color="var(--turquoise-deep)" aria-hidden="true" /> Completed
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => void setCompleted(true)} aria-disabled={!canComplete}>
                <Circle size={18} aria-hidden="true" /> Mark complete
              </button>
            )}
            {lesson.completionMode === 'watch' && !state.completed && duration > 0 && (
              <span className="muted small">
                Watched {watchedPct}% · {Math.round(lesson.minWatchPct * 100)}% needed ({clock(Math.max(0, target - state.watchSeconds))} to go)
              </span>
            )}
          </div>
        </div>
        {message && (
          <p className="notice err" role="alert" style={{ margin: 0 }}>
            {message}
          </p>
        )}

        <div>
          <div className="tabs" role="tablist" aria-label="Lesson tools">
            {(
              [
                ['notes', 'Notes', NotebookPen],
                ['files', 'Files', FileText],
                ['discussion', 'Discussion', MessageCircle],
                ['assignment', 'Assignment', ClipboardList],
              ] as const
            ).map(([key, label, Icon]) => (
              <button key={key} type="button" role="tab" className="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
                <Icon size={15} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
                {label}
              </button>
            ))}
          </div>
          <div role="tabpanel" style={{ paddingTop: 16 }}>
            {tab === 'notes' && <Notes lessonId={lesson.id} demo={demo} />}
            {tab === 'files' && <EmptyState icon={FileText} title="No files for this lesson" body="Material lists, templates and price sheets attached to this lesson will appear here." />}
            {tab === 'discussion' && <EmptyState icon={MessageCircle} title="Ask a question" body="Lesson Q&A arrives with the Team Life phase. For now, ask your trainer on the team group." />}
            {tab === 'assignment' && <EmptyState icon={ClipboardList} title="No practical for this lesson" body="When a lesson has a “Show your wrap” practical, you'll upload a photo here and a trainer reviews it." />}
          </div>
        </div>
        {lesson.summary && <p className="muted">{lesson.summary}</p>}
      </div>

      <aside className="col rail" aria-label="Course syllabus">
        <section className="card" style={{ padding: 14 }}>
          <div style={{ padding: '4px 8px 8px' }}>
            <Link href={`/schools/${course.slug}`} style={{ fontWeight: 700 }}>
              {course.title}
            </Link>
            <div className="muted small">
              {doneCount} of {lessons.length} complete
            </div>
          </div>
          {course.modules.map((m) => (
            <div key={m.id}>
              <div className="syllabus-mod">{m.title}</div>
              {m.lessons.map((l) => {
                const done = l.id === lesson.id ? state.completed : l.completed;
                return (
                  <Link key={l.id} href={`/learn/${course.slug}/${l.slug}`} className="syllabus-row" aria-current={l.id === lesson.id ? 'page' : undefined}>
                    <span className={`tick${done ? ' on' : ''}`} aria-hidden="true">
                      {done && <CheckCircle2 size={12} strokeWidth={3} />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>{l.title}</span>
                    <span className="muted small">{l.durationSeconds ? clock(l.durationSeconds) : ''}</span>
                    {done && <span className="sr-only">(completed)</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </section>
        <div style={{ display: 'flex', gap: 10 }}>
          {prev && (
            <Link className="btn btn-ghost" style={{ flex: 1 }} href={`/learn/${course.slug}/${prev.slug}`}>
              <ChevronLeft size={16} aria-hidden="true" /> Previous
            </Link>
          )}
          {next && (
            <Link className="btn btn-primary" style={{ flex: 1 }} href={`/learn/${course.slug}/${next.slug}`}>
              Up next <ChevronRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}

type ServerRow = { position_seconds: number; watch_seconds: number; is_completed: boolean; manually_incomplete: boolean };
function fromRow(r: ServerRow): ProgressState {
  return { positionSeconds: r.position_seconds, watchSeconds: r.watch_seconds, completed: r.is_completed, manuallyIncomplete: r.manually_incomplete };
}

/** Private notes, autosaved a second after typing stops. */
function Notes({ lessonId, demo }: { lessonId: string; demo: boolean }) {
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const loaded = useRef(false);
  const key = `note:${lessonId}`;

  useEffect(() => {
    loaded.current = false;
    const load: Promise<{ body: string }> = demo
      ? Promise.resolve({ body: readLocal(key) })
      : fetch(`/api/lessons/${lessonId}/note`).then((r) => (r.ok ? r.json() : { body: '' }));
    void load.then((d) => {
      setBody(d.body);
      loaded.current = true;
    });
  }, [lessonId, demo, key]);

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      setStatus('saving');
      if (demo) {
        try {
          localStorage.setItem(key, body);
        } catch {
          // Storage unavailable (private window); notes simply won't persist.
        }
        setStatus('saved');
        return;
      }
      void fetch(`/api/lessons/${lessonId}/note`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body }) }).then((r) =>
        setStatus(r.ok ? 'saved' : 'error'),
      );
    }, 1000);
    return () => clearTimeout(t);
  }, [body, demo, key, lessonId]);

  return (
    <div>
      <label htmlFor="notes" className="sr-only">
        Your notes
      </label>
      <textarea id="notes" className="notes" placeholder="Jot down measurements, tricks, or anything to remember. Only you can see these." value={body} onChange={(e) => setBody(e.target.value)} maxLength={20000} />
      <div className="muted small" aria-live="polite">
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Could not save' : ''}
      </div>
    </div>
  );
}

function readLocal(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
