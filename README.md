# The Uncovery

A mobile-friendly daily devotional web app built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (Auth + Database)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Required variables in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it will redirect to `/today`.

## Project Structure

```
app/
  layout.tsx              # Root layout (header, fonts, global styles)
  page.tsx                # Redirects → /today
  today/page.tsx          # Today's devotion + month theme
  browse/page.tsx         # Month/day picker
  devotion/[month]/[day]/ # Devotion detail page
  login/page.tsx          # Email/password login
  signup/page.tsx         # Account creation
components/
  Header.tsx              # Sticky nav (Today, Browse, Admin, Sign in/out)
lib/
  supabaseClient.ts       # Browser Supabase client
  isAdmin.ts              # Admin check helper
  utils.ts                # cn() utility (clsx + tailwind-merge)
```

## Database

See `docs/DB_SCHEMA.md` for full schema. Tables:

- `devotions` — daily devotion content (month + day indexed, published flag)
- `month_themes` — monthly theme + scripture
- `admins` — user IDs with admin access (RLS-enforced)

## Deployment

Deploy to [Vercel](https://vercel.com) — set the two `NEXT_PUBLIC_*` env vars in the project settings.
