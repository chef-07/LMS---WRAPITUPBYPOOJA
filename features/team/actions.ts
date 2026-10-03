'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { DEMO, asAdmin, dbError, fail, type ActionResult } from '@/lib/action';
import { isDemo } from '@/lib/supabase/config';

const ROLES = ['admin', 'trainer', 'member'] as const;
const DEPTS = ['artisan', 'sales', 'social', 'ops'] as const;
const email = z.string().trim().toLowerCase().email('That email doesn’t look right.').max(200);
const department = z.enum(DEPTS).nullable();

function done(): ActionResult {
  revalidatePath('/admin/team');
  return { ok: true };
}

export async function inviteMember(input: { email: string; fullName: string; role: string; department: string | null }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = z
    .object({ email, fullName: z.string().trim().min(2, 'Add their name.').max(80), role: z.enum(ROLES), department })
    .safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the form.');
  const f = parsed.data;
  if (f.role === 'member' && !f.department) return fail('Pick a department so the right courses show up for them.');
  return asAdmin(async ({ sb, viewer }) => {
    const { data: existing } = await sb.from('users').select('id').eq('email', f.email).maybeSingle();
    if (existing) return fail('This person already has an account. Change their role in the list below.');
    const { error } = await sb
      .from('invites')
      .upsert({ email: f.email, full_name: f.fullName, role: f.role, department: f.department, invited_by: viewer.id, accepted_at: null });
    if (error) return dbError(error);
    return done();
  });
}

export async function revokeInvite(input: { email: string }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = z.object({ email }).safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  return asAdmin(async ({ sb }) => {
    const { error } = await sb.from('invites').delete().eq('email', parsed.data.email).is('accepted_at', null);
    if (error) return dbError(error);
    return done();
  });
}

export async function updateMember(input: { id: string; role: string; department: string | null }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = z.object({ id: z.guid(), role: z.enum(ROLES), department }).safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  return asAdmin(async ({ sb, viewer }) => {
    // Nobody locks themselves out: the university always keeps an admin.
    if (parsed.data.id === viewer.id && parsed.data.role !== 'admin') return fail('You can’t remove your own admin access.');
    const { data, error } = await sb.from('users').update({ role: parsed.data.role, department: parsed.data.department }).eq('id', parsed.data.id).select('id');
    if (error) return dbError(error);
    if (!data?.length) return fail('Team member not found.');
    return done();
  });
}

export async function setMemberDisabled(input: { id: string; disabled: boolean }): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const parsed = z.object({ id: z.guid(), disabled: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  return asAdmin(async ({ sb, viewer }) => {
    if (parsed.data.id === viewer.id) return fail('You can’t switch off your own access.');
    const { data, error } = await sb.from('users').update({ is_disabled: parsed.data.disabled }).eq('id', parsed.data.id).select('id');
    if (error) return dbError(error);
    if (!data?.length) return fail('Team member not found.');
    return done();
  });
}
