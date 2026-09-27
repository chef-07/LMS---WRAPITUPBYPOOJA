'use client';
import { Megaphone, Pin, PinOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useAction } from '@/components/ui/useAction';
import { createAnnouncement, deleteAnnouncement, setAnnouncementPinned } from '@/features/team-life/actions';
import type { AdminAnnouncement } from '@/lib/team-life';

export function NewAnnouncement() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const { pending, error, run } = useAction();
  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createAnnouncement({ title, body }), () => {
          setTitle('');
          setBody('');
        });
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Megaphone size={18} aria-hidden="true" /> New announcement
      </h2>
      <div className="field">
        <label htmlFor="an-title">Headline</label>
        <input id="an-title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Diwali season starts 15 October" />
      </div>
      <div className="field">
        <label htmlFor="an-body">Details</label>
        <textarea id="an-body" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Finish “Festive Hamper Building” before then." />
      </div>
      {error && (
        <p className="notice err" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Posting…' : 'Pin to everyone’s dashboard'}
      </button>
    </form>
  );
}

export function AnnouncementRow({ a }: { a: AdminAnnouncement }) {
  const [open, setOpen] = useState(false);
  const act = useAction();
  const total = a.readers.length + a.notRead.length;
  return (
    <div className="list-row" style={{ flexWrap: 'wrap' }}>
      <div className="grow">
        <div className="title">{a.title}</div>
        <div className="muted small">
          {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(a.createdAt))} · {a.isPinned ? 'Pinned' : 'Not pinned'} ·{' '}
          <button type="button" className="linkish" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {a.readers.length} of {total} read
          </button>
        </div>
        {open && (
          <div className="small" style={{ marginTop: 6 }}>
            <div>
              <b>Read:</b> {a.readers.join(', ') || 'nobody yet'}
            </div>
            <div>
              <b>Not yet:</b> {a.notRead.join(', ') || 'everyone has read it 🎉'}
            </div>
          </div>
        )}
        {act.error && <p className="notice err" style={{ margin: '6px 0 0' }}>{act.error}</p>}
      </div>
      <div className="row-actions">
        <button className="icon-sm" type="button" aria-label={a.isPinned ? `Unpin ${a.title}` : `Pin ${a.title}`} title={a.isPinned ? 'Unpin' : 'Pin'} onClick={() => act.run(() => setAnnouncementPinned({ id: a.id, pinned: !a.isPinned }))}>
          {a.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
        </button>
        <ConfirmButton label={`Delete ${a.title}`} title={`Delete “${a.title}”?`} body="It disappears from every dashboard, with its read receipts." confirmLabel="Delete" onConfirm={() => act.run(() => deleteAnnouncement({ id: a.id }))}>
          <Trash2 size={16} />
        </ConfirmButton>
      </div>
    </div>
  );
}
