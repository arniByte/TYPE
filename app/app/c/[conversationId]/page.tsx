import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChatView } from '@/components/chat/ChatView';
import type { Member } from '@/components/chat/ConversationInfoModal';
import type { Conversation, MemberRole, Message, Profile } from '@/lib/types/database';

type MemberRow = {
  user_id: string;
  role: MemberRole;
  last_read_at: string | null;
  joined_at: string;
  profiles: Profile;
};

const PAGE = 30;

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();

  // Conversation + roster + latest messages, all in parallel. RLS ensures we
  // only see (and only receive messages for) conversations we belong to.
  const [{ data: conversation }, { data: memberRows }, { data: messageRows }] = await Promise.all([
    supabase.from('conversations').select('*').eq('id', conversationId).maybeSingle(),
    supabase
      .from('conversation_members')
      .select('user_id, role, last_read_at, joined_at, profiles(*)')
      .eq('conversation_id', conversationId)
      .order('joined_at', { ascending: true }),
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(PAGE),
  ]);
  if (!conversation) notFound();

  const members: Member[] = ((memberRows ?? []) as unknown as MemberRow[])
    .filter((r) => r.profiles)
    .map((r) => ({
      user_id: r.user_id,
      role: r.role,
      last_read_at: r.last_read_at,
      profile: r.profiles,
    }));

  const initialMessages = ((messageRows ?? []) as Message[]).slice().reverse(); // ascending

  return (
    <ChatView
      conversation={conversation as Conversation}
      initialMembers={members}
      initialMessages={initialMessages}
    />
  );
}
