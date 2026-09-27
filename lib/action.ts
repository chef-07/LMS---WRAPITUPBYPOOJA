import 'server-only';
import { getViewer } from './data';
import { isDemo } from './supabase/config';
import { supabaseServer } from './supabase/server';
import type { Viewer } from './types';

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export const DEMO = fail('Demo mode: connect Supabase to save changes.');

type Ctx = { sb: Awaited<ReturnType<typeof supabaseServer>>; viewer: Viewer };

/**
 * Runs a server action for an admin (or faculty). The database checks the
 * role again through RLS; this check just gives a clear message first.
 */
export async function asAdmin<T>(fn: (ctx: Ctx) => Promise<ActionResult<T>>, allow: 'admin' | 'faculty' = 'admin'): Promise<ActionResult<T>> {
  if (isDemo) return DEMO;
  const viewer = await getViewer();
  const allowed = viewer && (viewer.role === 'admin' || (allow === 'faculty' && viewer.role === 'trainer'));
  if (!viewer || !allowed) return fail('Only an admin can do that.');
  try {
    return await fn({ sb: await supabaseServer(), viewer });
  } catch (e) {
    console.error(e);
    return fail('Something went wrong. Try again.');
  }
}

/** Postgres error → a sentence a person can act on. */
export function dbError(err: { code?: string; message: string }): { ok: false; error: string } {
  if (err.code === '23505') return fail('That web address is already used. Pick another.');
  if (err.code === '23514') return fail('One of the values is not allowed. Check the form.');
  if (err.code === '42501') return fail('Only an admin can do that.');
  if (err.code === 'P0001') return fail(err.message);
  console.error(err);
  return fail('Could not save. Try again.');
}

/** Runs a server action for any signed-in, active team member. */
export async function asMember<T>(fn: (ctx: Ctx) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  const viewer = await getViewer();
  if (!viewer) return fail('Sign in again to continue.');
  try {
    return await fn({ sb: await supabaseServer(), viewer });
  } catch (e) {
    console.error(e);
    return fail('Something went wrong. Try again.');
  }
}
