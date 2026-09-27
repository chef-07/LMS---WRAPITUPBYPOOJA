import 'server-only';
import { one } from './assessment';
import { getCatalogue } from './data';
import { addDays, indiaToday } from './locks';
import { daysBetween, paceStatus, type PaceStatus } from './pace';
import { isDemo } from './supabase/config';
import { supabaseServer } from './supabase/server';
import type { Course, Department, Role, Viewer } from './types';

/**
 * Phase 5: programs (role tracks with levels), cohorts (new-joiner batches
 * with drip-released modules), skills (the skill matrix) and seasonal
 * campaigns. The database is the source of truth for every rule; this file
 * only shapes rows for the pages.
 */

export type CourseLevel = Course['level'];
export const LEVELS: CourseLevel[] = ['Trainee', 'Associate', 'Senior', 'Master'];

export type { PaceStatus };

const isFaculty = (v: Viewer) => v.role === 'admin' || v.role === 'trainer';
const seesDept = (v: Viewer, dept: Department | null) => dept === null || v.role !== 'member' || v.department === dept;
const seesDepts = (v: Viewer, depts: Department[]) => depts.length === 0 || v.role !== 'member' || (v.department !== null && depts.includes(v.department));

/** A course as a learner sees it inside a program or campaign. */
export type UniCourse = { id: string; slug: string; title: string; lessonCount: number; completedCount: number; certified: boolean };

function uniCourses(courses: Course[], certified: ReadonlySet<string>): Map<string, UniCourse> {
  const out = new Map<string, UniCourse>();
  for (const c of courses) {
    const lessons = c.modules.flatMap((m) => m.lessons);
    out.set(c.id, {
      id: c.id,
      slug: c.slug,
      title: c.title,
      lessonCount: lessons.length,
      completedCount: lessons.filter((l) => l.completed).length,
      certified: certified.has(c.id),
    });
  }
  return out;
}

async function myCertifiedCourses(viewer: Viewer, courses: Course[]): Promise<Set<string>> {
  if (isDemo) return new Set(courses.filter((c) => c.slug === 'perfect-box-wrap').map((c) => c.id));
  const sb = await supabaseServer();
  const { data } = await sb.from('certificates').select('course_id').eq('user_id', viewer.id);
  return new Set((data ?? []).map((c) => c.course_id));
}

/* ── Demo content ───────────────────────────────────────────────────────── */

type DemoProgram = { id: string; slug: string; title: string; emoji: string; description: string; department: Department | null; isPublished: boolean; levels: { level: CourseLevel; title: string; courses: string[] }[] };
const demoPrograms: DemoProgram[] = [
  {
    id: 'p1',
    slug: 'wrapping-artisan',
    title: 'Wrapping Artisan',
    emoji: '🎀',
    description: 'From your first clean box wrap to running the festive hamper table on your own.',
    department: 'artisan',
    isPublished: true,
    levels: [
      { level: 'Trainee', title: 'Clean basics', courses: ['welcome-to-wrapitup', 'perfect-box-wrap'] },
      { level: 'Associate', title: 'Bows and hampers', courses: ['bows-and-ribbons', 'festive-hampers'] },
    ],
  },
  {
    id: 'p2',
    slug: 'sales-star',
    title: 'Sales Star',
    emoji: '💬',
    description: 'Answer every WhatsApp enquiry warmly, quote with confidence and close politely.',
    department: 'sales',
    isPublished: true,
    levels: [{ level: 'Trainee', title: 'First replies', courses: ['welcome-to-wrapitup', 'whatsapp-sales'] }],
  },
  {
    id: 'p3',
    slug: 'dispatch-pro',
    title: 'Dispatch Pro',
    emoji: '🚚',
    description: 'Safe packing, courier handover and event-site setup.',
    department: 'ops',
    isPublished: false,
    levels: [{ level: 'Trainee', title: 'Packing', courses: ['safe-dispatch'] }],
  },
];

function demoDate(offset: number): string {
  return addDays(indiaToday(), offset);
}

/* ── Programs ───────────────────────────────────────────────────────────── */

