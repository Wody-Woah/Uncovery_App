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
- Vercel (hosting, manual deploy via `vercel --prod`)
- Resend (transactional email)
- @dnd-kit (drag-to-reorder dashboard cards)

---

## Distribution
- Web: uncoverydevotional.com
- Android: Google Play Store (TWA via PWABuilder), package `com.uncoverydevotional.twa`
- iOS: Add to Home Screen via Safari (PWA)

---

## Pages / Routes

### Public
- `/` — redirects to `/today` if logged in, `/login` if not
- `/login` — email/password login
- `/signup` — first name, last name, email, password, confirm password
- `/privacy` — privacy policy
- `/terms` — terms of service
- `/delete-account` — account deletion request page

### Authenticated
- `/welcome` — shown once on first login (author message + book cover)
- `/dashboard` — streak stats, today's devotion preview, author updates, drag-reorderable cards
- `/today` — today's full devotion (auto-marks as read when scrolled to bottom)
- `/browse` — browse devotions by month/day
- `/devotion/[month]/[day]` — full devotion detail page
- `/bookmarks` — saved devotions
- `/journal` — private journal entries
- `/profile` — edit display name, bio, avatar, clean date, change password
- `/settings` — dashboard card visibility toggles, notifications, PWA install, legal links
- `/groups` — list of user's small groups
- `/groups/new` — create a new group
- `/groups/join` — join a group via invite code
- `/groups/[id]` — group chat with realtime messages and emoji reactions
- `/groups/[id]/members` — members list, invite code, leave/delete group
- `/updates/[id]` — full author update detail page
- `/search` — search devotions by keyword (title, verse, body)
- `/book` — "Get the Book" page with book cover image and Amazon purchase link

### Admin
- `/admin` — admin dashboard with cards linking to sub-pages
- `/admin/devotions` — list all devotions
- `/admin/devotions/new` — create devotion
- `/admin/devotions/[id]/edit` — edit devotion
- `/admin/updates` — manage author updates (create, publish, pin, edit)
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
- Monthly streak grid calendar (current month)
- Streak milestone celebration overlay fires once per milestone (localStorage-tracked)

### Streak Milestone Celebrations
- Full-screen overlay appears when current streak hits a milestone day count
- Each milestone shown exactly once — stored in `shown_streak_milestones` localStorage key
- Milestones: 1, 7, 14, 30, 60, 90, 180, 365 days
- Content: title, message, scripture quote + reference, congratulations text — all authored by George
- Dismiss button ("Keep Going →") marks it as seen and closes the overlay

### Dashboard Cards
- Four cards: Today, Your Journey, Days Clean, From the Author
- Drag-to-reorder via @dnd-kit (order saved to `dashboard_card_order` localStorage key)
- "Your Journey" and "Days Clean" cards can be toggled on/off in `/settings`
- One-time drag hint shown on first load (`dashboard_drag_hint_seen` localStorage key)

### Bookmarks
- Save/unsave any devotion
- View all bookmarks on `/bookmarks`

### Journal
- Private per-user journal entries
- Create, view, delete entries

### Profile & Avatar
- Edit display name and bio
- Set clean date (used for Days Clean counter)
- Change password
- Upload a profile photo with crop UI (`react-easy-crop`)
- Supports HEIC/HEIF images (converted to JPEG via `heic2any` before crop)
- Avatar stored in Supabase Storage (`avatars` bucket), URL saved to `profiles.avatar_url`
- `Avatar` component used across the app to display profile photos

### Settings
- Toggle "Your Journey" and "Days Clean" dashboard cards on/off
- Push notification opt-in with daily reminder time selector (6 AM – 9 PM local)
- PWA install prompt (Android) or step-by-step instructions (iOS)
- Links to Privacy Policy and Terms of Service

### Days Clean Card
- Shown on dashboard when enabled in settings and a clean date is set in profile
- Displays total days clean or year/month/day breakdown (swipe or dot toggle)
- Anniversary message shown when today matches the clean date anniversary
- Background image rotates based on the month of the clean date

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
- Unread message badge on nav bar (sum across all groups) and on each group card (per-group)
- Badge clears immediately when opening a group (custom `uncovery:group-read` browser event)

### Author Updates
- George can post messages to all users (admin panel)
- Only published updates are visible to all users (no admin exception)
- Pinned updates appear first
- Shown on dashboard (latest 3) and `/updates/[id]` for full view
- Green "New Post" badge on unread updates (tracked via `read_update_ids` localStorage key)
- Marked as read when user opens the full update page

### Groups Announcement Modal
- Shows on dashboard after first login
- Displays up to 3 times total across logins (tracked in `user_flags.groups_announcement_count`)
- Uses `sessionStorage` to prevent showing more than once per session

### Welcome Page
- Shown on very first login only
- Full author message from George
- Book cover image
- "Continue to App" button sets `has_seen_welcome = true` in `user_flags`

### Push Notifications
- Web Push API via service worker (`/sw.js`)
- Subscriptions stored in `push_subscriptions` table
- Daily reminder cron job sends devotion title + verse to subscribed users
- Reminder time set per-subscription in UTC, displayed in user's local timezone

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
- `/.well-known/assetlinks.json` for Android TWA verification (contains both upload key and Google Play app signing key fingerprints)
- Package name: `com.uncoverydevotional.twa`

---

## localStorage Keys

| Key | Purpose |
|---|---|
| `dashboard_card_order` | Saved order of dashboard cards |
| `dashboard_drag_hint_seen` | Whether the drag hint has been dismissed |
| `shown_streak_milestones` | Array of milestone day counts already shown |
| `read_update_ids` | Array of author update IDs the user has opened |

---

## Key Behaviors
- Devotions repeat every year — year is never used in queries
- All times use Eastern Time (`lib/getTodayET.ts`)
- New users: profile row auto-created by `handle_new_user` trigger, display name saved via user metadata
- First login → welcome page → dashboard → groups announcement modal
- `window.location.href` used (not `router.push`) after login/signup for full session initialization
- Custom browser event `uncovery:group-read` dispatched when a group is opened — Header and BottomNav listen to clear unread badge immediately

---

## Future Features

See `docs/ENGAGEMENT_ROADMAP.md` for planned engagement improvements.

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
