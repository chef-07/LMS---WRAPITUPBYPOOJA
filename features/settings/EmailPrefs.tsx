'use client';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import type { EmailPrefs as Prefs } from '@/lib/email/status';
import { updateEmailPrefs } from './email-actions';

const ROWS: { key: keyof Prefs; title: string; body: string; adminOnly?: boolean }[] = [
  { key: 'reminders', title: 'Reminders', body: 'A morning email when something needs you: a practical to redo, a quiz, a live session, a campaign due soon. Never more than one a day.' },
  { key: 'streak', title: 'Streak saver', body: 'An evening email when your learning streak would end tonight.' },
  { key: 'digest', title: 'Monday team summary', body: 'Last week’s numbers and who could use a word from you.', adminOnly: true },
];

/** Your own email switches; each change saves straight away. */
export function EmailPrefs({ prefs, isAdmin, email }: { prefs: Prefs; isAdmin: boolean; email: string }) {
  const [value, setValue] = useState(prefs);
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAction();
  return (
    <section className="card" aria-labelledby="email-prefs-h">
      <h2 id="email-prefs-h" style={{ margin: '0 0 4px', fontSize: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Mail size={18} aria-hidden="true" /> Emails
      </h2>
      <p className="muted small" style={{ margin: '0 0 6px' }}>
        Emails go to {email}.
      </p>
      <div className="pref-list">
        {ROWS.filter((r) => !r.adminOnly || isAdmin).map((r) => (
          <label key={r.key} className="pref-row">
            <span>
              <b>{r.title}</b>
              <span className="muted small">{r.body}</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={value[r.key]}
              disabled={pending}
              onChange={(e) => {
                const next = { ...value, [r.key]: e.target.checked };
                setValue(next);
                setSaved(false);
                run(() => updateEmailPrefs(next), () => setSaved(true));
              }}
            />
          </label>
        ))}
      </div>
      <p className="small muted" role="status" aria-live="polite" style={{ margin: '8px 0 0', minHeight: 18 }}>
        {pending ? 'Saving…' : saved ? 'Saved.' : ''}
      </p>
      {error && (
        <p className="notice err" role="alert" style={{ margin: '4px 0 0' }}>
          {error}
        </p>
      )}
    </section>
  );
}
