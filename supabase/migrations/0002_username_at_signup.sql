-- ════════════════════════════════════════════════════════════════════════
--  TYPE — 0002: honor a user-chosen @username at signup
--  Safe to run on top of 0001 (functions use CREATE OR REPLACE).
--  Run once in Supabase → SQL Editor → Run.
--
--  Both profile-creation paths now prefer raw_user_meta_data->>'username'
--  (the handle the user picked on the sign-up form), falling back to the
--  email local-part. Collision handling appends a numeric suffix so signup
--  never fails on a taken handle.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  desired   text;
  base      text;
  candidate text;
  n         int := 0;
begin
  desired := regexp_replace(lower(coalesce(new.raw_user_meta_data ->> 'username', '')), '[^a-z0-9_]', '', 'g');
  if char_length(desired) >= 2 then
    base := left(desired, 24);
  else
    base := regexp_replace(lower(split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-z0-9_]', '', 'g');
    if base is null or char_length(base) < 2 then base := 'user'; end if;
    base := left(base, 20);
  end if;
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
        candidate := left(base, 21) || n::text;
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
        return new;
    end;
  end loop;
end;
$$;

create or replace function public.ensure_profile()
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  uid       uuid := auth.uid();
  meta      jsonb;
  uemail    text;
  desired   text;
  base      text;
  candidate text;
  n         int := 0;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.profiles where id = uid) then return; end if;
  select email, raw_user_meta_data into uemail, meta from auth.users where id = uid;
  desired := regexp_replace(lower(coalesce(meta ->> 'username', '')), '[^a-z0-9_]', '', 'g');
  if char_length(desired) >= 2 then
    base := left(desired, 24);
  else
    base := regexp_replace(lower(split_part(coalesce(uemail, 'user'), '@', 1)), '[^a-z0-9_]', '', 'g');
    if base is null or char_length(base) < 2 then base := 'user'; end if;
    base := left(base, 20);
  end if;
  candidate := base;
  loop
    begin
      insert into public.profiles (id, username, display_name, avatar_url)
      values (uid, candidate,
              coalesce(meta ->> 'full_name', meta ->> 'name', initcap(base)),
              meta ->> 'avatar_url');
      return;
    exception
      when unique_violation then
        n := n + 1;
        candidate := left(base, 21) || n::text;
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
