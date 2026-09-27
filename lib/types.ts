import type { CompletionMode } from './progress';

export type Role = 'admin' | 'trainer' | 'member';
export type Department = 'artisan' | 'sales' | 'social' | 'ops';

export const DEPARTMENTS: Record<Department, string> = {
  artisan: 'Wrapping & Packing',
  sales: 'Sales & Customer Care',
  social: 'Social Media & Content',
  ops: 'Operations & Dispatch',
};

export type Viewer = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  department: Department | null;
  avatarUrl: string | null;
};

export type School = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  /** One of the palette tokens: tangerine, turquoise, sunshine, violet, sky, pink. */
  tone: Tone;
  blurb: string;
};

export type Tone = 'tangerine' | 'turquoise' | 'sunshine' | 'violet' | 'sky' | 'pink';

export type LessonSummary = {
  id: string;
  slug: string;
  title: string;
  durationSeconds: number;
  videoId: string | null;
  completed: boolean;
};

export type Module = {
  id: string;
  title: string;
  lessons: LessonSummary[];
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: 'Trainee' | 'Associate' | 'Senior' | 'Master';
  schoolSlug: string;
  instructor: string;
  coverVideoId: string | null;
  /** Only faculty ever receive drafts (RLS hides them from members). */
  isDraft: boolean;
  modules: Module[];
};

export type CourseCard = {
  id: string;
  slug: string;
  title: string;
  level: Course['level'];
  school: School;
  instructor: string;
  coverVideoId: string | null;
  lessonCount: number;
  completedCount: number;
  durationSeconds: number;
  /** Seconds of the course still unwatched, for "N min left". */
  remainingSeconds: number;
  lastLesson: { slug: string; title: string } | null;
  lastActivityAt: string | null;
  isDraft: boolean;
};

export type Lesson = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  videoId: string | null;
  durationSeconds: number;
  completionMode: CompletionMode;
  minWatchPct: number;
  moduleTitle: string;
};

export type LessonPageData = {
  course: Course;
  lesson: Lesson;
  progress: {
    positionSeconds: number;
    watchSeconds: number;
    completed: boolean;
    manuallyIncomplete: boolean;
  };
  prev: LessonSummary | null;
  next: LessonSummary | null;
};

export type LiveSession = {
  id: string;
  title: string;
  host: string;
  startsAt: string;
  endsAt: string;
};

export type LeaderRow = { userId: string; name: string; department: Department | null; xp: number };

export type Announcement = { id: string; title: string; body: string; createdAt: string };

export type FirstWeekStep = {
  key: 'profile' | 'welcome' | 'conduct' | 'first_wrap' | 'live';
  title: string;
  hint: string;
  done: boolean;
  cta: { label: string; href: string };
};

export type DashboardData = {
  viewer: Viewer;
  streak: { current: number; best: number };
  stats: { lessonsFinished: number; learningSeconds: number; xp: number; rank: number | null };
  activity: { day: string; minutes: number }[];
  firstWeek: FirstWeekStep[];
  continueCourses: CourseCard[];
  upcoming: LiveSession[];
  leaderboard: LeaderRow[];
  announcement: Announcement | null;
};
