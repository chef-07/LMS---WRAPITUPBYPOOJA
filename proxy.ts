import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isDemo } from '@/lib/supabase/config';

/**
 * Keeps the Supabase session fresh on every request and sends signed-out
 * visitors to /login. Access itself is re-checked in the database on every
 * query (RLS), so a disabled account loses access immediately.
 */
export async function proxy(req: NextRequest) {
  if (isDemo) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await sb.auth.getUser();

  const path = req.nextUrl.pathname;
  const isPublic = path.startsWith('/login') || path.startsWith('/auth') || path.startsWith('/verify');
  if (!data.user && !isPublic) {
    if (path.startsWith('/api/')) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)'],
};
