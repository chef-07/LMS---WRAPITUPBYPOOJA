'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { DEMO, asAdmin, dbError, fail, type ActionResult } from '@/lib/action';
import { quizProblems } from '@/lib/quiz';
import { toCriteria } from '@/lib/rubric';
import { isDemo } from '@/lib/supabase/config';

function done(): ActionResult {
  revalidatePath('/', 'layout');
  return { ok: true };
}

const QuizInput = z
  .object({
    lessonId: z.guid(),
    passPct: z.number().int().min(1, 'Pass mark: at least 1%.').max(100, 'Pass mark: at most 100%.'),
    isRequired: z.boolean(),
    questions: z
      .array(
        z.object({
          kind: z.enum(['mcq', 'scenario']),
          prompt: z.string().trim().max(1000, 'Keep each question under 1000 characters.'),
          explanation: z.string().trim().max(1000),
          options: z.array(
            z.object({
              label: z.string().trim().max(300, 'Keep each answer under 300 characters.'),
              isCorrect: z.boolean(),
              feedback: z.string().trim().max(500),
            }),
          ),
        }),
      )
      .max(20),
  })
  .strict();

export async function saveQuiz(input: z.input<typeof QuizInput>): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = QuizInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the quiz.');
  const problem = quizProblems(parsed.data.questions);
  if (problem) return fail(problem);
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.rpc('admin_save_quiz', {
      p_lesson: parsed.data.lessonId,
      p_pass_pct: parsed.data.passPct,
      p_required: parsed.data.isRequired,
      p_questions: parsed.data.questions,
    });
    if (error) return dbError(error);
    return done();
  });
}

export async function deleteQuiz(input: { lessonId: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = z.object({ lessonId: z.guid() }).safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.from('quizzes').delete().eq('lesson_id', parsed.data.lessonId);
    if (error) return dbError(error);
    return done();
  });
}

const PracticalInput = z
  .object({
    lessonId: z.guid(),
    brief: z.string().trim().min(10, 'Describe what they should make, in a sentence or two.').max(2000),
    criteria: z.array(z.string().max(60)).max(8),
  })
  .strict();

export async function savePractical(input: z.input<typeof PracticalInput>): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = PracticalInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the practical.');
  const rubric = toCriteria(parsed.data.criteria);
  if (rubric.length === 0) return fail('Add at least one thing the trainer should check.');
  return asAdmin(async ({ sb }) => {
    const { data: lesson } = await sb.from('lessons').select('id, course_id').eq('id', parsed.data.lessonId).maybeSingle();
    if (!lesson) return fail('Lesson not found.');
    const { error } = await sb
      .from('assignments')
      .upsert({ lesson_id: lesson.id, course_id: lesson.course_id, brief: parsed.data.brief, rubric }, { onConflict: 'lesson_id' });
    if (error) return dbError(error);
    return done();
  });
}

export async function deletePractical(input: { lessonId: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = z.object({ lessonId: z.guid() }).safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.from('assignments').delete().eq('lesson_id', parsed.data.lessonId);
    if (error) return dbError(error);
    return done();
  });
}
