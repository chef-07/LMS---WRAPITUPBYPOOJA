import 'server-only';
import { cache } from 'react';
import { demoCompleted, demoCourses, demoLastLesson, demoSchools, demoViewer } from './demo-data';
import { isDemo } from './supabase/config';
import { supabaseServer } from './supabase/server';
import type {
  Course,
  CourseCard,
  DashboardData,
  Department,
  FirstWeekStep,
  LeaderRow,
  LessonPageData,
  LessonSummary,
  LiveSession,
  School,
  Viewer,
} from './types';

/* ── Viewer ─────────────────────────────────────────────────────────────── */

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (isDemo) return demoViewer;
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data } = await sb
    .from('users')
    .select('id, email, full_name, role, department, avatar_url, is_disabled')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (!data || data.is_disabled) return null;
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name || data.email,
    role: data.role,
    department: data.department,
    avatarUrl: data.avatar_url,
  };
});

/* ── Catalogue ──────────────────────────────────────────────────────────── */

type Catalogue = {
  schools: School[];
  courses: Course[];
  /** courseSlug → last lesson slug + time */
  last: Record<string, { lessonSlug: string; at: string | null }>;
  /** lesson id → saved position, for the "resuming at" line */
  lessonProgress: Record<string, { position: number; watch: number; completed: boolean; manuallyIncomplete: boolean }>;
};

type DbLesson = {
  id: string;
  slug: string;
  title: string;
  duration_seconds: number;
  video_id: string | null;
  rank: number;
  is_published: boolean;
};
type DbModule = { id: string; title: string; rank: number; lessons: DbLesson[] };
type DbCourse = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: Course['level'];
  instructor_name: string;
  cover_video_id: string | null;
  departments: Department[];
  rank: number;
  schools: { slug: string } | null;
  modules: DbModule[];
};

const byRank = <T extends { rank: number }>(a: T, b: T) => a.rank - b.rank;

export const getCatalogue = cache(async (): Promise<Catalogue> => {
  if (isDemo) {
    const courses = demoCourses.map((c) => ({
      ...c,
      modules: c.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => ({ ...l, completed: demoCompleted.has(l.slug) })),
      })),
    }));
    const last = Object.fromEntries(
      Object.entries(demoLastLesson).map(([course, lessonSlug], i) => [
        course,
        { lessonSlug, at: new Date(Date.now() - (i + 1) * 3_600_000 * 7).toISOString() },
      ]),
    );
    return { schools: demoSchools, courses, last, lessonProgress: {} };
  }

  const sb = await supabaseServer();
  const viewer = await getViewer();
  const [schoolsRes, coursesRes, progressRes, enrollRes] = await Promise.all([
    sb.from('schools').select('id, slug, name, emoji, tone, blurb, rank').order('rank'),
    sb
      .from('courses')
      .select(
        'id, slug, title, summary, level, instructor_name, cover_video_id, departments, rank, schools(slug), modules(id, title, rank, lessons(id, slug, title, duration_seconds, video_id, rank, is_published))',
      )
      .eq('is_published', true)
      .order('rank'),
    sb.from('lesson_progress').select('lesson_id, position_seconds, watch_seconds, is_completed, manually_incomplete').eq('user_id', viewer?.id ?? ''),
    sb.from('enrollments').select('course_id, last_activity_at, lessons:last_lesson_id(slug)').eq('user_id', viewer?.id ?? ''),
  ]);

  const lessonProgress: Catalogue['lessonProgress'] = {};
  for (const p of progressRes.data ?? []) {
    lessonProgress[p.lesson_id] = {
      position: p.position_seconds,
      watch: p.watch_seconds,
      completed: p.is_completed,
      manuallyIncomplete: p.manually_incomplete,
    };
  }

  const rows = (coursesRes.data ?? []) as unknown as DbCourse[];
  // Courses assigned to specific departments are shown to those departments
  // and to faculty; an empty list means everyone.
  const visible = rows.filter(
    (c) =>
      c.departments.length === 0 ||
      viewer?.role !== 'member' ||
      (viewer.department !== null && c.departments.includes(viewer.department)),
  );

  const courses: Course[] = visible.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    level: c.level,
    instructor: c.instructor_name,
    coverVideoId: c.cover_video_id,
    schoolSlug: c.schools?.slug ?? '',
    modules: [...c.modules].sort(byRank).map((m) => ({
      id: m.id,
      title: m.title,
      lessons: [...m.lessons]
        .filter((l) => l.is_published)
        .sort(byRank)
        .map((l) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          durationSeconds: l.duration_seconds,
          videoId: l.video_id,
          completed: lessonProgress[l.id]?.completed ?? false,
        })),
    })),
  }));

  const slugById = Object.fromEntries(courses.map((c) => [c.id, c.slug]));
  const last: Catalogue['last'] = {};
  for (const e of (enrollRes.data ?? []) as unknown as { course_id: string; last_activity_at: string; lessons: { slug: string } | null }[]) {
    const slug = slugById[e.course_id];
    if (slug && e.lessons) last[slug] = { lessonSlug: e.lessons.slug, at: e.last_activity_at };
  }

  return { schools: (schoolsRes.data ?? []) as School[], courses, last, lessonProgress };
});

