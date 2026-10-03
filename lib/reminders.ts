/**
 * Who gets a reminder email and what it says, as a pure function of one
 * database snapshot (public.cron_snapshot). Unit-tested; the cron route in
 * app/api/cron/[job]/route.ts loads the snapshot, calls planEmails() and
 * sends the result.
 *
 * - morning (about 9am India time):
 *   - a "reminder" for anyone with something to act on;
 *   - on Mondays, the weekly "digest" for admins.
 * - evening (about 7pm): a "streak" email for anyone whose streak ends
 *   tonight unless they learn today.
 *
 * Reminders go out the same day for anything time-bound (a live session
 * today, a module that opens today, a campaign 7/3/1/0 days from due).
 * Otherwise they go at most every 3 days, and a lone "pick up where you left
 * off" at most weekly, so nobody is nagged daily.
 */
import { addDays } from './locks';
import { daysBetween, paceStatus, type PaceStatus } from './pace';
import { buildReport, istDate, type ReportInput } from './report';
import type { Department, Role } from './types';

export type SnapPerson = {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: Department | null;
  createdAt: string;
  /** Drip clock: batch start, else the day they joined. */
  startOn: string;
  reminders: boolean;
  streak: boolean;
  digest: boolean;
};
export type SnapLesson = { id: string; slug: string; title: string };
export type SnapModule = { id: string; title: string; dripDays: number; lessons: SnapLesson[] };
export type SnapCourse = { id: string; slug: string; title: string; departments: Department[]; modules: SnapModule[] };

export type Snapshot = {
  /** India date. */
  today: string;
  people: SnapPerson[];
  /** Published courses, in catalogue order, with published lessons only. */
  courses: SnapCourse[];
  completions: { userId: string; lessonId: string; completedAt: string | null }[];
  /** user → India dates with any learning activity (last 60 days, ascending). */
  activityDays: Record<string, string[]>;
  xp: Record<string, number>;
  lastActive: Record<string, string>;
  certificates: { userId: string; courseId: string; issuedAt: string }[];
  waitingReviews: { id: string; userId: string; title: string; createdAt: string }[];
  redo: { userId: string; lessonId: string; title: string; since: string | null }[];
  failedQuizzes: { userId: string; lessonId: string; title: string }[];
  cohorts: { id: string; title: string; startsOn: string; endsOn: string; memberIds: string[]; courseIds: string[] }[];
  campaigns: { id: string; title: string; emoji: string; dueOn: string; startsOn: string; departments: Department[]; courseIds: string[] }[];
  live: { id: string; title: string; hostName: string; startsAt: string }[];
  emailLog: { userId: string; kind: EmailKind; sentOn: string }[];
};

export type Job = 'morning' | 'evening';
export type EmailKind = 'reminder' | 'streak' | 'digest';
/** The preference that switches each kind off. */
export const PREF_OF: Record<EmailKind, 'reminders' | 'streak' | 'digest'> = { reminder: 'reminders', streak: 'streak', digest: 'digest' };

export type Item = { key: string; emoji: string; text: string; href: string; timely: boolean; idle?: boolean };
export type EmailPlan = {
  userId: string;
  to: string;
  firstName: string;
  kind: EmailKind;
  subject: string;
  heading: string;
  intro: string;
  items: Item[];
  stats?: { label: string; value: string }[];
  cta: { label: string; href: string };
};

const MAX_ITEMS = 6;
const CAMPAIGN_DAYS = [7, 3, 1, 0];
const s = (n: number) => (n === 1 ? '' : 's');

export const firstName = (name: string, email: string) => name.trim().split(/\s+/)[0] || email.split('@')[0] || 'there';

/** "2026-10-05" → "5 Oct". */
export const shortDay = (d: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));
const clock = (iso: string) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(iso));

/** Length of the run of consecutive days ending on `endOn` (0 if endOn itself is missing). */
export function streakEndingOn(days: readonly string[], endOn: string): number {
  const set = new Set(days);
  let n = 0;
  for (let d = endOn; set.has(d); d = addDays(d, -1)) n++;
  return n;
}

