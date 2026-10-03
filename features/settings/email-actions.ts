'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { DEMO, asAdmin, asMember, dbError, fail, type ActionResult } from '@/lib/action';
import { toMail } from '@/lib/email/jobs';
import { sendOne } from '@/lib/email/send';
import { firstName, type EmailPlan } from '@/lib/reminders';
import { isDemo } from '@/lib/supabase/config';

const Prefs = z.object({ reminders: z.boolean(), streak: z.boolean(), digest: z.boolean() }).strict();

/** Your own email switches. */
export async function updateEmailPrefs(input: z.input<typeof Prefs>): Promise<ActionResult> {
  if (isDemo) return DEMO;
  const p = Prefs.safeParse(input);
  if (!p.success) return fail('Check the form.');
  return asMember(async ({ sb, viewer }) => {
    const { error } = await sb.from('email_prefs').upsert({ user_id: viewer.id, ...p.data, updated_at: new Date().toISOString() });
    if (error) return dbError(error);
    revalidatePath('/settings');
    return { ok: true };
  });
}

/** Sends the admin a sample reminder, to check the email setup end to end. */
export async function sendSampleEmail(): Promise<ActionResult<{ to: string }>> {
  return asAdmin(async ({ viewer }) => {
    const name = firstName(viewer.fullName, viewer.email);
    const plan: EmailPlan = {
      userId: viewer.id,
      to: viewer.email,
      firstName: name,
      kind: 'reminder',
      subject: 'Sample reminder from Wrap It Up University',
      heading: `Good morning, ${name}`,
      intro: 'This is a sample. Your team’s reminders look like this, with their own items:',
      items: [
        { key: 'live', emoji: '🎥', text: 'Live today at 4:00 pm: Hamper finishing with Pooja.', href: '/live', timely: true },
        { key: 'redo', emoji: '🔁', text: 'Redo your practical for “Hidden tape”. Your trainer left notes on what to change.', href: '/', timely: false },
        { key: 'resume', emoji: '📚', text: 'Pick up where you left off: “Classic bow” in Box Basics.', href: '/schools', timely: false },
      ],
      cta: { label: 'Open the university', href: '/' },
    };
    const r = await sendOne(toMail(plan));
    return r.ok ? { ok: true, data: { to: viewer.email } } : fail(r.error);
  });
}
