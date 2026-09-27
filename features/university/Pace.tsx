import { PACE_LABEL, type PaceStatus } from '@/lib/pace';

export function Pace({ status }: { status: PaceStatus }) {
  return <span className={`pace ${status}`}>{PACE_LABEL[status]}</span>;
}

export function daysLabel(days: number): string {
  if (days === 0) return 'due today';
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} overdue`;
  return `${days} day${days === 1 ? '' : 's'} left`;
}
