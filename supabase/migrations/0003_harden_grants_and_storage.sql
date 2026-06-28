-- ════════════════════════════════════════════════════════════════════════
--  TYPE — 0003: tighten function grants + storage (from Supabase advisors)
--  Safe to run on top of 0001/0002. Already applied to the live project.
-- ════════════════════════════════════════════════════════════════════════

-- Lock all RPCs to signed-in users (anon has no reason to call them; each RPC
-- also self-checks auth.uid(), this is defense-in-depth).
revoke execute on all functions in schema public from anon;

-- Internal trigger functions must not be callable via the REST API at all.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.bump_last_message_at() from anon, authenticated;
revoke execute on function public.enforce_block_on_message() from anon, authenticated;
revoke execute on function public.freeze_message_columns() from anon, authenticated;
revoke execute on function public.set_updated_at() from anon, authenticated;

-- Public `avatars` bucket: drop the broad SELECT policy so clients cannot LIST
-- every file. Direct public object URLs (getPublicUrl) keep working.
drop policy if exists "avatars_read" on storage.objects;
