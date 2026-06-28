import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function resolveOrigin(request: Request, fallback: string) {
  const host = request.headers.get('x-forwarded-host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  return host ? `${proto}://${host}` : fallback;
}

function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/app';
}

/** Handles email confirmation / magic-link / recovery links (verifyOtp). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const base = resolveOrigin(request, origin);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(searchParams.get('next'));

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      await supabase.rpc('ensure_profile');
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=${encodeURIComponent('Invalid or expired link')}`);
}