function allLessons(c: Course): LessonSummary[] {
  return c.modules.flatMap((m) => m.lessons);
}

function toCard(c: Course, cat: Catalogue): CourseCard {
  const lessons = allLessons(c);
  const school = cat.schools.find((s) => s.slug === c.schoolSlug) ?? cat.schools[0]!;
  const lastSlug = cat.last[c.slug]?.lessonSlug;
  const lastLesson = lessons.find((l) => l.slug === lastSlug) ?? null;
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    level: c.level,
    school,
    instructor: c.instructor,
    coverVideoId: c.coverVideoId ?? lessons.find((l) => l.videoId)?.videoId ?? null,
    lessonCount: lessons.length,
    completedCount: lessons.filter((l) => l.completed).length,
    durationSeconds: lessons.reduce((s, l) => s + l.durationSeconds, 0),
    remainingSeconds: lessons.filter((l) => !l.completed).reduce((s, l) => s + l.durationSeconds, 0),
    lastLesson: lastLesson ? { slug: lastLesson.slug, title: lastLesson.title } : null,
    lastActivityAt: cat.last[c.slug]?.at ?? null,
  };
}

export async function getCourseCards(): Promise<{ schools: School[]; cards: CourseCard[] }> {
  const cat = await getCatalogue();
  return { schools: cat.schools, cards: cat.courses.map((c) => toCard(c, cat)) };
}

export async function getCourse(slug: string): Promise<{ course: Course; card: CourseCard } | null> {
  const cat = await getCatalogue();
  const course = cat.courses.find((c) => c.slug === slug);
  return course ? { course, card: toCard(course, cat) } : null;
}

/** The lesson to open for "Resume": the last one visited if unfinished, else the first unfinished. */
export function resumeLessonSlug(course: Course, lastSlug: string | null): string | null {
  const lessons = allLessons(course);
  const last = lessons.find((l) => l.slug === lastSlug);
  if (last && !last.completed) return last.slug;
  return (lessons.find((l) => !l.completed) ?? lessons[0])?.slug ?? null;
}

