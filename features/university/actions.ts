'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { DEMO, asAdmin, dbError, fail, type ActionResult } from '@/lib/action';
import { isDemo } from '@/lib/supabase/config';

const id = z.guid();
const DEPTS = ['artisan', 'sales', 'social', 'ops'] as const;
const LEVELS = ['Trainee', 'Associate', 'Senior', 'Master'] as const;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.');

function done<T>(data?: T): ActionResult<T> {
  revalidatePath('/', 'layout');
  return { ok: true, data };
}
const first = (e: z.ZodError) => e.issues[0]?.message ?? 'Check the form.';

/* ── Programs (admin) ───────────────────────────────────────────────────── */

const ProgramInput = z
  .object({
    id: id.optional(),
    slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Web address: lowercase letters, numbers and dashes only.').max(60),
    title: z.string().trim().min(2, 'Give the program a name.').max(120),
    emoji: z.string().trim().min(1).max(8),
    description: z.string().trim().max(1000),
    department: z.enum(DEPTS).nullable(),
    isPublished: z.boolean(),
  })
  .strict();

export async function saveProgram(input: z.input<typeof ProgramInput>): Promise<ActionResult<{ id: string }>> {
  if (isDemo) return DEMO;
  const p = ProgramInput.safeParse(input);
  if (!p.success) return fail(first(p.error));
  const { id: programId, isPublished, ...rest } = p.data;
  const fields = { ...rest, is_published: isPublished };
  return asAdmin(async ({ sb }) => {
    if (programId) {
      const { error } = await sb.from('programs').update(fields).eq('id', programId);
      if (error) return dbError(error);
      return done({ id: programId });
    }
    const { data: last } = await sb.from('programs').select('rank').order('rank', { ascending: false }).limit(1);
    const { data, error } = await sb.from('programs').insert({ ...fields, rank: (last?.[0]?.rank ?? 0) + 1 }).select('id').single();
    if (error) return dbError(error);
    return done({ id: data.id });
  });
}

export async function deleteProgram(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.from('programs').delete().eq('id', p.data.id);
    if (error) return dbError(error);
    return done();
  });
}

const LevelInput = z
  .object({
    programId: id,
    level: z.enum(LEVELS),
    title: z.string().trim().max(120),
    courseIds: z.array(id).max(30),
  })
  .strict();

/** Sets the courses of one level (in the order given). No courses removes the level. */
export async function saveProgramLevel(input: z.input<typeof LevelInput>): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = LevelInput.safeParse(input);
  if (!p.success) return fail(first(p.error));
  const { programId, level, title, courseIds } = p.data;
  return asAdmin(async ({ sb }) => {
    if (courseIds.length === 0) {
      const { error } = await sb.from('program_levels').delete().eq('program_id', programId).eq('level', level);
      if (error) return dbError(error);
      return done();
    }
    const { data: lvl, error } = await sb.from('program_levels').upsert({ program_id: programId, level, title }, { onConflict: 'program_id,level' }).select('id').single();
    if (error) return dbError(error);
    const del = await sb.from('program_level_courses').delete().eq('level_id', lvl.id);
    if (del.error) return dbError(del.error);
    const ins = await sb.from('program_level_courses').insert([...new Set(courseIds)].map((course_id, rank) => ({ level_id: lvl.id, course_id, rank })));
    if (ins.error) return dbError(ins.error);
    return done();
  });
}

/* ── Cohorts (admin) ────────────────────────────────────────────────────── */

const CohortInput = z
  .object({
    id: id.optional(),
    title: z.string().trim().min(2, 'Give the batch a name.').max(120),
    startsOn: date,
    endsOn: date,
    programId: id.nullable(),
  })
  .strict()
  .refine((c) => c.endsOn >= c.startsOn, 'The deadline can’t be before the start date.');

export async function saveCohort(input: z.input<typeof CohortInput>): Promise<ActionResult<{ id: string }>> {
  if (isDemo) return DEMO;
  const p = CohortInput.safeParse(input);
  if (!p.success) return fail(first(p.error));
  const { id: cohortId, title, startsOn, endsOn, programId } = p.data;
  const fields = { title, starts_on: startsOn, ends_on: endsOn, program_id: programId };
  return asAdmin(async ({ sb }) => {
    if (cohortId) {
      const { error } = await sb.from('cohorts').update(fields).eq('id', cohortId);
      if (error) return dbError(error);
      return done({ id: cohortId });
    }
    const { data, error } = await sb.from('cohorts').insert(fields).select('id').single();
    if (error) return dbError(error);
    return done({ id: data.id });
  });
}

export async function deleteCohort(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.from('cohorts').delete().eq('id', p.data.id);
    if (error) return dbError(error);
    return done();
  });
}

