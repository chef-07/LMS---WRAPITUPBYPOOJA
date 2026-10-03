/** Team types and helpers that client components can import. */
import type { Department, Role } from './types';

export type Risk = 'active' | 'idle' | 'stalled' | 'dormant' | 'never';

export const RISK_LABEL: Record<Risk, string> = {
  active: 'Active',
  idle: 'Idle',
  stalled: 'Stalled',
  dormant: 'Dormant',
  never: 'Never started',
};

/** Same buckets as the reference LMS: by days since the last lesson activity. */
export function riskOf(lastActivityAt: string | null, now = Date.now()): Risk {
  if (!lastActivityAt) return 'never';
  const days = (now - new Date(lastActivityAt).getTime()) / 86_400_000;
  if (days < 7) return 'active';
  if (days < 21) return 'idle';
  if (days < 45) return 'stalled';
  return 'dormant';
}

export type TeamMember = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  department: Department | null;
  isDisabled: boolean;
  createdAt: string;
  lessonsDone: number;
  lastActivityAt: string | null;
  risk: Risk;
};

export type PendingInvite = { email: string; fullName: string; role: Role; department: Department | null; createdAt: string };

