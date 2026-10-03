import 'server-only';
import { one } from './assessment';
import { getCatalogue } from './data';
import { indiaToday } from './locks';
import { buildReport, type Report, type ReportInput } from './report';
import { isDemo } from './supabase/config';
import { supabaseServer } from './supabase/server';
import type { Department } from './types';
import { getCampaignsAdmin, getCohortsAdmin } from './university';

/** Loads every row the report needs (faculty can read them all through RLS). */
async function loadInput(): Promise<ReportInput> {
  const now = Date.now();
  const today = indiaToday();
  const [{ cohorts }, { campaigns }] = await Promise.all([getCohortsAdmin(), getCampaignsAdmin()]);
  const batches = cohorts.flatMap((c) => c.members.map((m) => ({ userId: m.userId, title: c.title, status: m.status, endsOn: c.endsOn })));
  const campaignRows = campaigns.flatMap((c) => c.rows.map((r) => ({ userId: r.userId, title: c.title, status: r.status, dueOn: c.dueOn })));

  if (isDemo) return demoInput(now, today, batches, campaignRows);

  const sb = await supabaseServer();
  const [users, courses, progress, events, enroll, certs, subs] = await Promise.all([
    sb.from('users').select('id, full_name, email, role, department, created_at').eq('is_disabled', false).neq('role', 'admin'),
    sb.from('courses').select('id, title, departments, rank, lessons(id, is_published)').eq('is_published', true).order('rank'),
    sb.from('lesson_progress').select('user_id, lesson_id, completed_at').eq('is_completed', true).limit(100_000),
    sb.from('activity_events').select('user_id, xp').gt('xp', 0).limit(100_000),
    sb.from('enrollments').select('user_id, last_activity_at').limit(100_000),
    sb.from('certificates').select('user_id, course_id, issued_at').limit(100_000),
    sb.from('submissions').select('id, user_id, created_at, assignments(lessons(title))').eq('status', 'submitted').order('created_at'),
  ]);
  for (const r of [users, courses, progress, events, enroll, certs, subs]) if (r.error) throw r.error;

  return {
    today,
    now,
    people: (users.data ?? []).map((u) => ({ id: u.id, name: u.full_name || u.email, email: u.email, role: u.role, department: u.department, createdAt: u.created_at })),
    courses: ((courses.data ?? []) as unknown as { id: string; title: string; departments: Department[]; lessons: { id: string; is_published: boolean }[] }[]).map((c) => ({
      id: c.id,
      title: c.title,
      departments: c.departments,
      lessonIds: c.lessons.filter((l) => l.is_published).map((l) => l.id),
    })),
    completions: (progress.data ?? []).map((p) => ({ userId: p.user_id, lessonId: p.lesson_id, completedAt: p.completed_at })),
    xp: (events.data ?? []).map((e) => ({ userId: e.user_id, xp: e.xp })),
    lastActive: (enroll.data ?? []).map((e) => ({ userId: e.user_id, at: e.last_activity_at })),
    certificates: (certs.data ?? []).map((c) => ({ userId: c.user_id, courseId: c.course_id, issuedAt: c.issued_at })),
    waitingReviews: ((subs.data ?? []) as unknown as { id: string; user_id: string; created_at: string; assignments: { lessons: { title: string } | { title: string }[] | null } | { lessons: { title: string } | { title: string }[] | null }[] | null }[]).map((s) => ({
      id: s.id,
      userId: s.user_id,
      title: one(one(s.assignments)?.lessons)?.title ?? 'Practical',
      createdAt: s.created_at,
    })),
    batches,
    campaigns: campaignRows,
  };
}

async function demoInput(now: number, today: string, batches: ReportInput['batches'], campaigns: ReportInput['campaigns']): Promise<ReportInput> {
  const { courses } = await getCatalogue();
  const ago = (d: number) => new Date(now - d * 86_400_000).toISOString();
  const people: ReportInput['people'] = [
    { id: 'u1', name: 'Riya Sharma', email: 'riya@example.com', role: 'trainer', department: 'artisan', createdAt: ago(120) },
    { id: 'u2', name: 'Aman Verma', email: 'aman@example.com', role: 'member', department: 'sales', createdAt: ago(90) },
    { id: 'u3', name: 'Sneha Patel', email: 'sneha@example.com', role: 'member', department: 'social', createdAt: ago(80) },
    { id: 'u4', name: 'Imran Khan', email: 'imran@example.com', role: 'member', department: 'ops', createdAt: ago(75) },
    { id: 'u5', name: 'Kavya Nair', email: 'kavya@example.com', role: 'member', department: 'artisan', createdAt: ago(3) },
    { id: 'u6', name: 'Meera Joshi', email: 'meera@example.com', role: 'member', department: 'artisan', createdAt: ago(12) },
  ];
  const cs = courses.map((c) => ({ id: c.id, title: c.title, departments: [] as Department[], lessonIds: c.modules.flatMap((m) => m.lessons.map((l) => l.id)) }));
  const deptOf: Record<string, Department[]> = { c2: ['artisan'], c3: ['artisan'], c4: ['artisan', 'ops'], c5: ['sales'], c6: ['social'], c7: ['ops'] };
  for (const c of cs) c.departments = deptOf[c.id] ?? [];
  // A deterministic spread: how far through their courses each person is, and when.
  const share: Record<string, number> = { u1: 0.9, u2: 0.55, u3: 0.2, u4: 0.35, u5: 0.1, u6: 0 };
  const completions: ReportInput['completions'] = [];
  let k = 0;
  for (const p of people) {
    const lessons = cs.filter((c) => c.departments.length === 0 || (p.department && c.departments.includes(p.department))).flatMap((c) => c.lessonIds);
    const n = Math.round(lessons.length * (share[p.id] ?? 0));
    for (const l of lessons.slice(0, n)) completions.push({ userId: p.id, lessonId: l, completedAt: ago((k++ * 5) % 52) });
  }
  return {
    today,
    now,
    people,
    courses: cs,
    completions,
    xp: people.map((p, i) => ({ userId: p.id, xp: [1250, 980, 120, 60, 50, 0][i] ?? 0 })),
    lastActive: [
      { userId: 'u1', at: ago(1) },
      { userId: 'u2', at: ago(9) },
      { userId: 'u3', at: ago(30) },
      { userId: 'u4', at: ago(50) },
      { userId: 'u5', at: ago(2) },
    ],
    certificates: [
      { userId: 'u1', courseId: 'c1', issuedAt: ago(40) },
      { userId: 'u1', courseId: 'c2', issuedAt: ago(20) },
      { userId: 'u1', courseId: 'c3', issuedAt: ago(6) },
      { userId: 'u2', courseId: 'c1', issuedAt: ago(15) },
    ],
    waitingReviews: [
      { id: 'demo-sub-1', userId: 'u6', title: 'The hidden-tape method', createdAt: ago(5) },
      { id: 'demo-sub-2', userId: 'u5', title: 'Sharp corners, every time', createdAt: ago(1) },
    ],
    batches,
    campaigns,
  };
}

export async function getReport(): Promise<Report> {
  return buildReport(await loadInput());
}
