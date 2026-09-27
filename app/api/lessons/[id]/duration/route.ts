import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bad, fromDbError, readJson, withLesson } from '@/lib/api/lesson-route';

const Body = z.object({ seconds: z.number().int().min(1).max(43_200) }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await withLesson(params);
  if ('demo' in ctx) return NextResponse.json({ demo: true });
  if ('error' in ctx) return ctx.error;
  const body = Body.safeParse(await readJson(req));
  if (!body.success) return bad('Invalid duration.');
  const { error } = await ctx.sb.rpc('report_lesson_duration', { p_lesson: ctx.id, p_seconds: body.data.seconds });
  if (error) return fromDbError(error);
  return new NextResponse(null, { status: 204 });
}
