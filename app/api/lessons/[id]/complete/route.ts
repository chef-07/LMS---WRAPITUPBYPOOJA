import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bad, fromDbError, readJson, withLesson } from '@/lib/api/lesson-route';

const Body = z.object({ completed: z.boolean() }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await withLesson(params);
  if ('demo' in ctx) return NextResponse.json({ demo: true });
  if ('error' in ctx) return ctx.error;
  const body = Body.safeParse(await readJson(req));
  if (!body.success) return bad('Invalid request.');
  const { data, error } = await ctx.sb.rpc('set_lesson_completion', { p_lesson: ctx.id, p_completed: body.data.completed });
  if (error) return fromDbError(error);
  return NextResponse.json(data);
}
