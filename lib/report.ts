/**
 * The Reports page, as a pure function of plain rows (unit-tested). The
 * loader in lib/reports.ts fetches the rows; nothing here touches the
 * database, so the numbers are easy to check by hand.
 */
import { riskOf, type Risk } from './admin-shared';
import type { PaceStatus } from './pace';
import type { Department, Role } from './types';

export type ReportInput = {
  /** India date, e.g. "2026-09-27". */
  today: string;
  now: number;
  people: { id: string; name: string; email: string; role: Role; department: Department | null; createdAt: string }[];
  /** Published courses with their published lessons. Empty departments = everyone. */
  courses: { id: string; title: string; departments: Department[]; lessonIds: string[] }[];
  completions: { userId: string; lessonId: string; completedAt: string | null }[];
  xp: { userId: string; xp: number }[];
  lastActive: { userId: string; at: string }[];
  certificates: { userId: string; courseId: string; issuedAt: string }[];
  waitingReviews: { id: string; userId: string; title: string; createdAt: string }[];
  batches: { userId: string; title: string; status: PaceStatus; endsOn: string }[];
  campaigns: { userId: string; title: string; status: PaceStatus; dueOn: string }[];
};

export type PersonRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: Department | null;
  lessonsDone: number;
  lessonsAssigned: number;
  pct: number;
  certificates: number;
  xp: number;
  lastActive: string | null;
  risk: Risk;
  batch: string | null;
  batchStatus: PaceStatus | null;
};

export type CourseRow = { id: string; title: string; assigned: number; started: number; certified: number; avgPct: number };
export type DeptRow = { key: Department | 'none'; people: number; active: number; avgPct: number; certificates: number; attention: number };
export type AttentionItem = { key: string; userId: string | null; who: string; what: string; detail: string; severity: 'high' | 'medium'; href: string };
export type Week = { start: string; lessons: number };

export type Report = {
  kpis: { learners: number; activeThisWeek: number; lessons30d: number; certificates30d: number; certificatesTotal: number; waitingReviews: number; oldestReviewDays: number | null };
  weeks: Week[];
  departments: DeptRow[];
  courses: CourseRow[];
  people: PersonRow[];
  attention: AttentionItem[];
};

