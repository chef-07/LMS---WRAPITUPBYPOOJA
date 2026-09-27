import type { PaceStatus } from '@/lib/pace';

const LABEL: Record<PaceStatus, string> = {
  done: 'Done',
  'on-track': 'On track',
  behind: 'Behind',
  overdue: 'Overdue',
  'not-started': 'Not started',
};

export function Pace({ status }: { status: PaceStatus }) {
  return <span className={`pace ${status}`}>{LABEL[status]}</span>;
}

export function daysLabel(days: number): string {
  if (days === 0) return 'due today';
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} overdue`;
  return `${days} day${days === 1 ? '' : 's'} left`;
}
