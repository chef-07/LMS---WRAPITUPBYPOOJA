'use client';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import type { EmailStatus } from '@/lib/email/status';
import { sendSampleEmail } from './email-actions';

const when = (iso: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(iso));

/** Admin only: is email set up, how the last week went, and a sample to check it end to end. */
export function EmailAdmin({ status }: { status: EmailStatus }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { pending, error, run } = useAction();
  const ready = status.sending && status.job;
  return (
    <section className="card" aria-labelledby="email-admin-h">
      <h2 id="email-admin-h" style={{ margin: '0 0 8px', fontSize: 16 }}>
        Team emails
      </h2>
      {ready ? (
        <p className="notice ok" style={{ margin: '0 0 10px' }}>
          On. Reminders go out around 9am and streak emails around 7pm, India time.
        </p>
      ) : (
        <p className="notice err" style={{ margin: '0 0 10px' }}>
          Not sending yet. Add {[!status.sending && 'RESEND_API_KEY', !status.job && 'CRON_SECRET'].filter(Boolean).join(' and ')} in Vercel (handover guide, section 10).
        </p>
      )}
      <dl className="kv small">
        <dt>From</dt>
        <dd>{status.from}</dd>
        <dt>Last 7 days</dt>
        <dd>
          {status.week.sent} sent{status.week.failed ? `, ${status.week.failed} failed` : ''}
        </dd>
        {status.lastSentAt && (
          <>
            <dt>Last sent</dt>
            <dd>{when(status.lastSentAt)}</dd>
          </>
        )}
        {status.lastError && (
          <>
            <dt>Last problem</dt>
            <dd>{status.lastError}</dd>
          </>
        )}
      </dl>
      <button type="button" className="btn btn-sm" disabled={pending || !status.sending} onClick={() => run(() => sendSampleEmail(), (d) => setSentTo(d?.to ?? null))} style={{ marginTop: 10 }}>
        <Send size={15} aria-hidden="true" /> {pending ? 'Sending…' : 'Send me a sample'}
      </button>
      {sentTo && (
        <p className="notice ok" role="status" style={{ margin: '8px 0 0' }}>
          Sent to {sentTo}. Check your inbox (and spam, the first time).
        </p>
      )}
      {error && (
        <p className="notice err" role="alert" style={{ margin: '8px 0 0' }}>
          {error}
        </p>
      )}
    </section>
  );
}
