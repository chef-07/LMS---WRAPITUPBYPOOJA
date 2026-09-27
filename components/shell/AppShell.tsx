import type { ReactNode } from 'react';
import { getBellItems } from '@/lib/assessment';
import { getCatalogue } from '@/lib/data';
import { getTeamLifeBell } from '@/lib/team-life';
import { isDemo } from '@/lib/supabase/config';
import { getUniversityBell } from '@/lib/university';
import type { Viewer } from '@/lib/types';
import { BottomNav } from './BottomNav';
import { GlobalSearch, type SearchEntry } from './GlobalSearch';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { TopNav } from './TopNav';
import { UserMenu } from './UserMenu';

export async function AppShell({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  const [{ schools, courses }, reviewBell, teamBell, uniBell] = await Promise.all([getCatalogue(), getBellItems(viewer), getTeamLifeBell(viewer), getUniversityBell(viewer)]);
  const bell = [...uniBell, ...teamBell, ...reviewBell];
  const index: SearchEntry[] = [
    ...schools.map((s) => ({ group: 'Schools' as const, title: `${s.emoji} ${s.name}`, sub: s.blurb, href: `/schools?school=${s.slug}` })),
    ...courses.map((c) => ({ group: 'Courses' as const, title: c.title, sub: c.summary, href: `/schools/${c.slug}` })),
    ...courses.flatMap((c) =>
      c.modules.flatMap((m) => m.lessons.map((l) => ({ group: 'Lessons' as const, title: l.title, sub: `${c.title} · ${m.title}`, href: `/learn/${c.slug}/${l.slug}` }))),
    ),
  ];

  return (
    <div className="app">
      <div className="panel">
        <header className="topbar">
          <Logo />
          <TopNav />
          <div className="topbar-actions">
            <GlobalSearch index={index} />
            <NotificationBell items={bell} />
            <UserMenu viewer={viewer} demo={isDemo} />
          </div>
        </header>
        {isDemo && (
          <div className="demo-banner" role="status">
            <b>Demo mode.</b> You’re seeing sample content. Add your Supabase keys to <code>.env.local</code> to switch on sign-in and real progress.
          </div>
        )}
        <main className="shell-main" id="main">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
