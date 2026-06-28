# TYPE — Project Context & Handoff

> Paste this into a new chat to continue work with full context.
> _"TYPE — where words matter."_ A minimalist real-time messenger.

## 1. What it is
A full web messenger: email / Google / Web3 (Solana+Ethereum) / quick @handle
sign-in, 1:1 + group chat, realtime, photo/video sharing, **voice messages**,
contacts & requests, typing, presence, read receipts — plus a hidden **bunny
mini-game**. Built to run **free** on Vercel + Supabase.

## 2. Live coordinates
| | |
|---|---|
| **Production URL** | https://type-hellowrld.vercel.app  (use this stable domain — per-deploy preview URLs change and drop auth cookies) |
| **GitHub repo** | `arniByte/TYPE` (default branch `main`) |
| **Dev branch** | `claude/type-messenger-app-l0tj1g` — PRs squash-merged to `main` → Vercel auto-deploys. (Workflow to ship: commit → `git rebase --onto origin/main <prev-tip> <branch>` → force-push → PR → squash-merge.) |
| **Vercel** | project `type`, team **hellowrld** (Hobby). Git integration on `main`. |
| **Supabase** | project **`heirpnnazjrcnfljridj`** ("type"), region ap-northeast-2, Postgres 17 — **connected via Supabase MCP connector** (can run SQL/migrations/advisors directly) |
| **Supabase URL** | https://heirpnnazjrcnfljridj.supabase.co |
| **Publishable key** | `sb_publishable_W93CwtFiFx6Cq2X13Qdd_w_-4VM5UQE` (public, browser-safe; RLS enforces access) |

## 3. Tech stack
Next.js 15 (App Router, React 19, TS strict) · Tailwind 3.4 · Supabase
(Postgres + Auth + Realtime + Storage) via `@supabase/ssr` + `@supabase/supabase-js`
(installed **2.108.2**, lockfile-pinned — has `signInWithWeb3`). Deploy: Vercel.

## 4. Design system (light + lime)
- Soft white canvas `#FAFAF7`, surfaces `#FFFFFF`/`#F1F2EC`, text `#15160E`.
- **One accent: lime `#CCFF00`** as a FILL; `lime-deep #5F7A00` for lime TEXT on
  white; `lime-grass #4FA800` brighter green for playful accents (the game).
- Tokens in `tailwind.config.ts`; base + animations in `app/globals.css`.
- **Mascot:** animated ASCII bunny `(\ /) ( . .) c(")(")` — `components/brand/Bunny.tsx`
  (`BunnyAscii`: float/aura/blink, optional `onClick`/`animated`). Used as the
  **logo mark** (tiny, static) and the **hero mascot** (large).
- **Wordmark:** `components/brand/TypeWordmark.tsx` — "TYPE" in the **calligraphic
  Great Vibes** font (`--font-display`) that **draws itself in left-to-right**
  (clip-path reveal): `loop` (menu/sidebar) re-writes; `loop={false}` (hero/auth)
  writes once. Pure CSS, disabled under `prefers-reduced-motion`.
- Fonts (next/font/google): **Inter** (UI), **JetBrains Mono** (bunny), **Great Vibes** (wordmark).
- Animations: `bunny-float`, `aura-pulse`, `slide-in-right` (mobile route enter),
  `slide-in-up`, `rec-pulse`, `tw-write-loop/once`.

## 5. Features (all working)
- **Auth:** email/password, Google OAuth, **Solana + Ethereum** (`signInWithWeb3`,
  uses window.solana / window.ethereum), and **quick @handle signup** on the
  landing (`components/auth/QuickAuth.tsx` + `lib/auth.ts` — maps `@handle` to a
  synthetic email `handle@guest.type.app`; **requires Supabase "Confirm email" OFF**).
- **Chat:** 1:1 + group, realtime, typing, presence, read receipts, edits,
  soft-delete, replies (+ **swipe-right-to-reply** on mobile), optimistic send.
- **Media:** photos/videos/files + **voice messages** (record in composer →
  custom `VoicePlayer`). Private `media` bucket, signed URLs.
- **Contacts:** search, requests (accept/decline), block/unblock.
- **Groups:** create, add/remove/rename/leave, admin roles.
- **Profile:** avatar/name/@username/bio/status (Settings).
- **Mini-game:** tap the bunny (landing + `/app` empty state) → "Bunny Word Rush"
  (`components/game/BunnyGame.tsx`, launched by `PlayableBunny`), a 30s typing
  game with combos/time-bonus/difficulty ramp + localStorage best score.

