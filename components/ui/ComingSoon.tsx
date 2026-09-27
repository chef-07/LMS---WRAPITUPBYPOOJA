import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState } from './primitives';

/** Holds a place in the navigation for a section built in a later phase (see docs/PLAN.md). */
export function ComingSoon({ title, icon, phase, body }: { title: string; icon: LucideIcon; phase: string; body: string }) {
  return (
    <div className="page">
      <PageHeader title={title} crumbs={[{ label: 'Home', href: '/' }, { label: title }]} />
      <div className="card">
        <EmptyState
          icon={icon}
          title={`${title} is coming in ${phase}`}
          body={body}
          action={
            <Link className="btn btn-ghost" href="/schools">
              Keep learning meanwhile
            </Link>
          }
        />
      </div>
    </div>
  );
}
