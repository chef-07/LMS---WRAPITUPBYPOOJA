import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { Showcase } from '@/features/showcase/Wall';
import { getViewer } from '@/lib/data';
import { isDemo } from '@/lib/supabase/config';
import { getShowcase } from '@/lib/team-life';

export const metadata: Metadata = { title: 'Showcase' };

export default async function ShowcasePage() {
  const viewer = (await getViewer())!;
  const { current, posts } = await getShowcase(viewer);
  return (
    <div className="page">
      <PageHeader
        title="Showcase"
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Showcase' }]}
        actions={
          viewer.role === 'admin' && (
            <Link className="btn btn-ghost" href="/admin/challenges">
              Manage challenges
            </Link>
          )
        }
      />
      <Showcase current={current} posts={posts} viewerId={viewer.id} isFaculty={viewer.role !== 'member'} demo={isDemo} />
    </div>
  );
}
