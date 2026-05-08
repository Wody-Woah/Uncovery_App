# The Uncovery Devotional

A mobile-first daily devotional web app and Android app built for people in recovery, faith, and spiritual growth. Based on the book *The Uncovery Devotional* by George A. Wood and Brit Eaton.

## Stack

- **Next.js 14** (App Router, all pages `'use client'`)
- **TypeScript**
- **Tailwind CSS** (custom color palette)
- **Supabase** (Auth + PostgreSQL + Realtime)
- **Framer Motion** (welcome page animations)
- **@dnd-kit** (drag-to-reorder dashboard cards)
- **Vercel** (hosting, manual deploy via `vercel --prod`)
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

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

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
  onboarding/page.tsx                 # Post-welcome setup (name, clean date, groups)
  login/page.tsx                      # Email/password login
  signup/page.tsx                     # Account creation (first name, last name, email, password)
  forgot-password/page.tsx            # Password reset request
  reset-password/page.tsx             # Password reset form
  profile/page.tsx                    # Edit display name, bio, avatar, clean date, change password
  settings/page.tsx                   # Dashboard card toggles, notifications, PWA install
  bookmarks/page.tsx                  # Saved devotions
  journal/page.tsx                    # Private journal entries
  search/page.tsx                     # Search devotions by keyword
  book/page.tsx                       # Get the Book page with Amazon link
  groups/page.tsx                     # Small groups list + open community discovery
  groups/new/page.tsx                 # Create a group
  groups/join/page.tsx                # Join via invite code
  groups/[id]/page.tsx                # Group chat — realtime messages, reactions, long-press actions
  groups/[id]/members/page.tsx        # Members list, invite code, leave/delete group, remove/ban
  updates/[id]/page.tsx               # Full author update
  privacy/page.tsx                    # Privacy policy
  terms/page.tsx                      # Terms of service
  delete-account/page.tsx             # Account deletion request
  auth/callback/page.tsx              # Supabase auth callback handler
  admin/page.tsx                      # Admin dashboard
  admin/devotions/page.tsx            # All devotions
  admin/devotions/new/page.tsx        # Create devotion
  admin/devotions/[id]/edit/page.tsx  # Edit devotion
  admin/updates/page.tsx              # Manage author updates
  admin/updates/new/page.tsx          # Create author update
  admin/updates/[id]/edit/page.tsx    # Edit author update
  admin/users/page.tsx                # User management (search, sort, delete, admin toggle)
  admin/reports/page.tsx              # Message reports (dismiss, ban & remove, unban)

components/
  Header.tsx              # Top navigation with unread group badge
  BottomNav.tsx           # Mobile bottom navigation (Home, Today, Groups, Journal, More)
  DevotionCard.tsx        # Devotion display with bookmark + auto-read-on-scroll
  DevotionCalendar.tsx    # Month/day calendar picker (used on /today and /browse)
  MonthlyStreakGrid.tsx   # Streak calendar grid showing read days (used on /dashboard)
  Avatar.tsx              # Profile photo display component
  AnimatedCard.tsx        # Framer Motion staggered entrance wrapper
  DevotionNotes.tsx       # Inline devotion notes component

lib/
  supabaseClient.ts       # Browser Supabase client
  isAdmin.ts              # Admin check helper
  getTodayET.ts           # Eastern Time date helper
  utils.ts                # cn() utility (clsx + tailwind-merge) for conditional class merging
  types.ts                # Shared TypeScript types (Devotion, etc.)
  constants.ts            # Shared constants (MONTHS array)
  pushUtils.ts            # Push notification utilities (VAPID key conversion, time zone helpers)

public/
  manifest.json           # PWA manifest
  sw.js                   # Service worker for push notifications
  apple-touch-icon.png    # 180×180 iOS icon
  icon-192.png            # 192×192 Android icon
  icon-512.png            # 512×512 Android icon
  badge-72.png            # Notification badge icon for push notifications
  og-image.jpg            # Open Graph image for social sharing previews
  login-hero.jpg          # Background image for login/signup pages
  book.jpg                # Book cover image for /book page
  UDLogo.jpg              # App logo
  community.jpg           # Background image for community group card
  .well-known/
    assetlinks.json       # Android TWA domain verification

docs/
  APP_SPEC.md             # Full feature and route specification
  DB_SCHEMA.md            # Database tables, RLS, functions, triggers
  UI_STYLE.md             # Design system and component patterns
  ENGAGEMENT_ROADMAP.md   # Planned engagement improvements

CLAUDE.md                 # Build rules and patterns for Claude Code (auto-loaded)

scripts/
  import-devotions.mjs    # Bulk upsert devotions from JSON
```

---

## Git Remotes

Two remotes — always push to both, then deploy manually:

```bash
git push origin dev       # GitHub (Wody-Woah/Uncovery_App.git)
git push vercel dev       # Vercel remote (Wody-Woah/uncovery-app.git)
vercel --prod             # Deploy to production
```

GitHub auto-deploy webhook is not working. Always run `vercel --prod` to deploy.

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
- `profiles` — user display names, bios, avatars, clean dates
- `user_flags` — onboarding state per user
- `devotion_reads` — reading history for streaks
- `bookmarks` — saved devotions
- `journal_entries` — private journal
- `author_updates` — messages from George
- `groups` + `group_members` + `group_messages` + `group_message_reactions` — Small Groups
- `group_read_receipts` — unread badge tracking per group
- `group_bans` — banned users per group
- `group_reports` — reported messages (pending/resolved)
- `push_subscriptions` — Web Push API subscriptions for daily reminders
- `admins` — admin access control

---

## Before Pushing

Always run a build check first:

```bash
npm run build
```

Fix any ESLint or TypeScript errors before pushing.
