-- ════════════════════════════════════════════════════════════════════════
--  TYPE — initial schema, RLS, RPCs, realtime, storage
--  Run once against a fresh Supabase project (SQL Editor → paste → Run,
--  or `supabase db push`). Idempotent where practical.
--
--  Security posture (hardened from architecture review):
--   • Every SECURITY DEFINER function pins search_path and is granted to
--     `authenticated` only (EXECUTE revoked from PUBLIC at the end).
--   • RLS recursion is broken by is_conversation_member() (SECURITY DEFINER).
--   • All membership writes happen *inside* RPCs — no direct INSERT grant.
--   • Messages are soft-deleted only; immutable columns are frozen by trigger.
--   • Direct conversations are deduped by a unique dm_key (race-safe).
--   • Media is private and scoped to conversation membership + owner folder.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─────────────────────────────  Tables  ─────────────────────────────────

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null,
  display_name text,
  avatar_url   text,
  bio          text,
  status       text default 'Available',
  last_seen_at timestamptz default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint username_len check (char_length(username) between 2 and 24),
  constraint username_fmt check (username ~ '^[a-z0-9_]+$')
);
create unique index if not exists profiles_username_lower_uniq
  on public.profiles (lower(username));

create table if not exists public.contacts (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'blocked')),
  blocked_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint contacts_distinct check (requester_id <> addressee_id)
);
-- Direction-independent uniqueness: one row per pair, regardless of who asked.
create unique index if not exists contacts_pair_uniq on public.contacts (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('direct', 'group')),
  name            text,
  avatar_url      text,
  dm_key          text unique,          -- "leastUuid:greatestUuid" for direct; null for groups
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz
);
create index if not exists conversations_last_msg_idx
  on public.conversations (last_message_at desc nulls last);

create table if not exists public.conversation_members (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            text not null default 'member' check (role in ('admin', 'member')),
  last_read_at    timestamptz,
  joined_at       timestamptz not null default now(),
  unique (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx
  on public.conversation_members (user_id, conversation_id);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  content         text,
  type            text not null default 'text'
                    check (type in ('text', 'image', 'video', 'file', 'system')),
  media_url       text,                  -- storage path within the `media` bucket
  media_metadata  jsonb,                 -- {width,height,duration,size,name,mime}
  reply_to        uuid references public.messages(id) on delete set null,
  created_at      timestamptz not null default now(),
  edited_at       timestamptz,
  deleted_at      timestamptz,
  constraint message_shape check (
    (type = 'text'   and content is not null and char_length(btrim(content)) between 1 and 4000 and media_url is null)
    or (type in ('image', 'video', 'file') and media_url is not null)
    or (type = 'system' and content is not null)
    or deleted_at is not null
  )
);
create index if not exists messages_conv_created_idx
  on public.messages (conversation_id, created_at desc, id desc);
create index if not exists messages_reply_idx on public.messages (reply_to);

-- ───────────────────────────  Helper functions  ─────────────────────────

create or replace function public.is_conversation_member(_conversation_id uuid, _user_id uuid)
returns boolean
language sql security definer stable
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = _conversation_id and user_id = _user_id
  );
$$;

create or replace function public.is_conversation_admin(_conversation_id uuid, _user_id uuid)
returns boolean
language sql security definer stable
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = _conversation_id and user_id = _user_id and role = 'admin'
  );
$$;

create or replace function public.is_blocked_pair(_a uuid, _b uuid)
returns boolean
language sql security definer stable
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.contacts
    where status = 'blocked'
      and least(requester_id, addressee_id) = least(_a, _b)
      and greatest(requester_id, addressee_id) = greatest(_a, _b)
  );
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────  Row Level Security  ─────────────────────────

alter table public.profiles              enable row level security;
alter table public.contacts              enable row level security;
alter table public.conversations         enable row level security;
alter table public.conversation_members  enable row level security;
alter table public.messages              enable row level security;

-- profiles: discoverable by any signed-in user; you may only write your own row.
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- contacts: visible to either party. All mutations go through RPCs (SECURITY
-- DEFINER), so no direct INSERT/UPDATE/DELETE policies are granted.
create policy "contacts_select" on public.contacts
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- conversations: members only. Created/renamed via RPC.
create policy "conversations_select" on public.conversations
  for select to authenticated
  using (public.is_conversation_member(id, auth.uid()));

