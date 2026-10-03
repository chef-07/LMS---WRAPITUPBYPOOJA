import 'server-only';
import { one } from './assessment';
import { normaliseCode } from './certificate';
import { isDemo } from './supabase/config';
import { supabaseServer } from './supabase/server';
import type { Viewer } from './types';

export type VerifiedCertificate = { code: string; fullName: string; courseTitle: string; schoolName: string; issuedAt: string };

export const DEMO_CERT_CODE = 'WIU-0DE0-2026';

/** Public check: works signed out. */
export async function verifyCertificate(input: string): Promise<VerifiedCertificate | null> {
  const code = normaliseCode(input);
  if (!code) return null;
  if (isDemo) {
    return code === DEMO_CERT_CODE
      ? { code, fullName: 'Riya Sharma', courseTitle: 'The Perfect Box Wrap', schoolName: 'School of Wrapping & Craft', issuedAt: new Date().toISOString() }
      : null;
  }
  const sb = await supabaseServer();
  const { data } = await sb.rpc('verify_certificate', { p_code: code });
  const row = (data as { full_name: string; course_title: string; school_name: string; issued_at: string }[] | null)?.[0];
  return row ? { code, fullName: row.full_name, courseTitle: row.course_title, schoolName: row.school_name, issuedAt: row.issued_at } : null;
}

export type MyProfile = {
  counts: Record<string, number>;
  bestStreak: number;
  xp: number;
  lessonsDone: number;
  quizzesPassed: number;
  practicalsApproved: number;
  certificates: { code: string; issuedAt: string; courseTitle: string; courseSlug: string }[];
};

export async function getMyProfile(viewer: Viewer): Promise<MyProfile> {
  if (isDemo) {
    return {
      counts: { 'lesson.completed': 3, 'challenge.entered': 1 },
      bestStreak: 6,
      xp: 150,
      lessonsDone: 3,
      quizzesPassed: 0,
      practicalsApproved: 0,
      certificates: [{ code: DEMO_CERT_CODE, issuedAt: new Date().toISOString(), courseTitle: 'The Perfect Box Wrap', courseSlug: 'perfect-box-wrap' }],
    };
  }
  const sb = await supabaseServer();
  const [events, certs, streak] = await Promise.all([
    sb.from('activity_events').select('kind, xp').eq('user_id', viewer.id).gt('xp', 0).limit(10000),
    sb.from('certificates').select('code, issued_at, courses(title, slug)').eq('user_id', viewer.id).order('issued_at', { ascending: false }),
    sb.rpc('my_streak').maybeSingle<{ current_streak: number; best_streak: number }>(),
  ]);
  const ev = events.data ?? [];
  const count = (k: string) => ev.filter((e) => e.kind === k).length;
  const counts: Record<string, number> = {};
  for (const e of ev) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
  return {
    counts,
    bestStreak: streak.data?.best_streak ?? 0,
    xp: ev.reduce((s, e) => s + e.xp, 0),
    lessonsDone: count('lesson.completed'),
    quizzesPassed: count('quiz.passed'),
    practicalsApproved: count('assignment.approved'),
    certificates: ((certs.data ?? []) as unknown as { code: string; issued_at: string; courses: { title: string; slug: string } | { title: string; slug: string }[] | null }[]).map((c) => ({
      code: c.code,
      issuedAt: c.issued_at,
      courseTitle: one(c.courses)?.title ?? 'Course',
      courseSlug: one(c.courses)?.slug ?? '',
    })),
  };
}

export function longDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(iso));
}
