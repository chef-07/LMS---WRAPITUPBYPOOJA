'use client';
import { Megaphone } from 'lucide-react';
import { useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import { markAnnouncementRead } from '@/features/team-life/actions';
import type { Announcement } from '@/lib/types';

export function AnnouncementStrip({ a, demo }: { a: Announcement; demo: boolean }) {
  const [gone, setGone] = useState(false);
  const { pending, run } = useAction();
  if (gone) return null;
  return (
    <div className="announce" role="note">
      <span className="announce-icon">
        <Megaphone size={18} aria-hidden="true" />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <b>{a.title}</b>
        {a.body && (
          <div className="small" style={{ color: 'var(--ink-2)' }}>
            {a.body}
          </div>
        )}
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={pending}
        onClick={() => (demo ? setGone(true) : run(() => markAnnouncementRead({ id: a.id }), () => setGone(true)))}
      >
        Got it
      </button>
    </div>
  );
}
