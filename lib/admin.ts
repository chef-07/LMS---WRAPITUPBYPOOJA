import 'server-only';
import { notFound } from 'next/navigation';
import { getViewer } from './data';
import { demoCourses, demoSchools } from './demo-data';
import { isDemo } from './supabase/config';
import { supabaseServer } from './supabase/server';
import type { Course, Department, Role, School, Viewer } from './types';
import type { CompletionMode } from './progress';
import { riskOf, type PendingInvite, type TeamMember } from './admin-shared';

export * from './admin-shared';

/* ── Guards ─────────────────────────────────────────────────────────────── */

/** Pages: 404 for anyone who is not an admin (a trainer sees Team, not Studio). */
export async function requireAdminPage(): Promise<Viewer> {
  const v = await getViewer();
  if (!v || v.role !== 'admin') notFound();
  return v;
}

export async function requireFacultyPage(): Promise<Viewer> {
  const v = await getViewer();
  if (!v || (v.role !== 'admin' && v.role !== 'trainer')) notFound();
  return v;
}

/* ── Studio ─────────────────────────────────────────────────────────────── */

export type StudioLesson = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  videoId: string | null;
  durationSeconds: number;
  durationSource: 'browser' | 'admin';
  completionMode: CompletionMode;
  minWatchPct: number;
  isPublished: boolean;
};

export type StudioModule = { id: string; title: string; dripDays: number; lessons: StudioLesson[] };

export type StudioCourse = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: Course['level'];
  schoolId: string;
  instructor: string;
  departments: Department[];
  isPublished: boolean;
  modules: StudioModule[];
};

export type StudioRow = {
  id: string;
  slug: string;
  title: string;
  level: Course['level'];
  school: School | null;
  isPublished: boolean;
  moduleCount: number;
  lessonCount: number;
  missingVideos: number;
  departments: Department[];
};

type DbLesson = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  video_id: string | null;
  duration_seconds: number;
  duration_source: 'browser' | 'admin';
  completion_mode: CompletionMode;
  min_watch_pct: number | string;
  is_published: boolean;
  rank: number;
};
type DbModule = { id: string; title: string; drip_days: number; rank: number; lessons: DbLesson[] };
type DbCourse = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: Course['level'];
  school_id: string;
  instructor_name: string;
  departments: Department[];
  is_published: boolean;
  rank: number;
  modules: DbModule[];
};

const byRank = <T extends { rank: number }>(a: T, b: T) => a.rank - b.rank;

function fromDemo(c: Course): StudioCourse {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    level: c.level,
    schoolId: demoSchools.find((s) => s.slug === c.schoolSlug)?.id ?? '',
    instructor: c.instructor,
    departments: [],
    isPublished: true,
    modules: c.modules.map((m) => ({
      id: m.id,
      title: m.title,
      dripDays: 0,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        summary: '',
        videoId: l.videoId,
        durationSeconds: l.durationSeconds,
        durationSource: 'admin' as const,
        completionMode: 'watch' as const,
        minWatchPct: 0.8,
        isPublished: true,
      })),
    })),
  };
}

function fromDb(c: DbCourse): StudioCourse {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    level: c.level,
    schoolId: c.school_id,
    instructor: c.instructor_name,
    departments: c.departments,
    isPublished: c.is_published,
    modules: [...c.modules].sort(byRank).map((m) => ({
      id: m.id,
      title: m.title,
      dripDays: m.drip_days,
      lessons: [...m.lessons].sort(byRank).map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        summary: l.summary,
        videoId: l.video_id,
        durationSeconds: l.duration_seconds,
        durationSource: l.duration_source,
        completionMode: l.completion_mode,
        minWatchPct: Number(l.min_watch_pct),
        isPublished: l.is_published,
      })),
    })),
  };
}

const COURSE_SELECT =
  'id, slug, title, summary, level, school_id, instructor_name, departments, is_published, rank, modules(id, title, drip_days, rank, lessons(id, slug, title, summary, video_id, duration_seconds, duration_source, completion_mode, min_watch_pct, is_published, rank))';

export async function getSchoolsForStudio(): Promise<School[]> {
  if (isDemo) return demoSchools;
  const sb = await supabaseServer();
  const { data } = await sb.from('schools').select('id, slug, name, emoji, tone, blurb').order('rank');
  return (data ?? []) as School[];
}

