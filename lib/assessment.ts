import 'server-only';
import { demoPracticals, demoQuizzes } from './demo-assessment';
import { moduleLocks } from './locks';
import { isDemo } from './supabase/config';
import { supabaseServer } from './supabase/server';
import type {
  Course,
  CourseAssessment,
  LearnerPractical,
  LearnerQuiz,
  PendingItem,
  PracticalSubmission,
  SubmissionStatus,
  Viewer,
} from './types';

/** PostgREST returns one-to-one embeds as an object, older versions as an array. */
export function one<T>(x: T | T[] | null | undefined): T | null {
  if (Array.isArray(x)) return x[0] ?? null;
  return x ?? null;
}

const isFaculty = (v: Viewer) => v.role === 'admin' || v.role === 'trainer';

/* ── Course-level: locks, badges, certificate progress ──────────────────── */

export async function getCourseAssessment(course: Course, viewer: Viewer): Promise<CourseAssessment> {
  const lessons = course.modules.flatMap((m) => m.lessons);
  const moduleOf = new Map(course.modules.flatMap((m) => m.lessons.map((l) => [l.id, m.id] as const)));

  let quizzes: { id: string; lessonId: string; required: boolean; hasQuestions: boolean }[] = [];
  let passed = new Set<string>();
  let practicals: { id: string; lessonId: string }[] = [];
  const latestStatus = new Map<string, SubmissionStatus>();
  let certificate: CourseAssessment['certificate'] = null;

  if (isDemo) {
    quizzes = demoQuizzes
      .map((q) => ({ id: q.id, lessonId: lessons.find((l) => l.slug === q.lessonSlug)?.id ?? '', required: q.isRequired, hasQuestions: true }))
      .filter((q) => q.lessonId);
    practicals = demoPracticals
      .map((p) => ({ id: p.id, lessonId: lessons.find((l) => l.slug === p.lessonSlug)?.id ?? '' }))
      .filter((p) => p.lessonId);
  } else {
    const sb = await supabaseServer();
    const [qRes, aRes, pRes, sRes, cRes] = await Promise.all([
      sb.from('quizzes').select('id, lesson_id, is_required, quiz_questions(id)').eq('course_id', course.id),
      sb.from('quiz_attempts').select('quiz_id').eq('user_id', viewer.id).eq('passed', true),
      sb.from('assignments').select('id, lesson_id').eq('course_id', course.id),
      sb.from('submissions').select('assignment_id, status, created_at').eq('user_id', viewer.id).eq('course_id', course.id).order('created_at', { ascending: false }),
      sb.from('certificates').select('code, issued_at').eq('user_id', viewer.id).eq('course_id', course.id).maybeSingle(),
    ]);
    quizzes = (qRes.data ?? []).map((q) => ({
      id: q.id,
      lessonId: q.lesson_id,
      required: q.is_required,
      hasQuestions: ((q.quiz_questions as unknown[] | null) ?? []).length > 0,
    }));
    passed = new Set((aRes.data ?? []).map((a) => a.quiz_id));
    practicals = (pRes.data ?? []).map((p) => ({ id: p.id, lessonId: p.lesson_id }));
    for (const s of sRes.data ?? []) if (!latestStatus.has(s.assignment_id)) latestStatus.set(s.assignment_id, s.status);
    if (cRes.data) certificate = { code: cRes.data.code, issuedAt: cRes.data.issued_at };
  }

  const liveQuizzes = quizzes.filter((q) => q.hasQuestions && lessons.some((l) => l.id === q.lessonId));
  const quizByLesson: CourseAssessment['quizByLesson'] = {};
  for (const q of liveQuizzes) quizByLesson[q.lessonId] = { quizId: q.id, required: q.required, passed: passed.has(q.id) };
  const practicalByLesson: CourseAssessment['practicalByLesson'] = {};
  for (const p of practicals) if (lessons.some((l) => l.id === p.lessonId)) practicalByLesson[p.lessonId] = { assignmentId: p.id, status: latestStatus.get(p.id) ?? null };

  // Faculty preview everything; for everyone else the database enforces the same rule.
  const lockedBy: Record<string, string> = {};
  if (!isFaculty(viewer)) {
    const locks = moduleLocks(
      course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        requiredQuizIds: liveQuizzes.filter((q) => q.required && moduleOf.get(q.lessonId) === m.id).map((q) => q.id),
      })),
      passed,
    );
    for (const m of course.modules) {
      const lock = locks[m.id];
      if (lock?.locked && lock.blockedBy) for (const l of m.lessons) lockedBy[l.id] = lock.blockedBy;
    }
  }

  const requiredQuizzes = liveQuizzes.filter((q) => q.required);
  const practicalList = Object.values(practicalByLesson);
  return {
    quizByLesson,
    practicalByLesson,
    lockedBy,
    certificate,
    progress: {
      lessons: { done: lessons.filter((l) => l.completed).length, total: lessons.length },
      quizzes: { done: requiredQuizzes.filter((q) => passed.has(q.id)).length, total: requiredQuizzes.length },
      practicals: { done: practicalList.filter((p) => p.status === 'approved').length, total: practicalList.length },
    },
  };
}

