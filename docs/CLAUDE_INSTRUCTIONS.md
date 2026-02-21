# Claude Code — Build Instructions for "The Uncovery" Web App

## Project Goal
Build a mobile-friendly web app (browser-based) for "The Uncovery" devotional.
It should feel calm, premium, and readable (Bible-app-like), and match the book’s tone.

## Tech Stack (Required)
- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS
- Supabase (Auth + Database)
- @supabase/supabase-js
- Optional (but preferred): shadcn/ui for components

## Hard Rules
- Mobile-first UI.
- Reading experience is the priority.
- Avoid over-engineering.
- No backend server needed beyond Supabase.
- Do NOT store Supabase service role key in the client.
- Use RLS policies already defined in Supabase.
- Keep pages fast and simple.
- Only implement MVP features first.

## MVP Features (Build in This Order)

### 1) Project Setup
- Initialize Next.js App Router project with TypeScript
- Add Tailwind
- Create basic layout shell and global styles

### 2) Supabase Client Setup
- Create `lib/supabaseClient.ts` for browser client
- Add env vars support:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
- Add a `lib/supabaseServer.ts` if needed for server components (optional)

### 3) Auth (Email/Password)
Pages:
- /login
- /signup
Behavior:
- Sign up and log in via Supabase Auth
- After login redirect to /today
- Add a simple user menu or logout button in header

### 4) Data Fetching (Read)
Tables:
- devotions
- month_themes
Queries:
- Today devotion:
  - where month = currentMonth and day = currentDay and published = true
- Month theme:
  - where month = currentMonth

### 5) Pages (Public)
- /today
  - Shows a subtle hero banner (road vibe) with soft gradient fade
  - Shows month theme card
  - Shows devotion card
- /browse
  - Simple month/day picker (dropdowns are fine for MVP)
  - Navigate to /devotion/[month]/[day]
- /devotion/[month]/[day]
  - Fetch devotion by month/day (published only for non-admin)

### 6) Admin Check (RLS-based)
Admins are determined by presence of user row in `admins` table.

Implement a helper:
- `lib/isAdmin.ts`:
  - if user exists, query `admins` where user_id = auth.uid()
  - return true/false

### 7) Admin Pages (Protected)
- /admin
  - Show admin-only controls and list of devotions (basic table)
- /admin/devotions/new
  - Form to create devotion
- /admin/devotions/[id]/edit
  - Form to edit devotion
Admin forms can insert/update/delete devotions via Supabase client.
RLS policies will enforce access.

## UI Requirements (Must Follow)
Follow the style guide: `docs/UI_STYLE.md`
General:
- Warm off-white background
- Charcoal text
- Muted steel-blue accent (buttons/links)
- Devotion content should read like a book:
  - Serif for devotion body and prayer
  - Sans for UI labels/titles
- Constrain reading width (max 700px)
- Use generous spacing and simple cards
- Hero image is subtle (low opacity + gradient fade); do not replicate torn paper effect

## Routing + Navigation
- Header with: Today | Browse | (Admin if admin) | Login/Profile
- / should redirect to /today

## Data Model
Use `docs/DB_SCHEMA.md` as the source of truth.

## Deliverables
Create:
- Complete Next.js project structure
- Pages and components for MVP
- Clear README with setup instructions
- `.env.example`

## Non-MVP (Do NOT build yet)
- Bookmarks
- Notes/highlights
- Search
- Streaks
- Push notifications
- Social features

## Quality Bar
This should feel polished:
- Clean typography
- Smooth spacing
- Works well on mobile
- No broken layouts
- No “developer-looking” raw forms (use clean inputs/buttons)