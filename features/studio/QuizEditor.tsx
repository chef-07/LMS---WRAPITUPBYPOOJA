'use client';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useAction } from '@/components/ui/useAction';
import type { StudioQuiz } from '@/lib/admin';
import { deleteQuiz, saveQuiz } from './assessment-actions';

type Q = StudioQuiz['questions'][number];

const blankQuestion = (): Q => ({
  kind: 'mcq',
  prompt: '',
  explanation: '',
  options: [
    { label: '', isCorrect: true, feedback: '' },
    { label: '', isCorrect: false, feedback: '' },
  ],
});

export function QuizEditor({ lessonId, quiz }: { lessonId: string; quiz: StudioQuiz | null }) {
  const [passPct, setPassPct] = useState(quiz?.passPct ?? 70);
  const [isRequired, setIsRequired] = useState(quiz?.isRequired ?? true);
  const [questions, setQuestions] = useState<Q[]>(quiz?.questions.length ? quiz.questions : [blankQuestion()]);
  const [saved, setSaved] = useState(false);
  const save = useAction();
  const del = useAction();

  const update = (i: number, patch: Partial<Q>) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: -1 | 1) =>
    setQuestions((qs) => {
      const next = [...qs];
      const j = i + d;
      if (j < 0 || j >= next.length) return qs;
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  return (
    <div className="form">
      <div className="form-row">
        <div className="field">
          <label htmlFor={`qz-pass-${lessonId}`}>Pass mark (%)</label>
          <input id={`qz-pass-${lessonId}`} type="number" min={1} max={100} step={5} value={passPct} onChange={(e) => setPassPct(Number(e.target.value))} />
        </div>
        <div className="field">
          <span className="label">Unlocks the next module?</span>
          <label className="check" style={{ alignSelf: 'flex-start' }}>
            <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
            Required: must pass to continue
          </label>
        </div>
      </div>

      {questions.map((q, i) => (
        <fieldset key={i} className="quiz-q-edit">
          <legend className="sr-only">Question {i + 1}</legend>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <b style={{ flex: 1 }}>Question {i + 1}</b>
            <label className="sr-only" htmlFor={`qz-kind-${lessonId}-${i}`}>
              Question type
            </label>
            <select id={`qz-kind-${lessonId}-${i}`} className="pill-btn" value={q.kind} onChange={(e) => update(i, { kind: e.target.value as Q['kind'] })}>
              <option value="mcq">Question</option>
              <option value="scenario">Customer scenario</option>
            </select>
            <button type="button" className="icon-sm" aria-label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
              <ArrowUp size={16} />
            </button>
            <button type="button" className="icon-sm" aria-label={`Move question ${i + 1} down`} disabled={i === questions.length - 1} onClick={() => move(i, 1)}>
              <ArrowDown size={16} />
            </button>
            <button type="button" className="icon-sm danger" aria-label={`Remove question ${i + 1}`} disabled={questions.length === 1} onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
              <Trash2 size={16} />
            </button>
          </div>
          <div className="field">
            <label htmlFor={`qz-p-${lessonId}-${i}`}>{q.kind === 'scenario' ? 'What the customer says' : 'Question'}</label>
            <textarea
              id={`qz-p-${lessonId}-${i}`}
              value={q.prompt}
              onChange={(e) => update(i, { prompt: e.target.value })}
              placeholder={q.kind === 'scenario' ? 'Customer: “₹2,500 is too much. Can you do ₹1,500?”' : 'Which tape gives the cleanest finish?'}
              style={{ minHeight: 64 }}
            />
          </div>
          <div className="field">
            <span className="label">{q.kind === 'scenario' ? 'Possible replies (tick the best one)' : 'Answers (tick the correct one)'}</span>
            {q.options.map((o, k) => (
              <div key={k} className="opt-edit">
                <input
                  type="radio"
                  name={`qz-correct-${lessonId}-${i}`}
                  checked={o.isCorrect}
                  aria-label={`Answer ${k + 1} is correct`}
                  onChange={() => update(i, { options: q.options.map((x, m) => ({ ...x, isCorrect: m === k })) })}
                />
                <input
                  aria-label={`Answer ${k + 1}`}
                  value={o.label}
                  placeholder={`Answer ${k + 1}`}
                  onChange={(e) => update(i, { options: q.options.map((x, m) => (m === k ? { ...x, label: e.target.value } : x)) })}
                />
                <input
                  aria-label={`Feedback for answer ${k + 1}`}
                  value={o.feedback}
                  placeholder="Feedback if chosen (optional)"
                  onChange={(e) => update(i, { options: q.options.map((x, m) => (m === k ? { ...x, feedback: e.target.value } : x)) })}
                />
                <button
                  type="button"
                  className="icon-sm"
                  aria-label={`Remove answer ${k + 1}`}
                  disabled={q.options.length <= 2}
                  onClick={() => {
                    const rest = q.options.filter((_, m) => m !== k);
                    if (!rest.some((x) => x.isCorrect) && rest[0]) rest[0] = { ...rest[0], isCorrect: true };
                    update(i, { options: rest });
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            {q.options.length < 5 && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => update(i, { options: [...q.options, { label: '', isCorrect: false, feedback: '' }] })}>
                <Plus size={14} aria-hidden="true" /> Add answer
              </button>
            )}
          </div>
          <div className="field">
            <label htmlFor={`qz-x-${lessonId}-${i}`}>Why (shown after they answer)</label>
            <input id={`qz-x-${lessonId}-${i}`} value={q.explanation} onChange={(e) => update(i, { explanation: e.target.value })} placeholder="Double-sided tape hides under the fold, so photos look clean." />
          </div>
        </fieldset>
      ))}

      {questions.length < 20 && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>
          <Plus size={14} aria-hidden="true" /> Add question
        </button>
      )}

      {(save.error || del.error) && (
        <p className="notice err" role="alert" style={{ margin: 0 }}>
          {save.error ?? del.error}
        </p>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={save.pending}
          onClick={() => {
            setSaved(false);
            save.run(() => saveQuiz({ lessonId, passPct, isRequired, questions }), () => setSaved(true));
          }}
        >
          {save.pending ? 'Saving…' : 'Save quiz'}
        </button>
        {saved && !save.pending && (
          <span className="small vid-ok" role="status">
            Quiz saved
          </span>
        )}
        {quiz && (
          <ConfirmButton
            className="btn btn-ghost btn-sm"
            label="Delete quiz"
            title="Delete this quiz?"
            body="Everyone’s attempts on it go too. If it was required, the next module unlocks for everyone."
            confirmLabel="Delete quiz"
            onConfirm={() => del.run(() => deleteQuiz({ lessonId }))}
          >
            <Trash2 size={14} aria-hidden="true" /> Delete quiz
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}
