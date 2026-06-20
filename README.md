# DMF Planner

Your team's central brain for planning, messaging, sharing scripts, organizing projects, and leveling up together.

## Quick Start

No backend required for local development:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

- **Landing page** at `/`
- **Demo login** at `/login` — any email/password works in mock mode
- **App** at `/dashboard`, `/chat`, `/projects`, `/events`, `/ai`, `/settings`

## Deploy to Vercel

1. Push this repo to GitHub
2. Import in [Vercel](https://vercel.com/new)
3. Deploy — no env vars needed for the demo site

## Connect Supabase (optional)

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.local.example` to `.env.local` and fill in your keys
3. Run the migration in `supabase/migrations/001_foundation.sql` via the Supabase SQL editor
4. Add the same env vars in Vercel project settings
5. Set Supabase Auth redirect URL to `https://your-domain.com/auth/callback`

When env vars are set, the app automatically switches from mock data to live Supabase auth, database, and realtime chat.

## Stack

- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS
- **Backend:** Supabase (Auth, Postgres, Realtime, Storage)
- **Deploy:** Vercel
