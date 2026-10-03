'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SECTIONS, isActive } from './nav';

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {SECTIONS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="nav-pill" aria-current={isActive(pathname, href) ? 'page' : undefined}>
          <Icon size={17} aria-hidden="true" />
          <span className="label">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
