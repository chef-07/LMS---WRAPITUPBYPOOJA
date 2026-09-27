'use client';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useAction } from '@/components/ui/useAction';
import { deleteSopItem, moveSopItem, saveSopItem } from '@/features/team-life/actions';
import { clock, parseClock } from '@/lib/format';
import { supabaseBrowser } from '@/lib/supabase/browser';
import type { SopItem, SopKind } from '@/lib/team-life';

const KIND_LABEL: Record<SopKind, string> = { template: 'Reply template (copyable)', steps: 'Step-by-step checklist', link: 'Link', file: 'File (PDF or image)' };

export function ItemList({ folderId, items, lessons }: { folderId: string; items: SopItem[]; lessons: { id: string; label: string }[] }) {
  const [editing, setEditing] = useState<string | 'new' | null>(items.length ? null : 'new');
  const act = useAction();
  return (
    <div className="col">
      {items.map((i, idx) => (
        <section key={i.id} className="card">
          <div className="list-row" style={{ border: 0, padding: 0 }}>
            <div className="grow">
              <div className="title">{i.title}</div>
              <div className="muted small">{KIND_LABEL[i.kind]}{i.lesson ? ` · linked to “${i.lesson.title}”` : ''}</div>
            </div>
            <div className="row-actions">
              <button className="icon-sm" type="button" aria-label={`Move ${i.title} up`} disabled={idx === 0 || act.pending} onClick={() => act.run(() => moveSopItem({ id: i.id, dir: 'up' }))}>
                <ArrowUp size={16} />
              </button>
              <button className="icon-sm" type="button" aria-label={`Move ${i.title} down`} disabled={idx === items.length - 1 || act.pending} onClick={() => act.run(() => moveSopItem({ id: i.id, dir: 'down' }))}>
                <ArrowDown size={16} />
              </button>
              <button className="icon-sm" type="button" aria-label={`Edit ${i.title}`} onClick={() => setEditing(editing === i.id ? null : i.id)}>
                <Pencil size={16} />
              </button>
              <ConfirmButton label={`Delete ${i.title}`} title={`Delete “${i.title}”?`} body={i.kind === 'file' ? 'The uploaded file is deleted too.' : 'It disappears from the library for everyone.'} confirmLabel="Delete" onConfirm={() => act.run(() => deleteSopItem({ id: i.id }))}>
                <Trash2 size={16} />
              </ConfirmButton>
            </div>
          </div>
          {editing === i.id && <ItemForm folderId={folderId} item={i} lessons={lessons} onDone={() => setEditing(null)} />}
        </section>
      ))}
      {act.error && (
        <p className="notice err" role="alert" style={{ margin: 0 }}>
          {act.error}
        </p>
      )}
      {editing === 'new' ? (
        <section className="card">
          <h2 style={{ margin: '0 0 10px', fontSize: 16 }}>New card</h2>
          <ItemForm folderId={folderId} lessons={lessons} onDone={() => setEditing(null)} />
        </section>
      ) : (
        <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setEditing('new')}>
          <Plus size={16} aria-hidden="true" /> Add card
        </button>
      )}
    </div>
  );
}

function ItemForm({ folderId, item, lessons, onDone }: { folderId: string; item?: SopItem; lessons: { id: string; label: string }[]; onDone: () => void }) {
  const [kind, setKind] = useState<SopKind>(item?.kind ?? 'template');
  const [title, setTitle] = useState(item?.title ?? '');
  const [body, setBody] = useState(item?.body ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [lessonId, setLessonId] = useState(item?.lessonId ?? '');
  const [at, setAt] = useState(item?.lessonSeconds ? clock(item.lessonSeconds) : '');
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const { pending, error, run } = useAction();

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploadErr(null);
    if (file.size > 15 * 1024 * 1024) return setUploadErr('Files up to 15 MB.');
    setUploading(true);
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-60);
    const path = `${folderId}/${crypto.randomUUID()}-${safe}`;
    const { error: e } = await supabaseBrowser().storage.from('sops').upload(path, file, { contentType: file.type });
    setUploading(false);
    if (e) setUploadErr('Upload failed. PDFs and images only, up to 15 MB.');
    else {
      setUrl(path);
      if (!title) setTitle(file.name.replace(/\.[a-z0-9]+$/i, ''));
    }
  };

  const secs = at.trim() ? parseClock(at) : null;
  return (
    <form
      className="form"
      style={{ marginTop: 12 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveSopItem({ id: item?.id, folderId, kind, title, body, url, lessonId: lessonId || null, lessonSeconds: secs }), onDone);
      }}
    >
      <div className="form-row">
        <div className="field">
          <label htmlFor={`k-${item?.id ?? 'new'}`}>Type</label>
          <select id={`k-${item?.id ?? 'new'}`} value={kind} onChange={(e) => setKind(e.target.value as SopKind)} disabled={!!item}>
            {(Object.keys(KIND_LABEL) as SopKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`t-${item?.id ?? 'new'}`}>Title</label>
          <input id={`t-${item?.id ?? 'new'}`} required value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'template' ? 'First reply to an enquiry' : 'Signature box wrap'} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`b-${item?.id ?? 'new'}`}>{kind === 'template' ? 'Message to copy' : kind === 'steps' ? 'Steps (one per line)' : 'Note (optional)'}</label>
        <textarea
          id={`b-${item?.id ?? 'new'}`}
          value={body}
          maxLength={5000}
          onChange={(e) => setBody(e.target.value)}
          style={{ minHeight: kind === 'link' || kind === 'file' ? 60 : 130 }}
          placeholder={kind === 'template' ? 'Hi {name}! 🎁 Thank you for reaching out…' : kind === 'steps' ? 'Measure paper\nCrease every edge\nTape under the fold' : ''}
        />
      </div>
      {kind === 'link' && (
        <div className="field">
          <label htmlFor={`u-${item?.id ?? 'new'}`}>Link</label>
          <input id={`u-${item?.id ?? 'new'}`} inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
      )}
      {kind === 'file' && (
        <div className="field">
          <span className="label">File</span>
          <label className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>
            <Upload size={14} aria-hidden="true" /> {uploading ? 'Uploading…' : url ? 'Replace file' : 'Choose PDF or image'}
            <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => void upload(e.target.files?.[0])} />
          </label>
          {url && <span className="hint">Uploaded ✓</span>}
          {uploadErr && <span className="small" style={{ color: 'var(--red-deep)' }}>{uploadErr}</span>}
        </div>
      )}
      <div className="form-row">
        <div className="field">
          <label htmlFor={`l-${item?.id ?? 'new'}`}>Link to a lesson (optional)</label>
          <select id={`l-${item?.id ?? 'new'}`} value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
            <option value="">None</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`a-${item?.id ?? 'new'}`}>Start the video at (optional)</label>
          <input id={`a-${item?.id ?? 'new'}`} value={at} onChange={(e) => setAt(e.target.value)} placeholder="4:10" disabled={!lessonId} />
        </div>
      </div>
      {error && (
        <p className="notice err" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={pending || uploading || (at.trim() !== '' && secs === null)}>
          {pending ? 'Saving…' : 'Save card'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={onDone}>
          Cancel
        </button>
        {at.trim() !== '' && secs === null && <span className="small" style={{ color: 'var(--red-deep)' }}>Write the time like 4:10</span>}
      </div>
    </form>
  );
}
