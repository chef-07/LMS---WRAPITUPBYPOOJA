'use client';
import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useAction } from '@/components/ui/useAction';
import type { StudioPractical } from '@/lib/admin';
import { DEFAULT_RUBRIC } from '@/lib/rubric';
import { deletePractical, savePractical } from './assessment-actions';

export function PracticalEditor({ lessonId, practical }: { lessonId: string; practical: StudioPractical | null }) {
  const [brief, setBrief] = useState(practical?.brief ?? '');
  const [criteria, setCriteria] = useState<string[]>((practical?.rubric ?? DEFAULT_RUBRIC).map((c) => c.label));
  const [saved, setSaved] = useState(false);
  const save = useAction();
  const del = useAction();

  return (
    <div className="form">
      <div className="field">
        <label htmlFor={`pr-brief-${lessonId}`}>What should they make?</label>
        <textarea
          id={`pr-brief-${lessonId}`}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          maxLength={2000}
          placeholder="Wrap a 20 × 20 cm box with the hidden-tape method. Take one photo from the top and one of the side seam in daylight."
        />
      </div>
      <div className="field">
        <span className="label">What the trainer scores (1–5 each)</span>
        {criteria.map((c, i) => (
          <div key={i} className="opt-edit" style={{ gridTemplateColumns: '1fr auto' }}>
            <input aria-label={`Scoring point ${i + 1}`} value={c} maxLength={60} onChange={(e) => setCriteria((cs) => cs.map((x, j) => (j === i ? e.target.value : x)))} />
            <button type="button" className="icon-sm" aria-label={`Remove scoring point ${i + 1}`} disabled={criteria.length <= 1} onClick={() => setCriteria((cs) => cs.filter((_, j) => j !== i))}>
              <X size={15} />
            </button>
          </div>
        ))}
        {criteria.length < 8 && (
          <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setCriteria((cs) => [...cs, ''])}>
            <Plus size={14} aria-hidden="true" /> Add scoring point
          </button>
        )}
      </div>
      {(save.error || del.error) && (
        <p className="notice err" role="alert" style={{ margin: 0 }}>
          {save.error ?? del.error}
        </p>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={save.pending}
          onClick={() => {
            setSaved(false);
            save.run(() => savePractical({ lessonId, brief, criteria }), () => setSaved(true));
          }}
        >
          {save.pending ? 'Saving…' : 'Save practical'}
        </button>
        {saved && !save.pending && (
          <span className="small vid-ok" role="status">
            Practical saved
          </span>
        )}
        {practical && (
          <ConfirmButton
            className="btn btn-ghost btn-sm"
            label="Delete practical"
            title="Delete this practical?"
            body="Everyone’s photo submissions and trainer reviews for it go too."
            confirmLabel="Delete practical"
            onConfirm={() => del.run(() => deletePractical({ lessonId }))}
          >
            <Trash2 size={14} aria-hidden="true" /> Delete practical
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}
