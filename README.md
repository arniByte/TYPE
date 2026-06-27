# TYPE

> **TYPE — where words matter.** A minimalist, real-time messenger you can deploy for free.

TYPE is a full messenger built with Next.js and Supabase: email + Google sign-in,
one-to-one and group chat, photo & video sharing, contacts and requests, typing
indicators, presence, read receipts, edits and deletes — wrapped in a calm,
lime-on-black interface that works from a 320px phone to a wide desktop.

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%7C%20Auth%20%7C%20Realtime%20%7C%20Storage-3FCF8E?logo=supabase" />
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-3.4-38BDF8?logo=tailwindcss" />
  <img alt="Vercel" src="https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel" />
</p>

## Features

- **Auth that remembers you** — email/password and Google OAuth (Supabase Auth), sessions persist across reloads and token refreshes.
- **Real-time chat** — messages, typing indicators, online presence and read receipts arrive instantly.
- **Direct & group** — start a 1:1 or spin up a group; add/remove members, rename, leave, admin roles.
- **Media** — share photos, video and files; private, membership-scoped storage with signed URLs.
- **Contacts** — find people by username, send/accept requests, block/unblock.
- **Thoughtful UX** — optimistic send, infinite scroll, jump-to-latest, edits & soft-deletes, day separators, empty/loading states, full responsive layout.
- **Secure by construction** — Postgres Row-Level Security on every table; all sensitive writes go through hardened `SECURITY DEFINER` RPCs.

## Tech stack

| | |
|---|---|
| Framework | Next.js 15 (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS 3.4 — a single lime accent on a near-black/white scale |
| Backend | Supabase — Postgres, Auth, Realtime, Storage |
| Auth | `@supabase/ssr` (cookie-based SSR sessions) |
| Hosting | Vercel (free tier) |

See [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md) for the full architecture and
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) for the schema, RLS and RPCs.

---

## Quick start (local)

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) → **New project** (free tier is fine).

### 2. Run the database migration

In the Supabase dashboard, open **SQL Editor**, paste the contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and **Run**.
This creates every table, index, RLS policy, RPC, the realtime publication, and
the `avatars` (public) + `media` (private) storage buckets.

> Using the Supabase CLI instead? `supabase link` then `supabase db push`.

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your project's values
(**Project Settings → API**):

```bash
cp .env.example .env.local
```

```ini
NEXT_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-public-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

---

## Auth configuration

### Email

Under **Authentication → Providers → Email**, email/password is on by default.
For the smoothest local experience you can turn **"Confirm email"** off; when it
is on, confirmation links route through `/auth/confirm` (already implemented).

### Google sign-in

1. In **Google Cloud Console** create an **OAuth 2.0 Client ID** (type: Web).
2. Add this **Authorized redirect URI**:
   `https://<your-ref>.supabase.co/auth/v1/callback`
3. In Supabase, **Authentication → Providers → Google**, paste the Client ID and Secret, enable.
4. In Supabase, **Authentication → URL Configuration**, set:
   - **Site URL:** your production URL (e.g. `https://type.vercel.app`)
   - **Redirect URLs** (add each on its own line):
     ```
     http://localhost:3000/auth/callback
     https://<your-prod-domain>/auth/callback
     https://*-<your-team>.vercel.app/auth/callback
     ```
     The wildcard line lets Vercel **preview** deployments complete the OAuth round-trip.

---

## Deploy to Vercel (free)

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
   Vercel auto-detects Next.js — no config needed.
3. Add **Environment Variables** (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` → your production URL
4. **Deploy.**
5. Back in Supabase, add your Vercel URLs to the **Redirect URLs** list (step 4 above)
   so Google sign-in works in production and previews.

That's it — TYPE runs entirely on free tiers.

---

## Security notes

- **Never** expose the Supabase `service_role` key to the client. TYPE only ever
  uses the public anon key; privileged operations run through `SECURITY DEFINER`
  RPCs executed with the user's own JWT.
- Every `SECURITY DEFINER` function pins `search_path` and is granted to
  `authenticated` only.
- RLS is enabled on all tables; conversation membership gates message/media
  access. The `media` bucket is private — files are served via short-lived
  signed URLs to conversation members only.
- Direct conversations are de-duplicated by a unique `dm_key`, so a 1:1 thread
  can never fork, even under a race.

## Project scripts

```bash
npm run dev        # start the dev server
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
```

## License

MIT — yours to build on.
