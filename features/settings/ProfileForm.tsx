'use client';
import { Camera, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import { initials } from '@/lib/format';
import { toSquareJpeg } from '@/lib/image';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { DEPARTMENTS, type Viewer } from '@/lib/types';
import { updateProfile } from './actions';

export function ProfileForm({ viewer, demo }: { viewer: Viewer; demo: boolean }) {
  const [name, setName] = useState(viewer.fullName);
  const [preview, setPreview] = useState<string | null>(viewer.avatarUrl);
  const [photoPath, setPhotoPath] = useState<string | null | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const { pending, error, setError, run } = useAction();

  async function pick(f: File | undefined) {
    if (!f) return;
    setError(null);
    setSaved(false);
    if (!f.type.startsWith('image/')) return setError('Pick a photo (JPEG, PNG or WebP).');
    setUploading(true);
    try {
      const blob = await toSquareJpeg(f);
      setPreview(URL.createObjectURL(blob));
      if (demo) return setPhotoPath(null);
      const path = `${viewer.id}/p-${Date.now().toString(36)}.jpg`;
      const { error: upErr } = await supabaseBrowser().storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw upErr;
      setPhotoPath(path);
    } catch {
      setError('Could not upload that photo. Try another one.');
      setPreview(viewer.avatarUrl);
    } finally {
      setUploading(false);
      if (file.current) file.current.value = '';
    }
  }

  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        run(() => updateProfile({ fullName: name, photoPath }), () => {
          setSaved(true);
          setPhotoPath(undefined);
        });
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16 }}>Your profile</h2>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="avatar" style={{ width: 72, height: 72, fontSize: 22 }} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="" /> : initials(name || viewer.fullName)}
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            <Camera size={14} aria-hidden="true" /> {uploading ? 'Uploading…' : preview ? 'Change photo' : 'Add a photo'}
            <input ref={file} type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => void pick(e.target.files?.[0])} />
          </label>
          {preview && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setPreview(null);
                setPhotoPath(null);
                setSaved(false);
              }}
            >
              <Trash2 size={14} aria-hidden="true" /> Remove
            </button>
          )}
        </div>
      </div>
      <div className="field">
        <label htmlFor="set-name">Your name</label>
        <input id="set-name" required maxLength={80} value={name} autoComplete="name" onChange={(e) => { setName(e.target.value); setSaved(false); }} />
        <span className="hint">This is how you appear on the leaderboard, certificates and the Showcase wall.</span>
      </div>
      <dl className="kv small">
        <dt>Email</dt>
        <dd>{viewer.email}</dd>
        <dt>Team</dt>
        <dd>{viewer.department ? DEPARTMENTS[viewer.department] : '—'}</dd>
      </dl>
      <p className="muted small" style={{ margin: 0 }}>Need a different email or team? Ask Pooja to change it for you.</p>
      {error && <p className="notice err" role="alert" style={{ margin: 0 }}>{error}</p>}
      {saved && <p className="notice ok" role="status" style={{ margin: 0 }}>Saved.</p>}
      <button className="btn btn-primary" type="submit" disabled={pending || uploading} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
