'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import { addModule } from './actions';

export function AddModule({ courseId, next }: { courseId: string; next: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const { pending, error, run } = useAction();
  if (!open) {
    return (
      <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(true)}>
        <Plus size={17} aria-hidden="true" /> Add module
      </button>
    );
  }
  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addModule({ courseId, title }), () => {
          setTitle('');
          setOpen(false);
        });
      }}
    >
      <div className="field">
        <label htmlFor="am-title">Module {next} title</label>
        <input id="am-title" autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Finishing touches" />
      </div>
      {error && (
        <p className="notice err" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add module'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
