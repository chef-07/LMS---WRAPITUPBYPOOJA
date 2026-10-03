import Link from 'next/link';
import type { ReactNode } from 'react';

export type Crumb = { label: string; href?: string };

/** Breadcrumb over the title on the left, primary actions on the right. */
export function PageHeader({ title, crumbs, actions }: { title: string; crumbs: Crumb[]; actions?: ReactNode }) {
  return (
    <header className="pagehead">
      <div style={{ minWidth: 0 }}>
        <nav className="crumbs" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} style={{ display: 'inline-flex', gap: 8 }}>
              {i > 0 && <span aria-hidden="true">/</span>}
              {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
            </span>
          ))}
        </nav>
        <h1>{title}</h1>
      </div>
      {actions && <div className="pagehead-actions">{actions}</div>}
    </header>
  );
}
