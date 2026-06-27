# TYPE — Build Spec

> _“TYPE — where words matter.”_
> The single source of truth for what TYPE is and how it is built. Written as the
> brief I (the builder) work from, and hardened against a four-lens architecture
> review (RLS/security, realtime, Next.js SSR auth, data-model/UX).

## 1. Product

TYPE is a **minimalist real-time messenger** on the web.

- **Auth:** email/password **and** Google — session persists across reloads.
- **People:** find users by username, send/accept contact requests, block.
- **Chat:** 1:1 and group conversations, realtime delivery, typing indicators,
  online presence, read receipts, edits, soft-delete, reply.
- **Media:** share photos and videos (and files) inside any conversation.
- **Groups:** create a group, add/remove members, rename, leave, admin roles.
- **Everywhere:** responsive from 320px phones to wide desktops.
- **Free:** Next.js on Vercel + Supabase free tier. No paid services.

## 2. Design language

One accent — **lime `#CCFF00`** — on a near-black / white grayscale. Lime is
reserved for brand, primary actions, focus rings, and "this is yours" signals
(your sent bubbles, active conversation, online dot is its own green). Generous
negative space, hairline borders (`#27272F`), `rounded-2xl` surfaces, calm
motion. The mascot is the friendly `( •ᴗ• )` face from the brand reference.

| Token | Value | Use |
|---|---|---|
| `canvas` | `#0B0B0E` | app background |
| `surface` | `#141418` | sidebar, cards |
| `elevated` | `#1C1C22` | inputs, incoming bubbles, popovers |
| `line` | `#27272F` | hairline borders |
| `fg` / `muted` / `faint` | `#F5F5F7` / `#9A9AA5` / `#65656F` | text tiers |
| `lime` / `lime-ink` | `#CCFF00` / `#1A1F00` | accent / text-on-lime |
| `online` / `danger` | `#34E27A` / `#FF5C5C` | presence / destructive |

Type: **Inter** (UI) + **JetBrains Mono** (accents/wordmark feel). No light mode —
the dark canvas _is_ the brand.

## 3. Stack

- **Next.js 15** App Router, React 19, TypeScript (strict).
- **Tailwind v3.4** with the token theme above.
- **Supabase**: Postgres + Auth + Realtime + Storage. Clients via
  `@supabase/ssr` (`getAll`/`setAll` cookie adapter only).
