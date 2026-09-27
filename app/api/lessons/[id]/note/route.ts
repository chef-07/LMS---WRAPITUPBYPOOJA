import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bad, readJson, withLesson } from '@/lib/api/lesson-route';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await withLesson(params);
  if ('demo' in ctx) return NextResponse.json({ body: '' });
  if ('error' in ctx) return ctx.error;
  const { data: auth } = await ctx.sb.auth.getUser();
  const { data } = await ctx.sb.from('lesson_notes').select('body').eq('lesson_id', ctx.id).eq('user_id', auth.user?.id ?? '').maybeSingle();
  return NextResponse.json({ body: data?.body ?? '' });
}

const Body = z.object({ body: z.string().max(20_000) }).strict();

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await withLesson(params);
  if ('demo' in ctx) return NextResponse.json({ demo: true });
  if ('error' in ctx) return ctx.error;
  const body = Body.safeParse(await readJson(req));
  if (!body.success) return bad('Note is too long.');
  const { data: auth } = await ctx.sb.auth.getUser();
  if (!auth.user) return bad('Sign in first.', 401);
  const { error } = await ctx.sb
    .from('lesson_notes')
    .upsert({ user_id: auth.user.id, lesson_id: ctx.id, body: body.data.body, updated_at: new Date().toISOString() });
  if (error) return bad('Could not save your note.', 500);
  return new NextResponse(null, { status: 204 });
}
