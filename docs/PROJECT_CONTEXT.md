# TYPE — Project Context & Handoff

> Paste this into a new chat to continue work with full context.
> _"TYPE — where words matter."_ A minimalist real-time messenger.

## 1. What it is
A full web messenger: email/Google/Web3 sign-in, 1:1 + group chat, realtime,
photo/video sharing, contacts & requests, typing, presence, read receipts.
Built to run **free** on Vercel + Supabase.

## 2. Live coordinates
| | |
|---|---|
| **Production URL** | https://type-hellowrld.vercel.app  (use this stable domain — not per-deploy `type-<hash>-hellowrld.vercel.app`, whose cookies don't carry over) |
| **GitHub repo** | `arniByte/TYPE` (default branch `main`) |
| **Dev branch** | `claude/type-messenger-app-l0tj1g` (PRs merged to `main` → Vercel auto-deploys) |
| **Vercel** | project `type`, team **hellowrld** (Hobby). Git integration on `main`. |
| **Supabase** | project **`heirpnnazjrcnfljridj`** ("type"), region ap-northeast-2, Postgres 17 |
| **Supabase URL** | https://heirpnnazjrcnfljridj.supabase.co |
| **Publishable key** | `sb_publishable_W93CwtFiFx6Cq2X13Qdd_w_-4VM5UQE` (public, browser-safe; RLS enforces access) |

## 3. Tech stack
Next.js 15 (App Router, React 19, TS strict) · Tailwind 3.4 · Supabase
(Postgres + Auth + Realtime + Storage) via `@supabase/ssr` + `@supabase/supabase-js`
(installed 2.108.2, lockfile-pinned — has `signInWithWeb3`). Deploy: Vercel.

## 4. Design system (light + lime)
- Soft white canvas `#FAFAF7`, surfaces `#FFFFFF`/`#F1F2EC`, text `#15160E`.
- **One accent: lime `#CCFF00`** as a FILL (buttons, sent bubbles, the `.mark`
  highlight). `lime-deep #5F7A00` for lime TEXT on white (readable).
- Tokens live in `tailwind.config.ts`; base styles in `app/globals.css`.
- **Mascot:** an animated ASCII bunny `(\ /) ( . .) c(")(")` — `components/brand/Bunny.tsx`
  (`BunnyAscii` floats/breathes/blinks; `BunnyMark` is a small SVG for logo/favicon).
- Fonts (next/font/google): **Inter** (UI), **JetBrains Mono** (bunny/mono),
  **Pacifico** (`--font-display`, the big calligraphic "TYPE" wordmark).

## 5. Architecture
- **Data model** (`supabase/migrations/0001_init.sql`): `profiles · contacts ·
  conversations · conversation_members · messages`. RLS on all tables; recursion
  broken by `is_conversation_member()` (SECURITY DEFINER). Direct chats deduped
  by unique `dm_key`. Soft-delete only; column-freeze trigger; CHECK constraints.
- **RPCs** (all SECURITY DEFINER, pinned `search_path`, `authenticated`-only):
  `ensure_profile, create_direct_conversation, create_group, add_group_members,
  remove_group_member, rename_conversation, leave_conversation, mark_read,
  edit_message, delete_message, send_contact_request, respond_contact_request,
  set_block, search_users, get_conversation_overview, heartbeat`.
- **Realtime** (`hooks/useRealtimeMessages.ts`): subscribe-first→fetch→merge,
  id-dedupe, keyset pagination, reconnect/refocus catch-up, optimistic send.
  Sidebar liveness + presence + typing in `components/chat/AppProvider.tsx` /
  `hooks/useTyping.ts`. Socket re-auth on token refresh.
- **Auth/SSR** (`lib/supabase/{client,server,middleware}.ts`, `middleware.ts`):
  `@supabase/ssr` getAll/setAll cookies; `getUser()` gates routes; PKCE callback
  at `app/auth/callback`, email link at `app/auth/confirm`, signout POST route.
