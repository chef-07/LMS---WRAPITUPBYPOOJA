import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { SopBrowser } from '@/features/sops/SopBrowser';
import { getViewer } from '@/lib/data';
import { getSopLibrary } from '@/lib/team-life';

export const metadata: Metadata = { title: 'SOP Library' };

export default async function SopsPage() {
  const [folders, viewer] = await Promise.all([getSopLibrary(), getViewer()]);
  return (
    <div className="page">
      <PageHeader
        title="SOP Library"
        crumbs={[{ label: 'Home', href: '/' }, { label: 'SOP Library' }]}
        actions={
          viewer?.role === 'admin' && (
            <Link className="btn btn-ghost" href="/admin/sops">
              Manage library
            </Link>
          )
        }
      />
      <SopBrowser folders={folders} />
    </div>
  );
}
