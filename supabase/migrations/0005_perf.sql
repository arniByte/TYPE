-- ════════════════════════════════════════════════════════════════════════
--  TYPE — 0005: performance (RLS init-plan, FK indexes, realtime WAL)
--  From the Supabase performance advisor. Already applied to the live project.
-- ════════════════════════════════════════════════════════════════════════

-- 1. RLS init-plan fix: wrap auth.uid() in (select …) so it is evaluated ONCE
--    per query (InitPlan) instead of re-evaluated for every row.
alter policy "profiles_insert_own" on public.profiles
  with check (id = (select auth.uid()));
alter policy "profiles_update_own" on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy "contacts_select" on public.contacts
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));
alter policy "conversations_select" on public.conversations
  using (public.is_conversation_member(id, (select auth.uid())));
alter policy "members_select" on public.conversation_members
  using (user_id = (select auth.uid()) or public.is_conversation_member(conversation_id, (select auth.uid())));
alter policy "members_update_own" on public.conversation_members
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "members_delete_own" on public.conversation_members
  using (user_id = (select auth.uid()));
alter policy "messages_select" on public.messages
  using (public.is_conversation_member(conversation_id, (select auth.uid())));
alter policy "messages_insert" on public.messages
  with check (
    sender_id = (select auth.uid())
    and type <> 'system'
    and public.is_conversation_member(conversation_id, (select auth.uid()))
  );

-- 2. Covering indexes for the previously-unindexed foreign keys.
create index if not exists messages_sender_idx on public.messages (sender_id);
create index if not exists contacts_requester_idx on public.contacts (requester_id);
create index if not exists contacts_addressee_idx on public.contacts (addressee_id);
create index if not exists contacts_blocked_by_idx on public.contacts (blocked_by);
create index if not exists conversations_created_by_idx on public.conversations (created_by);

-- 3. Drop the unused index that was rewritten on every message (last_message_at
--    bump) but never read (the overview RPC sorts in memory).
drop index if exists public.conversations_last_msg_idx;

-- 4. Lighten realtime WAL: REPLICA IDENTITY FULL isn't needed — we never
--    hard-delete, postgres_changes filters match the NEW row, and the client
--    only reads payload.new.
alter table public.messages replica identity default;
alter table public.conversation_members replica identity default;
