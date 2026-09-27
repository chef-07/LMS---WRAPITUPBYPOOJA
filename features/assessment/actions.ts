'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { DEMO, asAdmin, asMember, dbError, fail, type ActionResult } from '@/lib/action';
import { demoQuizzes } from '@/lib/demo-assessment';
import { gradeQuiz, type QuizResult } from '@/lib/quiz';
import { isDemo } from '@/lib/supabase/config';

const id = z.string().min(1).max(64);

function done<T>(data?: T): ActionResult<T> {
  revalidatePath('/', 'layout');
  return { ok: true, data };
}

/* ── Quiz ───────────────────────────────────────────────────────────────── */

const QuizInput = z.object({ quizId: id, answers: z.record(z.string().max(64), z.string().max(64)) }).strict();

export async function submitQuiz(input: z.input<typeof QuizInput>): Promise<ActionResult<QuizResult>> {
  const parsed = QuizInput.safeParse(input);
  if (!parsed.success) return fail('Invalid answers.');
  if (isDemo) {
    // Demo grading still happens here on the server; the key never ships.
    const q = demoQuizzes.find((x) => x.id === parsed.data.quizId);
    if (!q) return fail('Quiz not found.');
    return { ok: true, data: gradeQuiz(q.questions, parsed.data.answers, q.passPct) };
  }
  if (!z.guid().safeParse(parsed.data.quizId).success) return fail('Quiz not found.');
  return asMember(async ({ sb }) => {
    const { data, error } = await sb.rpc('submit_quiz', { p_quiz: parsed.data.quizId, p_answers: parsed.data.answers });
    if (error) return dbError(error);
    return done(data as QuizResult);
  });
}

/* ── Practical ──────────────────────────────────────────────────────────── */

const PracticalInput = z
  .object({
    assignmentId: z.guid(),
    paths: z.array(z.string().max(300)).max(5),
    link: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'The link must start with https://'),
    note: z.string().trim().max(1000),
  })
  .strict();

export async function submitPractical(input: z.input<typeof PracticalInput>): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = PracticalInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the form.');
  const f = parsed.data;
  if (!f.paths.length && !f.link) return fail('Add at least one photo, or a video link.');
  return asMember(async ({ sb }) => {
    const { error } = await sb.rpc('submit_practical', { p_assignment: f.assignmentId, p_paths: f.paths, p_link: f.link, p_note: f.note });
    if (error) return dbError(error);
    return done();
  });
}

/* ── Review (trainers and admins) ───────────────────────────────────────── */

const ReviewInput = z
  .object({
    submissionId: z.guid(),
    scores: z.record(z.string().max(60), z.number().int().min(1).max(5)),
    comment: z.string().trim().max(2000),
    decision: z.enum(['approved', 'redo']),
  })
  .strict();

export async function reviewSubmission(input: z.input<typeof ReviewInput>): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = ReviewInput.safeParse(input);
  if (!parsed.success) return fail('Score every point from 1 to 5.');
  const f = parsed.data;
  if (f.decision === 'redo' && f.comment.length < 3) return fail('Tell them what to fix, so the redo is better.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.rpc('review_submission', { p_submission: f.submissionId, p_scores: f.scores, p_comment: f.comment, p_decision: f.decision });
    if (error) return dbError(error);
    return done();
  }, 'faculty');
}