export async function getStudioRows(): Promise<StudioRow[]> {
  const schools = await getSchoolsForStudio();
  let courses: StudioCourse[];
  if (isDemo) courses = demoCourses.map(fromDemo);
  else {
    const sb = await supabaseServer();
    const { data } = await sb.from('courses').select(COURSE_SELECT).order('rank').order('created_at');
    courses = ((data ?? []) as unknown as DbCourse[]).map(fromDb);
  }
  return courses.map((c) => {
    const lessons = c.modules.flatMap((m) => m.lessons);
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      level: c.level,
      school: schools.find((s) => s.id === c.schoolId) ?? null,
      isPublished: c.isPublished,
      moduleCount: c.modules.length,
      lessonCount: lessons.length,
      missingVideos: lessons.filter((l) => !l.videoId).length,
      departments: c.departments,
    };
  });
}

export async function getStudioCourse(id: string): Promise<StudioCourse | null> {
  if (isDemo) {
    const c = demoCourses.find((x) => x.id === id);
    return c ? fromDemo(c) : null;
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sb = await supabaseServer();
  const { data } = await sb.from('courses').select(COURSE_SELECT).eq('id', id).maybeSingle();
  return data ? fromDb(data as unknown as DbCourse) : null;
}

/* ── Team ───────────────────────────────────────────────────────────────── */

export async function getTeam(): Promise<{ members: TeamMember[]; invites: PendingInvite[] }> {
  if (isDemo) {
    const now = Date.now();
    const mk = (id: string, fullName: string, role: Role, department: Department | null, done: number, daysAgo: number | null): TeamMember => {
      const lastActivityAt = daysAgo === null ? null : new Date(now - daysAgo * 86_400_000).toISOString();
      return { id, fullName, email: `${fullName.split(' ')[0]!.toLowerCase()}@example.com`, role, department, isDisabled: false, createdAt: new Date(now - 60 * 86_400_000).toISOString(), lessonsDone: done, lastActivityAt, risk: riskOf(lastActivityAt, now) };
    };
    return {
      members: [
        mk('demo-pooja', 'Pooja', 'admin', null, 3, 0),
        mk('u1', 'Riya Sharma', 'trainer', 'artisan', 24, 1),
        mk('u2', 'Aman Verma', 'member', 'sales', 17, 9),
        mk('u3', 'Sneha Patel', 'member', 'social', 3, 30),
        mk('u4', 'Imran Khan', 'member', 'ops', 1, 50),
        mk('u5', 'Kavya Nair', 'member', 'artisan', 0, null),
      ],
      invites: [{ email: 'meera@example.com', fullName: 'Meera Joshi', role: 'member', department: 'artisan', createdAt: new Date().toISOString() }],
    };
  }

  const sb = await supabaseServer();
  const [usersRes, invitesRes, progressRes, enrollRes] = await Promise.all([
    sb.from('users').select('id, full_name, email, role, department, is_disabled, created_at').order('full_name'),
    sb.from('invites').select('email, full_name, role, department, created_at').is('accepted_at', null).order('created_at', { ascending: false }),
    sb.from('lesson_progress').select('user_id').eq('is_completed', true).limit(50_000),
    sb.from('enrollments').select('user_id, last_activity_at').limit(50_000),
  ]);

  const done: Record<string, number> = {};
  for (const p of progressRes.data ?? []) done[p.user_id] = (done[p.user_id] ?? 0) + 1;
  const last: Record<string, string> = {};
  for (const e of enrollRes.data ?? []) if (!last[e.user_id] || e.last_activity_at > last[e.user_id]!) last[e.user_id] = e.last_activity_at;

  return {
    members: (usersRes.data ?? []).map((u) => ({
      id: u.id,
      fullName: u.full_name || u.email,
      email: u.email,
      role: u.role,
      department: u.department,
      isDisabled: u.is_disabled,
      createdAt: u.created_at,
      lessonsDone: done[u.id] ?? 0,
      lastActivityAt: last[u.id] ?? null,
      risk: riskOf(last[u.id] ?? null),
    })),
    invites: (invitesRes.data ?? []).map((i) => ({ email: i.email, fullName: i.full_name, role: i.role, department: i.department, createdAt: i.created_at })),
  };
}
