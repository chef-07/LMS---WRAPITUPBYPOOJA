import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { CampaignCard, NewCampaignForm } from '@/features/university/CampaignAdmin';
import { requireAdminPage } from '@/lib/admin';
import { indiaToday } from '@/lib/locks';
import { getCampaignsAdmin } from '@/lib/university';

export const metadata: Metadata = { title: 'Campaigns' };

export default async function CampaignsPage() {
  await requireAdminPage();
  const { campaigns, courses } = await getCampaignsAdmin();
  const today = indiaToday();
  const live = campaigns.filter((c) => c.dueOn >= today);
  const ended = campaigns.filter((c) => c.dueOn < today).reverse();
  return (
    <div className="page">
      <PageHeader title="Campaigns" crumbs={[{ label: 'Home', href: '/' }, { label: 'Campaigns' }]} />
      <div className="content">
        <div className="col">
          {campaigns.length === 0 && (
            <section className="card">
              <p className="muted" style={{ margin: 0 }}>No campaigns yet. Before Diwali, Rakhi or wedding season, launch a refresher on the right.</p>
            </section>
          )}
          {live.map((c) => (
            <CampaignCard key={c.id} c={c} courses={courses} todayIso={today} />
          ))}
          {ended.length > 0 && <h2 style={{ margin: '8px 0 0', fontSize: 16 }}>Ended</h2>}
          {ended.map((c) => (
            <CampaignCard key={c.id} c={c} courses={courses} todayIso={today} />
          ))}
        </div>
        <aside className="col rail">
          <NewCampaignForm courses={courses} />
          <p className="muted small" style={{ margin: 0 }}>
            The team sees a countdown card on their dashboard and in Programs, and a bell reminder in the last 7 days until they finish.
          </p>
        </aside>
      </div>
    </div>
  );
}
