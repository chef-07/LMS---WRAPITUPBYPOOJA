/**
 * Quiz grading. The database function `submit_quiz` does the real grading
 * (members never receive the answer key); this mirror exists so the rule is
 * tested in one place and so demo mode can grade on the server without
 * Supabase.
 */
export type QuestionKind = 'mcq' | 'scenario';

export type KeyedOption = { id: string; label: string; isCorrect: boolean; feedback: string };
export type KeyedQuestion = { id: string; kind: QuestionKind; prompt: string; explanation: string; options: KeyedOption[] };

export type QuestionResult = {
  questionId: string;
  chosen: string | null;
  correctOptionId: string | null;
  correct: boolean;
  feedback: string | null;
  explanation: string;
};

export type QuizResult = { score: number; total: number; passed: boolean; passPct: number; results: QuestionResult[] };

/** Passing means score/total ≥ passPct, compared without rounding. */
export function isPass(score: number, total: number, passPct: number): boolean {
  if (total <= 0) return false;
  return score * 100 >= passPct * total;
}

export function gradeQuiz(questions: KeyedQuestion[], answers: Record<string, string | undefined>, passPct: number): QuizResult {
  let score = 0;
  const results = questions.map((q): QuestionResult => {
    const chosen = answers[q.id] ?? null;
    const correctOption = q.options.find((o) => o.isCorrect) ?? null;
    const chosenOption = chosen ? (q.options.find((o) => o.id === chosen) ?? null) : null;
    const correct = !!chosenOption && chosenOption.id === correctOption?.id;
    if (correct) score++;
    return {
      questionId: q.id,
      chosen: chosenOption?.id ?? null,
      correctOptionId: correctOption?.id ?? null,
      correct,
      feedback: chosenOption?.feedback || null,
      explanation: q.explanation,
    };
  });
  return { score, total: questions.length, passed: isPass(score, questions.length, passPct), passPct, results };
}

/** What Studio may save: 1–20 questions, 2–5 options each, exactly one correct. */
export function quizProblems(questions: { prompt: string; options: { label: string; isCorrect: boolean }[] }[]): string | null {
  if (questions.length === 0) return 'Add at least one question.';
  if (questions.length > 20) return 'Keep it to 20 questions or fewer.';
  for (const [i, q] of questions.entries()) {
    const n = i + 1;
    if (q.prompt.trim().length < 3) return `Question ${n}: write the question.`;
    if (q.options.length < 2) return `Question ${n}: add at least two answers.`;
    if (q.options.length > 5) return `Question ${n}: five answers at most.`;
    if (q.options.some((o) => !o.label.trim())) return `Question ${n}: one of the answers is empty.`;
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (correct !== 1) return `Question ${n}: mark exactly one answer as correct.`;
  }
  return null;
}
