'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import { saveSopFolder } from '@/features/team-life/actions';
import { DEPARTMENTS, type Department } from '@/lib/types';

export type FolderValues = { id?: string; title: string; emoji: string; description: string; departments: Department[] };

export function FolderForm({ initial, onDone }: { initial?: FolderValues; onDone?: () => void }) {
  const router = useRouter();
  const [f, setF] = useState<FolderValues>(initial ?? { title: '', emoji: '📁', description: '', departments: [] });
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAction();
  const toggle = (d: Department) => setF((s) => ({ ...s, departments: s.departments.includes(d) ? s.departments.filter((x) => x !== d) : [...s.departments, d] }));
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        run(() => saveSopFolder(f), (d) => {
          setSaved(true);
          if (!f.id && d) router.push(`/admin/sops/${d.id}`);
          onDone?.();
        });
      }}
    >
      <div className="form-row" style={{ gridTemplateColumns: '90px 1fr' }}>
        <div className="field">
          <label htmlFor="sf-emoji">Icon</label>
          <input id="sf-emoji" value={f.emoji} maxLength={8} onChange={(e) => setF({ ...f, emoji: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="sf-title">Folder name</label>
          <input id="sf-title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="WhatsApp replies" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="sf-desc">Description</label>
        <input id="sf-desc" value={f.description} maxLength={300} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Copy, personalise the name, send." />
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 6 }}>
          Who sees it?
        </legend>
        <div className="checks">
          {(Object.keys(DEPARTMENTS) as Department[]).map((d) => (
            <label key={d} className="check">
              <input type="checkbox" checked={f.departments.includes(d)} onChange={() => toggle(d)} />
              {DEPARTMENTS[d]}
            </label>
          ))}
        </div>
        <span className="hint">None ticked = everyone.</span>
      </fieldset>
      {error && (
        <p className="notice err" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Saving…' : f.id ? 'Save folder' : 'Create folder'}
        </button>
        {saved && !pending && (
          <span className="small vid-ok" role="status">
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
