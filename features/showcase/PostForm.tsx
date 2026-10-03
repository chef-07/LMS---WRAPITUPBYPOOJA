'use client';
import { Camera, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import { createPost } from '@/features/team-life/actions';
import { toJpeg } from '@/lib/image';
import { supabaseBrowser } from '@/lib/supabase/browser';

export function PostForm({ viewerId, challenge, demo, onDone }: { viewerId: string; challenge: { id: string; title: string } | null; demo: boolean; onDone: () => void }) {
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { pending, error, run } = useAction();
  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), [files]);

  const submit = async () => {
    setErr(null);
    if (demo) return run(() => createPost({ challengeId: null, caption, paths: ['demo/x.jpg'] }));
    setUploading(true);
    const paths: string[] = [];
    try {
      const storage = supabaseBrowser().storage.from('showcase');
      for (const { file } of files) {
        const path = `${viewerId}/${crypto.randomUUID()}.jpg`;
        const { error: e } = await storage.upload(path, await toJpeg(file), { contentType: 'image/jpeg' });
        if (e) throw e;
        paths.push(path);
      }
    } catch (e) {
      console.error(e);
      setErr('A photo didn’t upload. Check your connection and try again.');
      setUploading(false);
      return;
    }
    setUploading(false);
    run(() => createPost({ challengeId: challenge?.id ?? null, caption, paths }), onDone);
  };

  return (
    <section className="card form" aria-label={challenge ? `Enter ${challenge.title}` : 'Share your work'}>
      <h2 style={{ margin: 0, fontSize: 16 }}>{challenge ? `Enter: ${challenge.title}` : 'Share your work'}</h2>
      <div className="photos">
        {files.map((f, i) => (
          <div key={f.url} className="photo-slot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={`Photo ${i + 1}`} />
            <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setFiles((c) => c.filter((x) => x !== f))}>
              <X size={14} />
            </button>
          </div>
        ))}
        {files.length < 4 && (
          <label className="drop">
            <Camera size={22} aria-hidden="true" />
            Add photo
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
                setFiles((c) => [...c, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 4));
              }}
            />
          </label>
        )}
      </div>
      <div className="field">
        <label htmlFor="post-caption">Caption</label>
        <input id="post-caption" value={caption} maxLength={500} onChange={(e) => setCaption(e.target.value)} placeholder="Pleats took me three tries 😅" />
      </div>
      {(err || error) && (
        <p className="notice err" role="alert" style={{ margin: 0 }}>
          {err ?? error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn-primary" disabled={(!files.length && !demo) || uploading || pending} onClick={() => void submit()}>
          {uploading ? 'Uploading…' : pending ? 'Posting…' : challenge ? 'Enter · +40 XP' : 'Post to the wall'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
      </div>
    </section>
  );
}
