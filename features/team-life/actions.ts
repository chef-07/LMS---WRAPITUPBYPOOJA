'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { DEMO, asAdmin, asMember, dbError, fail, type ActionResult } from '@/lib/action';
import { isDemo } from '@/lib/supabase/config';

const id = z.guid();
const DEPTS = ['artisan', 'sales', 'social', 'ops'] as const;

function done<T>(data?: T): ActionResult<T> {
  revalidatePath('/', 'layout');
  return { ok: true, data };
}
const first = (e: z.ZodError) => e.issues[0]?.message ?? 'Check the form.';

/* ── SOP library (admin) ────────────────────────────────────────────────── */

const FolderInput = z
  .object({
    id: id.optional(),
    title: z.string().trim().min(1, 'Give the folder a name.').max(80),
    emoji: z.string().trim().min(1).max(8),
    description: z.string().trim().max(300),
    departments: z.array(z.enum(DEPTS)).max(4),
  })
  .strict();

export async function saveSopFolder(input: z.input<typeof FolderInput>): Promise<ActionResult<{ id: string }>> {
  if (isDemo) return DEMO;
  const p = FolderInput.safeParse(input);
  if (!p.success) return fail(first(p.error));
  const { id: folderId, ...fields } = p.data;
  return asAdmin(async ({ sb }) => {
    if (folderId) {
      const { error } = await sb.from('sop_folders').update(fields).eq('id', folderId);
      if (error) return dbError(error);
      return done({ id: folderId });
    }
    const { data: last } = await sb.from('sop_folders').select('rank').order('rank', { ascending: false }).limit(1);
    const { data, error } = await sb.from('sop_folders').insert({ ...fields, rank: (last?.[0]?.rank ?? 0) + 1 }).select('id').single();
    if (error) return dbError(error);
    return done({ id: data.id });
  });
}

export async function deleteSopFolder(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { data: files } = await sb.from('sop_items').select('url').eq('folder_id', p.data.id).eq('kind', 'file');
    const { error } = await sb.from('sop_folders').delete().eq('id', p.data.id);
    if (error) return dbError(error);
    const paths = (files ?? []).map((f) => f.url).filter((u): u is string => !!u);
    if (paths.length) await sb.storage.from('sops').remove(paths);
    return done();
  });
}

const ItemInput = z
  .object({
    id: id.optional(),
    folderId: id,
    kind: z.enum(['template', 'steps', 'link', 'file']),
    title: z.string().trim().min(1, 'Give it a title.').max(120),
    body: z.string().trim().max(5000),
    url: z.string().trim().max(500),
    lessonId: id.nullable(),
    lessonSeconds: z.number().int().min(0).max(43_200).nullable(),
  })
  .strict();

export async function saveSopItem(input: z.input<typeof ItemInput>): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = ItemInput.safeParse(input);
  if (!p.success) return fail(first(p.error));
  const f = p.data;
  if ((f.kind === 'template' || f.kind === 'steps') && !f.body) return fail(f.kind === 'template' ? 'Write the message to copy.' : 'Add at least one step.');
  if (f.kind === 'link' && !/^https:\/\/\S+$/.test(f.url)) return fail('The link must start with https://');
  if (f.kind === 'file' && !f.url) return fail('Upload the file first.');
  const row = {
    folder_id: f.folderId,
    kind: f.kind,
    title: f.title,
    body: f.body,
    url: f.kind === 'link' || f.kind === 'file' ? f.url : null,
    lesson_id: f.lessonId,
    lesson_seconds: f.lessonId ? f.lessonSeconds : null,
    updated_at: new Date().toISOString(),
  };
  return asAdmin(async ({ sb }) => {
    if (f.id) {
      const { error } = await sb.from('sop_items').update(row).eq('id', f.id);
      if (error) return dbError(error);
    } else {
      const { data: last } = await sb.from('sop_items').select('rank').eq('folder_id', f.folderId).order('rank', { ascending: false }).limit(1);
      const { error } = await sb.from('sop_items').insert({ ...row, rank: (last?.[0]?.rank ?? 0) + 1 });
      if (error) return dbError(error);
    }
    return done();
  });
}

export async function deleteSopItem(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { data: item } = await sb.from('sop_items').select('kind, url').eq('id', p.data.id).maybeSingle();
    const { error } = await sb.from('sop_items').delete().eq('id', p.data.id);
    if (error) return dbError(error);
    if (item?.kind === 'file' && item.url) await sb.storage.from('sops').remove([item.url]);
    return done();
  });
}

