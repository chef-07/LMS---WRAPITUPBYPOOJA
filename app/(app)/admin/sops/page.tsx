import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { FolderForm } from '@/features/sops/FolderForm';
import { requireAdminPage } from '@/lib/admin';
import { getSopLibrary } from '@/lib/team-life';
import { DEPARTMENTS } from '@/lib/types';

export const metadata: Metadata = { title: 'Manage SOP library' };

export default async function AdminSopsPage() {
  await requireAdminPage();
  const folders = await getSopLibrary();
  return (
    <div className="page">
      <PageHeader title="SOP library" crumbs={[{ label: 'Home', href: '/' }, { label: 'SOP Library', href: '/sops' }, { label: 'Manage' }]} />
      <div className="content">
        <section className="card">
          {folders.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>No folders yet. Create the first one on the right.</p>
          ) : (
            <div className="list">
              {folders.map((f) => (
                <Link key={f.id} href={`/admin/sops/${f.id}`} className="list-row" style={{ color: 'inherit' }}>
                  <span className="school-emoji tone-sunshine" style={{ width: 40, height: 40, fontSize: 20 }} aria-hidden="true">
                    {f.emoji}
                  </span>
                  <div className="grow">
                    <div className="title">{f.title}</div>
                    <div className="muted small">
                      {f.items.length} cards · {f.departments.length ? f.departments.map((d) => DEPARTMENTS[d]).join(', ') : 'Everyone'}
                    </div>
                  </div>
                  <ChevronRight size={18} className="muted" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </section>
        <aside className="col rail">
          <section className="card">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>New folder</h2>
            <FolderForm />
          </section>
        </aside>
      </div>
    </div>
  );
}
