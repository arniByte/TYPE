import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Resolve the real public origin (Vercel sits behind a proxy). */
function resolveOrigin(request: Request, fallback: string) {
  const host = request.headers.get('x-forwarded-host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  return host ? `${proto}://${host}` : fallback;
}

/** Only allow relative redirect targets (open-redirect guard). */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/app';
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const base = resolveOrigin(request, origin);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const next = safeNext(searchParams.get('next'));

  if (error) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(errorDescription ?? error)}`,
    );
  }
  if (!code) {
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent('Missing authorization code')}`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(exchangeError.message)}`);
  }

  // Safety net for the OAuth-first-load profile race.
  await supabase.rpc('ensure_profile');

  return NextResponse.redirect(`${base}${next}`);
}