/* ── Lesson-level: the quiz and the practical ───────────────────────────── */

type RpcQuiz = { id: string; passPct: number; isRequired: boolean; questions: LearnerQuiz['questions'] };

export async function getLearnerQuiz(lessonId: string, lessonSlug: string, viewer: Viewer): Promise<LearnerQuiz | null> {
  if (isDemo) {
    const q = demoQuizzes.find((x) => x.lessonSlug === lessonSlug);
    if (!q) return null;
    return {
      id: q.id,
      passPct: q.passPct,
      isRequired: q.isRequired,
      questions: q.questions.map((qq) => ({ id: qq.id, kind: qq.kind, prompt: qq.prompt, options: qq.options.map((o) => ({ id: o.id, label: o.label })) })),
      passed: false,
      attempts: 0,
      best: null,
    };
  }
  const sb = await supabaseServer();
  const { data } = await sb.rpc('get_quiz', { p_lesson: lessonId });
  const quiz = data as RpcQuiz | null;
  if (!quiz || !quiz.questions.length) return null;
  const { data: attempts } = await sb
    .from('quiz_attempts')
    .select('score, total, passed')
    .eq('quiz_id', quiz.id)
    .eq('user_id', viewer.id)
    .order('score', { ascending: false })
    .limit(200);
  const list = attempts ?? [];
  const best = list[0] ?? null;
  return {
    ...quiz,
    passed: list.some((a) => a.passed),
    attempts: list.length,
    best: best ? { score: best.score, total: best.total } : null,
  };
}

type DbSubmission = {
  id: string;
  status: SubmissionStatus;
  created_at: string;
  photo_paths: string[];
  link: string | null;
  note: string;
  submission_reviews: DbReview | DbReview[] | null;
};
type DbReview = { scores: Record<string, number>; comment: string; decision: 'approved' | 'redo'; created_at: string; users: { full_name: string } | { full_name: string }[] | null };

