import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppProvider } from '@/components/chat/AppProvider';
import { AppShell } from '@/components/chat/AppShell';
import type { Profile } from '@/lib/types/database';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Safety net for the OAuth-first-load profile race.
  await supabase.rpc('ensure_profile');

  let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) {
    await supabase.rpc('ensure_profile');
    ({ data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single());
  }

  const me: Profile =
    profile ??
    ({
      id: user.id,
      username: user.email?.split('@')[0] ?? 'you',
      display_name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      bio: null,
      status: 'Available',
      last_seen_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies Profile);

  return (
    <AppProvider me={me}>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
