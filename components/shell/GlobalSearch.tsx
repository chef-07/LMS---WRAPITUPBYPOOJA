'use client';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDismiss } from './useDismiss';

export type SearchEntry = { group: 'Courses' | 'Lessons' | 'Schools'; title: string; sub: string; href: string };

/** "Search anything" (⌘K). Searches the catalogue the viewer can see. */
export function GlobalSearch({ index }: { index: SearchEntry[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(box, open, close);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return index.filter((e) => `${e.title} ${e.sub}`.toLowerCase().includes(term)).slice(0, 12);
  }, [q, index]);

  const groups = ['Schools', 'Courses', 'Lessons'] as const;
  const ordered = groups.flatMap((g) => results.filter((r) => r.group === g));

  return (
    <div className="search" ref={box} role="search">
      <label htmlFor="global-search" className="sr-only">
        Search anything
      </label>
      <input
        id="global-search"
        ref={input}
        placeholder="Search anything"
        value={q}
        autoComplete="off"
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, ordered.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && ordered[active]) {
            router.push(ordered[active].href);
            setOpen(false);
          }
        }}
      />
      <Search size={17} aria-hidden="true" />
      {open && q.trim().length >= 2 && (
        <div className="search-results">
          {ordered.length === 0 && <p className="muted small" style={{ padding: 10, margin: 0 }}>Nothing found for “{q}”.</p>}
          {groups.map((g) => {
            const rows = ordered.filter((r) => r.group === g);
            if (!rows.length) return null;
            return (
              <div key={g}>
                <div className="group">{g}</div>
                {rows.map((r) => (
                  <Link key={r.href} href={r.href} data-active={ordered[active] === r} onClick={() => setOpen(false)}>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div className="muted small">{r.sub}</div>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