export type ProgramLevelView = { level: CourseLevel; title: string; courses: UniCourse[]; done: boolean };
export type ProgramView = {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  description: string;
  department: Department | null;
  isPublished: boolean;
  levels: ProgramLevelView[];
  coursesDone: number;
  coursesTotal: number;
};

type ProgramRow = { id: string; slug: string; title: string; emoji: string; description: string; department: Department | null; isPublished: boolean; rank: number; levels: { level: CourseLevel; title: string; courseIds: string[] }[] };

async function programRows(): Promise<{ rows: ProgramRow[]; courseIdBySlug: Map<string, string> }> {
  if (isDemo) {
    const { courses } = await getCatalogue();
    const bySlug = new Map(courses.map((c) => [c.slug, c.id]));
    return {
      courseIdBySlug: bySlug,
      rows: demoPrograms.map((p, i) => ({
        ...p,
        rank: i,
        levels: p.levels.map((l) => ({ level: l.level, title: l.title, courseIds: l.courses.map((s) => bySlug.get(s) ?? '').filter(Boolean) })),
      })),
    };
  }
  const sb = await supabaseServer();
  const { data } = await sb
    .from('programs')
    .select('id, slug, title, emoji, description, department, is_published, rank, program_levels(level, title, program_level_courses(course_id, rank))')
    .order('rank');
  type Db = { id: string; slug: string; title: string; emoji: string; description: string; department: Department | null; is_published: boolean; rank: number; program_levels: { level: CourseLevel; title: string; program_level_courses: { course_id: string; rank: number }[] }[] };
  const rows = ((data ?? []) as unknown as Db[]).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    emoji: p.emoji,
    description: p.description,
    department: p.department,
    isPublished: p.is_published,
    rank: p.rank,
    levels: [...p.program_levels]
      .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))
      .map((l) => ({ level: l.level, title: l.title, courseIds: [...l.program_level_courses].sort((a, b) => a.rank - b.rank).map((c) => c.course_id) })),
  }));
  return { rows, courseIdBySlug: new Map() };
}

function toView(p: ProgramRow, courses: Map<string, UniCourse>): ProgramView {
  const levels = p.levels
    .map((l) => {
      const cs = l.courseIds.map((id) => courses.get(id)).filter((c): c is UniCourse => !!c);
      return { level: l.level, title: l.title, courses: cs, done: cs.length > 0 && cs.every((c) => c.certified) };
    })
    .filter((l) => l.courses.length > 0);
  const all = new Map(levels.flatMap((l) => l.courses.map((c) => [c.id, c] as const)));
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    emoji: p.emoji,
    description: p.description,
    department: p.department,
    isPublished: p.isPublished,
    levels,
    coursesDone: [...all.values()].filter((c) => c.certified).length,
    coursesTotal: all.size,
  };
}

/** Programs the viewer can see, with their own progress. */
export async function getPrograms(viewer: Viewer): Promise<ProgramView[]> {
  const [{ courses }, { rows }] = await Promise.all([getCatalogue(), programRows()]);
  const certified = await myCertifiedCourses(viewer, courses);
  const map = uniCourses(courses, certified);
  return rows.filter((p) => (p.isPublished || isFaculty(viewer)) && seesDept(viewer, p.department)).map((p) => toView(p, map));
}

export async function getProgram(viewer: Viewer, slug: string): Promise<ProgramView | null> {
  return (await getPrograms(viewer)).find((p) => p.slug === slug) ?? null;
}

export type ProgramAdmin = Omit<ProgramRow, 'rank'>;
export type CourseOption = { id: string; title: string; level: CourseLevel };

async function courseOptions(): Promise<CourseOption[]> {
  if (isDemo) return (await getCatalogue()).courses.map((c) => ({ id: c.id, title: c.title, level: c.level }));
  const sb = await supabaseServer();
  const { data } = await sb.from('courses').select('id, title, level').order('rank');
  return (data ?? []) as CourseOption[];
}

export async function getProgramsAdmin(): Promise<{ programs: ProgramAdmin[]; courses: CourseOption[] }> {
  const [{ rows }, courses] = await Promise.all([programRows(), courseOptions()]);
  return { programs: rows, courses };
}