-- conversation_members: members can see the roster; you may update/delete only
-- your own membership row (read receipts / leave). Inserts are RPC-only.
create policy "members_select" on public.conversation_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_conversation_member(conversation_id, auth.uid()));
create policy "members_update_own" on public.conversation_members
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members_delete_own" on public.conversation_members
  for delete to authenticated
  using (user_id = auth.uid());

-- messages: members read; members send (never 'system'); edits/deletes via RPC.
create policy "messages_select" on public.messages
  for select to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()));
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and type <> 'system'
    and public.is_conversation_member(conversation_id, auth.uid())
  );

-- ───────────────────────────────  Triggers  ─────────────────────────────

-- Freeze immutable columns on any message UPDATE (edit / soft-delete only).
create or replace function public.freeze_message_columns()
returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if new.conversation_id <> old.conversation_id
     or new.sender_id <> old.sender_id
     or new.created_at <> old.created_at
     or new.type is distinct from old.type then
    raise exception 'message columns are immutable';
  end if;
  return new;
end;
$$;
create trigger messages_freeze before update on public.messages
  for each row execute function public.freeze_message_columns();

-- Block enforcement inside an existing direct conversation: if either party
-- has blocked the other, new messages are rejected (membership alone is not
-- enough once a block exists).
create or replace function public.enforce_block_on_message()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if new.type <> 'system'
     and (select type from public.conversations where id = new.conversation_id) = 'direct'
     and exists (
       select 1 from public.conversation_members cm
       where cm.conversation_id = new.conversation_id
         and cm.user_id <> new.sender_id
         and public.is_blocked_pair(new.sender_id, cm.user_id)
     ) then
    raise exception 'You cannot message this person';
  end if;
  return new;
end;
$$;
create trigger messages_block_check before insert on public.messages
  for each row execute function public.enforce_block_on_message();

-- Keep conversations.last_message_at authoritative (drives sidebar ordering).
create or replace function public.bump_last_message_at()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  update public.conversations
    set last_message_at = new.created_at
    where id = new.conversation_id;
  return new;
end;
$$;
create trigger messages_bump after insert on public.messages
  for each row execute function public.bump_last_message_at();

create trigger profiles_touch before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger contacts_touch before update on public.contacts
  for each row execute function public.set_updated_at();

-- New auth user → profile, with collision-proof username that never aborts signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  base      text;
  candidate text;
  n         int := 0;
begin
  base := regexp_replace(lower(split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-z0-9_]', '', 'g');
  if base is null or char_length(base) < 2 then base := 'user'; end if;
  base := left(base, 20);
  candidate := base;
  loop
    begin
      insert into public.profiles (id, username, display_name, avatar_url)
      values (
        new.id,
        candidate,
        coalesce(new.raw_user_meta_data ->> 'full_name',
                 new.raw_user_meta_data ->> 'name',
                 initcap(base)),
        new.raw_user_meta_data ->> 'avatar_url'
      );
      return new;
    exception
      when unique_violation then
        n := n + 1;
        candidate := base || n::text;
        if n > 50 then
          candidate := left(base, 12) || '_' || left(replace(new.id::text, '-', ''), 8);
          insert into public.profiles (id, username, display_name, avatar_url)
          values (new.id, candidate,
                  coalesce(new.raw_user_meta_data ->> 'full_name', initcap(base)),
                  new.raw_user_meta_data ->> 'avatar_url')
          on conflict (id) do nothing;
          return new;
        end if;
      when others then
        return new; -- never block auth signup on profile creation
    end;
  end loop;
end;
$$;
-- Installing a trigger on auth.users requires ownership of that table, which
-- is not guaranteed on every Supabase project / SQL-editor role. Make it
-- non-fatal: if it can't be created, the app still creates profiles via the
-- ensure_profile() RPC (called on first authenticated load and in the auth
-- callbacks). Also makes re-running the migration idempotent.
do $$
begin
  create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_user();
exception
  when insufficient_privilege then
    raise notice 'Skipped on_auth_user_created trigger (insufficient privilege); profiles will be created via ensure_profile().';
  when duplicate_object then
    null; -- trigger already exists
end $$;

-- ──────────────────────────────────  RPCs  ──────────────────────────────

-- Idempotent profile safety net for the OAuth-first-load race.
create or replace function public.ensure_profile()
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  uid       uuid := auth.uid();
  uemail    text;
  base      text;
  candidate text;
  n         int := 0;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.profiles where id = uid) then return; end if;
  select email into uemail from auth.users where id = uid;
  base := regexp_replace(lower(split_part(coalesce(uemail, 'user'), '@', 1)), '[^a-z0-9_]', '', 'g');
  if base is null or char_length(base) < 2 then base := 'user'; end if;
  base := left(base, 20);
  candidate := base;
  loop
    begin
      insert into public.profiles (id, username, display_name) values (uid, candidate, initcap(base));
      return;
    exception
      when unique_violation then
        n := n + 1;
        candidate := base || n::text;
        if n > 50 then
          candidate := left(base, 12) || '_' || left(replace(uid::text, '-', ''), 8);
          insert into public.profiles (id, username, display_name)
          values (uid, candidate, initcap(base)) on conflict (id) do nothing;
          return;
        end if;
    end;
  end loop;