export async function getLessonPage(courseSlug: string, lessonSlug: string): Promise<LessonPageData | null> {
  const cat = await getCatalogue();
  const course = cat.courses.find((c) => c.slug === courseSlug);
  if (!course) return null;
  const lessons = allLessons(course);
  const idx = lessons.findIndex((l) => l.slug === lessonSlug);
  if (idx < 0) return null;
  const summary = lessons[idx]!;
  const moduleTitle = course.modules.find((m) => m.lessons.some((l) => l.id === summary.id))?.title ?? '';

  let detail = { summary: '', completionMode: 'watch' as const as 'watch' | 'manual', minWatchPct: 0.8 };
  if (!isDemo) {
    const sb = await supabaseServer();
    const { data } = await sb.from('lessons').select('summary, completion_mode, min_watch_pct').eq('id', summary.id).maybeSingle();
    if (data) detail = { summary: data.summary, completionMode: data.completion_mode, minWatchPct: Number(data.min_watch_pct) };
  }

  const p = cat.lessonProgress[summary.id];
  return {
    course,
    lesson: {
      id: summary.id,
      slug: summary.slug,
      title: summary.title,
      summary: detail.summary,
      videoId: summary.videoId,
      durationSeconds: summary.durationSeconds,
      completionMode: detail.completionMode,
      minWatchPct: detail.minWatchPct,
      moduleTitle,
    },
    progress: {
      positionSeconds: p?.position ?? 0,
      watchSeconds: p?.watch ?? (summary.completed ? summary.durationSeconds : 0),
      completed: summary.completed,
      manuallyIncomplete: p?.manuallyIncomplete ?? false,
    },
    prev: lessons[idx - 1] ?? null,
    next: lessons[idx + 1] ?? null,
  };
}

/* ── Dashboard ──────────────────────────────────────────────────────────── */

function lastSevenDays(): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    out.push(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d));
  }
  return out;
}

function firstWeekSteps(done: Partial<Record<FirstWeekStep['key'], boolean>>): FirstWeekStep[] {
  return [
    { key: 'profile', title: 'Say who you are', hint: 'Add your photo and department so the team knows you.', done: !!done.profile, cta: { label: 'Fill in your profile', href: '/me' } },
    { key: 'welcome', title: 'Watch the WrapItUp story', hint: 'Six minutes on how we started and what we stand for.', done: !!done.welcome, cta: { label: 'Watch now', href: '/learn/welcome-to-wrapitup/brand-story' } },
    { key: 'conduct', title: 'Read the code of conduct & hygiene', hint: 'How we handle gifts, food items and customer homes.', done: !!done.conduct, cta: { label: 'Open lesson', href: '/learn/welcome-to-wrapitup/code-of-conduct' } },
    { key: 'first_wrap', title: 'Submit your first practice wrap', hint: 'A photo of one wrapped box. A trainer replies within a day.', done: !!done.first_wrap, cta: { label: 'Start practice', href: '/schools/perfect-box-wrap' } },
    { key: 'live', title: 'Join a live training', hint: 'Meet Pooja and the team on the next call.', done: !!done.live, cta: { label: 'See sessions', href: '/live' } },
  ];
}

