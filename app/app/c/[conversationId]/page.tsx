import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChatView } from '@/components/chat/ChatView';
import type { Member } from '@/components/chat/ConversationInfoModal';
import type { Conversation, MemberRole, Profile } from '@/lib/types/database';

type MemberRow = {
  user_id: string;
  role: MemberRole;
  last_read_at: string | null;
  joined_at: string;
  profiles: Profile;
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();

  // RLS ensures we only see conversations we belong to.
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conversation) notFound();

  const { data: memberRows } = await supabase
    .from('conversation_members')
    .select('user_id, role, last_read_at, joined_at, profiles(*)')
    .eq('conversation_id', conversationId)
    .order('joined_at', { ascending: true });

  const members: Member[] = ((memberRows ?? []) as unknown as MemberRow[])
    .filter((r) => r.profiles)
    .map((r) => ({
      user_id: r.user_id,
      role: r.role,
      last_read_at: r.last_read_at,
      profile: r.profiles,
    }));

  return <ChatView conversation={conversation as Conversation} initialMembers={members} />;
}
