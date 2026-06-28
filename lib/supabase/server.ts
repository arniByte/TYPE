import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Server Supabase client for Server Components, Route Handlers and Server
 * Actions. `cookies()` is async in Next 15 and must be awaited.
 *
 * NOTE: Server Components cannot write cookies — the `setAll` below is wrapped
 * in try/catch and becomes a no-op there. Token refresh happens in middleware.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render — safe to ignore.
            // Middleware is responsible for refreshing the auth cookies.
          }
        },
      },
    },
  );
}
