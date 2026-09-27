import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Magic-link and Google sign-ins land here with a one-time code. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const oauthError = url.searchParams.get('error_description') ?? '';
  if (oauthError) {
    const reason = /invited|database error/i.test(oauthError) ? 'not_invited' : 'link';
    return NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin));
  }
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/', url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=link', url.origin));
}
