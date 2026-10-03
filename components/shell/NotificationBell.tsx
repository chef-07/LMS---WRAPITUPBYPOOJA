'use client';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { useDismiss } from './useDismiss';

export type BellItem = { id: string; title: string; body: string; href: string };

export function NotificationBell({ items }: { items: BellItem[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(box, open, close);

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button type="button" className="icon-btn" aria-label={`Notifications${items.length ? ` (${items.length} new)` : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell size={18} aria-hidden="true" />
        {items.length > 0 && <span className="dot" />}
      </button>
      {open && (
        <div className="menu" style={{ width: 320 }}>
          <div className="menu-label">Notifications</div>
          {items.length === 0 ? (
            <p className="muted small" style={{ padding: '6px 10px', margin: 0 }}>You’re all caught up.</p>
          ) : (
            items.map((n) => (
              <Link key={n.id} href={n.href} onClick={close} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, background: 'var(--tangerine-tint)', marginBottom: 4 }}>
                <b style={{ color: 'var(--ink)' }}>{n.title}</b>
                <span className="small">{n.body}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
