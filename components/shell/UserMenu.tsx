'use client';
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Grid3x3,
  LogOut,
  Megaphone,
  Settings,
  Sparkles,
  User,
  Users,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { initials } from '@/lib/format';
import { DEPARTMENTS, type Viewer } from '@/lib/types';
import { useDismiss } from './useDismiss';

const FACULTY_LINKS = [
  { href: '/admin', label: 'Studio', icon: Wand2, adminOnly: true },
  { href: '/admin/team', label: 'Team', icon: Users, adminOnly: false },
  { href: '/admin/reviews', label: 'Reviews', icon: ClipboardCheck, adminOnly: false },
  { href: '/admin/skills', label: 'Skill matrix', icon: Grid3x3, adminOnly: false },
  { href: '/admin/campaigns', label: 'Campaigns', icon: Sparkles, adminOnly: true },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone, adminOnly: true },
  { href: '/admin/cohorts', label: 'Cohorts', icon: CalendarDays, adminOnly: true },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3, adminOnly: false },
];

export function UserMenu({ viewer, demo }: { viewer: Viewer; demo: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(box, open, close);
  const faculty = viewer.role === 'admin' || viewer.role === 'trainer';

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button type="button" className="avatar" aria-label="Your account" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {viewer.avatarUrl ? <img src={viewer.avatarUrl} alt="" /> : initials(viewer.fullName)}
      </button>
      {open && (
        <div className="menu">
          <div style={{ padding: '8px 10px' }}>
            <div style={{ fontWeight: 700 }}>{viewer.fullName}</div>
            <div className="muted small">{viewer.email}</div>
            <span className="chip tone-violet" style={{ marginTop: 8 }}>
              <BadgeCheck size={13} aria-hidden="true" />
              {viewer.role === 'member' ? (viewer.department ? DEPARTMENTS[viewer.department] : 'Team member') : viewer.role === 'admin' ? 'Founder · Admin' : 'Trainer'}
            </span>
          </div>
          <hr />
          <Link href="/me" onClick={close}>
            <User size={16} aria-hidden="true" /> My profile
          </Link>
          <Link href="/settings" onClick={close}>
            <Settings size={16} aria-hidden="true" /> Settings
          </Link>
          {faculty && (
            <>
              <hr />
              <div className="menu-label">Running the university</div>
              {FACULTY_LINKS.filter((l) => viewer.role === 'admin' || !l.adminOnly).map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={close}>
                  <Icon size={16} aria-hidden="true" /> {label}
                </Link>
              ))}
            </>
          )}
          <hr />
          {demo ? (
            <span className="muted small" style={{ display: 'block', padding: '8px 10px' }}>Demo mode: sign-in is off</span>
          ) : (
            <form action="/auth/signout" method="post">
              <button type="submit" className="menu-item">
                <LogOut size={16} aria-hidden="true" /> Sign out
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