type Ctx = {
  snap: Snapshot;
  now: number;
  lessonAt: Map<string, { course: SnapCourse; lesson: SnapLesson }>;
  doneBy: Map<string, Set<string>>;
  lessonsOf: (courseIds: string[]) => SnapLesson[];
};

function context(snap: Snapshot, now: number): Ctx {
  const lessonAt = new Map<string, { course: SnapCourse; lesson: SnapLesson }>();
  for (const course of snap.courses) for (const m of course.modules) for (const lesson of m.lessons) lessonAt.set(lesson.id, { course, lesson });
  const doneBy = new Map<string, Set<string>>();
  for (const c of snap.completions) {
    if (!doneBy.has(c.userId)) doneBy.set(c.userId, new Set());
    doneBy.get(c.userId)!.add(c.lessonId);
  }
  const byId = new Map(snap.courses.map((c) => [c.id, c]));
  const lessonsOf = (ids: string[]) => ids.flatMap((id) => byId.get(id)?.modules.flatMap((m) => m.lessons) ?? []);
  return { snap, now, lessonAt, doneBy, lessonsOf };
}

const href = (course: SnapCourse, lesson: SnapLesson) => `/learn/${course.slug}/${lesson.slug}`;
const assigned = (p: SnapPerson, depts: Department[]) => depts.length === 0 || (p.department !== null && depts.includes(p.department));
/** Learners: everyone but the founder/admins, who run the place. */
const isLearner = (p: SnapPerson) => p.role !== 'admin';

/** The next lesson to do: in a course already started, else the first course not finished. */
function nextLesson(ctx: Ctx, p: SnapPerson): { course: SnapCourse; lesson: SnapLesson } | null {
  const done = ctx.doneBy.get(p.id) ?? new Set<string>();
  const courses = ctx.snap.courses.filter((c) => assigned(p, c.departments));
  const todo = (c: SnapCourse) => c.modules.flatMap((m) => m.lessons).filter((l) => !done.has(l.id));
  const started = courses.find((c) => c.modules.some((m) => m.lessons.some((l) => done.has(l.id))) && todo(c).length > 0);
  const course = started ?? courses.find((c) => todo(c).length > 0);
  return course ? { course, lesson: todo(course)[0]! } : null;
}

/** Last India date with learning activity. */
function lastActiveDay(ctx: Ctx, p: SnapPerson): string | null {
  const days = ctx.snap.activityDays[p.id] ?? [];
  const a = days.at(-1) ?? null;
  const b = ctx.snap.lastActive[p.id] ? istDate(ctx.snap.lastActive[p.id]!) : null;
  return a && b ? (a > b ? a : b) : (a ?? b);
}

function lastSent(snap: Snapshot, userId: string, kind: EmailKind): string | null {
  return snap.emailLog.filter((e) => e.userId === userId && e.kind === kind).reduce<string | null>((m, e) => (m === null || e.sentOn > m ? e.sentOn : m), null);
}

/* ── Morning reminder ───────────────────────────────────────────────────── */

