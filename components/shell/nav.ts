import { BookOpen, CalendarDays, FolderOpen, GraduationCap, LayoutGrid, Sparkles, type LucideIcon } from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const SECTIONS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/schools', label: 'Schools', icon: BookOpen },
  { href: '/programs', label: 'Programs', icon: GraduationCap },
  { href: '/showcase', label: 'Showcase', icon: Sparkles },
  { href: '/live', label: 'Live', icon: CalendarDays },
  { href: '/sops', label: 'SOP Library', icon: FolderOpen },
];

export const MOBILE_TABS: NavItem[] = [SECTIONS[0]!, SECTIONS[1]!, SECTIONS[5]!, SECTIONS[3]!];

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/schools') return pathname.startsWith('/schools') || pathname.startsWith('/learn');
  return pathname === href || pathname.startsWith(`${href}/`);
}
