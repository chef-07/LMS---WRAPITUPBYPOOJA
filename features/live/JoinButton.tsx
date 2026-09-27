'use client';
import { Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import { joinLive } from '@/features/team-life/actions';

/** Enabled from 15 minutes before the start; the server checks the same window. */
export function JoinButton({ id, startsAt, endsAt }: { id: string; startsAt: string; endsAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const { pending, error, run } = useAction();
  const opens = new Date(startsAt).getTime() - 15 * 60_000;
  const open = now >= opens && now <= new Date(endsAt).getTime();
  const mins = Math.max(0, Math.ceil((opens - now) / 60_000));
  const label = open ? 'Join now' : mins < 60 ? `Opens in ${mins} min` : mins < 1440 ? `Opens in ${Math.round(mins / 60)} h` : 'Link opens 15 min before';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
      <button
        type="button"
        className={`btn ${open ? 'btn-primary' : 'btn-ghost'} btn-sm`}
        disabled={!open || pending}
        onClick={() =>
          run(() => joinLive({ id }), (d) => {
            if (d?.url) window.open(d.url, '_blank', 'noopener');
          })
        }
      >
        <Video size={14} aria-hidden="true" /> {pending ? 'Opening…' : label}
      </button>
      {error && (
        <span className="small" role="alert" style={{ color: 'var(--red-deep)' }}>
          {error}
        </span>
      )}
    </div>
  );
}
