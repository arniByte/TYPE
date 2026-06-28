-- ════════════════════════════════════════════════════════════════════════
--  TYPE — 0004: voice messages (new message type 'audio')
--  Safe to run on top of 0001-0003. Already applied to the live project.
-- ════════════════════════════════════════════════════════════════════════

alter table public.messages drop constraint if exists messages_type_check;
alter table public.messages add constraint messages_type_check
  check (type in ('text', 'image', 'video', 'file', 'audio', 'system'));

alter table public.messages drop constraint if exists message_shape;
alter table public.messages add constraint message_shape check (
  (type = 'text' and content is not null and char_length(btrim(content)) between 1 and 4000 and media_url is null)
  or (type in ('image', 'video', 'file', 'audio') and media_url is not null)
  or (type = 'system' and content is not null)
  or deleted_at is not null
);
