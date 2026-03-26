# The Uncovery Devotional

A mobile-first daily devotional web app and Android app built for people in recovery, faith, and spiritual growth. Based on the book *The Uncovery Devotional* by George Castillo and Brit Eaton.

## Stack

- **Next.js 14** (App Router, all pages `'use client'`)
- **TypeScript**
- **Tailwind CSS** (custom color palette)
- **Supabase** (Auth + PostgreSQL + Realtime)
- **Framer Motion** (welcome page animations)
- **Vercel** (hosting, auto-deploy)
- **Resend** (transactional email)

## Distribution

- **Web:** uncoverydevotional.com
- **Android:** Google Play Store (TWA via PWABuilder, package: `com.uncoverydevotional.twa`)
- **iOS:** Add to Home Screen via Safari (PWA)

---

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
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key is only needed for the bulk import script.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
app/
  layout.tsx                          # Root layout (header, background, bottom nav)
  page.tsx                            # Redirects → /today or /login
  today/page.tsx                      # Today's devotion (auto-marks read on scroll)
  browse/page.tsx                     # Browse devotions by month/day
  devotion/[month]/[day]/page.tsx     # Full devotion detail
  dashboard/page.tsx                  # Streak stats, today preview, author updates
  welcome/page.tsx                    # First-login author message
  login/page.tsx                      # Email/password login
  signup/page.tsx                     # Account creation (first name, last name, email, password)
  profile/page.tsx                    # Edit display name, bio, change password
  bookmarks/page.tsx                  # Saved devotions
  journal/page.tsx                    # Private journal entries
  groups/page.tsx                     # Small groups list
  groups/new/page.tsx                 # Create a group
  groups/join/page.tsx                # Join via invite code
  groups/[id]/page.tsx                # Group chat with realtime messages + reactions
  groups/[id]/members/page.tsx        # Members list, invite code, leave/delete group
  updates/[id]/page.tsx               # Full author update
  privacy/page.tsx                    # Privacy policy
  delete-account/page.tsx             # Account deletion request
  admin/page.tsx                      # Admin dashboard
  admin/devotions/page.tsx            # All devotions
  admin/devotions/new/page.tsx        # Create devotion
  admin/devotions/[id]/edit/page.tsx  # Edit devotion
  admin/updates/page.tsx              # Manage author updates
  admin/users/page.tsx                # User management (search, sort, delete, admin toggle)

components/
  Header.tsx              # Top navigation
  BottomNav.tsx           # Mobile bottom navigation (Home, Today, Groups, Search, More)
  DevotionCard.tsx        # Devotion display with bookmark + auto-read-on-scroll
  MonthlyStreakGrid.tsx   # Calendar grid showing read days

lib/
  supabaseClient.ts       # Browser Supabase client
  isAdmin.ts              # Admin check helper
  getTodayET.ts           # Eastern Time date helper

public/
  manifest.json           # PWA manifest
  apple-touch-icon.png    # 180×180 iOS icon
  icon-192.png            # 192×192 Android icon
  icon-512.png            # 512×512 Android icon
  .well-known/
    assetlinks.json       # Android TWA domain verification

docs/
  APP_SPEC.md             # Full feature and route specification
  DB_SCHEMA.md            # Database tables, RLS, functions, triggers
  UI_STYLE.md             # Design system and component patterns
  CLAUDE_INSTRUCTIONS.md  # Build rules and patterns for Claude Code

scripts/
  import-devotions.mjs    # Bulk upsert devotions from JSON
```

---

## Git Remotes

Two remotes — always push to both:

```bash
git push origin dev           # GitHub (Uncovery_App.git, dev branch)
git push vercel dev:main      # Vercel (uncovery-app.git, main branch)
```

Vercel auto-deploys from the `main` branch of the vercel remote.

---

## Bulk Import

Use the import script to upsert devotions from a JSON file:

```bash
node scripts/import-devotions.mjs data/january.json
```

**JSON shape:**

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

---

## Database

See `docs/DB_SCHEMA.md` for full schema. Key tables:

- `devotions` — daily devotion content
- `month_themes` — monthly theme + scripture
- `profiles` — user display names and bios
- `user_flags` — onboarding state per user
- `devotion_reads` — reading history for streaks
- `bookmarks` — saved devotions
- `journal_entries` — private journal
- `author_updates` — messages from George
- `groups` + `group_members` + `group_messages` + `group_message_reactions` — Small Groups feature
- `admins` — admin access control

---

## Before Pushing

Always run a build check first:

```bash
npm run build
```

Fix any ESLint or TypeScript errors before pushing.
