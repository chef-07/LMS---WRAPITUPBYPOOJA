import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { NewProgramForm, ProgramEditor } from '@/features/university/ProgramAdmin';
import { requireAdminPage } from '@/lib/admin';
import { getProgramsAdmin } from '@/lib/university';

export const metadata: Metadata = { title: 'Programs' };

export default async function ProgramsAdminPage() {
  await requireAdminPage();
  const { programs, courses } = await getProgramsAdmin();
  return (
    <div className="page">
      <PageHeader title="Programs" crumbs={[{ label: 'Home', href: '/' }, { label: 'Programs', href: '/programs' }, { label: 'Manage' }]} />
      <div className="content">
        <div className="col">
          {programs.length === 0 ? (
            <section className="card">
              <p className="muted" style={{ margin: 0 }}>No programs yet. Create the first track on the right, then add courses to each level.</p>
            </section>
          ) : (
            programs.map((p) => <ProgramEditor key={p.id} p={p} courses={courses} />)
          )}
        </div>
        <aside className="col rail">
          <NewProgramForm />
          <p className="muted small" style={{ margin: 0 }}>
            A level is finished when someone holds the certificate for every course in it. That gives +150 XP once and shows on their profile.
          </p>
        </aside>
      </div>
    </div>
  );
}