export async function moveSopItem(input: { id: string; dir: 'up' | 'down' }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id, dir: z.enum(['up', 'down']) }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { data: item } = await sb.from('sop_items').select('folder_id').eq('id', p.data.id).maybeSingle();
    if (!item) return fail('Not found.');
    const { data: sib } = await sb.from('sop_items').select('id').eq('folder_id', item.folder_id).order('rank').order('id');
    const list = (sib ?? []).map((s) => s.id);
    const i = list.indexOf(p.data.id);
    const j = p.data.dir === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= list.length) return { ok: true };
    [list[i], list[j]] = [list[j]!, list[i]!];
    for (const [rank, rid] of list.entries()) await sb.from('sop_items').update({ rank: rank + 1 }).eq('id', rid);
    return done();
  });
}

/* ── Announcements ──────────────────────────────────────────────────────── */

export async function createAnnouncement(input: { title: string; body: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ title: z.string().trim().min(3, 'Give it a short headline.').max(120), body: z.string().trim().max(1000) }).strict().safeParse(input);
  if (!p.success) return fail(first(p.error));
  return asAdmin(async ({ sb, viewer }) => {
    const { error } = await sb.from('announcements').insert({ title: p.data.title, body: p.data.body, is_pinned: true, created_by: viewer.id });
    if (error) return dbError(error);
    return done();
  });
}

export async function setAnnouncementPinned(input: { id: string; pinned: boolean }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id, pinned: z.boolean() }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.from('announcements').update({ is_pinned: p.data.pinned }).eq('id', p.data.id);
    if (error) return dbError(error);
    return done();
  });
}

export async function deleteAnnouncement(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.from('announcements').delete().eq('id', p.data.id);
    if (error) return dbError(error);
    return done();
  });
}

export async function markAnnouncementRead(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asMember(async ({ sb, viewer }) => {
    const { error } = await sb.from('announcement_reads').upsert({ announcement_id: p.data.id, user_id: viewer.id }, { onConflict: 'announcement_id,user_id', ignoreDuplicates: true });
    if (error) return dbError(error);
    return done();
  });
}

/* ── Live sessions ──────────────────────────────────────────────────────── */

const LiveInput = z
  .object({
    id: id.optional(),
    title: z.string().trim().min(3, 'Give the session a title.').max(120),
    host: z.string().trim().min(1).max(80),
    description: z.string().trim().max(1000),
    startsAt: z.string().datetime({ offset: true, message: 'Pick a date and time.' }),
    durationMinutes: z.number().int().min(10, 'At least 10 minutes.').max(480),
    joinUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'The meeting link must start with https://'),
    recordingLessonId: id.nullable(),
  })
  .strict();

export async function saveLiveSession(input: z.input<typeof LiveInput>): Promise<ActionResult<{ id: string }>> {
  if (isDemo) return DEMO;
  const p = LiveInput.safeParse(input);
  if (!p.success) return fail(first(p.error));
  const f = p.data;
  const starts = new Date(f.startsAt);
  const row = {
    title: f.title,
    host_name: f.host,
    description: f.description,
    starts_at: starts.toISOString(),
    ends_at: new Date(starts.getTime() + f.durationMinutes * 60_000).toISOString(),
    join_url: f.joinUrl || null,
    recording_lesson_id: f.recordingLessonId,
  };
  return asAdmin(async ({ sb }) => {
    if (f.id) {
      const { error } = await sb.from('live_sessions').update(row).eq('id', f.id);
      if (error) return dbError(error);
      return done({ id: f.id });
    }
    const { data, error } = await sb.from('live_sessions').insert(row).select('id').single();
    if (error) return dbError(error);
    return done({ id: data.id });
  }, 'faculty');
}

export async function deleteLiveSession(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.from('live_sessions').delete().eq('id', p.data.id);
    if (error) return dbError(error);
    return done();
  }, 'faculty');
}

export async function joinLive(input: { id: string }): Promise<ActionResult<{ url: string }>> {
  if (isDemo) return { ok: true, data: { url: 'https://meet.google.com/' } };
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asMember(async ({ sb }) => {
    const { data, error } = await sb.rpc('join_live_session', { p_session: p.data.id });
    if (error) return dbError(error);
    return done({ url: data as string });
  });
}

export async function markAttendance(input: { sessionId: string; userId: string; present: boolean }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ sessionId: id, userId: id, present: z.boolean() }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.rpc('mark_attendance', { p_session: p.data.sessionId, p_user: p.data.userId, p_present: p.data.present });
    if (error) return dbError(error);
    return done();
  }, 'faculty');
}

/* ── Showcase + Wrap of the Week ────────────────────────────────────────── */

