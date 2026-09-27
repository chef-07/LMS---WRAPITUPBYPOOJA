'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { DEMO, asAdmin, dbError, fail, type ActionResult } from '@/lib/action';
import { isDemo } from '@/lib/supabase/config';
import { parseClock } from '@/lib/format';
import { SLUG_RE, looksLikeUrl, slugify, uniqueSlug } from '@/lib/slug';
import { youtubeId } from '@/lib/youtube';

const uuid = z.guid();
const title = z.string().trim().min(2, 'Give it a title of at least 2 letters.').max(120);
const DEPTS = ['artisan', 'sales', 'social', 'ops'] as const;
const LEVELS = ['Trainee', 'Associate', 'Senior', 'Master'] as const;

function done<T>(data?: T): ActionResult<T> {
  revalidatePath('/', 'layout');
  return { ok: true, data };
}

function firstIssue(e: z.ZodError): string {
  return e.issues[0]?.message ?? 'Check the form.';
}

/* ── Courses ────────────────────────────────────────────────────────────── */

export async function createCourse(input: { title: string; schoolId: string }): Promise<ActionResult<{ id: string }>> {
  if (isDemo) return DEMO;
  const parsed = z.object({ title, schoolId: uuid }).safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  return asAdmin(async ({ sb }) => {
    const { data: taken } = await sb.from('courses').select('slug');
    const slug = uniqueSlug(slugify(parsed.data.title) || 'course', (taken ?? []).map((r) => r.slug));
    const { data: last } = await sb.from('courses').select('rank').order('rank', { ascending: false }).limit(1);
    const { data, error } = await sb
      .from('courses')
      .insert({ title: parsed.data.title, slug, school_id: parsed.data.schoolId, rank: (last?.[0]?.rank ?? 0) + 1 })
      .select('id')
      .single();
    if (error) return dbError(error);
    // Every course starts with one module so the first lesson has a home.
    await sb.from('modules').insert({ course_id: data.id, title: 'Module 1', rank: 1 });
    return done({ id: data.id });
  });
}

const CourseFields = z
  .object({
    id: uuid,
    title,
    slug: z.string().trim().toLowerCase().max(60),
    summary: z.string().trim().max(600),
    level: z.enum(LEVELS),
    schoolId: uuid,
    instructor: z.string().trim().min(1, 'Add who teaches it.').max(80),
    departments: z.array(z.enum(DEPTS)).max(4),
  })
  .strict();

export async function updateCourse(input: z.input<typeof CourseFields>): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = CourseFields.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const f = parsed.data;
  if (looksLikeUrl(f.slug)) return fail('The web address looks like a link. Paste YouTube links into a lesson instead.');
  if (!SLUG_RE.test(f.slug)) return fail('Web address: use lowercase letters, numbers and dashes only.');
  return asAdmin(async ({ sb }) => {
    const { data, error } = await sb
      .from('courses')
      .update({ title: f.title, slug: f.slug, summary: f.summary, level: f.level, school_id: f.schoolId, instructor_name: f.instructor, departments: f.departments, updated_at: new Date().toISOString() })
      .eq('id', f.id)
      .select('id');
    if (error) return dbError(error);
    if (!data?.length) return fail('Course not found.');
    return done();
  });
}

export async function setCoursePublished(input: { id: string; published: boolean }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = z.object({ id: uuid, published: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    if (parsed.data.published) {
      const { count } = await sb.from('lessons').select('id', { count: 'exact', head: true }).eq('course_id', parsed.data.id).eq('is_published', true);
      if (!count) return fail('Add at least one published lesson before publishing the course.');
    }
    const { data, error } = await sb.from('courses').update({ is_published: parsed.data.published, updated_at: new Date().toISOString() }).eq('id', parsed.data.id).select('id');
    if (error) return dbError(error);
    if (!data?.length) return fail('Course not found.');
    return done();
  });
}

export async function deleteCourse(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = z.object({ id: uuid }).safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { data, error } = await sb.from('courses').delete().eq('id', parsed.data.id).select('id');
    if (error) return dbError(error);
    if (!data?.length) return fail('Course not found.');
    return done();
  });
}

/* ── Modules ────────────────────────────────────────────────────────────── */

export async function addModule(input: { courseId: string; title: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = z.object({ courseId: uuid, title }).safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  return asAdmin(async ({ sb }) => {
    const { data: last } = await sb.from('modules').select('rank').eq('course_id', parsed.data.courseId).order('rank', { ascending: false }).limit(1);
    const { error } = await sb.from('modules').insert({ course_id: parsed.data.courseId, title: parsed.data.title, rank: (last?.[0]?.rank ?? 0) + 1 });
    if (error) return dbError(error);
    return done();
  });
}

export async function updateModule(input: { id: string; title: string; dripDays: number }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = z.object({ id: uuid, title, dripDays: z.number().int().min(0, 'Days can’t be negative.').max(365) }).safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  return asAdmin(async ({ sb }) => {
    const { data, error } = await sb.from('modules').update({ title: parsed.data.title, drip_days: parsed.data.dripDays }).eq('id', parsed.data.id).select('id');
    if (error) return dbError(error);
    if (!data?.length) return fail('Module not found.');
    return done();
  });
}

export async function deleteModule(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = z.object({ id: uuid }).safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { data, error } = await sb.from('modules').delete().eq('id', parsed.data.id).select('id');
    if (error) return dbError(error);
    if (!data?.length) return fail('Module not found.');
    return done();
  });
}