- **Deploy:** Vercel. Env: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`. Never ship the
  service-role key to the client.

## 4. Data model (Postgres)

`profiles · contacts · conversations · conversation_members · messages`

Decisions hardened from review:

- **`profiles`** mirrors `auth.users` (id PK). `username` is `citext unique`.
  Created by a **collision-proof, never-failing** `handle_new_user` trigger +
  an idempotent `ensure_profile()` RPC safety net (covers the OAuth-first-load
  race).
- **`contacts`** with a **direction-independent** unique pair index
  (`least/greatest`). Status `pending|accepted|blocked`. Mutations go through
  RPCs that enforce transitions (requester can't self-accept; only blocker
  unblocks; a reverse pending request auto-accepts).
- **`conversations`**: `type direct|group`, `last_message_at` (maintained by an
  `AFTER INSERT` trigger on messages), and a **`dm_key`** (`least:greatest` of
  the two member ids) with a **partial unique index `WHERE type='direct'`** so a
  1:1 thread can never be duplicated, even under a race.
- **`conversation_members`**: `role admin|member`, `last_read_at`. Membership is
  written **only** inside SECURITY DEFINER RPCs (no direct INSERT grant). Users
  may UPDATE their own `last_read_at` and DELETE their own row (leave).
- **`messages`**: `type text|image|video|file|system`, `content`, `media_url`
  (storage path), `media_metadata jsonb`, `reply_to` (ON DELETE SET NULL),
  `edited_at`, `deleted_at`. **Soft-delete only — no DELETE grant.** A
  `BEFORE UPDATE` trigger freezes `conversation_id/sender_id/created_at`. CHECK
  constraints: `text` ⇒ 1..4000 chars & no media; media types ⇒ `media_url` set.

**Indexes:** `messages(conversation_id, created_at DESC, id DESC)`,
`conversations(last_message_at DESC NULLS LAST)`,
`conversation_members(user_id, conversation_id)`, `messages(reply_to)`,
contacts pair-unique, partial unique `conversations(dm_key) WHERE type='direct'`.

### RLS principles

- Recursion broken by `is_conversation_member(conv, uid)` — `SECURITY DEFINER`,
  `STABLE`, `SET search_path = public, pg_temp`.
- **Every** SECURITY DEFINER function pins `search_path` and is
  `REVOKE EXECUTE FROM public; GRANT EXECUTE TO authenticated`.
- `profiles`: SELECT to authenticated (discovery); write own row only.
- `messages`: SELECT/INSERT gated by membership; UPDATE own row (soft-delete/
  edit) with column-freeze trigger; no DELETE.
- `conversation_members`: SELECT via membership; INSERT only via RPC; UPDATE/
  DELETE own row only.

### RPCs (all SECURITY DEFINER, pinned search_path, authenticated-only)

`ensure_profile() · create_direct_conversation(other) · create_group(name, ids[])
· send_contact_request(username) · respond_contact_request(id, accept)
· set_block(target, blocked) · leave_conversation(conv)
· add_group_members(conv, ids[]) · remove_group_member(conv, target)
· rename_conversation(conv, name) · mark_read(conv)
· get_conversation_overview() · search_users(q)`

Authorization invariants enforced **inside** the RPCs: caller is always
`auth.uid()` (never a parameter); `create_direct_conversation` rejects self-DMs
and blocked pairs and is idempotent on `dm_key`; `create_group` forces the
creator in as `admin`, de-dups/validates ids, skips blocked; group-management
RPCs require `admin`; sole-admin leave promotes the oldest remaining member.

## 5. Realtime

- **Auth the socket:** call `supabase.realtime.setAuth(access_token)` on
  `SIGNED_IN`/`TOKEN_REFRESHED` so RLS-filtered `postgres_changes` keep
  delivering across the ~1h token lifetime. Gate `subscribe()` on a session.
- **Open chat:** `postgres_changes` `*` on `messages` filtered
  `conversation_id=eq.X`. **Subscribe first, then fetch, then merge**, de-duping
  by `id` and dropping anything at/below the fetch high-water `(created_at,id)`.
  On `SUBSCRIBED`/reconnect and on tab refocus, **catch-up fetch** rows newer
  than the latest in state. INSERT adds, UPDATE reconciles (edit/soft-delete).
- **Sidebar:** an RLS-filtered `messages` INSERT stream bumps order and
  increments unread for non-active conversations; `conversation_members` INSERT
  filtered `user_id=eq.me` surfaces newly-created/joined conversations live.
  (Acceptable at free-tier scale; the scale path is DB-driven Broadcast.)
- **Ordering/paging:** order by `(created_at, id)`, keyset cursor — never OFFSET.
- **Unread:** server-computed in `get_conversation_overview()`
  (`created_at > last_read_at AND sender_id <> me AND deleted_at IS NULL`).
  `mark_read` sets `last_read_at` from the DB clock, debounced.
- **Typing & presence:** per-conversation channel (`conversation:{id}`) using
  broadcast + presence (ephemeral, throttled, auto-expiring). A global
  `presence:online` channel drives online dots; `last_seen_at` heartbeat for
  "last seen". Topics are UUID-scoped.
- **Read receipts:** 1:1 "Seen" derived from the peer's `last_read_at`, broadcast
  over the conversation channel for live updates.

## 6. Auth / SSR (the three classic pitfalls — pre-solved)

1. **Server Components can't write cookies** → `server.ts` wraps `setAll` in
   `try/catch` (no-op on throw); `cookies()` is awaited (async in Next 15).
2. **Middleware must thread refreshed cookies** onto the **same** response, and
   copy them onto any redirect response. `getUser()` (never `getSession`) gates
   routes. Broad matcher excluding static assets.
3. **Profile race** → collision-proof trigger **and** `ensure_profile()` called
   in the `/app` layout.

Routes: `/auth/callback` (PKCE `exchangeCodeForSession`, validates relative
`next`, honors `x-forwarded-host`, handles `?error`), `/auth/confirm`
(`verifyOtp` for email links), `/auth/signout` (route handler). OAuth redirect
allowlist + Site URL documented in the README.

## 7. Storage

- **`avatars`** — public read; write RLS keyed to `auth.uid()` folder prefix.
- **`media`** — **private**; path `{conversation_id}/{user_id}/{uuid}`. INSERT
  requires `is_conversation_member` + own uid folder; SELECT requires
  membership. Rendered via short-lived **signed URLs** (cached, refreshed on
  error). No public media URLs.

## 8. App structure

```
app/
  layout.tsx · globals.css · icon.svg · page.tsx (landing)
  login/ · signup/                       auth screens
  auth/callback · auth/confirm · auth/signout    auth plumbing
  app/                                   protected messenger
    layout.tsx (shell + realtime providers, ensure_profile)
    page.tsx (empty state)
    c/[conversationId]/page.tsx (chat)
    contacts/page.tsx · settings/page.tsx
middleware.ts
lib/supabase/{client,server,middleware}.ts · lib/types/database.ts · lib/utils.ts
components/{brand,ui,chat,contacts,auth}/...
hooks/{useRealtimeMessages,useConversations,usePresence,useTyping,useSignedUrl}.ts
supabase/migrations/0001_init.sql
```

## 9. UX must-haves (non-"ai-slop")

Optimistic send with temp-id reconciliation · skeleton loaders · empty states
for every list · infinite scroll-up + "jump to latest" · reconnecting banner ·
"edited"/"deleted" rendering · "Seen" · grouped timestamps & day separators ·
upload progress + aspect-ratio placeholders (no layout shift) · keyboard-first
composer · mobile list↔chat navigation · accessible focus rings & dialogs.

## 10. Definition of done

`npm run build` clean · RLS denies non-members (no message/member leakage) ·
no duplicate 1:1 threads · sessions survive refresh & token expiry · media is
membership-scoped · responsive on phone & desktop · deploy guide in README.
