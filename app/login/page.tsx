import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/shell/Logo';
import { isDemo } from '@/lib/supabase/config';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (isDemo) redirect('/');
  const { error } = await searchParams;
  return (
    <div className="login-wrap">
      <div className="card login-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Logo />
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: '4px 0' }}>Welcome to the team 🎀</h1>
          <p className="muted" style={{ margin: 0 }}>
            Sign in with the email Pooja invited. There’s no password to remember.
          </p>
        </div>
        {error && (
          <p className="notice err" role="alert" style={{ margin: 0 }}>
            {error === 'not_invited' ? "That email hasn't been invited yet. Ask Pooja to send you an invite." : 'Sign-in link expired or was already used. Request a new one.'}
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