## 6. Architecture
- **Data model** (`supabase/migrations/0001_init.sql`): `profiles · contacts ·
  conversations · conversation_members · messages`. RLS on all tables; recursion
  broken by `is_conversation_member()` (SECURITY DEFINER). Direct chats deduped
  by unique `dm_key`. Soft-delete only; column-freeze trigger; CHECK constraints.
  Message types: `text|image|video|file|audio|system`.
- **RPCs** (SECURITY DEFINER, pinned search_path, authenticated-only): ensure_profile,
  create_direct_conversation, create_group, add/remove_group_member,
  rename/leave_conversation, mark_read, edit/delete_message, send/respond_contact_request,
  set_block, search_users, get_conversation_overview, heartbeat.
- **Realtime** (`hooks/useRealtimeMessages.ts`): subscribe-first→fetch→merge,
  id-dedupe, keyset pagination, reconnect/refocus catch-up, optimistic send.
  Sidebar liveness/presence/typing in `components/chat/AppProvider.tsx` /
  `hooks/useTyping.ts`. Socket re-auth on token refresh.
- **Auth/SSR** (`lib/supabase/{client,server,middleware}.ts`, `middleware.ts`):
  `@supabase/ssr` getAll/setAll cookies; `getUser()` gates routes; callback
  `app/auth/callback`, email link `app/auth/confirm`, signout POST route.
- **Storage:** `avatars` (public read via getPublicUrl, no list policy), `media`
  (private; `{conversationId}/{userId}/{uuid}`; signed URLs via `hooks/useSignedUrl.ts`).

## 7. Env vars (committed in `.env.production`, public-safe)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable),
`NEXT_PUBLIC_SITE_URL=https://type-hellowrld.vercel.app`. Never ship the
service-role key to the client.

## 8. Migrations — ALL APPLIED to the live DB (via the Supabase connector)
- `0001_init.sql` — schema, RLS, RPCs, realtime publication, storage buckets.
- `0002_username_at_signup.sql` — handle_new_user/ensure_profile honor metadata `username`.
- `0003_harden_grants_and_storage.sql` — revoke anon RPC execute; lock trigger fns;
  drop broad avatars list policy (from advisors).
- `0004_add_audio_message_type.sql` — `audio` message type for voice messages.
- `0005_perf.sql` — perf: RLS `(select auth.uid())` init-plan fix on all 9
  policies, covering indexes for the 5 FKs, dropped unused
  `conversations_last_msg_idx`, `REPLICA IDENTITY DEFAULT` on messages +
  conversation_members. (Server also seeds the sidebar + first message page now.)

## 9. Manual Supabase dashboard config still required (cannot be done via SQL/MCP)
1. **Turn OFF "Confirm email"** (Authentication → Providers → Email) — needed for
   quick @handle signup to work instantly (otherwise "email rate limit exceeded").
2. **Site URL** = `https://type-hellowrld.vercel.app` (fixes email links landing on localhost).
3. **Redirect URLs** → add `https://type-hellowrld.vercel.app/auth/callback` and `/**`.
4. **Google provider** → enable + paste Google Cloud **Client ID + Secret**; in
   Google Cloud the Authorized redirect URI must be
   `https://heirpnnazjrcnfljridj.supabase.co/auth/v1/callback` (fixes `redirect_uri_mismatch`).
5. Web3 (Solana/Ethereum) providers enabled in Supabase Auth (already done by owner).
6. (Optional) enable Leaked-password protection (advisor WARN).

## 10. Gotchas
- This agent's sandbox **cannot reach `*.supabase.co` / `*.vercel.app` / `api.vercel.com`**
  (network policy 403) — verify the live site in a browser; use the Supabase MCP for DB.
- The **Workflow tool intermittently fails** with a permission-stream error — fall
  back to parallel `Agent` tool calls for multi-agent reviews.
- Cookies are host-bound → only the stable production domain keeps you signed in.
- Vercel is on team **hellowrld**, but the Vercel MCP connector here is authed to
  team **ROKOAI** — so I can't read hellowrld's build logs; verify deploys in a browser.

## 11. Commands
```bash
npm install
npm run dev         # local (needs .env.local with the same NEXT_PUBLIC_* values)
npm run build       # production build
npx tsc --noEmit    # typecheck
```