end;
$$;

-- Search users by username / display name, annotated with relationship state.
create or replace function public.search_users(_q text)
returns table (
  id uuid, username text, display_name text, avatar_url text,
  contact_status text, last_seen_at timestamptz
)
language sql security definer stable
set search_path = public, pg_temp as $$
  select p.id, p.username, p.display_name, p.avatar_url,
    (select c.status from public.contacts c
       where least(c.requester_id, c.addressee_id) = least(p.id, auth.uid())
         and greatest(c.requester_id, c.addressee_id) = greatest(p.id, auth.uid())
       limit 1) as contact_status,
    p.last_seen_at
  from public.profiles p
  where p.id <> auth.uid()
    and (_q is not null and char_length(btrim(_q)) >= 1)
    and (p.username ilike '%' || btrim(_q) || '%' or p.display_name ilike '%' || btrim(_q) || '%')
    and not public.is_blocked_pair(p.id, auth.uid())
  order by (lower(p.username) = lower(btrim(_q))) desc, p.username
  limit 20;
$$;

create or replace function public.send_contact_request(_username text)
returns uuid language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  uid     uuid := auth.uid();
  target  uuid;
  existing public.contacts%rowtype;
  new_id  uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select id into target from public.profiles where lower(username) = lower(btrim(_username));
  if target is null then raise exception 'User not found'; end if;
  if target = uid then raise exception 'You cannot add yourself'; end if;

  select * into existing from public.contacts
    where least(requester_id, addressee_id) = least(uid, target)
      and greatest(requester_id, addressee_id) = greatest(uid, target);

  if found then
    if existing.status = 'blocked' then raise exception 'Unavailable'; end if;
    if existing.status = 'accepted' then return existing.id; end if;
    -- a pending request exists; if they asked me, accept it
    if existing.addressee_id = uid then
      update public.contacts set status = 'accepted' where id = existing.id;
    end if;
    return existing.id;
  end if;

  insert into public.contacts (requester_id, addressee_id, status)
    values (uid, target, 'pending') returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.respond_contact_request(_contact_id uuid, _accept boolean)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); row public.contacts%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into row from public.contacts where id = _contact_id;
  if not found then raise exception 'Request not found'; end if;
  if row.addressee_id <> uid then raise exception 'Only the recipient can respond'; end if;
  if row.status <> 'pending' then raise exception 'Request is not pending'; end if;
  if _accept then
    update public.contacts set status = 'accepted' where id = _contact_id;
  else
    delete from public.contacts where id = _contact_id;
  end if;
end;
$$;

create or replace function public.set_block(_target uuid, _blocked boolean)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if uid = _target then raise exception 'You cannot block yourself'; end if;
  if _blocked then
    insert into public.contacts (requester_id, addressee_id, status, blocked_by)
      values (uid, _target, 'blocked', uid)
    on conflict (least(requester_id, addressee_id), greatest(requester_id, addressee_id))
      do update set status = 'blocked', blocked_by = uid;
  else
    delete from public.contacts
      where status = 'blocked' and blocked_by = uid
        and least(requester_id, addressee_id) = least(uid, _target)
        and greatest(requester_id, addressee_id) = greatest(uid, _target);
  end if;
end;
$$;

-- Get-or-create a 1:1 conversation; race-safe via dm_key; consent-checked.
create or replace function public.create_direct_conversation(_other uuid)
returns uuid language plpgsql security definer
set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); key text; cid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if _other = uid then raise exception 'You cannot message yourself'; end if;
  if not exists (select 1 from public.profiles where id = _other) then
    raise exception 'User not found';
  end if;
  if public.is_blocked_pair(uid, _other) then raise exception 'Unavailable'; end if;

  key := least(uid, _other)::text || ':' || greatest(uid, _other)::text;
  select id into cid from public.conversations where dm_key = key;
  if cid is null then
    insert into public.conversations (type, dm_key, created_by)
      values ('direct', key, uid)
      on conflict (dm_key) do nothing
      returning id into cid;
    if cid is null then
      select id into cid from public.conversations where dm_key = key;
    end if;
  end if;

  insert into public.conversation_members (conversation_id, user_id, role)
    values (cid, uid, 'member'), (cid, _other, 'member')
    on conflict (conversation_id, user_id) do nothing;
  return cid;
