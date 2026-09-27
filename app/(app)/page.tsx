import { BookCheck, Clock, Flame, Megaphone, Trophy } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, StatTile } from '@/components/ui/primitives';
import { ActivityChart } from '@/features/dashboard/ActivityChart';
import { ContinueRail } from '@/features/dashboard/ContinueRail';
import { FirstWeek } from '@/features/dashboard/FirstWeek';
import { Hero } from '@/features/dashboard/Hero';
import { Leaderboard } from '@/features/dashboard/Leaderboard';
import { Pending } from '@/features/dashboard/Pending';
import { Upcoming } from '@/features/dashboard/Upcoming';
import { getDashboard } from '@/lib/data';
import { minutesLabel } from '@/lib/format';

export default async function DashboardPage() {
  const d = await getDashboard();
  if (!d) redirect('/login');

  const top = d.continueCourses[0];
  const resume = top ? { href: top.lastLesson ? `/learn/${top.slug}/${top.lastLesson.slug}` : `/schools/${top.slug}`, courseTitle: top.title } : null;
  const myXp = d.stats.xp;
  const above = d.stats.rank && d.stats.rank > 1 ? d.leaderboard[d.stats.rank - 2] : null;

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Dashboard' }]}
        actions={
          <Link className="btn btn-primary" href={resume?.href ?? '/schools'}>
            Continue learning
          </Link>
        }
      />

      {d.announcement && (
        <div className="announce" role="note">
          <span className="announce-icon">
            <Megaphone size={18} aria-hidden="true" />
          </span>
          <div style={{ minWidth: 0 }}>
            <b>{d.announcement.title}</b>
            <div className="small" style={{ color: 'var(--ink-2)' }}>
              {d.announcement.body}
            </div>
          </div>
        </div>
      )}

      <Hero name={d.viewer.fullName} streak={d.streak.current} resume={resume} />

      <div className="content">
        <div className="col">
          <FirstWeek steps={d.firstWeek} />
          <Pending items={d.pending} />
          <ContinueRail courses={d.continueCourses} />
          <div className="grid-4">
            <StatTile icon={BookCheck} tone="turquoise" value={d.stats.lessonsFinished} label="Lessons finished" />
            <StatTile icon={Clock} tone="sky" value={minutesLabel(d.stats.learningSeconds)} label="Learning time" />
            <StatTile icon={Flame} tone="tangerine" value={d.streak.current} label="Day streak" sub={`best ${d.streak.best}`} />
            <StatTile icon={Trophy} tone="violet" value={myXp.toLocaleString('en-IN')} label="XP earned" sub={d.stats.rank ? `rank #${d.stats.rank}` : undefined} />
          </div>
          <Card title="Learning activity">
            <ActivityChart days={d.activity} />
          </Card>
        </div>

        <aside className="col rail" aria-label="At a glance">
          <Upcoming sessions={d.upcoming} />
          <Leaderboard rows={d.leaderboard} viewerId={d.viewer.id} viewerDept={d.viewer.department} />
          <div className="promo">
            <h3>🎀 Wrap of the Week</h3>
            <p className="small" style={{ margin: 0 }}>
              {above ? `You're ${(above.xp - myXp + 1).toLocaleString('en-IN')} XP from ${above.name}. ` : ''}
              Post your best wrap in Showcase for +40 XP.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