/* ── People (for the faculty pages) ─────────────────────────────────────── */

export type Person = { id: string; name: string; department: Department | null; role: Role };

const demoPeople: Person[] = [
  { id: 'u1', name: 'Riya Sharma', department: 'artisan', role: 'trainer' },
  { id: 'u2', name: 'Aman Verma', department: 'sales', role: 'member' },
  { id: 'u3', name: 'Sneha Patel', department: 'social', role: 'member' },
  { id: 'u4', name: 'Imran Khan', department: 'ops', role: 'member' },
  { id: 'u5', name: 'Kavya Nair', department: 'artisan', role: 'member' },
  { id: 'u6', name: 'Meera Joshi', department: 'artisan', role: 'member' },
];

/** Everyone who is learning: active trainers and members (the founder is left out). */
async function learners(): Promise<Person[]> {
  if (isDemo) return demoPeople;
  const sb = await supabaseServer();
  const { data } = await sb.from('users').select('id, full_name, email, department, role').eq('is_disabled', false).neq('role', 'admin').order('full_name');
  return (data ?? []).map((u) => ({ id: u.id, name: u.full_name || u.email, department: u.department, role: u.role }));
}

/** user → set of completed lesson ids, for the given lessons. */
async function completedLessons(lessonIds: string[]): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  if (isDemo || lessonIds.length === 0) return out;
  const sb = await supabaseServer();
  const { data } = await sb.from('lesson_progress').select('user_id, lesson_id').eq('is_completed', true).in('lesson_id', lessonIds).limit(50_000);
  for (const r of data ?? []) {
    if (!out.has(r.user_id)) out.set(r.user_id, new Set());
    out.get(r.user_id)!.add(r.lesson_id);
  }
  return out;
}

/** course id → published lesson ids. */
async function lessonsOf(courseIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (courseIds.length === 0) return out;
  if (isDemo) {
    for (const c of (await getCatalogue()).courses) if (courseIds.includes(c.id)) out.set(c.id, c.modules.flatMap((m) => m.lessons.map((l) => l.id)));
    return out;
  }
  const sb = await supabaseServer();
  const { data } = await sb.from('lessons').select('id, course_id').eq('is_published', true).in('course_id', courseIds).limit(10_000);
  for (const l of data ?? []) {
    if (!out.has(l.course_id)) out.set(l.course_id, []);
    out.get(l.course_id)!.push(l.id);
  }
  return out;
}

/* ── Progress status (shared by cohorts and campaigns) ──────────────────── */

/* ── Cohorts ────────────────────────────────────────────────────────────── */

export type CohortMemberRow = { userId: string; name: string; department: Department | null; done: number; total: number; pct: number; status: PaceStatus };
export type CohortView = {
  id: string;
  title: string;
  startsOn: string;
  endsOn: string;
  programId: string | null;
  programTitle: string | null;
  /** Day N of the batch (1 on the start date); 0 before it starts. */
  day: number;
  totalDays: number;
  members: CohortMemberRow[];
};

type CohortRow = { id: string; title: string; startsOn: string; endsOn: string; programId: string | null; memberIds: string[] };

async function cohortRows(): Promise<CohortRow[]> {
  if (isDemo) {
    return [
      { id: 'k1', title: 'October 2026 batch', startsOn: demoDate(-3), endsOn: demoDate(25), programId: 'p1', memberIds: ['u5', 'u6'] },
      { id: 'k2', title: 'Festive temps (sales)', startsOn: demoDate(-12), endsOn: demoDate(2), programId: 'p2', memberIds: ['u2'] },
    ];
  }
  const sb = await supabaseServer();
  const { data } = await sb.from('cohorts').select('id, title, starts_on, ends_on, program_id, cohort_members(user_id)').order('starts_on', { ascending: false });
  return ((data ?? []) as unknown as { id: string; title: string; starts_on: string; ends_on: string; program_id: string | null; cohort_members: { user_id: string }[] }[]).map((c) => ({
    id: c.id,
    title: c.title,
    startsOn: c.starts_on,
    endsOn: c.ends_on,
    programId: c.program_id,
    memberIds: c.cohort_members.map((m) => m.user_id),
  }));
}