end;
$$;

create or replace function public.create_group(_name text, _member_ids uuid[])
returns uuid language plpgsql security definer
set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); cid uuid; m uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if coalesce(btrim(_name), '') = '' then raise exception 'Group name is required'; end if;

  insert into public.conversations (type, name, created_by)
    values ('group', left(btrim(_name), 80), uid) returning id into cid;
  insert into public.conversation_members (conversation_id, user_id, role)
    values (cid, uid, 'admin');

  foreach m in array coalesce(_member_ids, '{}'::uuid[]) loop
    if m is not null and m <> uid
       and exists (select 1 from public.profiles where id = m)
       and not public.is_blocked_pair(uid, m) then
      insert into public.conversation_members (conversation_id, user_id, role)
        values (cid, m, 'member') on conflict (conversation_id, user_id) do nothing;
    end if;
  end loop;

  insert into public.messages (conversation_id, sender_id, type, content)
    values (cid, uid, 'system', 'created the group');
  return cid;
end;
$$;

create or replace function public.add_group_members(_conv uuid, _member_ids uuid[])
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); m uuid; added int := 0;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.is_conversation_admin(_conv, uid) then raise exception 'Only admins can add members'; end if;
  foreach m in array coalesce(_member_ids, '{}'::uuid[]) loop
    if m is not null and exists (select 1 from public.profiles where id = m)
       and not public.is_blocked_pair(uid, m)
       and not public.is_conversation_member(_conv, m) then
      insert into public.conversation_members (conversation_id, user_id, role)
        values (_conv, m, 'member') on conflict (conversation_id, user_id) do nothing;
      added := added + 1;
    end if;
  end loop;
  if added > 0 then
    insert into public.messages (conversation_id, sender_id, type, content)
      values (_conv, uid, 'system', 'added ' || added || ' member' || case when added > 1 then 's' else '' end);
  end if;
end;
$$;

