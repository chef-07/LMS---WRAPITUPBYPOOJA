import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { CohortCard, NewCohortForm } from '@/features/university/CohortAdmin';
import { requireAdminPage } from '@/lib/admin';
import { getCohortsAdmin } from '@/lib/university';

export const metadata: Metadata = { title: 'Cohorts' };

export default async function CohortsPage() {
  await requireAdminPage();
  const { cohorts, people, programs } = await getCohortsAdmin();
  return (
    <div className="page">
      <PageHeader title="Cohorts" crumbs={[{ label: 'Home', href: '/' }, { label: 'Cohorts' }]} />
      <div className="content">
        <div className="col">
          {cohorts.length === 0 ? (
            <section className="card">
              <p className="muted" style={{ margin: 0 }}>No batches yet. Create one on the right, then add the new joiners.</p>
            </section>
          ) : (
            cohorts.map((c) => <CohortCard key={c.id} c={c} people={people} programs={programs} />)
          )}
        </div>
        <aside className="col rail">
          <NewCohortForm programs={programs} />
          <section className="card">
            <h3 style={{ margin: '0 0 6px', fontSize: 15 }}>How drip release works</h3>
            <p className="muted small" style={{ margin: 0 }}>
              In Studio, set <b>Unlocks after (days)</b> on a module. It opens that many days after the batch starts. Someone not in a batch counts from the day they joined. Faculty always see everything.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
