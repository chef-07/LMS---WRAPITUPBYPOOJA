'use client';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { youtubeId, youtubeThumb } from '@/lib/youtube';

/** The paste box: accepts any YouTube link shape and shows which video it found. */
export function VideoField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const found = value.trim() ? youtubeId(value) : null;
  return (
    <div className="field">
      <label htmlFor={id}>YouTube link</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Paste from YouTube’s Share button, e.g. https://youtu.be/…" inputMode="url" autoComplete="off" />
      {value.trim() && found && (
        <div className="video-found">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={youtubeThumb(found)} alt="" />
          <div className="small">
            <div className="vid-ok" style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
              <CheckCircle2 size={15} aria-hidden="true" /> Video found
            </div>
            <div className="muted">ID {found}. Make sure it is Unlisted with embedding allowed.</div>
          </div>
        </div>
      )}
      {value.trim() && !found && (
        <span className="small vid-missing" role="alert" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <AlertTriangle size={14} aria-hidden="true" /> That doesn’t look like a YouTube link.
        </span>
      )}
      {!value.trim() && <span className="hint">Leave empty for now; learners will see “Video coming soon”.</span>}
    </div>
  );
}