export async function createPost(input: { challengeId: string | null; caption: string; paths: string[] }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z
    .object({ challengeId: id.nullable(), caption: z.string().trim().max(500), paths: z.array(z.string().max(300)).min(1, 'Add a photo.').max(4) })
    .strict()
    .safeParse(input);
  if (!p.success) return fail(first(p.error));
  return asMember(async ({ sb, viewer }) => {
    if (p.data.paths.some((x) => !x.startsWith(`${viewer.id}/`))) return fail('Upload your own photos.');
    const { error } = await sb.from('showcase_posts').insert({ user_id: viewer.id, challenge_id: p.data.challengeId, caption: p.data.caption, photo_paths: p.data.paths });
    if (error) return error.code === '42501' ? fail('This challenge is closed. Share it on the wall instead.') : dbError(error);
    return done();
  });
}

export async function toggleReaction(input: { postId: string; emoji: string; on: boolean }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ postId: id, emoji: z.enum(['❤️', '🎀', '👏', '🔥']), on: z.boolean() }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asMember(async ({ sb, viewer }) => {
    const q = p.data.on
      ? sb.from('showcase_reactions').upsert({ post_id: p.data.postId, user_id: viewer.id, emoji: p.data.emoji }, { onConflict: 'post_id,user_id,emoji', ignoreDuplicates: true })
      : sb.from('showcase_reactions').delete().eq('post_id', p.data.postId).eq('user_id', viewer.id).eq('emoji', p.data.emoji);
    const { error } = await q;
    if (error) return dbError(error);
    return { ok: true };
  });
}

export async function deletePost(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asMember(async ({ sb }) => {
    const { data, error } = await sb.from('showcase_posts').delete().eq('id', p.data.id).select('photo_paths');
    if (error) return dbError(error);
    if (!data?.length) return fail('You can only remove your own posts.');
    await sb.storage.from('showcase').remove(data[0]!.photo_paths);
    return done();
  });
}

export async function hidePost(input: { id: string; hidden: boolean }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id, hidden: z.boolean() }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.from('showcase_posts').update({ is_hidden: p.data.hidden }).eq('id', p.data.id);
    if (error) return dbError(error);
    return done();
  }, 'faculty');
}

const ChallengeInput = z
  .object({
    id: id.optional(),
    title: z.string().trim().min(3, 'Give the challenge a title.').max(120),
    brief: z.string().trim().max(2000),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a start date.'),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick an end date.'),
  })
  .strict();

export async function saveChallenge(input: z.input<typeof ChallengeInput>): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = ChallengeInput.safeParse(input);
  if (!p.success) return fail(first(p.error));
  if (p.data.endsOn < p.data.startsOn) return fail('The end date must be after the start.');
  const row = { title: p.data.title, brief: p.data.brief, starts_on: p.data.startsOn, ends_on: p.data.endsOn };
  return asAdmin(async ({ sb }) => {
    const { error } = p.data.id ? await sb.from('challenges').update(row).eq('id', p.data.id) : await sb.from('challenges').insert(row);
    if (error) return dbError(error);
    return done();
  });
}

export async function deleteChallenge(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.from('challenges').delete().eq('id', p.data.id);
    if (error) return dbError(error);
    return done();
  });
}

export async function pickWinner(input: { challengeId: string; postId: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ challengeId: id, postId: id }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.rpc('pick_challenge_winner', { p_challenge: p.data.challengeId, p_post: p.data.postId });
    if (error) return dbError(error);
    return done();
  });
}

/* ── Lesson Q&A ─────────────────────────────────────────────────────────── */

export async function askQuestion(input: { lessonId: string; body: string; parentId: string | null }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z
    .object({ lessonId: id, body: z.string().trim().min(2, 'Write your question.').max(2000), parentId: id.nullable() })
    .strict()
    .safeParse(input);
  if (!p.success) return fail(first(p.error));
  return asMember(async ({ sb, viewer }) => {
    const { error } = await sb.from('lesson_questions').insert({ lesson_id: p.data.lessonId, user_id: viewer.id, parent_id: p.data.parentId, body: p.data.body });
    if (error) return dbError(error);
    return done();
  });
}

export async function setQuestionResolved(input: { id: string; resolved: boolean }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id, resolved: z.boolean() }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asMember(async ({ sb }) => {
    const { data, error } = await sb.from('lesson_questions').update({ is_resolved: p.data.resolved }).eq('id', p.data.id).select('id');
    if (error) return dbError(error);
    if (!data?.length) return fail('Only the person who asked, or a trainer, can do that.');
    return done();
  });
}

export async function deleteQuestion(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asMember(async ({ sb }) => {
    const { data, error } = await sb.from('lesson_questions').delete().eq('id', p.data.id).select('id');
    if (error) return dbError(error);
    if (!data?.length) return fail('You can only delete your own posts.');
    return done();
  });
}
