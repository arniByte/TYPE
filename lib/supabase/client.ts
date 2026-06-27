'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client. A single instance is reused across the app so the
 * realtime socket and auth state are shared (and re-authed on token refresh).
 */
let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