function reminderItems(ctx: Ctx, p: SnapPerson): Item[] {
  const { snap, now } = ctx;
  const today = snap.today;
  const items: Item[] = [];
  const done = ctx.doneBy.get(p.id) ?? new Set<string>();

  for (const l of snap.live) {
    if (Date.parse(l.startsAt) <= now) continue;
    items.push({ key: `live-${l.id}`, emoji: '🎥', text: `Live today at ${clock(l.startsAt)}: ${l.title} with ${l.hostName}.`, href: '/live', timely: true });
  }

  if (isLearner(p)) {
    for (const course of snap.courses) {
      if (!assigned(p, course.departments)) continue;
      for (const m of course.modules) {
        const first = m.lessons[0];
        if (m.dripDays > 0 && first && addDays(p.startOn, m.dripDays) === today) {
          items.push({ key: `drip-${m.id}`, emoji: '🔓', text: `New today: “${m.title}” in ${course.title} is open.`, href: href(course, first), timely: true });
        }
      }
    }

    for (const c of snap.campaigns) {
      if (!assigned(p, c.departments)) continue;
      const lessons = ctx.lessonsOf(c.courseIds);
      const finished = lessons.filter((l) => done.has(l.id)).length;
      if (lessons.length === 0 || finished >= lessons.length) continue;
      const left = daysBetween(today, c.dueOn);
      if (!(CAMPAIGN_DAYS.includes(left) || (left < 0 && left >= -7))) continue;
      const when = left < 0 ? `was due ${-left} day${s(-left)} ago` : left === 0 ? 'is due today' : `is due in ${left} day${s(left)}`;
      const next = lessons.find((l) => !done.has(l.id))!;
      const at = ctx.lessonAt.get(next.id)!;
      items.push({ key: `camp-${c.id}`, emoji: c.emoji || '✨', text: `${c.title} ${when}. You’ve done ${finished} of ${lessons.length} lessons.`, href: href(at.course, at.lesson), timely: left >= 0 });
    }

    for (const r of snap.redo) {
      if (r.userId !== p.id) continue;
      const at = ctx.lessonAt.get(r.lessonId);
      if (at) items.push({ key: `redo-${r.lessonId}`, emoji: '🔁', text: `Redo your practical for “${r.title}”. Your trainer left notes on what to change.`, href: href(at.course, at.lesson), timely: false });
    }

    for (const q of snap.failedQuizzes) {
      if (q.userId !== p.id) continue;
      const at = ctx.lessonAt.get(q.lessonId);
      if (at) items.push({ key: `quiz-${q.lessonId}`, emoji: '📝', text: `Pass the quiz in “${q.title}” to open the next module.`, href: href(at.course, at.lesson), timely: false });
    }

    const batch = snap.cohorts.find((c) => c.memberIds.includes(p.id));
    if (batch) {
      const lessons = ctx.lessonsOf(batch.courseIds);
      const finished = lessons.filter((l) => done.has(l.id)).length;
      const pct = lessons.length ? Math.round((finished / lessons.length) * 100) : 0;
      const status = lessons.length ? paceStatus(pct, batch.startsOn, batch.endsOn, today) : 'not-started';
      if (status === 'behind') {
        const day = daysBetween(batch.startsOn, today) + 1;
        const total = daysBetween(batch.startsOn, batch.endsOn) + 1;
        items.push({ key: `batch-${batch.id}`, emoji: '⏳', text: `${batch.title}: you’re ${pct}% through on day ${day} of ${total}. A lesson a day gets you back on track.`, href: '/', timely: false });
      } else if (status === 'overdue' && daysBetween(batch.endsOn, today) <= 30) {
        items.push({ key: `batch-${batch.id}`, emoji: '⏰', text: `${batch.title} ended on ${shortDay(batch.endsOn)} and you’re ${pct}% through. ${lessons.length - finished} lesson${s(lessons.length - finished)} to go.`, href: '/', timely: false });
      }
    }

    const last = lastActiveDay(ctx, p);
    const next = nextLesson(ctx, p);
    if (next) {
      if (!last && daysBetween(istDate(p.createdAt), today) >= 3) {
        items.push({ key: 'start', emoji: '👋', text: `Your first lesson is waiting: “${next.lesson.title}” in ${next.course.title}.`, href: href(next.course, next.lesson), timely: false, idle: true });
      } else if (last && daysBetween(last, today) >= 7) {
        items.push({ key: 'resume', emoji: '📚', text: `Pick up where you left off: “${next.lesson.title}” in ${next.course.title}.`, href: href(next.course, next.lesson), timely: false, idle: true });
      }
    }
  }

  if (p.role !== 'member') {
    const waiting = snap.waitingReviews.filter((r) => now - Date.parse(r.createdAt) >= 86_400_000);
    if (waiting.length) {
      const oldest = Math.max(...waiting.map((r) => Math.floor((now - Date.parse(r.createdAt)) / 86_400_000)));
      items.push({ key: 'reviews', emoji: '📸', text: `${waiting.length} practical${s(waiting.length)} waiting for your review (oldest ${oldest} day${s(oldest)}).`, href: '/admin/reviews', timely: false });
    }
  }

  const rank = (i: Item) => (i.timely ? 0 : i.idle ? 2 : 1);
  return items.sort((a, b) => rank(a) - rank(b)).slice(0, MAX_ITEMS);
}

