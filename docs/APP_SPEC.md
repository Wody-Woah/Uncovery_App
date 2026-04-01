# The Uncovery Devotional — App Specification (Current)

## Goal
A mobile-first web app (PWA) and Android app for The Uncovery Devotional book by George A. Wood and Brit Eaton. Designed for people in recovery, faith, and spiritual growth. Feels calm, personal, and readable — like a premium Bible app.

---

## Tech Stack
- Next.js 14 (App Router, `'use client'` pages)
- TypeScript
- Tailwind CSS (custom color palette)
- Supabase (Auth + PostgreSQL + Realtime)
- Framer Motion (animations on welcome page)
- Vercel (hosting, auto-deploy from main branch)
- Resend (transactional email)

---

## Distribution
- Web: uncoverydevotional.com
- Android: Google Play Store (TWA via PWABuilder)
- iOS: Add to Home Screen via Safari (PWA)

---

## Pages / Routes

### Public
- `/` — redirects to `/today` if logged in, `/login` if not
- `/login` — email/password login
- `/signup` — first name, last name, email, password, confirm password
- `/privacy` — privacy policy
- `/delete-account` — account deletion request page

### Authenticated
- `/welcome` — shown once on first login (author message + book cover)
- `/dashboard` — streak stats, today's devotion preview, author updates, quick actions
- `/today` — today's full devotion (auto-marks as read when scrolled to bottom)
- `/browse` — browse devotions by month/day
- `/devotion/[month]/[day]` — full devotion detail page
- `/bookmarks` — saved devotions
- `/journal` — private journal entries
- `/profile` — edit display name, bio, change password
- `/groups` — list of user's small groups
- `/groups/new` — create a new group
- `/groups/join` — join a group via invite code
- `/groups/[id]` — group chat with realtime messages and emoji reactions
- `/groups/[id]/members` — members list, invite code, leave/delete group
- `/updates/[id]` — full author update detail page

### Admin
- `/admin` — admin dashboard with cards linking to sub-pages
- `/admin/devotions` — list all devotions
- `/admin/devotions/new` — create devotion
- `/admin/devotions/[id]/edit` — edit devotion
- `/admin/updates` — manage author updates
- `/admin/users` — search, sort, paginate, delete users, toggle admin role

---

## Features

### Today's Devotion
- Fetches by current month + day (Eastern Time)
- Shows month theme card above devotion
- Auto-marks as read when user scrolls to the bottom (IntersectionObserver)
- Bookmark toggle

### Reading Streaks
- Tracked via `devotion_reads` table
- Dashboard shows current streak, longest streak, total days read
- Monthly streak grid calendar

### Bookmarks
- Save/unsave any devotion
- View all bookmarks on `/bookmarks`

### Journal
- Private per-user journal entries
- Create, view, delete entries

### Small Groups
- Create a group (generates UUID invite code)
- Join via 6-character invite code
- Realtime group chat (Supabase Realtime)
- Emoji reactions on messages (7 emojis: 🙏 ❤️ 👍 🕊️ ✝️ 💙 🔥)
- Today's devotion pinned at top of chat
- Admin role within group (creator is admin)
- Leave group / Delete group (admin only)
- Copy invite code from members page
- Member display names fetched via `get_member_display_names()` security definer function

### Author Updates
- George can post messages to all users
- Pinned updates appear first
- Shown on dashboard (latest 3) and `/updates/[id]` for full view

### Groups Announcement Modal
- Shows on dashboard after first login
- Displays up to 3 times total across logins (tracked in `user_flags`)
- Uses `sessionStorage` to prevent showing more than once per session

### Welcome Page
- Shown on very first login only
- Full author message from George
- Book cover image
- "Continue to App" button sets `has_seen_welcome = true` in `user_flags`

### Admin Users Page
- Search by name or email
- Sort: newest joined, oldest joined, most active, name A–Z
- Pagination (25 per page)
- Delete user with confirmation modal (calls `admin_delete_user()` RPC)
- Toggle admin role with confirmation modal (calls `admin_toggle_admin()` RPC)
- Mobile: card layout | Desktop: table layout

### PWA / App
- `manifest.json` with icons (192×192, 512×512), standalone display
- `apple-touch-icon.png` (180×180)
- `/.well-known/assetlinks.json` for Android TWA verification
- Package name: `com.uncoverydevotional.twa`

---

## Future Features

### Video Section (YouVersion-style)
Modeled after the YouVersion Bible app's video feed. George posts reels to YouTube and the app surfaces them in a polished, native-feeling feed.

**Feed layout:**
- Vertical scrollable list of video cards
- Each card shows a thumbnail (auto-pulled from YouTube using video ID), title, and optional short description
- Tapping a card opens a full-screen video player

**Content management:**
- Videos hosted on YouTube — George posts as normal, admin pastes the YouTube URL
- Thumbnails generated automatically from the YouTube video ID (no manual upload)
- Admin panel to add, remove, and reorder videos
- Optional category/tag per video (e.g. "Recovery", "Faith", "Hope")

**Navigation:**
- Dedicated Videos tab in bottom nav or a "Watch" section on the dashboard featuring 1–2 latest videos

**Database:**
- New `videos` table: `id`, `youtube_url`, `title`, `description`, `category`, `published`, `sort_order`, `created_at`
- YouTube video ID extracted from URL client-side to build thumbnail URL: `https://img.youtube.com/vi/{VIDEO_ID}/hqdefault.jpg`

---

## Key Behaviors
- Devotions repeat every year — year is never used in queries
- All times use Eastern Time (`lib/getTodayET.ts`)
- New users: profile row auto-created by `handle_new_user` trigger, display name saved via user metadata
- First login → welcome page → dashboard → groups announcement modal
- `window.location.href` used (not `router.push`) after login/signup for full session initialization
