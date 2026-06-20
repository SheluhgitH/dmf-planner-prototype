# DMF Planner

Your team's central brain for planning, messaging, sharing scripts, organizing projects, and leveling up together.

**Production:** https://dmf-planner-prototype.vercel.app/

## Quick Start (local)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

- **Landing page** at `/`
- **Demo login** at `/login` — any email/password works in mock mode (read-only for most features)
- **App** at `/dashboard`, `/chat`, `/projects`, `/events`, `/ai`, `/settings`

## Team testing (Supabase required)

For multi-user team testing, use Supabase — mock mode does not persist projects, tasks, DMs, or notifications.

### 1. Create Supabase project

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Run all migrations (in order)

Run each file in the Supabase SQL editor (or `supabase db push`):

| # | File | Purpose |
|---|------|---------|
| 1 | `supabase/migrations/001_foundation.sql` | Profiles, workspaces, channels, messages |
| 2 | `supabase/migrations/002_fix_workspace_rpc_auth.sql` | Workspace RPC auth fix |
| 3 | `supabase/migrations/003_events.sql` | Events and RSVPs |
| 4 | `supabase/migrations/004_chat_messenger.sql` | Reactions, reads, attachments storage |
| 5 | `supabase/migrations/005_shared_workspace.sql` | Shared DMF Studio workspace |
| 6 | `supabase/migrations/006_fix_shared_workspace_channels.sql` | Channel seeding fix |
| 7 | `supabase/migrations/007_fix_join_channel_workspace.sql` | Join channel workspace fix |
| 8 | `supabase/migrations/008_productivity_communication.sql` | Projects, tasks, mentions, notifications |
| 9 | `supabase/migrations/009_activity_feed.sql` | Workspace activity timeline |

### 3. Storage

Ensure the `chat-attachments` bucket exists (created by migration `004`). Set to private; RLS policies are in the migration.

### 4. Auth redirect URLs

In Supabase → Authentication → URL configuration, add:

- **Site URL:** `https://dmf-planner-prototype.vercel.app`
- **Redirect URLs:**
  - `https://dmf-planner-prototype.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (local dev)

### 5. Deploy to Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com/new)
3. Add the same Supabase env vars in Vercel project settings
4. Redeploy after env vars are set

When env vars are set, the app switches from mock data to live Supabase auth, database, realtime chat, and full productivity features.

## Beta test script (5 min)

1. Sign up → set display name → join `#general`
2. Send a message with `@teammate` and paste an image
3. Create a task from that message → drag on Kanban
4. RSVP to an event → share to `#events`
5. Try Cmd+K search and start a DM

## Stack

- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS
- **Backend:** Supabase (Auth, Postgres, Realtime, Storage)
- **Deploy:** Vercel
