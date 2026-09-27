import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState } from '@/components/ui/primitives';
import { SopItemCard } from '@/features/sops/SopItemCard';
import { getSopLibrary } from '@/lib/team-life';
import { FolderOpen } from 'lucide-react';

export const metadata: Metadata = { title: 'SOP Library' };

export default async function SopFolderPage({ params }: { params: Promise<{ folder: string }> }) {
  const id = (await params).folder;
  const folder = (await getSopLibrary()).find((f) => f.id === id);
  if (!folder) notFound();
  return (
    <div className="page">
      <PageHeader title={`${folder.emoji} ${folder.title}`} crumbs={[{ label: 'Home', href: '/' }, { label: 'SOP Library', href: '/sops' }, { label: folder.title }]} />
      {folder.description && <p className="muted" style={{ margin: 0 }}>{folder.description}</p>}
      {folder.items.length ? (
        <div className="sop-grid">
          {folder.items.map((i) => (
            <SopItemCard key={i.id} item={i} />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={FolderOpen} title="Nothing in this folder yet" body="Cards added by Pooja show up here." />
        </div>
      )}
    </div>
  );
}
