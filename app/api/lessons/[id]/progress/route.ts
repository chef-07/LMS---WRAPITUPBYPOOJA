import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bad, fromDbError, readJson, withLesson } from '@/lib/api/lesson-route';

const Body = z.object({ position: z.number().int().min(0).max(86_400), watched: z.number().int().min(0).max(3_600) }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await withLesson(params);
  if ('demo' in ctx) return NextResponse.json({ demo: true });
  if ('error' in ctx) return ctx.error;
  const body = Body.safeParse(await readJson(req));
  if (!body.success) return bad('Invalid progress report.');
  const { data, error } = await ctx.sb.rpc('save_lesson_progress', { p_lesson: ctx.id, p_position: body.data.position, p_watched_delta: body.data.watched });
  if (error) return fromDbError(error);
  return NextResponse.json(data);
}
