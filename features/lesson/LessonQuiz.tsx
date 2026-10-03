'use client';
import { CheckCircle2, HelpCircle, RotateCcw, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import { submitQuiz } from '@/features/assessment/actions';
import type { QuizResult } from '@/lib/quiz';
import type { LearnerQuiz } from '@/lib/types';

export function LessonQuiz({ quiz, demo }: { quiz: LearnerQuiz; demo: boolean }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [practising, setPractising] = useState(false);
  const { pending, error, run } = useAction();
  const everyAnswered = quiz.questions.every((q) => answers[q.id]);

  // Already passed and not re-taking it: a small summary.
  if (quiz.passed && !result && !practising) {
    return (
      <section className="card quiz-card">
        <h2 style={{ margin: 0, fontSize: 16 }}>
          <CheckCircle2 size={18} color="var(--turquoise-deep)" aria-hidden="true" /> Quiz passed
        </h2>
        <p className="muted small" style={{ margin: '6px 0 12px' }}>
          Best score {quiz.best?.score} of {quiz.best?.total}.
        </p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPractising(true)}>
          <RotateCcw size={14} aria-hidden="true" /> Practise again
        </button>
      </section>
    );
  }

  const res = (qid: string) => result?.results.find((r) => r.questionId === qid);

  return (
    <section className="card quiz-card" aria-labelledby={`quiz-${quiz.id}`}>
      <h2 id={`quiz-${quiz.id}`} style={{ margin: 0, fontSize: 16 }}>
        <HelpCircle size={18} color="var(--violet)" aria-hidden="true" /> Check yourself
      </h2>
      <p className="muted small" style={{ margin: '4px 0 8px' }}>
        {quiz.questions.length} {quiz.questions.length === 1 ? 'question' : 'questions'} · pass mark {quiz.passPct}%
        {quiz.isRequired && ' · unlocks the next module'}
        {quiz.attempts > 0 && !result && ` · ${quiz.attempts} ${quiz.attempts === 1 ? 'try' : 'tries'} so far`}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => submitQuiz({ quizId: quiz.id, answers }), (d) => d && setResult(d));
        }}
      >
        {quiz.questions.map((q, i) => {
          const r = res(q.id);
          return (
            <fieldset key={q.id} className="quiz-q" style={{ border: 0, margin: 0, padding: undefined }}>
              <legend className="sr-only">Question {i + 1}</legend>
              {q.kind === 'scenario' ? <p className="bubble">{q.prompt.replace(/^customer:\s*/i, '')}</p> : <p className="prompt">{i + 1}. {q.prompt}</p>}
              {q.options.map((o) => {
                const state = r ? (o.id === r.correctOptionId ? 'right' : o.id === r.chosen ? 'wrong' : '') : '';
                return (
                  <label key={o.id} className={`quiz-opt ${state}`}>
                    <input
                      type="radio"
                      name={q.id}
                      value={o.id}
                      checked={answers[q.id] === o.id}
                      disabled={!!result}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                    />
                    <span>{o.label}</span>
                  </label>
                );
              })}
              {r && (
                <p className="quiz-why">
                  {r.correct ? '✅ ' : '❌ '}
                  {r.feedback ? `${r.feedback} ` : ''}
                  {r.explanation}
                </p>
              )}
            </fieldset>
          );
        })}

        {error && (
          <p className="notice err" role="alert" style={{ margin: '8px 0' }}>
            {error}
          </p>
        )}

        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }} role="status">
            <span className={`score-pill ${result.passed ? 'pass' : 'fail'}`}>
              {result.passed ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
              {result.score} of {result.total} · {result.passed ? (quiz.passed || practising ? 'Passed' : 'Passed · +30 XP') : `Need ${result.passPct}%`}
            </span>
            {demo && <span className="muted small">Demo mode: results aren’t saved.</span>}
            {!result.passed && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setResult(null);
                  setAnswers({});
                }}
              >
                <RotateCcw size={14} aria-hidden="true" /> Try again
              </button>
            )}
          </div>
        ) : (
          <button className="btn btn-primary" type="submit" disabled={!everyAnswered || pending} style={{ width: '100%', marginTop: 4 }}>
            {pending ? 'Checking…' : everyAnswered ? 'Check my answers' : 'Answer every question'}
          </button>
        )}
      </form>
    </section>
  );
}
