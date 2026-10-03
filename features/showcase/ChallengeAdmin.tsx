'use client';
import { Trash2, Trophy } from 'lucide-react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useAction } from '@/components/ui/useAction';
import { deleteChallenge, pickWinner, saveChallenge } from '@/features/team-life/actions';
import type { Challenge, ShowcasePost } from '@/lib/team-life';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const plus = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export function ChallengeForm() {
  const [f, setF] = useState({ title: '', brief: '', startsOn: today(), endsOn: plus(today(), 6) });
  const { pending, error, run } = useAction();
  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveChallenge(f), () => setF({ title: '', brief: '', startsOn: today(), endsOn: plus(today(), 6) }));
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16 }}>New Wrap of the Week</h2>
      <div className="field">
        <label htmlFor="ch-title">Challenge</label>
        <input id="ch-title" required value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Rakhi box in 10 minutes" />
      </div>
      <div className="field">
        <label htmlFor="ch-brief">Brief</label>
        <textarea id="ch-brief" value={f.brief} maxLength={2000} onChange={(e) => setF({ ...f, brief: e.target.value })} placeholder="Pleated top, mini bow, photo from above in daylight." />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="ch-start">Opens</label>
          <input id="ch-start" type="date" value={f.startsOn} onChange={(e) => setF({ ...f, startsOn: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="ch-end">Closes</label>
          <input id="ch-end" type="date" value={f.endsOn} onChange={(e) => setF({ ...f, endsOn: e.target.value })} />
        </div>
      </div>
      {error && <p className="notice err" role="alert" style={{ margin: 0 }}>{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Create challenge'}
      </button>
    </form>
  );
}

export function ChallengeCard({ c, entries }: { c: Challenge; entries: ShowcasePost[] }) {
  const act = useAction();
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2 style={{ margin: 0 }}>{c.title}</h2>
          <div className="muted small">
            {c.startsOn} → {c.endsOn} · {c.isOpen ? 'Open' : c.endsOn < today() ? 'Closed' : 'Not open yet'} · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
        <ConfirmButton label={`Delete ${c.title}`} title={`Delete “${c.title}”?`} body="Entries stay on the wall, just no longer tied to this challenge." confirmLabel="Delete" onConfirm={() => act.run(() => deleteChallenge({ id: c.id }))}>
          <Trash2 size={16} />
        </ConfirmButton>
      </div>
      {entries.length === 0 ? (
        <p className="muted small" style={{ margin: 0 }}>No entries yet.</p>
      ) : (
        <div className="photos" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {entries.map((p) => (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {p.photoUrls[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photoUrls[0]} alt={`Entry by ${p.author}`} />
              ) : (
                <div className="ph" style={{ display: 'grid', placeItems: 'center', fontSize: 32 }} aria-hidden="true">🎁</div>
              )}
              <span className="small"><b>{p.author}</b></span>
              {c.winnerPostId === p.id ? (
                <span className="chip warn"><Trophy size={12} aria-hidden="true" /> Winner</span>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" disabled={act.pending} onClick={() => act.run(() => pickWinner({ challengeId: c.id, postId: p.id }))}>
                  <Trophy size={13} aria-hidden="true" /> Pick as winner
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {act.error && <p className="notice err" style={{ margin: '8px 0 0' }}>{act.error}</p>}
    </section>
  );
}