/** Signed, short-lived URLs for private practical photos. */
export async function signPhotos(paths: string[]): Promise<Record<string, string>> {
  if (isDemo || paths.length === 0) return {};
  const sb = await supabaseServer();
  const { data } = await sb.storage.from('submissions').createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

export function mapSubmission(s: DbSubmission, urls: Record<string, string>): PracticalSubmission {
  const r = one(s.submission_reviews);
  return {
    id: s.id,
    status: s.status,
    createdAt: s.created_at,
    photoUrls: s.photo_paths.map((p) => urls[p]).filter((u): u is string => !!u),
    link: s.link,
    note: s.note,
    review: r
      ? { scores: r.scores ?? {}, comment: r.comment, decision: r.decision, reviewerName: one(r.users)?.full_name ?? 'Trainer', createdAt: r.created_at }
      : null,
  };
}

export const SUBMISSION_SELECT = 'id, status, created_at, photo_paths, link, note, submission_reviews(scores, comment, decision, created_at, users(full_name))';

export async function getLearnerPractical(lessonId: string, lessonSlug: string, viewer: Viewer): Promise<LearnerPractical | null> {
  if (isDemo) {
    const p = demoPracticals.find((x) => x.lessonSlug === lessonSlug);
    return p ? { id: p.id, brief: p.brief, rubric: p.rubric, submissions: [] } : null;
  }
  const sb = await supabaseServer();
  const { data: a } = await sb.from('assignments').select('id, brief, rubric').eq('lesson_id', lessonId).maybeSingle();
  if (!a) return null;
  const { data: subs } = await sb
    .from('submissions')
    .select(SUBMISSION_SELECT)
    .eq('assignment_id', a.id)
    .eq('user_id', viewer.id)
    .order('created_at', { ascending: false })
    .limit(20);
  const list = (subs ?? []) as unknown as DbSubmission[];
  const urls = await signPhotos(list.flatMap((s) => s.photo_paths));
  return { id: a.id, brief: a.brief, rubric: a.rubric, submissions: list.map((s) => mapSubmission(s, urls)) };
}

/* ── Dashboard and bell ─────────────────────────────────────────────────── */

type WithLesson = { lessons: { slug: string; title: string } | { slug: string; title: string }[] | null; courses: { slug: string; title: string } | { slug: string; title: string }[] | null };

export async function getPending(viewer: Viewer): Promise<{ pending: PendingItem[]; anySubmission: boolean }> {
  if (isDemo) {
    return {
      pending: [
        { id: 'p1', kind: 'redo', title: 'The hidden-tape method', detail: 'Riya asked for a redo: “Corners are a little soft.”', href: '/learn/perfect-box-wrap/hidden-tape' },
        { id: 'p2', kind: 'quiz', title: 'When the customer says “too expensive”', detail: 'Quiz not passed yet. Best score 0 of 1.', href: '/learn/whatsapp-sales/price-objections' },
      ],
      anySubmission: false,
    };
  }
  const sb = await supabaseServer();
  const [subsRes, attemptsRes] = await Promise.all([
    sb
      .from('submissions')
      .select('id, assignment_id, status, created_at, submission_reviews(comment), assignments(lessons(slug, title), courses(slug, title))')
      .eq('user_id', viewer.id)
      .order('created_at', { ascending: false })
      .limit(200),
    sb
      .from('quiz_attempts')
      .select('quiz_id, score, total, passed, quizzes(lessons(slug, title), courses(slug, title))')
      .eq('user_id', viewer.id)
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  const pending: PendingItem[] = [];
  const seenAssignments = new Set<string>();
  for (const s of (subsRes.data ?? []) as unknown as { id: string; assignment_id: string; status: SubmissionStatus; submission_reviews: { comment: string } | { comment: string }[] | null; assignments: WithLesson | null }[]) {
    if (seenAssignments.has(s.assignment_id)) continue;
    seenAssignments.add(s.assignment_id);
    const lesson = one(s.assignments?.lessons);
    const course = one(s.assignments?.courses);
    if (s.status === 'redo' && lesson && course) {
      const comment = one(s.submission_reviews)?.comment;
      pending.push({ id: s.id, kind: 'redo', title: lesson.title, detail: comment ? `Redo requested: “${comment}”` : 'Your trainer asked for a redo.', href: `/learn/${course.slug}/${lesson.slug}` });
    }
  }

  const byQuiz = new Map<string, { passed: boolean; best: number; total: number; ref: WithLesson | null }>();
  for (const a of (attemptsRes.data ?? []) as unknown as { quiz_id: string; score: number; total: number; passed: boolean; quizzes: WithLesson | null }[]) {
    const cur = byQuiz.get(a.quiz_id) ?? { passed: false, best: 0, total: a.total, ref: a.quizzes };
    cur.passed ||= a.passed;
    cur.best = Math.max(cur.best, a.score);
    byQuiz.set(a.quiz_id, cur);
  }
  for (const [id, q] of byQuiz) {
    const lesson = one(q.ref?.lessons);
    const course = one(q.ref?.courses);
    if (!q.passed && lesson && course) {
      pending.push({ id, kind: 'quiz', title: lesson.title, detail: `Quiz not passed yet. Best score ${q.best} of ${q.total}.`, href: `/learn/${course.slug}/${lesson.slug}` });
    }
  }
  return { pending, anySubmission: (subsRes.data ?? []).length > 0 };
}

export type BellItem = { id: string; title: string; body: string; href: string };

export async function getBellItems(viewer: Viewer): Promise<BellItem[]> {
  if (isDemo) return [];
  const sb = await supabaseServer();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const items: BellItem[] = [];
  if (isFaculty(viewer)) {
    const { count } = await sb.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted').neq('user_id', viewer.id);
    if (count) items.push({ id: 'queue', title: `${count} ${count === 1 ? 'wrap is' : 'wraps are'} waiting for review`, body: 'Open the review queue.', href: '/admin/reviews' });
  }
  const { data } = await sb
    .from('submissions')
    .select('id, status, reviewed_at, assignments(lessons(slug, title), courses(slug, title))')
    .eq('user_id', viewer.id)
    .gte('reviewed_at', since)
    .order('reviewed_at', { ascending: false })
    .limit(5);
  for (const s of (data ?? []) as unknown as { id: string; status: SubmissionStatus; assignments: WithLesson | null }[]) {
    const lesson = one(s.assignments?.lessons);
    const course = one(s.assignments?.courses);
    if (!lesson || !course) continue;
    items.push({
      id: s.id,
      title: s.status === 'approved' ? `Approved: ${lesson.title} 🎉` : `Redo requested: ${lesson.title}`,
      body: s.status === 'approved' ? '+60 XP. Lovely work.' : 'See your trainer’s notes and try again.',
      href: `/learn/${course.slug}/${lesson.slug}`,
    });
  }
  return items;
}
