import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /*
   * Only the routes that actually need an auth decision:
   *  - /app/*   refresh the session + gate (unauthenticated → /login)
   *  - /login, /signup   bounce already-authenticated users to /app
   *
   * Everything else (landing, /auth/callback, static assets) skips the
   * middleware entirely. This matters: Edge middleware ignores the vercel.json
   * region pin, so every invocation is a transpacific getUser() round-trip to
   * Supabase (Seoul). Public pages don't need it — keeping them off the
   * middleware makes the landing effectively static and instant.
   */
  matcher: ['/app/:path*', '/login', '/signup'],
};
