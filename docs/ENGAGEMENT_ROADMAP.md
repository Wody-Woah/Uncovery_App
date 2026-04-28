# The Uncovery Devotional — Engagement Roadmap

Planned improvements to deepen daily engagement, encourage return visits, and make the app feel alive and personal. Work through these one at a time.

---

## Status

| # | Feature | Status |
|---|---|---|
| 1 | Streak milestone celebrations | ✅ Done |
| 2 | Group last message preview | Pending |
| 3 | Reading progress bar | ✅ Done |
| 4 | Onboarding improvements | Pending |
| 5 | Empty state improvements | Pending |
| 6 | Weekly recap notification | Pending |
| 7 | Page transitions | Pending |

---

## 1. Streak Milestone Celebrations ✅
Full-screen overlay fires when the user's reading streak hits 1, 7, 14, 30, 60, 90, 180, or 365 days. Each milestone uses a scripture and message authored by George. Shown exactly once per milestone via localStorage.

---

## 2. Group Last Message Preview
**What:** Show the most recent message (and sender name) as a preview line on each group card in `/groups`.

**Why:** Gives users a reason to tap into a group — they can see at a glance that someone posted something new.

**How:**
- Fetch the most recent `group_messages` row for each group (or add a `last_message` denormalized field to `groups`)
- Display sender name + truncated message below the group name on the card
- Show timestamp (e.g. "2h ago") alongside the preview

**DB impact:** Either add a `last_message_at` + `last_message_preview` + `last_message_sender` to `groups` (updated by trigger), or query latest message per group on load.

---

## 3. Reading Progress Bar
**What:** A thin progress bar or percentage shown somewhere on the dashboard or browse page indicating how many of the 365 devotions the user has read.

**Why:** Gives users a sense of overall progress through the book — motivates completion.

**How:**
- `total` from `devotion_reads` count already exists in the streaks object
- Total possible = 365 (or however many devotions are published)
- Show as a progress bar on the Journey card, or a "X of 365 devotions read" line

**No DB changes needed** — already tracked.

---

## 4. Onboarding Improvements
**What:** After the welcome page, guide new users through 2–3 quick setup steps: set a display name/avatar, optionally set a clean date, optionally join or create a group.

**Why:** Users who complete setup are more likely to return. Currently many users skip profile setup entirely.

**How:**
- New `/onboarding` route shown after `/welcome` (check a `has_seen_onboarding` flag in `user_flags`)
- Step 1: Add your name and photo (skip option)
- Step 2: Set your clean date (skip option)
- Step 3: Join or create a small group (skip option)
- Completion redirects to `/dashboard`

**DB impact:** Add `has_seen_onboarding` bool to `user_flags`.

---

## 5. Empty State Improvements
**What:** Replace generic "nothing here yet" text with warm, encouraging empty states that give users a clear next action.

**Why:** Empty states are a missed opportunity — they're often the first thing a new user sees.

**Pages to improve:**
- `/bookmarks` — "You haven't saved anything yet. Tap the bookmark icon on any devotion."
- `/journal` — Something personal and inviting about starting to write
- `/groups` — Already has a good empty state; review and refine if needed
- `/browse` — If no devotions are found for a month

---

## 6. Weekly Recap Notification
**What:** A push notification sent once per week (e.g. Sunday evening) summarizing the user's week — days read, current streak, and an encouraging line.

**Why:** Re-engages users who have drifted. Feels personal, not spammy.

**How:**
- New cron endpoint `/api/send-weekly-recap`
- Query users who have push subscriptions and read at least 1 devotion in the past 30 days
- Build a personalized message: "You read 5 days this week. Your streak is 12 days. Keep going."
- Send via Web Push
- Add `weekly_recap_enabled` bool to `push_subscriptions` or a separate preferences table

**DB impact:** May need a `notification_preferences` table or additional columns on `push_subscriptions`.

---

## 7. Page Transitions
**What:** Smooth, subtle slide or fade transitions when navigating between pages.

**Why:** Makes the app feel more native and polished — especially on mobile where it currently snaps between pages.

**How:**
- Next.js App Router doesn't support page transitions natively; best approach is Framer Motion `AnimatePresence` on the layout
- Keep transitions fast (150–200ms) and directional (slide left on forward nav, slide right on back)
- Must not interfere with scroll position restoration

**Complexity:** Medium-high. Test thoroughly on mobile before shipping.