export async function getCohortsAdmin(): Promise<{ cohorts: CohortView[]; people: (Person & { cohortId: string | null })[]; programs: { id: string; title: string }[] }> {
  const [rows, people, { rows: programs }] = await Promise.all([cohortRows(), learners(), programRows()]);
  const today = indiaToday();
  const programCourses = new Map(programs.map((p) => [p.id, [...new Set(p.levels.flatMap((l) => l.courseIds))]]));
  const lessonMap = await lessonsOf([...new Set([...programCourses.values()].flat())]);
  const programLessons = new Map([...programCourses].map(([id, cs]) => [id, cs.flatMap((c) => lessonMap.get(c) ?? [])]));
  const done = await completedLessons([...new Set([...programLessons.values()].flat())]);
  const personById = new Map(people.map((p) => [p.id, p]));
  const demoPct: Record<string, number> = { u5: 40, u6: 5, u2: 70 };

  const cohorts: CohortView[] = rows.map((c) => {
    const lessons = c.programId ? (programLessons.get(c.programId) ?? []) : [];
    const members = c.memberIds
      .map((uid) => personById.get(uid))
      .filter((p): p is Person => !!p)
      .map((p) => {
        const total = lessons.length;
        const finished = isDemo ? Math.round(((demoPct[p.id] ?? 0) / 100) * total) : lessons.filter((l) => done.get(p.id)?.has(l)).length;
        const pct = total ? Math.round((finished / total) * 100) : 0;
        return { userId: p.id, name: p.name, department: p.department, done: finished, total, pct, status: total ? paceStatus(pct, c.startsOn, c.endsOn, today) : ('not-started' as const) };
      });
    return {
      id: c.id,
      title: c.title,
      startsOn: c.startsOn,
      endsOn: c.endsOn,
      programId: c.programId,
      programTitle: programs.find((p) => p.id === c.programId)?.title ?? null,
      day: today < c.startsOn ? 0 : daysBetween(c.startsOn, today) + 1,
      totalDays: daysBetween(c.startsOn, c.endsOn) + 1,
      members,
    };
  });
  const cohortOf = new Map(rows.flatMap((c) => c.memberIds.map((u) => [u, c.id] as const)));
  return {
    cohorts,
    people: people.map((p) => ({ ...p, cohortId: cohortOf.get(p.id) ?? null })),
    programs: programs.map((p) => ({ id: p.id, title: p.title })),
  };
}

export type MyBatch = {
  title: string;
  startsOn: string;
  endsOn: string;
  day: number;
  totalDays: number;
  daysLeft: number;
  program: { slug: string; title: string; done: number; total: number } | null;
  status: PaceStatus | null;
  nextUnlock: { module: string; course: string; opensOn: string } | null;
};

/** The viewer's own batch, for the dashboard banner. */
export async function getMyBatch(viewer: Viewer): Promise<MyBatch | null> {
  let row: CohortRow | null = null;
  if (isDemo) {
    row = (await cohortRows())[0]!;
  } else {
    const sb = await supabaseServer();
    const { data } = await sb.from('cohort_members').select('cohorts(id, title, starts_on, ends_on, program_id)').eq('user_id', viewer.id).maybeSingle();
    const c = one((data as unknown as { cohorts: { id: string; title: string; starts_on: string; ends_on: string; program_id: string | null } | null } | null)?.cohorts);
    if (c) row = { id: c.id, title: c.title, startsOn: c.starts_on, endsOn: c.ends_on, programId: c.program_id, memberIds: [] };
  }
  if (!row) return null;
  const today = indiaToday();
  const [{ courses }, programs] = await Promise.all([getCatalogue(), row.programId ? getPrograms(viewer) : Promise.resolve([])]);
  const p = programs.find((x) => x.id === row.programId) ?? null;
  const pLessons = p ? p.levels.flatMap((l) => l.courses) : [];
  const uniq = [...new Map(pLessons.map((c) => [c.id, c])).values()];
  const total = uniq.reduce((s, c) => s + c.lessonCount, 0);
  const finished = uniq.reduce((s, c) => s + c.completedCount, 0);

  let nextUnlock: MyBatch['nextUnlock'] = null;
  for (const c of courses) {
    if (p && !uniq.some((u) => u.id === c.id)) continue;
    for (const m of c.modules) {
      if (m.dripDays <= 0) continue;
      const opensOn = addDays(row.startsOn, m.dripDays);
      if (opensOn > today && (!nextUnlock || opensOn < nextUnlock.opensOn)) nextUnlock = { module: m.title, course: c.title, opensOn };
    }
  }
  const pct = total ? Math.round((finished / total) * 100) : 0;
  return {
    title: row.title,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    day: today < row.startsOn ? 0 : daysBetween(row.startsOn, today) + 1,
    totalDays: daysBetween(row.startsOn, row.endsOn) + 1,
    daysLeft: daysBetween(today, row.endsOn),
    program: p ? { slug: p.slug, title: p.title, done: finished, total } : null,
    status: p && total ? paceStatus(pct, row.startsOn, row.endsOn, today) : null,
    nextUnlock,
  };
}

