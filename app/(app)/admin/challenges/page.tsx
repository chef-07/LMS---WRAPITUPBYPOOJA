import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { ChallengeCard, ChallengeForm } from '@/features/showcase/ChallengeAdmin';
import { requireAdminPage } from '@/lib/admin';
import { getShowcase } from '@/lib/team-life';

export const metadata: Metadata = { title: 'Wrap of the Week' };

export default async function ChallengesPage() {
  const viewer = await requireAdminPage();
  const { challenges, posts } = await getShowcase(viewer);
  return (
    <div className="page">
      <PageHeader title="Wrap of the Week" crumbs={[{ label: 'Home', href: '/' }, { label: 'Showcase', href: '/showcase' }, { label: 'Challenges' }]} />
      <div className="content">
        <div className="col">
          {challenges.length === 0 ? (
            <section className="card">
              <p className="muted" style={{ margin: 0 }}>No challenges yet. Create the first one on the right.</p>
            </section>
          ) : (
            challenges.map((c) => <ChallengeCard key={c.id} c={c} entries={posts.filter((p) => p.challengeId === c.id && !p.isHidden)} />)
          )}
        </div>
        <aside className="col rail">
          <ChallengeForm />
          <p className="muted small" style={{ margin: 0 }}>Entering gives +40 XP once per challenge. The winner gets +100 XP and a trophy on the wall.</p>
        </aside>
      </div>
    </div>
  );
}
