'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mediaLabel } from '@/lib/utils';
import { useApp } from './AppProvider';
import { useRealtimeMessages, type ChatMessage } from '@/hooks/useRealtimeMessages';
import { useTyping } from '@/hooks/useTyping';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { Composer, type ReplyTarget } from './Composer';
import { ConversationInfoModal, type Member } from './ConversationInfoModal';
import type { Conversation, MemberRole, Message, Profile } from '@/lib/types/database';

type MemberRow = {
  user_id: string;
  role: MemberRole;
  last_read_at: string | null;
  joined_at: string;
  profiles: Profile;
};

export function ChatView({
  conversation,
  initialMembers,
  initialMessages = [],
}: {
  conversation: Conversation;
  initialMembers: Member[];
  initialMessages?: Message[];
}) {
  const { supabase, me, isOnline } = useApp();
  const isGroup = conversation.type === 'group';

  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [reply, setReply] = useState<ReplyTarget>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [scrollToken, setScrollToken] = useState(0);

  const { messages, initialLoaded, hasMore, loadingOlder, loadOlder, addPending, markFailed } =
    useRealtimeMessages(conversation.id, initialMessages);
  const { typing, notifyTyping, notifyStop } = useTyping(conversation.id);

  const profiles = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const m of members) map.set(m.user_id, m.profile);
    return map;
  }, [members]);

  const peer = useMemo(
    () => (isGroup ? null : members.find((m) => m.user_id !== me.id)?.profile ?? null),
    [isGroup, members, me.id],
  );
  const peerLastReadAt = useMemo(
    () => (isGroup ? null : members.find((m) => m.user_id !== me.id)?.last_read_at ?? null),
    [isGroup, members, me.id],
  );

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from('conversation_members')
      .select('user_id, role, last_read_at, joined_at, profiles(*)')
      .eq('conversation_id', conversation.id)
      .order('joined_at', { ascending: true });
    const rows = (data ?? []) as unknown as MemberRow[];
    setMembers(
      rows
        .filter((r) => r.profiles)
        .map((r) => ({
          user_id: r.user_id,
          role: r.role,
          last_read_at: r.last_read_at,
          profile: r.profiles,
        })),
    );
  }, [supabase, conversation.id]);

  // Keep the roster + read receipts fresh.
  useEffect(() => {
    const channel = supabase
      .channel(`members:${conversation.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_members', filter: `conversation_id=eq.${conversation.id}` },
        fetchMembers,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversation.id, fetchMembers]);

  // Mark read (debounced) on open, new messages, and refocus.
  const markTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markRead = useCallback(() => {
    if (document.visibilityState !== 'visible') return;
    if (markTimer.current) clearTimeout(markTimer.current);
    markTimer.current = setTimeout(() => {
      supabase.rpc('mark_read', { _conv: conversation.id });
    }, 350);
  }, [supabase, conversation.id]);

  const lastMessage = messages[messages.length - 1];
  const lastKey = lastMessage
    ? `${lastMessage.id}:${lastMessage.created_at}:${lastMessage.deleted_at ?? ''}`
    : '';
  useEffect(() => {
    markRead();
  }, [lastKey, markRead]);

  useEffect(() => {
    const handler = () => markRead();
    window.addEventListener('focus', handler);
    document.addEventListener('visibilitychange', handler);
    return () => {
      window.removeEventListener('focus', handler);
      document.removeEventListener('visibilitychange', handler);
    };
  }, [markRead]);

  const onReply = useCallback(
    (m: ChatMessage) => {
      const name =
        m.sender_id === me.id
          ? 'yourself'
          : profiles.get(m.sender_id)?.display_name || profiles.get(m.sender_id)?.username || 'Unknown';
      const text = m.deleted_at ? 'Deleted message' : m.content || mediaLabel(m.type);
      setReply({ id: m.id, name, text });
    },
    [me.id, profiles],
  );

  const online = !isGroup && peer ? isOnline(peer.id) : false;

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas lg:animate-none animate-slide-in-right">
      <ChatHeader
        conversation={conversation}
        peer={peer}
        memberCount={members.length}
        online={online}
        typingNames={typing}
        onOpenInfo={() => setInfoOpen(true)}
      />

      <MessageList
        messages={messages}
        me={me}
        profiles={profiles}
        isGroup={isGroup}
        peerLastReadAt={peerLastReadAt}
        initialLoaded={initialLoaded}
        hasMore={hasMore}
        loadingOlder={loadingOlder}
        loadOlder={loadOlder}
        onReply={onReply}
        scrollToken={scrollToken}
      />

      <Composer
        conversationId={conversation.id}
        reply={reply}
        onCancelReply={() => setReply(null)}
        addPending={addPending}
        markFailed={markFailed}
        onSent={() => setScrollToken((t) => t + 1)}
        notifyTyping={notifyTyping}
        notifyStop={notifyStop}
      />

      <ConversationInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        conversation={conversation}
        members={members}
        onChanged={fetchMembers}
      />
    </div>
  );
}
