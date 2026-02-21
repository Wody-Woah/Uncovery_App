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
# App (browser-safe)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Scripts only (server-side, never exposed to browser)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key is only needed for the bulk import script. Find it in **Supabase → Project Settings → API → service_role secret**.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it will redirect to `/login`.

## Bulk Import

Use the import script to upsert devotions from a JSON file. It uses the Supabase service role key to bypass RLS and performs an upsert on `(month, day)` — safe to run repeatedly.

```bash
node scripts/import-devotions.mjs data/january.json
```

The script will print a per-row log and a final summary:

```
✓ Inserted: January 1 — "A New Beginning"
↺ Updated:  January 2 — "Still Waters"

──────────────────────────────────────
  Inserted:          1
  Updated:           1
  Failed:            0
──────────────────────────────────────
```

**JSON shape** — each entry in the array must include:

| Field | Type | Required |
|---|---|---|
| `month` | integer 1–12 | yes |
| `day` | integer 1–31 | yes |
| `title` | string | yes |
| `verse_reference` | string | yes |
| `body` | string | yes |
| `prayer` | string | yes |
| `verse_text` | string | no |
| `published` | boolean | no (default `true`) |

See `data/example.json` for a working sample. Real data files are gitignored — only `data/example.json` is tracked.

## Project Structure

```
app/
  layout.tsx                        # Root layout (header, fonts, global styles)
  page.tsx                          # Redirects → /login
  today/page.tsx                    # Today's devotion + month theme
  browse/page.tsx                   # Month/day picker
  devotion/[month]/[day]/           # Devotion detail page
  login/page.tsx                    # Email/password login
  signup/page.tsx                   # Account creation
  admin/page.tsx                    # Admin dashboard
  admin/devotions/page.tsx          # All devotions list
  admin/devotions/new/page.tsx      # Create devotion form
  admin/devotions/[id]/edit/        # Edit devotion form
components/
  Header.tsx              # Sticky nav (Today, Browse, Admin, Sign in/out)
lib/
  supabaseClient.ts       # Browser Supabase client
  isAdmin.ts              # Admin check helper
  utils.ts                # cn() utility (clsx + tailwind-merge)
scripts/
  import-devotions.mjs    # Bulk upsert devotions from JSON
data/
  example.json            # Example import file (2 entries)
```

## Database

See `docs/DB_SCHEMA.md` for full schema. Tables:

- `devotions` — daily devotion content (month + day indexed, published flag)
- `month_themes` — monthly theme + scripture
- `admins` — user IDs with admin access (RLS-enforced)

## Deployment

Deploy to [Vercel](https://vercel.com) — set the two `NEXT_PUBLIC_*` env vars in the project settings.