export async function getDashboard(): Promise<DashboardData | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  const { cards } = await getCourseCards();

  const continueCourses = cards
    .filter((c) => c.lastActivityAt && c.completedCount < c.lessonCount)
    .sort((a, b) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''));

  if (isDemo) {
    const now = Date.now();
    const upcoming: LiveSession[] = [
      { id: 'w1', title: 'Diwali hamper live demo', host: 'Pooja', startsAt: new Date(now + 2 * 86_400_000).toISOString(), endsAt: new Date(now + 2 * 86_400_000 + 3_600_000).toISOString() },
      { id: 'w2', title: 'Sales huddle: festive pricing', host: 'Pooja', startsAt: new Date(now + 5 * 86_400_000).toISOString(), endsAt: new Date(now + 5 * 86_400_000 + 2_700_000).toISOString() },
    ];
    const leaderboard: LeaderRow[] = [
      { userId: 'u1', name: 'Riya Sharma', department: 'artisan', xp: 1250 },
      { userId: 'u2', name: 'Aman Verma', department: 'sales', xp: 980 },
      { userId: 'demo-pooja', name: 'Pooja', department: null, xp: 150 },
      { userId: 'u3', name: 'Sneha Patel', department: 'social', xp: 120 },
      { userId: 'u4', name: 'Imran Khan', department: 'ops', xp: 60 },
    ];
    const minutes = [12, 0, 25, 18, 40, 8, 22];
    return {
      viewer,
      streak: { current: 3, best: 6 },
      stats: { lessonsFinished: demoCompleted.size, learningSeconds: 125 * 60, xp: 150, rank: 3 },
      activity: lastSevenDays().map((day, i) => ({ day, minutes: minutes[i] ?? 0 })),
      firstWeek: firstWeekSteps({ welcome: true }),
      continueCourses,
      upcoming,
      leaderboard,
      announcement: {
        id: 'a1',
        title: 'Diwali season starts 15 October',
        body: 'Finish "Festive Hamper Building" before then. Corporate orders open next week.',
        createdAt: new Date().toISOString(),
      },
    };
  }

  const sb = await supabaseServer();
  const days = lastSevenDays();
  const [streakRes, eventsRes, boardRes, liveRes, annRes, readRes] = await Promise.all([
    sb.rpc('my_streak').maybeSingle<{ current_streak: number; best_streak: number }>(),
    sb.from('activity_events').select('kind, xp, minutes, created_at').eq('user_id', viewer.id).order('created_at', { ascending: false }).limit(5000),
    sb.rpc('leaderboard', { p_department: null, p_limit: 50 }),
    sb.from('live_sessions').select('id, title, host_name, starts_at, ends_at').gte('ends_at', new Date().toISOString()).order('starts_at').limit(3),
    sb.from('announcements').select('id, title, body, created_at').eq('is_pinned', true).order('created_at', { ascending: false }).limit(1),
    sb.from('announcement_reads').select('announcement_id').eq('user_id', viewer.id),
  ]);

  const events = eventsRes.data ?? [];
  const perDay: Record<string, number> = {};
  let xp = 0;
  let minutesTotal = 0;
  let lessonsFinished = 0;
  for (const e of events) {
    xp += e.xp;
    minutesTotal += Number(e.minutes);
    if (e.kind === 'lesson.completed') lessonsFinished++;
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(e.created_at));
    perDay[day] = (perDay[day] ?? 0) + Number(e.minutes);
  }

  const board = (boardRes.data ?? []) as { user_id: string; full_name: string; department: Department | null; xp: number }[];
  const rankIdx = board.findIndex((r) => r.user_id === viewer.id);

  const readIds = new Set((readRes.data ?? []).map((r) => r.announcement_id));
  const ann = (annRes.data ?? []).find((a) => !readIds.has(a.id));

  const { data: me } = await sb.from('users').select('avatar_url, department').eq('id', viewer.id).maybeSingle();
  const welcome = (await getLessonDone('welcome-to-wrapitup', 'brand-story')) ?? false;
  const conduct = (await getLessonDone('welcome-to-wrapitup', 'code-of-conduct')) ?? false;

  return {
    viewer,
    streak: { current: streakRes.data?.current_streak ?? 0, best: streakRes.data?.best_streak ?? 0 },
    stats: { lessonsFinished, learningSeconds: Math.round(minutesTotal * 60), xp, rank: rankIdx >= 0 ? rankIdx + 1 : null },
    activity: days.map((day) => ({ day, minutes: Math.round(perDay[day] ?? 0) })),
    firstWeek: firstWeekSteps({ profile: !!(me?.avatar_url && me.department), welcome, conduct }),
    continueCourses,
    upcoming: (liveRes.data ?? []).map((s) => ({ id: s.id, title: s.title, host: s.host_name, startsAt: s.starts_at, endsAt: s.ends_at })),
    leaderboard: board.slice(0, 10).map((r) => ({ userId: r.user_id, name: r.full_name, department: r.department, xp: Number(r.xp) })),
    announcement: ann ? { id: ann.id, title: ann.title, body: ann.body, createdAt: ann.created_at } : null,
  };
}

async function getLessonDone(courseSlug: string, lessonSlug: string): Promise<boolean | null> {
  const cat = await getCatalogue();
  const course = cat.courses.find((c) => c.slug === courseSlug);
  const lesson = course?.modules.flatMap((m) => m.lessons).find((l) => l.slug === lessonSlug);
  return lesson ? lesson.completed : null;
}
