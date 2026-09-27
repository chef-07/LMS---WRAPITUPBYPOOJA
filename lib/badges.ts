/** Badges are earned from the XP event stream and the streak; nothing is stored. */
export type Badge = { key: string; emoji: string; title: string; how: string; earned: boolean };

export type BadgeInput = { counts: Record<string, number>; bestStreak: number };

const RULES: { key: string; emoji: string; title: string; how: string; test: (i: BadgeInput) => boolean }[] = [
  { key: 'first-lesson', emoji: '🎁', title: 'First lesson', how: 'Finish any lesson', test: (i) => (i.counts['lesson.completed'] ?? 0) >= 1 },
  { key: 'quiz-whiz', emoji: '🧠', title: 'Quiz whiz', how: 'Pass 5 quizzes', test: (i) => (i.counts['quiz.passed'] ?? 0) >= 5 },
  { key: 'first-wrap', emoji: '📷', title: 'First wrap approved', how: 'Get a practical approved', test: (i) => (i.counts['assignment.approved'] ?? 0) >= 1 },
  { key: 'graduate', emoji: '🎓', title: 'Course graduate', how: 'Earn a certificate', test: (i) => (i.counts['course.completed'] ?? 0) >= 1 },
  { key: 'level-up', emoji: '🪜', title: 'Level up', how: 'Finish a program level', test: (i) => (i.counts['level.completed'] ?? 0) >= 1 },
  { key: 'live-learner', emoji: '🎤', title: 'Live learner', how: 'Join 3 live trainings', test: (i) => (i.counts['live.attended'] ?? 0) >= 3 },
  { key: 'challenger', emoji: '🎀', title: 'Challenger', how: 'Enter a Wrap of the Week', test: (i) => (i.counts['challenge.entered'] ?? 0) >= 1 },
  { key: 'winner', emoji: '🏆', title: 'Wrap of the Week winner', how: 'Win a weekly challenge', test: (i) => (i.counts['challenge.won'] ?? 0) >= 1 },
  { key: 'streak-7', emoji: '🔥', title: '7-day streak', how: 'Learn 7 days in a row', test: (i) => i.bestStreak >= 7 },
];

export function badgesFor(input: BadgeInput): Badge[] {
  return RULES.map(({ test, ...b }) => ({ ...b, earned: test(input) }));
}
