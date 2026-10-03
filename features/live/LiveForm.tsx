'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import { saveLiveSession } from '@/features/team-life/actions';

export type LiveValues = { id?: string; title: string; host: string; description: string; startsAt: string | null; durationMinutes: number; joinUrl: string; recordingLessonId: string | null };

/** datetime-local wants "YYYY-MM-DDTHH:mm" in the browser's own time zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LiveForm({ initial, lessons }: { initial?: LiveValues; lessons: { id: string; label: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState({
    title: initial?.title ?? '',
    host: initial?.host ?? 'Pooja',
    description: initial?.description ?? '',
    when: toLocalInput(initial?.startsAt ?? null),
    durationMinutes: initial?.durationMinutes ?? 60,
    joinUrl: initial?.joinUrl ?? '',
    recordingLessonId: initial?.recordingLessonId ?? '',
  });
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAction();
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        const startsAt = f.when ? new Date(f.when).toISOString() : '';
        run(
          () => saveLiveSession({ id: initial?.id, title: f.title, host: f.host, description: f.description, startsAt, durationMinutes: f.durationMinutes, joinUrl: f.joinUrl, recordingLessonId: f.recordingLessonId || null }),
          (d) => {
            setSaved(true);
            if (!initial?.id && d) router.push(`/admin/live/${d.id}`);
          },
        );
      }}
    >
      <div className="field">
        <label htmlFor="lv-title">Title</label>
        <input id="lv-title" required value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Diwali hamper live demo" />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="lv-when">Starts</label>
          <input id="lv-when" type="datetime-local" required value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="lv-dur">Length (minutes)</label>
          <input id="lv-dur" type="number" min={10} max={480} step={5} value={f.durationMinutes} onChange={(e) => setF({ ...f, durationMinutes: Number(e.target.value) })} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="lv-host">Host</label>
          <input id="lv-host" value={f.host} maxLength={80} onChange={(e) => setF({ ...f, host: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="lv-url">Google Meet / Zoom link</label>
          <input id="lv-url" inputMode="url" value={f.joinUrl} onChange={(e) => setF({ ...f, joinUrl: e.target.value })} placeholder="https://meet.google.com/…" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="lv-desc">What to bring / agenda</label>
        <textarea id="lv-desc" value={f.description} maxLength={1000} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Bring a 20 cm box, paper and ribbon." style={{ minHeight: 64 }} />
      </div>
      {initial?.id && (
        <div className="field">
          <label htmlFor="lv-rec">Recording (a lesson with the video)</label>
          <select id="lv-rec" value={f.recordingLessonId} onChange={(e) => setF({ ...f, recordingLessonId: e.target.value })}>
            <option value="">No recording yet</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="hint">Upload the recording to YouTube, add it as a lesson in Studio, then pick it here.</span>
        </div>
      )}
      {error && (
        <p className="notice err" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Saving…' : initial?.id ? 'Save session' : 'Schedule session'}
        </button>
        {saved && !pending && <span className="small vid-ok" role="status">Saved</span>}
      </div>
    </form>
  );
}
