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
  quiz: LearnerQuiz | null;
  practical: LearnerPractical | null;
  assessment: CourseAssessment;
  qa: import('./team-life').QaThread[];
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
  pending: PendingItem[];
  challenge: { title: string } | null;
};

/* ── Assessment (Phase 4) ──────────────────────────────────────────────── */

export type SubmissionStatus = 'submitted' | 'approved' | 'redo';

/** A quiz as a learner receives it: no answer key. */
export type LearnerQuiz = {
  id: string;
  passPct: number;
  isRequired: boolean;
  questions: { id: string; kind: 'mcq' | 'scenario'; prompt: string; options: { id: string; label: string }[] }[];
  passed: boolean;
  attempts: number;
  best: { score: number; total: number } | null;
};

export type PracticalReview = {
  scores: Record<string, number>;
  comment: string;
  decision: 'approved' | 'redo';
  reviewerName: string;
  createdAt: string;
};

export type PracticalSubmission = {
  id: string;
  status: SubmissionStatus;
  createdAt: string;
  photoUrls: string[];
  link: string | null;
  note: string;
  review: PracticalReview | null;
};

export type LearnerPractical = {
  id: string;
  brief: string;
  rubric: { key: string; label: string }[];
  /** Newest first. */
  submissions: PracticalSubmission[];
};

export type CourseAssessment = {
  quizByLesson: Record<string, { quizId: string; required: boolean; passed: boolean }>;
  practicalByLesson: Record<string, { assignmentId: string; status: SubmissionStatus | null }>;
  /** lesson id → title of the module whose quiz is blocking it. */
  lockedBy: Record<string, string>;
  certificate: { code: string; issuedAt: string } | null;
  progress: {
    lessons: { done: number; total: number };
    quizzes: { done: number; total: number };
    practicals: { done: number; total: number };
  };
};

export type PendingItem = { id: string; kind: 'redo' | 'quiz'; title: string; detail: string; href: string };