- **Storage**: `avatars` (public read via getPublicUrl; no list policy),
  `media` (private; path `{conversationId}/{userId}/{uuid}`; signed URLs via
  `hooks/useSignedUrl.ts`).
- **Auth UI** (`components/auth/AuthForm.tsx`): email/password + Google OAuth +
  **Solana & Ethereum** (`signInWithWeb3`, uses window.solana / window.ethereum)
  + **@username chosen at signup**.

## 6. File map (key paths)
```
app/                page.tsx (landing) · login · signup · auth/* · app/* (messenger)
components/brand/   Bunny.tsx · Logo.tsx
components/ui/      Button Input Textarea Modal Popover Avatar Badge Spinner EmptyState Skeleton
components/auth/    AuthForm.tsx · AuthShell.tsx
components/chat/    AppProvider · AppShell · Sidebar · ConversationItem · NewConversationModal
                    ChatView · ChatHeader · MessageList · MessageBubble · MediaMessage
                    Composer · TypingIndicator · ConversationInfoModal
components/contacts/ ContactsView.tsx     components/settings/ SettingsView.tsx
hooks/             useRealtimeMessages · useTyping · useSignedUrl
lib/               supabase/* · types/database.ts · utils.ts · time.ts · media.ts
supabase/migrations/ 0001_init.sql · 0002_username_at_signup.sql · 0003_harden_grants_and_storage.sql
docs/              BUILD_SPEC.md · PROJECT_CONTEXT.md (this file)
```

## 7. Env vars (committed in `.env.production`, public-safe)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable),
`NEXT_PUBLIC_SITE_URL=https://type-hellowrld.vercel.app`.
**Never** add the service-role key to the client.

## 8. Migration status (live DB)
- `0001_init.sql` — **applied** (via SQL editor).
- `0002_username_at_signup.sql` — **applied** (via MCP). Honors chosen @username.
- `0003_harden_grants_and_storage.sql` — **applied** (via MCP). Revoked anon RPC
  execute; locked internal trigger fns; dropped broad avatars list policy.

## 9. Manual config still required in the Supabase dashboard (cannot be done via SQL/MCP)
1. **Site URL** → set to `https://type-hellowrld.vercel.app`
   (Authentication → URL Configuration). _Fixes the email-confirm link landing on
   a `localhost:3000` error page._
2. **Redirect URLs** → add `https://type-hellowrld.vercel.app/auth/callback` and
   `https://type-hellowrld.vercel.app/**`.
3. **Google provider** → enable + paste Google Cloud **Client ID** + **Secret**
   (NOT the callback URL). In Google Cloud, the Authorized redirect URI must be
   `https://heirpnnazjrcnfljridj.supabase.co/auth/v1/callback` (fixes
   `redirect_uri_mismatch`).
4. (Optional) Enable **Leaked password protection** (advisor WARN).
5. Web3: Solana/Ethereum providers enabled in Supabase Auth (user did this).

## 10. State — works / pending
- **Works**: full messenger UI, realtime, light+lime theme, animated bunny,
  @username signup, profile editing, build green, migrations applied.
- **Pending (config, not code)**: Google login (provider/redirect config), email
  confirm redirect (Site URL), always test on the stable production domain.
- **Web3**: code shipped; needs a browser wallet (Phantom/MetaMask) to test.

## 11. Gotchas
- This agent's sandbox **cannot reach `*.supabase.co` / `*.vercel.app` / `api.vercel.com`**
  (network policy 403) — verify the live site from a browser, or via the Supabase
  MCP connector for DB.
- Cookies are host-bound → only the **stable** production domain keeps you signed in.
- `next/font` fetches fonts at build (works on Vercel).

## 12. Commands
```bash
npm install
npm run dev         # local (needs .env.local with the same NEXT_PUBLIC_* values)
npm run build       # production build
npx tsc --noEmit    # typecheck
```
