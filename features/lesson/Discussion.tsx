'use client';
import { CheckCircle2, MessageCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { EmptyState } from '@/components/ui/primitives';
import { useAction } from '@/components/ui/useAction';
import { askQuestion, deleteQuestion, setQuestionResolved } from '@/features/team-life/actions';
import type { QaReply, QaThread } from '@/lib/team-life';

function ago(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `${Math.max(m, 1)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

export function Discussion({ lessonId, threads, viewerId, isFaculty }: { lessonId: string; threads: QaThread[]; viewerId: string; isFaculty: boolean }) {
  const [body, setBody] = useState('');
  const ask = useAction();
  return (
    <div className="col" style={{ gap: 14 }}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          ask.run(() => askQuestion({ lessonId, body, parentId: null }), () => setBody(''));
        }}
      >
        <label htmlFor="qa-ask" className="sr-only">
          Ask a question about this lesson
        </label>
        <textarea id="qa-ask" value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} placeholder="Stuck on something in this lesson? Ask here. Trainers and the team can answer." style={{ minHeight: 70 }} />
        {ask.error && <p className="notice err" role="alert" style={{ margin: 0 }}>{ask.error}</p>}
        <button className="btn btn-primary btn-sm" type="submit" disabled={ask.pending || body.trim().length < 2} style={{ alignSelf: 'flex-start' }}>
          {ask.pending ? 'Posting…' : 'Ask'}
        </button>
      </form>
      {threads.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No questions yet" body="Be the first to ask. Someone else is probably wondering the same thing." />
      ) : (
        threads.map((t) => <Thread key={t.id} t={t} lessonId={lessonId} viewerId={viewerId} isFaculty={isFaculty} />)
      )}
    </div>
  );
}

function Meta({ r, viewerId, isFaculty }: { r: QaReply; viewerId: string; isFaculty: boolean }) {
  const act = useAction();
  return (
    <div className="qa-meta">
      <b style={{ color: 'var(--ink)' }}>{r.author}</b>
      {r.isFaculty && <span className="chip tone-violet">Trainer</span>}
      <span>{ago(r.createdAt)}</span>
      {(r.authorId === viewerId || isFaculty) && (
        <ConfirmButton label="Delete post" title="Delete this post?" body="Replies to it are deleted too." confirmLabel="Delete" onConfirm={() => act.run(() => deleteQuestion({ id: r.id }))}>
          <Trash2 size={13} />
        </ConfirmButton>
      )}
    </div>
  );
}

function Thread({ t, lessonId, viewerId, isFaculty }: { t: QaThread; lessonId: string; viewerId: string; isFaculty: boolean }) {
  const [replying, setReplying] = useState(false);
  const [body, setBody] = useState('');
  const act = useAction();
  const canResolve = t.authorId === viewerId || isFaculty;
  return (
    <article className="qa-thread">
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Meta r={t} viewerId={viewerId} isFaculty={isFaculty} />
        {t.isResolved && (
          <span className="chip live">
            <CheckCircle2 size={12} aria-hidden="true" /> Answered
          </span>
        )}
      </div>
      <p className="qa-body">{t.body}</p>
      {t.replies.map((r) => (
        <div key={r.id} className="qa-reply">
          <Meta r={r} viewerId={viewerId} isFaculty={isFaculty} />
          <p className="qa-body">{r.body}</p>
        </div>
      ))}
      <div className="form-actions" style={{ marginTop: 10 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReplying((v) => !v)}>
          Reply
        </button>
        {canResolve && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={act.pending} onClick={() => act.run(() => setQuestionResolved({ id: t.id, resolved: !t.isResolved }))}>
            {t.isResolved ? 'Reopen' : 'Mark answered'}
          </button>
        )}
      </div>
      {replying && (
        <form
          className="form"
          style={{ marginTop: 10 }}
          onSubmit={(e) => {
            e.preventDefault();
            act.run(() => askQuestion({ lessonId, body, parentId: t.id }), () => {
              setBody('');
              setReplying(false);
            });
          }}
        >
          <label htmlFor={`reply-${t.id}`} className="sr-only">
            Your reply
          </label>
          <textarea id={`reply-${t.id}`} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply" style={{ minHeight: 60 }} autoFocus />
          <button className="btn btn-primary btn-sm" type="submit" disabled={act.pending || body.trim().length < 2} style={{ alignSelf: 'flex-start' }}>
            Post reply
          </button>
        </form>
      )}
      {act.error && <p className="notice err" style={{ margin: '8px 0 0' }}>{act.error}</p>}
    </article>
  );
}