/* ── Skills ─────────────────────────────────────────────────────────────── */

export type Skill = { id: string; name: string; emoji: string; description: string; department: Department | null; courseIds: string[] };
export type SkillCell = { granted: { by: string | null; at: string } | null; coursesDone: number; coursesTotal: number };

const demoSkills: Skill[] = [
  { id: 'sk1', name: 'Box wrap', emoji: '📦', description: 'Sharp corners, hidden tape, clean ends.', department: 'artisan', courseIds: ['c2'] },
  { id: 'sk2', name: 'Signature bows', emoji: '🎀', description: 'Classic, pom-pom and layered bows.', department: 'artisan', courseIds: ['c3'] },
  { id: 'sk3', name: 'Festive hampers', emoji: '🧺', description: 'Base, fill, balance and cellophane.', department: 'artisan', courseIds: ['c4'] },
  { id: 'sk4', name: 'WhatsApp quoting', emoji: '💬', description: 'Discovery questions and polite quotes.', department: 'sales', courseIds: ['c5'] },
  { id: 'sk5', name: 'Courier packing', emoji: '🚚', description: 'Box-in-box and fragile items.', department: 'ops', courseIds: ['c7'] },
  { id: 'sk6', name: 'Unboxing reels', emoji: '📸', description: 'Phone setup, light and the reel formula.', department: 'social', courseIds: ['c6'] },
];

async function skillRows(): Promise<Skill[]> {
  if (isDemo) return demoSkills;
  const sb = await supabaseServer();
  const { data } = await sb.from('skills').select('id, name, emoji, description, department, rank, skill_courses(course_id)').order('rank');
  return ((data ?? []) as unknown as { id: string; name: string; emoji: string; description: string; department: Department | null; skill_courses: { course_id: string }[] }[]).map((s) => ({
    id: s.id,
    name: s.name,
    emoji: s.emoji,
    description: s.description,
    department: s.department,
    courseIds: s.skill_courses.map((c) => c.course_id),
  }));
}

