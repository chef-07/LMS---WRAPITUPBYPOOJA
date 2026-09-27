'use client';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import type { School } from '@/lib/types';
import { createCourse } from './actions';

export function NewCourse({ schools }: { schools: School[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const { pending, error, run } = useAction();

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus size={18} aria-hidden="true" /> New course
      </button>
    );
  }
  return (
    <form
      className="card form"
      style={{ width: '100%', maxWidth: 560 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createCourse({ title, schoolId }), (d) => d && router.push(`/admin/courses/${d.id}`));
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16 }}>New course</h2>
      <div className="form-row">
        <div className="field">
          <label htmlFor="nc-title">Title</label>
          <input id="nc-title" autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rakhi Hamper Basics" />
        </div>
        <div className="field">
          <label htmlFor="nc-school">School</label>
          <select id="nc-school" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.emoji} {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p className="notice err" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create and open'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <span className="muted small">It starts as a draft. Nobody sees it until you publish.</span>
      </div>
    </form>
  );
}
