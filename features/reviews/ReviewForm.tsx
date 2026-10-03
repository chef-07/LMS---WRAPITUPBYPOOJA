'use client';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import { reviewSubmission } from '@/features/assessment/actions';
import { SCORE_LABELS } from '@/lib/rubric';

export function ReviewForm({ submissionId, rubric }: { submissionId: string; rubric: { key: string; label: string }[] }) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const { pending, error, run } = useAction();
  const complete = rubric.every((c) => scores[c.key]);

  const decide = (decision: 'approved' | 'redo') => run(() => reviewSubmission({ submissionId, scores, comment, decision }), () => router.push('/admin/reviews'));

  return (
    <section className="card form" aria-label="Score this wrap">
      <h2 style={{ margin: 0, fontSize: 16 }}>Score it</h2>
      {rubric.map((c) => (
        <div key={c.key} className="field">
          <span className="label" id={`crit-${c.key}`}>
            {c.label}
            {scores[c.key] && <span className="muted"> · {SCORE_LABELS[scores[c.key]!]}</span>}
          </span>
          <div className="score-btns" role="group" aria-labelledby={`crit-${c.key}`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-pressed={scores[c.key] === n} aria-label={`${n}: ${SCORE_LABELS[n]}`} onClick={() => setScores((s) => ({ ...s, [c.key]: n }))}>
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="field">
        <label htmlFor="rv-comment">Comment</label>
        <textarea id="rv-comment" value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} placeholder="What’s great, and one thing to improve. Required for a redo." />
      </div>
      {error && (
        <p className="notice err" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn-primary" disabled={!complete || pending} onClick={() => decide('approved')}>
          <CheckCircle2 size={17} aria-hidden="true" /> Approve
        </button>
        <button type="button" className="btn btn-ghost" disabled={!complete || pending} onClick={() => decide('redo')}>
          <RotateCcw size={16} aria-hidden="true" /> Ask for a redo
        </button>
        {!complete && <span className="muted small">Score every point first.</span>}
      </div>
    </section>
  );
}
