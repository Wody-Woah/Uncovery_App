# Claude Code — Instructions for The Uncovery Devotional

## Critical Rules (Never Break These)
- **NEVER push to any repo without the user explicitly saying to push.** Always ask first.
- **Always run `npm run build` before pushing** to catch ESLint/TypeScript errors locally.
- **Never use `router.push()`** after login, signup, or welcome completion — use `window.location.href` to ensure full session initialization.
- Apostrophes in JSX must use `&apos;` — raw `'` will fail ESLint.
- Do not over-engineer. Only build what is asked. No extra abstractions, helpers, or features.

---

## Git / Deployment

Two remotes, always push to both:
- `origin` → `git@github.com:Wody-Woah/Uncovery_App.git` → `dev` branch
- `vercel` → `git@github.com:Wody-Woah/uncovery-app.git` → `main` branch

Push commands:
```bash
git push origin dev
git push vercel dev:main
```

Vercel auto-deploys from the `main` branch of the vercel remote.

---

## Tech Stack
- Next.js 14 App Router — all pages are `'use client'`
- TypeScript
- Tailwind CSS with custom colors (see UI_STYLE.md)
- Supabase (`@supabase/supabase-js`) — Auth, PostgreSQL, Realtime
- Framer Motion — used on welcome page only
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
- `is_group_admin(gid)` — admin check for groups
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

---

## File Structure Notes
- `app/` — all pages (Next.js App Router)
- `components/` — shared components (Header, BottomNav, DevotionCard, MonthlyStreakGrid)
- `lib/` — utilities (supabaseClient, isAdmin, getTodayET)
- `public/` — static assets (images, manifest.json, icons, assetlinks.json)
- `docs/` — spec files (this file and others)

---

## Style
See `docs/UI_STYLE.md` for full style guide.
- Use `text-shadow-hero` on white text over the dark background image
- All pages have the fixed dark hero background (set in layout.tsx)
- Bottom navigation bar on mobile (`components/BottomNav.tsx`)

---

## Reference Docs
- App features and routes: `docs/APP_SPEC.md`
- Database tables and functions: `docs/DB_SCHEMA.md`
- Colors and typography: `docs/UI_STYLE.md`