export async function getSkillMatrix(): Promise<{ skills: Skill[]; people: Person[]; cells: Record<string, SkillCell>; courses: CourseOption[] }> {
  const [skills, people, courses] = await Promise.all([skillRows(), learners(), courseOptions()]);
  const grants = new Map<string, { by: string | null; at: string }>();
  const certs = new Map<string, Set<string>>();
  if (isDemo) {
    const at = new Date().toISOString();
    for (const k of ['sk1:u1', 'sk2:u1', 'sk3:u1', 'sk4:u2', 'sk1:u5']) grants.set(k, { by: 'Pooja', at });
    certs.set('u1', new Set(['c2', 'c3', 'c4']));
    certs.set('u2', new Set(['c5']));
    certs.set('u5', new Set(['c2']));
    certs.set('u6', new Set(['c2']));
    certs.set('u4', new Set(['c7']));
  } else {
    const sb = await supabaseServer();
    const [g, c] = await Promise.all([
      sb.from('skill_grants').select('skill_id, user_id, granted_at, users!skill_grants_granted_by_fkey(full_name)').limit(10_000),
      sb.from('certificates').select('user_id, course_id').limit(50_000),
    ]);
    for (const r of (g.data ?? []) as unknown as { skill_id: string; user_id: string; granted_at: string; users: { full_name: string } | { full_name: string }[] | null }[]) {
      grants.set(`${r.skill_id}:${r.user_id}`, { by: one(r.users)?.full_name ?? null, at: r.granted_at });
    }
    for (const r of c.data ?? []) {
      if (!certs.has(r.user_id)) certs.set(r.user_id, new Set());
      certs.get(r.user_id)!.add(r.course_id);
    }
  }
  const cells: Record<string, SkillCell> = {};
  for (const s of skills) {
    for (const p of people) {
      const mine = certs.get(p.id);
      cells[`${s.id}:${p.id}`] = {
        granted: grants.get(`${s.id}:${p.id}`) ?? null,
        coursesDone: s.courseIds.filter((c) => mine?.has(c)).length,
        coursesTotal: s.courseIds.length,
      };
    }
  }
  return { skills, people, cells, courses };
}

export type MySkill = { id: string; name: string; emoji: string; description: string; state: 'signed' | 'ready' | 'learning'; coursesDone: number; coursesTotal: number };

/** The viewer's skills: signed off, ready for sign-off, or being learned. */
export async function getMySkills(viewer: Viewer): Promise<MySkill[]> {
  const [skills, { courses }] = await Promise.all([skillRows(), getCatalogue()]);
  const certified = await myCertifiedCourses(viewer, courses);
  let granted = new Set<string>();
  if (isDemo) granted = new Set(['sk1']);
  else {
    const sb = await supabaseServer();
    const { data } = await sb.from('skill_grants').select('skill_id').eq('user_id', viewer.id);
    granted = new Set((data ?? []).map((g) => g.skill_id));
  }
  return skills
    .filter((s) => granted.has(s.id) || seesDept(viewer, s.department))
    .map((s) => {
      const done = s.courseIds.filter((c) => certified.has(c)).length;
      const state: MySkill['state'] = granted.has(s.id) ? 'signed' : s.courseIds.length > 0 && done === s.courseIds.length ? 'ready' : 'learning';
      return { id: s.id, name: s.name, emoji: s.emoji, description: s.description, state, coursesDone: done, coursesTotal: s.courseIds.length };
    })
    .sort((a, b) => ['signed', 'ready', 'learning'].indexOf(a.state) - ['signed', 'ready', 'learning'].indexOf(b.state));
}

/** Program levels the viewer has finished, for their profile. */
export async function getMyLevels(viewer: Viewer): Promise<{ program: string; emoji: string; level: CourseLevel; title: string }[]> {
  const programs = await getPrograms(viewer);
  return programs.flatMap((p) => p.levels.filter((l) => l.done).map((l) => ({ program: p.title, emoji: p.emoji, level: l.level, title: l.title })));
}

/* ── Campaigns ──────────────────────────────────────────────────────────── */

export type CampaignBase = { id: string; title: string; emoji: string; description: string; dueOn: string; startsOn: string; departments: Department[]; courseIds: string[] };

async function campaignRows(): Promise<CampaignBase[]> {
  if (isDemo) {
    return [
      { id: 'cp1', title: 'Diwali 2026 refresher', emoji: '🪔', description: 'Hamper finishing and safe courier packing before the festive rush.', dueOn: demoDate(12), startsOn: demoDate(-5), departments: ['artisan', 'ops'], courseIds: ['c4', 'c7'] },
      { id: 'cp2', title: 'Festive pricing on WhatsApp', emoji: '💬', description: 'Handling “too expensive” during peak season.', dueOn: demoDate(4), startsOn: demoDate(-10), departments: ['sales'], courseIds: ['c5'] },
    ];
  }
  const sb = await supabaseServer();
  const { data } = await sb.from('campaigns').select('id, title, emoji, description, due_on, departments, created_at, campaign_courses(course_id)').order('due_on');
  return ((data ?? []) as unknown as { id: string; title: string; emoji: string; description: string; due_on: string; departments: Department[]; created_at: string; campaign_courses: { course_id: string }[] }[]).map((c) => ({
    id: c.id,
    title: c.title,
    emoji: c.emoji,
    description: c.description,
    dueOn: c.due_on,
    startsOn: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(c.created_at)),
    departments: c.departments,
    courseIds: c.campaign_courses.map((x) => x.course_id),
  }));
}

