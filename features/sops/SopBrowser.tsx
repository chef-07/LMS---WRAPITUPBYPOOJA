'use client';
import { FolderOpen, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/primitives';
import type { SopFolder } from '@/lib/team-life';
import { SopItemCard } from './SopItemCard';

export function SopBrowser({ folders }: { folders: SopFolder[] }) {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const hits = useMemo(
    () => (term.length < 2 ? [] : folders.flatMap((f) => f.items.filter((i) => `${i.title} ${i.body}`.toLowerCase().includes(term)).map((i) => ({ folder: f, item: i })))),
    [folders, term],
  );

  if (!folders.length) {
    return (
      <div className="card">
        <EmptyState icon={FolderOpen} title="The library is empty" body="Pooja adds step cards, reply templates and price sheets here." />
      </div>
    );
  }
  return (
    <>
      <div className="field" style={{ maxWidth: 480 }}>
        <label htmlFor="sop-search" className="sr-only">
          Search the library
        </label>
        <input id="sop-search" placeholder="Search templates, steps, price lists…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {term.length >= 2 ? (
        hits.length ? (
          <div className="sop-grid">
            {hits.map(({ folder, item }) => (
              <div key={item.id}>
                <div className="muted small" style={{ marginBottom: 4 }}>
                  {folder.emoji} {folder.title}
                </div>
                <SopItemCard item={item} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState icon={SearchX} title={`Nothing for “${q}”`} body="Try another word, like “price”, “ribbon” or “courier”." />
          </div>
        )
      ) : (
        <div className="grid-3">
          {folders.map((f) => (
            <Link key={f.id} href={`/sops/${f.id}`} className="card school-card course-card" style={{ color: 'inherit' }}>
              <span className="school-emoji tone-sunshine" aria-hidden="true">
                {f.emoji}
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 16 }}>{f.title}</h2>
                <p className="muted small" style={{ margin: '2px 0 6px' }}>
                  {f.description}
                </p>
                <span className="chip">
                  {f.items.length} {f.items.length === 1 ? 'card' : 'cards'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
