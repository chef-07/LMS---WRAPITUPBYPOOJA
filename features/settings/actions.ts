'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { DEMO, asMember, dbError, fail, type ActionResult } from '@/lib/action';
import { SUPABASE_URL, isDemo } from '@/lib/supabase/config';

const Input = z
  .object({
    fullName: z.string().trim().min(2, 'Add your name.').max(80),
    // undefined = keep the current photo, null = remove it, a path = the photo just uploaded.
    photoPath: z.string().regex(/^[0-9a-f-]{36}\/[a-z0-9-]{1,60}\.jpg$/).nullable().optional(),
  })
  .strict();

/** Your own name and photo. Role, team and email stay admin-only (a database trigger enforces it). */
export async function updateProfile(input: z.input<typeof Input>): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = Input.safeParse(input);
  if (!p.success) return fail(p.error.issues[0]?.message ?? 'Check the form.');
  return asMember(async ({ sb, viewer }) => {
    const { fullName, photoPath } = p.data;
    if (photoPath && !photoPath.startsWith(`${viewer.id}/`)) return fail('That photo belongs to someone else.');
    const patch: { full_name: string; avatar_url?: string | null } = { full_name: fullName };
    if (photoPath !== undefined) patch.avatar_url = photoPath ? `${SUPABASE_URL}/storage/v1/object/public/avatars/${photoPath}` : null;
    const { error } = await sb.from('users').update(patch).eq('id', viewer.id);
    if (error) return dbError(error);
    if (photoPath !== undefined) {
      // Tidy up older photos in your own folder; failing here never blocks the save.
      const { data: files } = await sb.storage.from('avatars').list(viewer.id);
      const old = (files ?? []).map((f) => `${viewer.id}/${f.name}`).filter((f) => f !== photoPath);
      if (old.length) await sb.storage.from('avatars').remove(old);
    }
    revalidatePath('/', 'layout');
    return { ok: true };
  });
}
