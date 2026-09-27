import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isDemo } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export const lessonId = z.string().uuid();

/** Reads a JSON body, including sendBeacon's text/plain one. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return JSON.parse(await req.text());
  } catch {
    return null;
  }
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Maps a Postgres error from our functions to a response. */
export function fromDbError(err: { code?: string; message: string }) {
  if (err.code === '42501') return bad('Not allowed.', 403);
  if (err.code === 'P0002') return bad('Lesson not found.', 404);
  if (err.code === 'P0001') return bad(err.message, 422);
  return bad('Something went wrong. Try again.', 500);
}

export async function withLesson(params: Promise<{ id: string }>) {
  if (isDemo) return { demo: true as const };
  const parsed = lessonId.safeParse((await params).id);
  if (!parsed.success) return { error: bad('Lesson not found.', 404) };
  return { id: parsed.data, sb: await supabaseServer() };
}