function reminderPlan(ctx: Ctx, p: SnapPerson): EmailPlan | null {
  if (!p.reminders) return null;
  const items = reminderItems(ctx, p);
  if (items.length === 0) return null;
  const last = lastSent(ctx.snap, p.id, 'reminder');
  const since = last ? daysBetween(last, ctx.snap.today) : Infinity;
  if (since === 0) return null;
  const due = items.some((i) => i.timely) || (items.some((i) => !i.idle) ? since >= 3 : since >= 7);
  if (!due) return null;
  const name = firstName(p.name, p.email);
  return {
    userId: p.id,
    to: p.email,
    firstName: name,
    kind: 'reminder',
    subject: items.length === 1 ? items[0]!.text : `${name}, ${items.length} things for you today`,
    heading: `Good morning, ${name}`,
    intro: items.length === 1 ? 'One thing for you today at Wrap It Up University:' : 'Here’s what needs you today at Wrap It Up University:',
    items,
    cta: { label: 'Open the university', href: items[0]!.href },
  };
}

/* ── Evening streak saver ───────────────────────────────────────────────── */

function streakPlan(ctx: Ctx, p: SnapPerson): EmailPlan | null {
  const { today } = ctx.snap;
  if (!p.streak || lastSent(ctx.snap, p.id, 'streak') === today) return null;
  const days = ctx.snap.activityDays[p.id] ?? [];
  if (days.includes(today)) return null;
  const run = streakEndingOn(days, addDays(today, -1));
  if (run < 2) return null;
  const next = nextLesson(ctx, p);
  if (!next) return null;
  const name = firstName(p.name, p.email);
  return {
    userId: p.id,
    to: p.email,
    firstName: name,
    kind: 'streak',
    subject: `Keep your ${run}-day streak going 🔥`,
    heading: `${run} days in a row, ${name} 🔥`,
    intro: run === 6 ? 'One lesson before midnight makes it 7 days and earns the 7-day streak badge.' : 'One lesson before midnight keeps your streak going.',
    items: [{ key: 'next', emoji: '▶️', text: `Up next: “${next.lesson.title}” in ${next.course.title}.`, href: href(next.course, next.lesson), timely: true }],
    cta: { label: 'Keep my streak', href: href(next.course, next.lesson) },
  };
}

/* ── Monday digest for admins ───────────────────────────────────────────── */

/** Batch and campaign pace for every learner, as the admin pages show it. */
export function paceRows(snap: Snapshot): { batches: ReportInput['batches']; campaigns: ReportInput['campaigns'] } {
  const ctx = context(snap, 0);
  const learners = snap.people.filter(isLearner);
  const byId = new Map(learners.map((p) => [p.id, p]));
  const pctOf = (userId: string, lessons: SnapLesson[]) => {
    const done = ctx.doneBy.get(userId);
    return lessons.length ? Math.round((lessons.filter((l) => done?.has(l.id)).length / lessons.length) * 100) : 0;
  };
  const batches = snap.cohorts.flatMap((c) => {
    const lessons = ctx.lessonsOf(c.courseIds);
    return c.memberIds
      .filter((id) => byId.has(id))
      .map((userId) => ({ userId, title: c.title, endsOn: c.endsOn, status: (lessons.length ? paceStatus(pctOf(userId, lessons), c.startsOn, c.endsOn, snap.today) : 'not-started') as PaceStatus }));
  });
  const campaigns = snap.campaigns.flatMap((c) => {
    const lessons = ctx.lessonsOf(c.courseIds);
    return learners.filter((p) => assigned(p, c.departments)).map((p) => ({ userId: p.id, title: c.title, dueOn: c.dueOn, status: paceStatus(pctOf(p.id, lessons), c.startsOn, c.dueOn, snap.today) }));
  });
  return { batches, campaigns };
}