/** Swap with the neighbour above or below, then renumber 1..n so ranks stay tidy. */
async function move(
  sb: Parameters<Parameters<typeof asAdmin>[0]>[0]['sb'],
  table: 'modules' | 'lessons',
  parentCol: 'course_id' | 'module_id',
  id: string,
  dir: 'up' | 'down',
): Promise<ActionResult> {
  const { data: row } = await sb.from(table).select(`id, ${parentCol}`).eq('id', id).maybeSingle<Record<string, string>>();
  if (!row) return fail('Not found.');
  const { data: siblings } = await sb.from(table).select('id, rank').eq(parentCol, row[parentCol]!).order('rank').order('id');
  const list = (siblings ?? []).map((s) => s.id as string);
  const i = list.indexOf(id);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  [list[i], list[j]] = [list[j]!, list[i]!];
  for (const [rank, rid] of list.entries()) {
    const { error } = await sb.from(table).update({ rank: rank + 1 }).eq('id', rid);
    if (error) return dbError(error);
  }
  return done();
}

const MoveInput = z.object({ id: uuid, dir: z.enum(['up', 'down']) });

export async function moveModule(input: { id: string; dir: 'up' | 'down' }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = MoveInput.safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  return asAdmin(({ sb }) => move(sb, 'modules', 'course_id', parsed.data.id, parsed.data.dir));
}

/* ── Lessons ────────────────────────────────────────────────────────────── */

function parseVideo(raw: string | undefined): { ok: true; id: string | null } | { ok: false; error: string } {
  if (!raw || !raw.trim()) return { ok: true, id: null };
  const id = youtubeId(raw);
  return id ? { ok: true, id } : { ok: false, error: 'That doesn’t look like a YouTube link. Copy it from the Share button on YouTube.' };
}

export async function addLesson(input: { moduleId: string; title: string; video?: string }): Promise<ActionResult<{ id: string }>> {
  if (isDemo) return DEMO;
  const parsed = z.object({ moduleId: uuid, title, video: z.string().max(500).optional() }).safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const video = parseVideo(parsed.data.video);
  if (!video.ok) return fail(video.error);
  return asAdmin(async ({ sb }) => {
    const { data: mod } = await sb.from('modules').select('id, course_id').eq('id', parsed.data.moduleId).maybeSingle();
    if (!mod) return fail('Module not found.');
    const [{ data: taken }, { data: last }] = await Promise.all([
      sb.from('lessons').select('slug').eq('course_id', mod.course_id),
      sb.from('lessons').select('rank').eq('module_id', mod.id).order('rank', { ascending: false }).limit(1),
    ]);
    const slug = uniqueSlug(slugify(parsed.data.title), (taken ?? []).map((r) => r.slug));
    const { data, error } = await sb
      .from('lessons')
      .insert({ module_id: mod.id, course_id: mod.course_id, slug, title: parsed.data.title, video_id: video.id, rank: (last?.[0]?.rank ?? 0) + 1 })
      .select('id')
      .single();
    if (error) return dbError(error);
    return done({ id: data.id });
  });
}

const LessonFields = z
  .object({
    id: uuid,
    title,
    slug: z.string().trim().toLowerCase().max(60),
    summary: z.string().trim().max(2000),
    video: z.string().max(500),
    /** "12:30", "1:02:03", or empty to let the player report it. */
    duration: z.string().max(10),
    completionMode: z.enum(['watch', 'manual']),
    minWatchPct: z.number().int().min(10, 'Watch rule: at least 10%.').max(100, 'Watch rule: at most 100%.'),
    isPublished: z.boolean(),
  })
  .strict();

export async function updateLesson(input: z.input<typeof LessonFields>): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = LessonFields.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const f = parsed.data;
  if (looksLikeUrl(f.slug)) return fail('The web address looks like a link. Paste the YouTube link into the video box.');
  if (!SLUG_RE.test(f.slug)) return fail('Web address: use lowercase letters, numbers and dashes only.');
  const video = parseVideo(f.video);
  if (!video.ok) return fail(video.error);
  let duration: { duration_seconds: number; duration_source: 'admin' | 'browser' } | Record<string, never> = {};
  if (f.duration.trim()) {
    const secs = parseClock(f.duration);
    if (secs === null || secs <= 0 || secs > 43_200) return fail('Length: write it like 12:30 (minutes:seconds) or 1:05:00.');
    duration = { duration_seconds: secs, duration_source: 'admin' };
  }

  return asAdmin(async ({ sb }) => {
    const { data: current } = await sb.from('lessons').select('video_id, duration_source').eq('id', f.id).maybeSingle();
    if (!current) return fail('Lesson not found.');
    // A new video has a new length: clear a length the browser reported for the
    // old one so the player reports again. An admin-entered length stays.
    if (!f.duration.trim() && current.video_id !== video.id && current.duration_source === 'browser') {
      duration = { duration_seconds: 0, duration_source: 'browser' };
    }
    const { error } = await sb
      .from('lessons')
      .update({
        title: f.title,
        slug: f.slug,
        summary: f.summary,
        video_id: video.id,
        completion_mode: f.completionMode,
        min_watch_pct: f.minWatchPct / 100,
        is_published: f.isPublished,
        ...duration,
      })
      .eq('id', f.id);
    if (error) return dbError(error);
    return done();
  });
}

export async function moveLesson(input: { id: string; dir: 'up' | 'down' }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = MoveInput.safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  return asAdmin(({ sb }) => move(sb, 'lessons', 'module_id', parsed.data.id, parsed.data.dir));
}

export async function deleteLesson(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = z.object({ id: uuid }).safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { data, error } = await sb.from('lessons').delete().eq('id', parsed.data.id).select('id');
    if (error) return dbError(error);
    if (!data?.length) return fail('Lesson not found.');
    return done();
  });
}