export type MyCampaign = CampaignBase & { courses: UniCourse[]; done: number; total: number; daysLeft: number };

/** Campaigns for the viewer's department that are still running (or overdue by up to a week and unfinished). */
export async function getMyCampaigns(viewer: Viewer): Promise<MyCampaign[]> {
  const [rows, { courses }] = await Promise.all([campaignRows(), getCatalogue()]);
  const today = indiaToday();
  const map = uniCourses(courses, new Set());
  return rows
    // Faculty see the campaigns for their own team (or all of them, without one), like members do.
    .filter((c) => seesDepts({ ...viewer, role: viewer.department ? 'member' : viewer.role }, c.departments))
    .map((c) => {
      const cs = c.courseIds.map((id) => map.get(id)).filter((x): x is UniCourse => !!x);
      const total = cs.reduce((s, x) => s + x.lessonCount, 0);
      const done = cs.reduce((s, x) => s + x.completedCount, 0);
      return { ...c, courses: cs, total, done, daysLeft: daysBetween(today, c.dueOn) };
    })
    .filter((c) => c.total > 0 && (c.daysLeft >= 0 || (c.daysLeft >= -7 && c.done < c.total)));
}

export type CampaignRow = { userId: string; name: string; department: Department | null; done: number; total: number; pct: number; status: PaceStatus };
export type CampaignAdmin = CampaignBase & { rows: CampaignRow[] };

export async function getCampaignsAdmin(): Promise<{ campaigns: CampaignAdmin[]; courses: CourseOption[] }> {
  const [rows, people, courses] = await Promise.all([campaignRows(), learners(), courseOptions()]);
  const today = indiaToday();
  const lessonMap = await lessonsOf([...new Set(rows.flatMap((c) => c.courseIds))]);
  const done = await completedLessons([...new Set([...lessonMap.values()].flat())]);
  const demoPct: Record<string, number> = { u1: 100, u4: 30, u5: 10, u6: 0, u2: 55 };
  return {
    courses,
    campaigns: rows.map((c) => {
      const lessons = c.courseIds.flatMap((id) => lessonMap.get(id) ?? []);
      const audience = people.filter((p) => c.departments.length === 0 || (p.department !== null && c.departments.includes(p.department)));
      return {
        ...c,
        rows: audience.map((p) => {
          const total = lessons.length;
          const finished = isDemo ? Math.round(((demoPct[p.id] ?? 0) / 100) * total) : lessons.filter((l) => done.get(p.id)?.has(l)).length;
          const pct = total ? Math.round((finished / total) * 100) : 0;
          return { userId: p.id, name: p.name, department: p.department, done: finished, total, pct, status: paceStatus(pct, c.startsOn, c.dueOn, today) };
        }),
      };
    }),
  };
}

/* ── Bell ───────────────────────────────────────────────────────────────── */

export type UniBellItem = { id: string; title: string; body: string; href: string };

/** Campaigns due within a week that the viewer hasn't finished, and a module that opened today. */
export async function getUniversityBell(viewer: Viewer): Promise<UniBellItem[]> {
  if (isDemo) return [];
  const items: UniBellItem[] = [];
  for (const c of await getMyCampaigns(viewer)) {
    if (c.done >= c.total || c.daysLeft > 7) continue;
    const when = c.daysLeft < 0 ? `was due ${-c.daysLeft} day${c.daysLeft === -1 ? '' : 's'} ago` : c.daysLeft === 0 ? 'is due today' : `is due in ${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'}`;
    items.push({ id: `camp-${c.id}`, title: `${c.emoji} ${c.title} ${when}`, body: `${c.done} of ${c.total} lessons done.`, href: '/programs' });
  }
  return items;
}
