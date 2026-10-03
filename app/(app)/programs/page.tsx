import { GraduationCap } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState } from '@/components/ui/primitives';
import { CampaignCard } from '@/features/university/CampaignCard';
import { ProgramCard } from '@/features/university/ProgramCard';
import { getViewer } from '@/lib/data';
import { getMyCampaigns, getPrograms } from '@/lib/university';

export const metadata: Metadata = { title: 'Programs' };

export default async function ProgramsPage() {
  const viewer = (await getViewer())!;
  const [programs, campaigns] = await Promise.all([getPrograms(viewer), getMyCampaigns(viewer)]);
  return (
    <div className="page">
      <PageHeader
        title="Programs"
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Programs' }]}
        actions={
          viewer.role === 'admin' ? (
            <Link className="btn btn-ghost" href="/admin/programs">
              Manage programs
            </Link>
          ) : undefined
        }
      />
      {campaigns.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Seasonal refreshers</h2>
          {campaigns.map((c) => (
            <CampaignCard key={c.id} c={c} />
          ))}
        </section>
      )}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Your tracks</h2>
        <p className="muted" style={{ margin: 0 }}>
          Each track goes Trainee → Associate → Senior → Master. Earn the certificate for every course in a level to finish it (+150 XP).
        </p>
        {programs.length === 0 ? (
          <div className="card">
            <EmptyState icon={GraduationCap} title="No programs yet" body="Pooja will add role tracks here soon. Meanwhile, every course is open in Schools." />
          </div>
        ) : (
          <div className="program-grid">
            {programs.map((p) => (
              <ProgramCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
