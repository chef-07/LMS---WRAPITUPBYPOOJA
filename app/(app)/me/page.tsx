import { Award, BookCheck, Camera, Download, HelpCircle, Trophy } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, StatTile } from '@/components/ui/primitives';
import { getViewer } from '@/lib/data';
import { badgesFor } from '@/lib/badges';
import { getMyProfile, longDate } from '@/lib/certificates';
import { initials } from '@/lib/format';
import { DEPARTMENTS } from '@/lib/types';

export const metadata: Metadata = { title: 'My profile' };

export default async function MePage() {
  const viewer = (await getViewer())!;
  const p = await getMyProfile(viewer);
  const badges = badgesFor({ counts: p.counts, bestStreak: p.bestStreak });
  const role = viewer.role === 'admin' ? 'Founder · Admin' : viewer.role === 'trainer' ? 'Trainer' : 'Team member';
  return (
    <div className="page">
      <PageHeader title="My profile" crumbs={[{ label: 'Home', href: '/' }, { label: 'My profile' }]} />
      <section className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="avatar" style={{ width: 64, height: 64, fontSize: 20 }} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {viewer.avatarUrl ? <img src={viewer.avatarUrl} alt="" /> : initials(viewer.fullName)}
        </span>
        <div>
          <h2 style={{ margin: 0 }}>{viewer.fullName}</h2>
          <div className="muted">{viewer.email}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span className="chip tone-violet">{role}</span>
            {viewer.department && <span className="chip tone-tangerine">{DEPARTMENTS[viewer.department]}</span>}
          </div>
        </div>
      </section>
      <div className="grid-4">
        <StatTile icon={Trophy} tone="violet" value={p.xp.toLocaleString('en-IN')} label="XP earned" />
        <StatTile icon={BookCheck} tone="turquoise" value={p.lessonsDone} label="Lessons finished" />
        <StatTile icon={HelpCircle} tone="sky" value={p.quizzesPassed} label="Quizzes passed" />
        <StatTile icon={Camera} tone="tangerine" value={p.practicalsApproved} label="Practicals approved" />
      </div>
      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>
          Badges · {badges.filter((b) => b.earned).length} of {badges.length}
        </h2>
        <div className="badge-grid">
          {badges.map((b) => (
            <div key={b.key} className={`badge${b.earned ? '' : ' locked'}`} title={b.how}>
              <span className="em" aria-hidden="true">
                {b.emoji}
              </span>
              <b className="small">{b.title}</b>
              <div className="muted small">{b.earned ? 'Earned' : b.how}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Certificates</h2>
        {p.certificates.length === 0 ? (
          <EmptyState icon={Award} title="No certificates yet" body="Finish every lesson, quiz and practical in a course to earn its certificate." />
        ) : (
          <div className="list">
            {p.certificates.map((c) => (
              <div key={c.code} className="list-row">
                <span className="school-emoji tone-sunshine" style={{ width: 40, height: 40, fontSize: 20 }} aria-hidden="true">
                  🏅
                </span>
                <div className="grow">
                  <div className="title">{c.courseTitle}</div>
                  <div className="muted small">
                    {longDate(c.issuedAt)} · {c.code}
                  </div>
                </div>
                <div className="row-actions">
                  <Link className="btn btn-ghost btn-sm" href={`/verify/${c.code}`}>
                    View
                  </Link>
                  <a className="btn btn-primary btn-sm" href={`/verify/${c.code}/pdf`}>
                    <Download size={14} aria-hidden="true" /> PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
