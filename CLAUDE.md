# Claude Code — Instructions for The Uncovery Devotional

## Critical Rules (Never Break These)
- **NEVER commit, push, or deploy without the user explicitly saying to.** Always wait for instruction.
- **Always run `npm run build` before pushing** to catch ESLint/TypeScript errors locally.
- **Never use `router.push()`** after login, signup, or welcome completion — use `window.location.href` to ensure full session initialization.
- Apostrophes in JSX must use `&apos;` — raw `'` will fail ESLint.
- Do not over-engineer. Only build what is asked. No extra abstractions, helpers, or features.

---

## Git / Deployment

Two remotes, always push to both:
- `origin` → `git@github.com:Wody-Woah/Uncovery_App.git` → `dev` branch
- `vercel` → `git@github.com:Wody-Woah/uncovery-app.git` → `dev` branch

Push commands:
```bash
git push origin dev
git push vercel dev
vercel --prod
```

GitHub auto-deploy webhook is not working. Always run `vercel --prod` after pushing to deploy to production. Vercel CLI must be installed and authenticated (`vercel login`).

---

## Tech Stack
- Next.js 14 App Router — all pages are `'use client'`
- TypeScript
- Tailwind CSS with custom colors (see UI_STYLE.md)
- Supabase (`@supabase/supabase-js`) — Auth, PostgreSQL, Realtime
- Framer Motion — used on welcome page and AnimatedCard component
- @dnd-kit — drag-to-reorder on dashboard
- Vercel — hosting

---

## Supabase Patterns

### Auth
- Always use `supabase.auth.getUser()` to check session inside `useEffect`
- Redirect to `/login` if no user
- New users auto-get a `profiles` row via the `handle_new_user` trigger

### RLS Workarounds
When RLS causes recursion or blocks legitimate cross-user reads, use **security definer functions** (RPCs) that bypass RLS. Existing ones:
- `get_my_group_ids()` — user's group IDs
- `is_group_admin(gid)` — admin check for groups (checks `group_members.role = 'admin'` only, does NOT check the `admins` table)
- `get_group_id_by_invite_code(code)` — join group without membership
- `get_member_display_names(member_ids)` — names with auth.users email fallback
- `admin_get_users()`, `admin_delete_user()`, `admin_toggle_admin()` — admin panel

### Realtime
- Use `supabase.channel()` with `postgres_changes` for live group chat
- Use `useRef` for values needed inside realtime callbacks to avoid stale closures
- Always call `supabase.removeChannel(channel)` in the useEffect cleanup

### Optimistic Updates
- Apply state change immediately, then call Supabase
- Revert on error
- Used for: emoji reactions, admin role toggle

---

## Common Patterns

### Loading States
Always wrap data fetching in `try/catch/finally` with `setLoading(false)` in `finally`:
```tsx
try {
  // fetch data
} catch {
  // silent fail
} finally {
  setLoading(false)
}
```

### Groups - Creating
Use `crypto.randomUUID()` client-side for the group ID to avoid 403 on `.select()` after insert.

### Date / Time
Always use `getTodayET()` from `lib/getTodayET.ts` — never `new Date()` directly for devotion queries. App uses Eastern Time.

### Cross-Component Events
Custom browser events are used to sync state between components without global state:
- `uncovery:group-read` — dispatched when a group is opened; Header and BottomNav listen to clear unread badge immediately
```tsx
window.dispatchEvent(new CustomEvent('uncovery:group-read', { detail: { groupId: id } }))
```

### Group Message Actions (Long Press)
Long-pressing a message opens an action sheet. Own messages: React / Edit / Delete. Others' messages: React / Report.
- Delete uses an inline confirm step (`confirmDelete` state) — no separate modal
- Edit is inline with Cancel/Save
- Users can only delete their own messages (`group_messages` DELETE RLS: `auth.uid() = user_id`)
- Moderators/admins can delete any message in their group via separate RLS policies

### localStorage Keys
| Key | Purpose |
|---|---|
| `dashboard_card_order` | Saved order of dashboard cards |
| `dashboard_drag_hint_seen` | Whether the drag-to-reorder hint has been dismissed |
| `shown_streak_milestones` | Array of milestone day counts already shown to the user |
| `read_update_ids` | Array of author update IDs the user has opened |

---

## File Structure Notes
- `app/` — all pages (Next.js App Router)
- `components/` — shared components (Header, BottomNav, DevotionCard, MonthlyStreakGrid, Avatar, AnimatedCard, DevotionNotes)
- `lib/` — utilities (supabaseClient, isAdmin, getTodayET)
- `public/` — static assets (images, manifest.json, icons, assetlinks.json, sw.js)
- `docs/` — spec files

---

## Style
See `docs/UI_STYLE.md` for full style guide.
- Page headings: `font-display text-5xl font-bold text-brand-blue text-shadow-hero text-center`
- Use `text-shadow-hero` on white text over the dark background image
- All pages have the fixed dark hero background (set in layout.tsx)
- Dashboard overrides background with `bg-[#162845]` fixed div at `-z-[5]`
- Bottom navigation bar on mobile (`components/BottomNav.tsx`)
- `AnimatedCard` wraps most list items for staggered entrance animation

---

## Reference Docs
- App features and routes: `docs/APP_SPEC.md`
- Database tables and functions: `docs/DB_SCHEMA.md`
- Colors and typography: `docs/UI_STYLE.md`
- Planned engagement improvements: `docs/ENGAGEMENT_ROADMAP.md`
