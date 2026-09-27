'use client';
import { Camera, CheckCircle2, Clock, Link2, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import { submitPractical } from '@/features/assessment/actions';
import { SCORE_LABELS, averageScore } from '@/lib/rubric';
import { supabaseBrowser } from '@/lib/supabase/browser';
import type { LearnerPractical, PracticalSubmission } from '@/lib/types';

const MAX_PHOTOS = 5;

/** Phone photos are 3–8 MB; a 1600px JPEG is ~300 KB and plenty for review. */
async function toJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('resize failed'))), 'image/jpeg', 0.85));
}

export function Practical({ practical, viewerId, demo }: { practical: LearnerPractical; viewerId: string; demo: boolean }) {
  const latest = practical.submissions[0] ?? null;
  const canSubmit = !latest || latest.status === 'redo';

  return (
    <div className="col" style={{ gap: 16 }}>
      <section className="card" style={{ background: 'var(--soft-2)' }}>
        <h3 style={{ margin: '0 0 6px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Camera size={18} color="var(--violet)" aria-hidden="true" /> Show your wrap
        </h3>
        <p style={{ margin: '0 0 10px', whiteSpace: 'pre-line' }}>{practical.brief}</p>
        <div className="muted small">
          A trainer scores: {practical.rubric.map((c) => c.label).join(' · ')}
        </div>
      </section>

      {latest?.status === 'approved' && (
        <p className="notice ok" role="status" style={{ margin: 0 }}>
          <CheckCircle2 size={16} aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Approved. Lovely work. +60 XP
        </p>
      )}
      {latest?.status === 'submitted' && (
        <p className="notice" role="status" style={{ margin: 0, background: 'var(--sky-tint)', color: 'var(--sky-deep)' }}>
          <Clock size={16} aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Sent. A trainer usually replies within a day.
        </p>
      )}

      {canSubmit && <SubmitForm practical={practical} viewerId={viewerId} demo={demo} isRedo={latest?.status === 'redo'} />}

      {practical.submissions.length > 0 && (
        <section>
          <h3 style={{ fontSize: 15, margin: '0 0 8px' }}>Your submissions</h3>
          <ol className="timeline">
            {practical.submissions.map((s) => (
              <SubmissionItem key={s.id} s={s} rubric={practical.rubric} />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function SubmitForm({ practical, viewerId, demo, isRedo }: { practical: LearnerPractical; viewerId: string; demo: boolean; isRedo: boolean }) {
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { pending, error, run } = useAction();

  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), [files]);

  const add = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).filter((f) => f.type.startsWith('image/'));
    setFiles((cur) => [...cur, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_PHOTOS));
  };

  const submit = async () => {
    setUploadError(null);
    if (demo) {
      run(() => submitPractical({ assignmentId: practical.id, paths: [], link, note }));
      return;
    }
    setUploading(true);
    const paths: string[] = [];
    try {
      const storage = supabaseBrowser().storage.from('submissions');
      for (const { file } of files) {
        const blob = await toJpeg(file);
        const path = `${viewerId}/${practical.id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await storage.upload(path, blob, { contentType: 'image/jpeg', upsert: false });
        if (upErr) throw upErr;
        paths.push(path);
      }
    } catch (e) {
      console.error(e);
      setUploadError('A photo didn’t upload. Check your connection and try again.');
      setUploading(false);
      return;
    }
    setUploading(false);
    run(() => submitPractical({ assignmentId: practical.id, paths, link, note }), () => {
      setFiles([]);
      setLink('');
      setNote('');
    });
  };

  const busy = uploading || pending;
  return (
    <section className="card form" aria-label="Submit your practical">
      <h3 style={{ margin: 0, fontSize: 15 }}>{isRedo ? 'Try again' : 'Send your work'}</h3>
      <div className="photos">
        {files.map((f, i) => (
          <div key={f.url} className="photo-slot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={`Photo ${i + 1}`} />
            <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setFiles((cur) => cur.filter((x) => x !== f))}>
              <X size={14} />
            </button>
          </div>
        ))}
        {files.length < MAX_PHOTOS && (
          <label className="drop">
            <Camera size={22} aria-hidden="true" />
            Add photo
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
          </label>
        )}
      </div>
      <span className="hint small muted">Up to {MAX_PHOTOS} photos in daylight. Show the top and the seams.</span>
      <div className="field">
        <label htmlFor="pr-link">
          <Link2 size={13} aria-hidden="true" /> Video link (optional)
        </label>
        <input id="pr-link" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtu.be/… or a Google Drive link" />
      </div>
      <div className="field">
        <label htmlFor="pr-note">Note for your trainer (optional)</label>
        <textarea id="pr-note" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} placeholder="Took 12 minutes. The ribbon kept slipping." style={{ minHeight: 64 }} />
      </div>
      {(uploadError || error) && (
        <p className="notice err" role="alert" style={{ margin: 0 }}>
          {uploadError ?? error}
        </p>
      )}
      <button type="button" className="btn btn-primary" disabled={busy || (!files.length && !link.trim())} onClick={() => void submit()}>
        {uploading ? 'Uploading photos…' : pending ? 'Sending…' : isRedo ? 'Send again' : 'Send to trainer'}
      </button>
    </section>
  );
}

function Dots({ n }: { n: number }) {
  return (
    <span className="dots" aria-label={`${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= n ? 'on' : ''} />
      ))}
    </span>
  );
}

function SubmissionItem({ s, rubric }: { s: PracticalSubmission; rubric: LearnerPractical['rubric'] }) {
  const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(s.createdAt));
  const avg = s.review ? averageScore(s.review.scores) : null;
  return (
    <li>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span className="muted small">Sent {when}</span>
        <span className={`chip ${s.status === 'approved' ? 'live' : s.status === 'redo' ? 'warn' : 'draft'}`}>
          {s.status === 'approved' ? 'Approved' : s.status === 'redo' ? (
            <>
              <RotateCcw size={12} aria-hidden="true" /> Redo
            </>
          ) : (
            'Waiting for review'
          )}
        </span>
      </div>
      {s.photoUrls.length > 0 && (
        <div className="photos" style={{ marginBottom: 8 }}>
          {s.photoUrls.map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Submitted photo ${i + 1}`} loading="lazy" />
            </a>
          ))}
        </div>
      )}
      {s.link && (
        <a className="small" href={s.link} target="_blank" rel="noreferrer" style={{ color: 'var(--violet-deep)', fontWeight: 600 }}>
          Video link ↗
        </a>
      )}
      {s.note && <p className="small muted" style={{ margin: '6px 0 0' }}>“{s.note}”</p>}
      {s.review && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--hair)' }}>
          <b className="small">
            {s.review.reviewerName}
            {avg !== null && ` · ${avg}/5`}
          </b>
          <div className="scores">
            {rubric.map((c) => {
              const n = s.review!.scores[c.key];
              return n ? (
                <span key={c.key} style={{ display: 'contents' }}>
                  <span>{c.label}</span>
                  <span title={SCORE_LABELS[n]}>
                    <Dots n={n} />
                  </span>
                </span>
              ) : null;
            })}
          </div>
          {s.review.comment && <p style={{ margin: 0 }}>{s.review.comment}</p>}
        </div>
      )}
    </li>
  );
}
