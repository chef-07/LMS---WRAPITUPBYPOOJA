import 'server-only';
import { notFound } from 'next/navigation';
import { getViewer } from './data';
import { SUBMISSION_SELECT, mapSubmission, one, signPhotos } from './assessment';
import { demoPracticals, demoQuizzes } from './demo-assessment';
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

export type StudioQuiz = {
  id: string;
  passPct: number;
  isRequired: boolean;
  questions: { kind: 'mcq' | 'scenario'; prompt: string; explanation: string; options: { label: string; isCorrect: boolean; feedback: string }[] }[];
};

export type StudioPractical = { id: string; brief: string; rubric: { key: string; label: string }[] };

export type StudioLesson = {
  quiz: StudioQuiz | null;
  practical: StudioPractical | null;
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

type DbOption = { label: string; is_correct: boolean; feedback: string; rank: number; id: string };
type DbQuestion = { kind: 'mcq' | 'scenario'; prompt: string; explanation: string; rank: number; id: string; quiz_options: DbOption[] };
type DbQuiz = { id: string; pass_pct: number; is_required: boolean; quiz_questions: DbQuestion[] };
type DbPractical = { id: string; brief: string; rubric: { key: string; label: string }[] };

type DbLesson = {
  quizzes: DbQuiz | DbQuiz[] | null;
  assignments: DbPractical | DbPractical[] | null;
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

const byRank = <T extends { rank: number; id: string }>(a: T, b: T) => a.rank - b.rank || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function toStudioQuiz(q: DbQuiz | null): StudioQuiz | null {
  if (!q) return null;
  return {
    id: q.id,
    passPct: q.pass_pct,
    isRequired: q.is_required,
    questions: [...q.quiz_questions].sort(byRank).map((qq) => ({
      kind: qq.kind,
      prompt: qq.prompt,
      explanation: qq.explanation,
      options: [...qq.quiz_options].sort(byRank).map((o) => ({ label: o.label, isCorrect: o.is_correct, feedback: o.feedback })),
    })),
  };
}

function demoStudioQuiz(slug: string): StudioQuiz | null {
  const q = demoQuizzes.find((x) => x.lessonSlug === slug);
  if (!q) return null;
  return {
    id: q.id,
    passPct: q.passPct,
    isRequired: q.isRequired,
    questions: q.questions.map((qq) => ({ kind: qq.kind, prompt: qq.prompt, explanation: qq.explanation, options: qq.options.map((o) => ({ label: o.label, isCorrect: o.isCorrect, feedback: o.feedback })) })),
  };
}

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
        quiz: demoStudioQuiz(l.slug),
        practical: demoPracticals.find((p) => p.lessonSlug === l.slug) ?? null,
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
        quiz: toStudioQuiz(one(l.quizzes)),
        practical: one(l.assignments),
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
  'id, slug, title, summary, level, school_id, instructor_name, departments, is_published, rank, modules(id, title, drip_days, rank, lessons(id, slug, title, summary, video_id, duration_seconds, duration_source, completion_mode, min_watch_pct, is_published, rank, quizzes(id, pass_pct, is_required, quiz_questions(id, kind, prompt, explanation, rank, quiz_options(id, label, is_correct, feedback, rank))), assignments(id, brief, rubric)))';

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

/* ── Reviews ────────────────────────────────────────────────────────────── */

export type ReviewQueueItem = {
  id: string;
  createdAt: string;
  learner: string;
  department: Department | null;
  lessonTitle: string;
  courseTitle: string;
  photoCount: number;
  attempt: number;
};

export type ReviewDetail = {
  id: string;
  status: 'submitted' | 'approved' | 'redo';
  createdAt: string;
  learner: string;
  department: Department | null;
  lessonTitle: string;
  lessonHref: string;
  courseTitle: string;
  brief: string;
  rubric: { key: string; label: string }[];
  photoUrls: string[];
  link: string | null;
  note: string;
  isOwn: boolean;
  history: import('./types').PracticalSubmission[];
};

type Named = { full_name: string; department: Department | null };
type Ref = { title: string; slug: string };
type DbQueueRow = {
  id: string;
  user_id: string;
  assignment_id: string;
  created_at: string;
  photo_paths: string[];
  users: Named | Named[] | null;
  assignments: { lessons: Ref | Ref[] | null; courses: Ref | Ref[] | null } | null;
};

export async function getReviewQueue(): Promise<ReviewQueueItem[]> {
  if (isDemo) {
    return [
      { id: 'demo-sub', createdAt: new Date(Date.now() - 5 * 3_600_000).toISOString(), learner: 'Kavya Nair', department: 'artisan', lessonTitle: 'The hidden-tape method', courseTitle: 'The Perfect Box Wrap', photoCount: 2, attempt: 1 },
    ];
  }
  const sb = await supabaseServer();
  const { data } = await sb
    .from('submissions')
    .select('id, user_id, assignment_id, created_at, photo_paths, users(full_name, department), assignments(lessons(title, slug), courses(title, slug))')
    .eq('status', 'submitted')
    .order('created_at', { ascending: true })
    .limit(200);
  const rows = (data ?? []) as unknown as DbQueueRow[];
  // Which try is this? Count earlier submissions for the same person and practical.
  const { data: all } = await sb.from('submissions').select('user_id, assignment_id, created_at').limit(5000);
  return rows.map((r) => {
    const user = one(r.users);
    return {
      id: r.id,
      createdAt: r.created_at,
      learner: user?.full_name ?? 'Team member',
      department: user?.department ?? null,
      lessonTitle: one(r.assignments?.lessons)?.title ?? 'Lesson',
      courseTitle: one(r.assignments?.courses)?.title ?? '',
      photoCount: r.photo_paths.length,
      attempt: (all ?? []).filter((a) => a.user_id === r.user_id && a.assignment_id === r.assignment_id && a.created_at <= r.created_at).length,
    };
  });
}

export async function getReviewDetail(id: string, viewerId: string): Promise<ReviewDetail | null> {
  if (isDemo) {
    if (id !== 'demo-sub') return null;
    const p = demoPracticals[0]!;
    return {
      id,
      status: 'submitted',
      createdAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
      learner: 'Kavya Nair',
      department: 'artisan',
      lessonTitle: 'The hidden-tape method',
      lessonHref: '/learn/perfect-box-wrap/hidden-tape',
      courseTitle: 'The Perfect Box Wrap',
      brief: p.brief,
      rubric: p.rubric,
      photoUrls: [],
      link: null,
      note: 'Took me 14 minutes. The side seam was tricky.',
      isOwn: false,
      history: [],
    };
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sb = await supabaseServer();
  const { data } = await sb
    .from('submissions')
    .select('id, user_id, assignment_id, status, created_at, photo_paths, link, note, users(full_name, department), assignments(brief, rubric, lessons(title, slug), courses(title, slug))')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as DbQueueRow & {
    status: ReviewDetail['status'];
    link: string | null;
    note: string;
    assignments: { brief: string; rubric: ReviewDetail['rubric']; lessons: Ref | Ref[] | null; courses: Ref | Ref[] | null } | null;
  };
  const { data: hist } = await sb
    .from('submissions')
    .select(SUBMISSION_SELECT)
    .eq('user_id', row.user_id)
    .eq('assignment_id', row.assignment_id)
    .neq('id', row.id)
    .order('created_at', { ascending: false })
    .limit(20);
  const history = (hist ?? []) as unknown as Parameters<typeof mapSubmission>[0][];
  const urls = await signPhotos([...row.photo_paths, ...history.flatMap((h) => h.photo_paths)]);
  const user = one(row.users);
  const lesson = one(row.assignments?.lessons);
  const course = one(row.assignments?.courses);
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    learner: user?.full_name ?? 'Team member',
    department: user?.department ?? null,
    lessonTitle: lesson?.title ?? 'Lesson',
    lessonHref: lesson && course ? `/learn/${course.slug}/${lesson.slug}` : '/',
    courseTitle: course?.title ?? '',
    brief: row.assignments?.brief ?? '',
    rubric: row.assignments?.rubric ?? [],
    photoUrls: row.photo_paths.map((p) => urls[p]).filter((u): u is string => !!u),
    link: row.link,
    note: row.note,
    isOwn: row.user_id === viewerId,
    history: history.map((h) => mapSubmission(h, urls)),
  };
}
