'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ConversationOverview, Profile } from '@/lib/types/database';

type AppContextValue = {
  supabase: ReturnType<typeof createClient>;
  me: Profile;
  conversations: ConversationOverview[];
  loadingConversations: boolean;
  refreshConversations: () => Promise<void>;
  isOnline: (userId: string) => boolean;
  onlineIds: Set<string>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

export function AppProvider({
  me,
  initialConversations = [],
  children,
}: {
  me: Profile;
  initialConversations?: ConversationOverview[];
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] = useState<ConversationOverview[]>(initialConversations);
  const [loadingConversations, setLoading] = useState(initialConversations.length === 0);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshConversations = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_conversation_overview');
    if (!error && data) {
      setConversations((data as unknown as ConversationOverview[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  // Debounced refresh so a burst of realtime events causes one round-trip.
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(refreshConversations, 250);
  }, [refreshConversations]);

  // Keep the realtime socket authenticated across token refreshes.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) supabase.realtime.setAuth(data.session.access_token);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        supabase.realtime.setAuth(session.access_token);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // Initial load + heartbeat.
  useEffect(() => {
    refreshConversations();
    const beat = () => supabase.rpc('heartbeat');
    beat();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') beat();
    }, 60_000);
    const onFocus = () => {
      beat();
      scheduleRefresh();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [supabase, refreshConversations, scheduleRefresh]);

  // Sidebar liveness: new messages, edits/deletes, and newly-joined conversations.
  useEffect(() => {
    const channel = supabase
      .channel('sidebar')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, scheduleRefresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, scheduleRefresh)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${me.id}` },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        scheduleRefresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, me.id, scheduleRefresh]);

  // Global online presence.
  useEffect(() => {
    const channel = supabase.channel('presence:online', {
      config: { presence: { key: me.id } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ at: Date.now() });
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, me.id]);

  const isOnline = useCallback((userId: string) => onlineIds.has(userId), [onlineIds]);

  const value: AppContextValue = {
    supabase,
    me,
    conversations,
    loadingConversations,
    refreshConversations,
    isOnline,
    onlineIds,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
