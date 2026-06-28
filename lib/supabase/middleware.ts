import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refreshes the Supabase session on every request and gates protected routes.
 *
 * Critical correctness points (from review):
 *  - Refreshed cookies are written to BOTH the request and the SAME response
 *    object that is ultimately returned.
 *  - When we redirect, we copy those cookies onto the redirect response, or the
 *    refresh is lost and the session lapses.
 *  - We use getUser() (revalidated) — never getSession() — to gate routes.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === '/login' || pathname === '/signup';
  const isProtected = pathname.startsWith('/app');

  // Unauthenticated → bounce protected routes to /login, preserving destination.
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(url);
    copyCookies(response, redirect);
    return redirect;
  }

  // Authenticated → keep them out of the auth screens.
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/app';
    url.search = '';
    const redirect = NextResponse.redirect(url);
    copyCookies(response, redirect);
    return redirect;
  }

  return response;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
}
