import { MailCheck, MailX } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/shell/Logo';

export const metadata: Metadata = { title: 'Email settings' };

const WHAT: Record<string, string> = {
  reminders: 'reminder emails',
  streak: 'evening streak emails',
  digest: 'the Monday team summary',
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Public: the "stop these emails" link in every email lands here. It asks
 * first, because mail scanners open links on their own.
 */
export default async function UnsubscribePage({ searchParams }: Props) {
  const q = await searchParams;
  const one = (k: string) => (typeof q[k] === 'string' ? (q[k] as string) : '');
  const kind = one('k');
  const what = WHAT[kind] ?? 'these emails';
  const status = one('status');
  const action = `/api/email/unsubscribe?${new URLSearchParams({ u: one('u'), k: kind, t: one('t'), from: 'page' })}`;

  return (
    <main className="login-wrap">
      <div className="card login-card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <Logo />
        </div>
        {status === 'done' ? (
          <>
            <MailCheck size={36} color="var(--turquoise-deep)" aria-hidden="true" />
            <h1 style={{ fontFamily: 'var(--font-display)', margin: '8px 0' }}>Done</h1>
            <p className="muted">You won’t get {what} any more. You can switch them back on in Settings whenever you like.</p>
            <Link className="btn btn-primary" href="/settings">
              Open Settings
            </Link>
          </>
        ) : status === 'invalid' || (!status && (!one('u') || !one('t') || !WHAT[kind])) ? (
          <>
            <MailX size={36} color="var(--red-deep)" aria-hidden="true" />
            <h1 style={{ fontFamily: 'var(--font-display)', margin: '8px 0' }}>This link doesn’t work</h1>
            <p className="muted">It may be incomplete. Sign in and switch emails off in Settings instead.</p>
            <Link className="btn btn-primary" href="/settings">
              Open Settings
            </Link>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', margin: '8px 0' }}>Stop {what}?</h1>
            <p className="muted">Your training and progress stay exactly as they are. Only these emails stop.</p>
            {status === 'error' && (
              <p className="notice err" role="alert">
                That didn’t save. Try again in a minute.
              </p>
            )}
            <form method="post" action={action}>
              <button className="btn btn-primary" type="submit">
                Yes, stop {what}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
