'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOBILE_TABS, isActive } from './nav';

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottomnav" aria-label="Main">
      {MOBILE_TABS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={isActive(pathname, href) ? 'page' : undefined}>
          <Icon size={20} aria-hidden="true" />
          {label === 'SOP Library' ? 'SOPs' : label}
        </Link>
      ))}
    </nav>
  );
}