/** Puts someone in a batch (moving them out of any other), or out of every batch with cohortId null. */
export async function setCohortMember(input: { cohortId: string | null; userId: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ cohortId: id.nullable(), userId: id }).strict().safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const del = await sb.from('cohort_members').delete().eq('user_id', p.data.userId);
    if (del.error) return dbError(del.error);
    if (p.data.cohortId) {
      const { error } = await sb.from('cohort_members').insert({ cohort_id: p.data.cohortId, user_id: p.data.userId });
      if (error) return error.code === '23505' ? fail('They are already in a batch.') : dbError(error);
    }
    return done();
  });
}

/* ── Skills ─────────────────────────────────────────────────────────────── */

const SkillInput = z
  .object({
    id: id.optional(),
    name: z.string().trim().min(2, 'Give the skill a name.').max(80),
    emoji: z.string().trim().min(1).max(8),
    description: z.string().trim().max(300),
    department: z.enum(DEPTS).nullable(),
    courseIds: z.array(id).max(20),
  })
  .strict();

export async function saveSkill(input: z.input<typeof SkillInput>): Promise<ActionResult<{ id: string }>> {
  if (isDemo) return DEMO;
  const p = SkillInput.safeParse(input);
  if (!p.success) return fail(first(p.error));
  const { id: skillId, courseIds, ...fields } = p.data;
  return asAdmin(async ({ sb }) => {
    let sid = skillId;
    if (sid) {
      const { error } = await sb.from('skills').update(fields).eq('id', sid);
      if (error) return dbError(error);
    } else {
      const { data: last } = await sb.from('skills').select('rank').order('rank', { ascending: false }).limit(1);
      const { data, error } = await sb.from('skills').insert({ ...fields, rank: (last?.[0]?.rank ?? 0) + 1 }).select('id').single();
      if (error) return dbError(error);
      sid = data.id;
    }
    const del = await sb.from('skill_courses').delete().eq('skill_id', sid!);
    if (del.error) return dbError(del.error);
    if (courseIds.length) {
      const ins = await sb.from('skill_courses').insert([...new Set(courseIds)].map((course_id) => ({ skill_id: sid!, course_id })));
      if (ins.error) return dbError(ins.error);
    }
    return done({ id: sid! });
  });
}

export async function deleteSkill(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.from('skills').delete().eq('id', p.data.id);
    if (error) return dbError(error);
    return done();
  });
}

/** Trainer or admin signs someone off on a skill (or takes the sign-off back). */
export async function setSkillGrant(input: { skillId: string; userId: string; granted: boolean }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ skillId: id, userId: id, granted: z.boolean() }).strict().safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb, viewer }) => {
    const { skillId, userId, granted } = p.data;
    if (granted) {
      const { error } = await sb.from('skill_grants').insert({ skill_id: skillId, user_id: userId, granted_by: viewer.id });
      if (error && error.code !== '23505') return dbError(error);
    } else {
      const { error } = await sb.from('skill_grants').delete().eq('skill_id', skillId).eq('user_id', userId);
      if (error) return dbError(error);
    }
    return done();
  }, 'faculty');
}

/* ── Campaigns (admin) ──────────────────────────────────────────────────── */

const CampaignInput = z
  .object({
    id: id.optional(),
    title: z.string().trim().min(3, 'Give the campaign a name.').max(120),
    emoji: z.string().trim().min(1).max(8),
    description: z.string().trim().max(1000),
    dueOn: date,
    departments: z.array(z.enum(DEPTS)).max(4),
    courseIds: z.array(id).min(1, 'Pick at least one course.').max(20),
  })
  .strict();

export async function saveCampaign(input: z.input<typeof CampaignInput>): Promise<ActionResult<{ id: string }>> {
  if (isDemo) return DEMO;
  const p = CampaignInput.safeParse(input);
  if (!p.success) return fail(first(p.error));
  const { id: campaignId, courseIds, dueOn, ...rest } = p.data;
  const fields = { ...rest, due_on: dueOn };
  return asAdmin(async ({ sb }) => {
    let cid = campaignId;
    if (cid) {
      const { error } = await sb.from('campaigns').update(fields).eq('id', cid);
      if (error) return dbError(error);
    } else {
      const { data, error } = await sb.from('campaigns').insert(fields).select('id').single();
      if (error) return dbError(error);
      cid = data.id;
    }
    const del = await sb.from('campaign_courses').delete().eq('campaign_id', cid!);
    if (del.error) return dbError(del.error);
    const ins = await sb.from('campaign_courses').insert([...new Set(courseIds)].map((course_id) => ({ campaign_id: cid!, course_id })));
    if (ins.error) return dbError(ins.error);
    return done({ id: cid! });
  });
}

export async function deleteCampaign(input: { id: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = z.object({ id }).safeParse(input);
  if (!p.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.from('campaigns').delete().eq('id', p.data.id);
    if (error) return dbError(error);
    return done();
  });
}