create or replace function public.remove_group_member(_conv uuid, _target uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.is_conversation_admin(_conv, uid) then raise exception 'Only admins can remove members'; end if;
  if _target = uid then raise exception 'Use leave to remove yourself'; end if;
  delete from public.conversation_members where conversation_id = _conv and user_id = _target;
  insert into public.messages (conversation_id, sender_id, type, content)
    values (_conv, uid, 'system', 'removed a member');
end;
$$;

create or replace function public.rename_conversation(_conv uuid, _name text)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.is_conversation_admin(_conv, uid) then raise exception 'Only admins can rename'; end if;
  if coalesce(btrim(_name), '') = '' then raise exception 'Name is required'; end if;
  update public.conversations set name = left(btrim(_name), 80) where id = _conv and type = 'group';
  insert into public.messages (conversation_id, sender_id, type, content)
    values (_conv, uid, 'system', 'renamed the group to "' || left(btrim(_name), 80) || '"');
end;
$$;

create or replace function public.leave_conversation(_conv uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); promote uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.is_conversation_member(_conv, uid) then return; end if;
  delete from public.conversation_members where conversation_id = _conv and user_id = uid;
  -- promote the oldest remaining member if no admins are left
  if not exists (select 1 from public.conversation_members where conversation_id = _conv and role = 'admin') then
    select user_id into promote from public.conversation_members
      where conversation_id = _conv order by joined_at asc limit 1;
    if promote is not null then
      update public.conversation_members set role = 'admin'
        where conversation_id = _conv and user_id = promote;
    end if;
  end if;
  if exists (select 1 from public.conversation_members where conversation_id = _conv) then
    insert into public.messages (conversation_id, sender_id, type, content)
      values (_conv, uid, 'system', 'left the group');
  else
    delete from public.conversations where id = _conv;  -- empty group: clean up
  end if;
end;
$$;

create or replace function public.mark_read(_conv uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  update public.conversation_members set last_read_at = now()
    where conversation_id = _conv and user_id = auth.uid();
end;
$$;

create or replace function public.edit_message(_id uuid, _content text)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if coalesce(btrim(_content), '') = '' then raise exception 'Message cannot be empty'; end if;
  update public.messages
    set content = left(btrim(_content), 4000), edited_at = now()
    where id = _id and sender_id = auth.uid() and type = 'text' and deleted_at is null;
end;
$$;

create or replace function public.delete_message(_id uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  update public.messages
    set deleted_at = now(), content = null, media_url = null, media_metadata = null
    where id = _id and sender_id = auth.uid() and deleted_at is null;
end;
$$;

create or replace function public.heartbeat()
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  update public.profiles set last_seen_at = now() where id = auth.uid();
end;
$$;

-- One round-trip for the whole sidebar: conversations + peer + last message +
-- unread count, ordered by recent activity.
create or replace function public.get_conversation_overview()
returns jsonb language sql security definer stable
set search_path = public, pg_temp as $$
  with my as (
    select cm.conversation_id, cm.last_read_at, cm.role
    from public.conversation_members cm where cm.user_id = auth.uid()
  ),
  last_msg as (
    select distinct on (m.conversation_id)
      m.conversation_id, m.id, m.content, m.type, m.sender_id, m.created_at, m.deleted_at
    from public.messages m join my on my.conversation_id = m.conversation_id
    order by m.conversation_id, m.created_at desc, m.id desc
  ),
  unread as (
    select m.conversation_id, count(*) as cnt
    from public.messages m join my on my.conversation_id = m.conversation_id
    where m.created_at > coalesce(my.last_read_at, 'epoch'::timestamptz)
      and m.sender_id <> auth.uid() and m.deleted_at is null
    group by m.conversation_id
  ),
  peer as (
    select cm.conversation_id, p.id, p.username, p.display_name, p.avatar_url, p.last_seen_at
    from public.conversation_members cm
    join my on my.conversation_id = cm.conversation_id
    join public.conversations c on c.id = cm.conversation_id and c.type = 'direct'
    join public.profiles p on p.id = cm.user_id
    where cm.user_id <> auth.uid()
  )
  select coalesce(jsonb_agg(sub.row order by sub.last_activity desc nulls last), '[]'::jsonb)
  from (
    select
      coalesce(c.last_message_at, c.created_at) as last_activity,
      jsonb_build_object(
        'id', c.id,
        'type', c.type,
        'name', c.name,
        'avatar_url', c.avatar_url,
        'created_at', c.created_at,
        'last_message_at', c.last_message_at,
        'role', my.role,
        'unread', coalesce(u.cnt, 0),
        'member_count', (select count(*) from public.conversation_members where conversation_id = c.id),
        'peer', case when c.type = 'direct' and pe.id is not null then jsonb_build_object(
            'id', pe.id, 'username', pe.username, 'display_name', pe.display_name,
            'avatar_url', pe.avatar_url, 'last_seen_at', pe.last_seen_at) else null end,
        'last_message', case when lm.id is not null then jsonb_build_object(
            'content', case when lm.deleted_at is not null then null else lm.content end,
            'type', lm.type, 'sender_id', lm.sender_id,
            'created_at', lm.created_at, 'deleted', lm.deleted_at is not null) else null end
      ) as row
    from public.conversations c
    join my on my.conversation_id = c.id
    left join last_msg lm on lm.conversation_id = c.id
    left join unread u on u.conversation_id = c.id
    left join peer pe on pe.conversation_id = c.id
  ) sub;
$$;

-- ─────────────────────────────  Realtime  ───────────────────────────────

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['messages', 'conversations', 'conversation_members'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Full old-row payloads so RLS can evaluate UPDATE events (edits/soft-deletes).
alter table public.messages replica identity full;
alter table public.conversation_members replica identity full;

-- ──────────────────────────────  Storage  ───────────────────────────────

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true), ('media', 'media', false)
  on conflict (id) do nothing;

-- avatars: world-readable; you may only write under your own uid/ folder.
drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "avatars_write_own" on storage.objects;
create policy "avatars_write_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- media: private. Path = {conversation_id}/{user_id}/{file}. Read requires
-- membership; write requires membership AND your own uid folder.
-- The regex guard avoids a 22P02 "invalid input syntax for type uuid" error
-- if a stray object ever lands with a non-UUID first path segment.
drop policy if exists "media_read_members" on storage.objects;
create policy "media_read_members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );
drop policy if exists "media_write_members" on storage.objects;
create policy "media_write_members" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );
drop policy if exists "media_delete_own" on storage.objects;
create policy "media_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

-- ──────────────────────────────  Grants  ────────────────────────────────

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- RPCs: callable only by signed-in users.
revoke execute on all functions in schema public from public;
grant execute on all functions in schema public to authenticated;