export function toReportInput(snap: Snapshot, now: number): ReportInput {
  return {
    today: snap.today,
    now,
    people: snap.people.filter(isLearner).map((p) => ({ id: p.id, name: p.name || p.email, email: p.email, role: p.role, department: p.department, createdAt: p.createdAt })),
    courses: snap.courses.map((c) => ({ id: c.id, title: c.title, departments: c.departments, lessonIds: c.modules.flatMap((m) => m.lessons.map((l) => l.id)) })),
    completions: snap.completions,
    xp: Object.entries(snap.xp).map(([userId, xp]) => ({ userId, xp })),
    lastActive: Object.entries(snap.lastActive).map(([userId, at]) => ({ userId, at })),
    certificates: snap.certificates,
    waitingReviews: snap.waitingReviews,
    ...paceRows(snap),
  };
}

function digestPlans(ctx: Ctx): EmailPlan[] {
  const { snap, now } = ctx;
  const { today } = snap;
  if (new Date(`${today}T00:00:00Z`).getUTCDay() !== 1) return [];
  const learners = snap.people.filter(isLearner);
  if (learners.length === 0) return [];
  const from = addDays(today, -7);
  const inWeek = (iso: string | null) => !!iso && istDate(iso) >= from && istDate(iso) < today;
  const ids = new Set(learners.map((p) => p.id));
  const active = learners.filter((p) => (snap.activityDays[p.id] ?? []).some((d) => d >= from && d < today)).length;
  const lessons = snap.completions.filter((c) => ids.has(c.userId) && inWeek(c.completedAt)).length;
  const certs = snap.certificates.filter((c) => ids.has(c.userId) && inWeek(c.issuedAt)).length;
  const report = buildReport(toReportInput(snap, now));
  const items: Item[] = report.attention.slice(0, MAX_ITEMS).map((a) => ({ key: a.key, emoji: a.severity === 'high' ? '🔴' : '🟡', text: `${a.who}: ${a.what}.`, href: a.href, timely: false }));
  const more = report.attention.length - items.length;

  return snap.people
    .filter((p) => p.role === 'admin' && p.digest && (lastSent(snap, p.id, 'digest') ?? '') < addDays(today, -6))
    .map((p) => {
      const name = firstName(p.name, p.email);
      return {
        userId: p.id,
        to: p.email,
        firstName: name,
        kind: 'digest' as const,
        subject: `Your team last week: ${lessons} lesson${s(lessons)}, ${active} of ${learners.length} learning`,
        heading: `Your team last week, ${name}`,
        intro: items.length
          ? `A few people could use a word from you${more > 0 ? ` (the top ${items.length} of ${report.attention.length})` : ''}:`
          : 'Everyone is on track. Nothing needs you this week.',
        items,
        stats: [
          { label: 'Learned last week', value: `${active} of ${learners.length}` },
          { label: 'Lessons finished', value: String(lessons) },
          { label: 'Certificates', value: String(certs) },
          { label: 'Practicals waiting', value: String(report.kpis.waitingReviews) },
        ],
        cta: { label: 'Open Reports', href: '/admin/reports' },
      };
    });
}

/* ── Entry point ────────────────────────────────────────────────────────── */

export function planEmails(snap: Snapshot, job: Job, now: number): EmailPlan[] {
  const ctx = context(snap, now);
  const plans =
    job === 'evening'
      ? snap.people.map((p) => streakPlan(ctx, p))
      : [...snap.people.map((p) => reminderPlan(ctx, p)), ...digestPlans(ctx)];
  return plans.filter((p): p is EmailPlan => p !== null);
}