const DAY = 86_400_000;
/** A timestamp as an India date. */
export const istDate = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
/** Monday of the week containing d. */
export function weekStart(d: string): string {
  const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
  return addDays(d, -((dow + 6) % 7));
}
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export function buildReport(input: ReportInput, weeksBack = 8): Report {
  const { today, now } = input;
  const done = new Map<string, Set<string>>();
  for (const c of input.completions) {
    if (!done.has(c.userId)) done.set(c.userId, new Set());
    done.get(c.userId)!.add(c.lessonId);
  }
  const xp = new Map<string, number>();
  for (const e of input.xp) xp.set(e.userId, (xp.get(e.userId) ?? 0) + e.xp);
  const last = new Map<string, string>();
  for (const a of input.lastActive) if (!last.has(a.userId) || a.at > last.get(a.userId)!) last.set(a.userId, a.at);
  const certs = new Map<string, Set<string>>();
  for (const c of input.certificates) {
    if (!certs.has(c.userId)) certs.set(c.userId, new Set());
    certs.get(c.userId)!.add(c.courseId);
  }
  const batchOf = new Map(input.batches.map((b) => [b.userId, b]));

  const assignedTo = (dept: Department | null) => input.courses.filter((c) => c.departments.length === 0 || (dept !== null && c.departments.includes(dept)));

  const people: PersonRow[] = input.people.map((p) => {
    const lessons = assignedTo(p.department).flatMap((c) => c.lessonIds);
    const mine = done.get(p.id);
    const finished = lessons.filter((l) => mine?.has(l)).length;
    const lastAt = last.get(p.id) ?? null;
    const b = batchOf.get(p.id);
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role,
      department: p.department,
      lessonsDone: finished,
      lessonsAssigned: lessons.length,
      pct: pct(finished, lessons.length),
      certificates: certs.get(p.id)?.size ?? 0,
      xp: xp.get(p.id) ?? 0,
      lastActive: lastAt,
      risk: riskOf(lastAt, now),
      batch: b?.title ?? null,
      batchStatus: b?.status ?? null,
    };
  });

  /* Needs attention: most urgent first. */
  const attention: AttentionItem[] = [];
  const nameOf = new Map(input.people.map((p) => [p.id, p.name]));
  for (const b of input.batches) {
    if (b.status !== 'overdue' && b.status !== 'behind') continue;
    attention.push({ key: `batch-${b.userId}`, userId: b.userId, who: nameOf.get(b.userId) ?? 'Someone', what: b.status === 'overdue' ? `Missed the ${b.title} deadline` : `Behind in ${b.title}`, detail: `Finish by ${b.endsOn}`, severity: b.status === 'overdue' ? 'high' : 'medium', href: '/admin/cohorts' });
  }
  for (const c of input.campaigns) {
    const daysLeft = Math.round((Date.parse(`${c.dueOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY);
    const late = c.status === 'overdue';
    if (!late && !(c.status !== 'done' && daysLeft <= 3 && daysLeft >= 0)) continue;
    attention.push({ key: `camp-${c.title}-${c.userId}`, userId: c.userId, who: nameOf.get(c.userId) ?? 'Someone', what: late ? `Overdue: ${c.title}` : `${c.title} due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`, detail: `Due ${c.dueOn}`, severity: late ? 'high' : 'medium', href: '/admin/campaigns' });
  }
  for (const p of people) {
    const joinedDays = (now - new Date(input.people.find((x) => x.id === p.id)!.createdAt).getTime()) / DAY;
    if (p.risk === 'never' && joinedDays >= 7) attention.push({ key: `never-${p.id}`, userId: p.id, who: p.name, what: 'Hasn’t started yet', detail: `Joined ${Math.floor(joinedDays)} days ago`, severity: 'medium', href: '/admin/team' });
    if (p.risk === 'stalled' || p.risk === 'dormant') {
      const days = Math.floor((now - new Date(p.lastActive!).getTime()) / DAY);
      attention.push({ key: `quiet-${p.id}`, userId: p.id, who: p.name, what: `No learning for ${days} days`, detail: p.risk === 'dormant' ? 'Dormant' : 'Stalled', severity: p.risk === 'dormant' ? 'high' : 'medium', href: '/admin/team' });
    }
  }
  for (const r of input.waitingReviews) {
    const days = Math.floor((now - new Date(r.createdAt).getTime()) / DAY);
    if (days < 3) continue;
    attention.push({ key: `rev-${r.id}`, userId: null, who: nameOf.get(r.userId) ?? 'Someone', what: `Practical waiting ${days} days for review`, detail: r.title, severity: days >= 7 ? 'high' : 'medium', href: `/admin/reviews/${r.id}` });
  }
  attention.sort((a, b) => (a.severity === b.severity ? a.who.localeCompare(b.who) : a.severity === 'high' ? -1 : 1));

  /* Departments. */
  const keys: (Department | 'none')[] = ['artisan', 'sales', 'social', 'ops', 'none'];
  const departments: DeptRow[] = keys
    .map((key) => {
      const rows = people.filter((p) => (p.department ?? 'none') === key);
      const ids = new Set(rows.map((r) => r.id));
      return {
        key,
        people: rows.length,
        active: rows.filter((r) => r.risk === 'active').length,
        avgPct: rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0,
        certificates: rows.reduce((s, r) => s + r.certificates, 0),
        attention: new Set(attention.filter((a) => a.userId && ids.has(a.userId)).map((a) => a.userId)).size,
      };
    })
    .filter((d) => d.people > 0);

  /* Courses. */
  const courses: CourseRow[] = input.courses.map((c) => {
    const audience = people.filter((p) => c.departments.length === 0 || (p.department !== null && c.departments.includes(p.department)));
    const progress = audience.map((p) => {
      const mine = done.get(p.id);
      return c.lessonIds.filter((l) => mine?.has(l)).length;
    });
    return {
      id: c.id,
      title: c.title,
      assigned: audience.length,
      started: progress.filter((n) => n > 0).length,
      certified: audience.filter((p) => certs.get(p.id)?.has(c.id)).length,
      avgPct: audience.length ? Math.round(progress.reduce((s, n) => s + pct(n, c.lessonIds.length), 0) / audience.length) : 0,
    };
  });

  /* Weekly lessons finished (Monday weeks, India time). */
  const thisWeek = weekStart(today);
  const weeks: Week[] = Array.from({ length: weeksBack }, (_, i) => ({ start: addDays(thisWeek, -7 * (weeksBack - 1 - i)), lessons: 0 }));
  const learnerIds = new Set(input.people.map((p) => p.id));
  for (const c of input.completions) {
    if (!c.completedAt || !learnerIds.has(c.userId)) continue;
    const start = weekStart(istDate(c.completedAt));
    const w = weeks.find((x) => x.start === start);
    if (w) w.lessons += 1;
  }

  const since30 = now - 30 * DAY;
  const learnerCerts = input.certificates.filter((c) => learnerIds.has(c.userId));
  const oldest = input.waitingReviews.reduce<number | null>((m, r) => {
    const d = Math.floor((now - new Date(r.createdAt).getTime()) / DAY);
    return m === null || d > m ? d : m;
  }, null);

  return {
    kpis: {
      learners: people.length,
      activeThisWeek: people.filter((p) => p.risk === 'active').length,
      lessons30d: input.completions.filter((c) => c.completedAt && learnerIds.has(c.userId) && new Date(c.completedAt).getTime() >= since30).length,
      certificates30d: learnerCerts.filter((c) => new Date(c.issuedAt).getTime() >= since30).length,
      certificatesTotal: learnerCerts.length,
      waitingReviews: input.waitingReviews.length,
      oldestReviewDays: oldest,
    },
    weeks,
    departments,
    courses,
    people: [...people].sort((a, b) => a.name.localeCompare(b.name)),
    attention,
  };
}
