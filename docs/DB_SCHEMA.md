# The Uncovery Devotional — Database Schema (Supabase)

## Overview
PostgreSQL database hosted on Supabase with Row Level Security (RLS) on all tables.
Devotions repeat every year — year is never used in queries, only month + day.

---

## Tables

### month_themes
Stores the theme for each month.

| Column | Type | Notes |
|---|---|---|
| month | int | PRIMARY KEY, 1–12 |
| month_name | text | e.g. "March" |
| theme_title | text | |
| theme_scripture_reference | text | |
| theme_scripture_text | text | nullable |

RLS: SELECT open to all authenticated users.

---

### devotions
Daily devotion content.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PRIMARY KEY, gen_random_uuid() |
| month | int | 1–12 |
| day | int | 1–31 |
| title | text | |
| verse_reference | text | |
| verse_text | text | nullable |
| body | text | |
| prayer | text | |
| published | bool | default true |
| created_at | timestamptz | default now() |

Constraints: UNIQUE (month, day)
RLS: SELECT published=true for all; INSERT/UPDATE/DELETE for admins only.

---

### admins
Which users have admin access.

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | PRIMARY KEY, references auth.users |
| created_at | timestamptz | default now() |

RLS: SELECT own row only.

---

### profiles
User profile data. Row auto-created by `handle_new_user` trigger on signup.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PRIMARY KEY, references auth.users |
| display_name | text | nullable, set from user metadata on signup |
| bio | text | nullable |
| avatar_url | text | nullable, public URL to profile photo in Supabase Storage |
| clean_date | date | nullable, user's sobriety date |
| show_journey_card | bool | default true, controls dashboard card visibility |
| show_clean_date_card | bool | default false, controls dashboard card visibility |
| updated_at | timestamptz | |

RLS:
- SELECT: all authenticated users can view all profiles
- INSERT/UPDATE: own row only

---

### user_flags
Per-user feature flags and onboarding state.

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | PRIMARY KEY, references auth.users |
| has_seen_welcome | bool | default false |
| groups_announcement_count | int | default 0 |

RLS: own row only (SELECT, INSERT, UPDATE).

---

### devotion_reads
Tracks which devotions a user has read and when.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PRIMARY KEY |
| user_id | uuid | references auth.users |
| month | int | |
| day | int | |
| read_on | date | YYYY-MM-DD string (Eastern Time) |
| created_at | timestamptz | default now() |

Constraints: UNIQUE (user_id, read_on)
RLS: own rows only.

---

### bookmarks
Saved devotions per user.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PRIMARY KEY |
| user_id | uuid | references auth.users |
| month | int | |
| day | int | |
| created_at | timestamptz | default now() |

Constraints: UNIQUE (user_id, month, day)
RLS: own rows only.

---

### journal_entries
Private journal entries per user.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PRIMARY KEY |
| user_id | uuid | references auth.users |
| title | text | nullable |
| body | text | |
| created_at | timestamptz | default now() |

RLS: own rows only.

---

### author_updates
Messages from George to all users.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PRIMARY KEY |
| title | text | |
| body | text | |
| published | bool | default false |
| pinned | bool | default false |
| published_at | timestamptz | nullable |
| created_at | timestamptz | default now() |

RLS: SELECT published=true for all users; admin can see all; INSERT/UPDATE/DELETE admin only.

---

### groups
Small groups.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PRIMARY KEY |
| name | text | |
| description | text | nullable |
| created_by | uuid | references auth.users |
| invite_code | text | UNIQUE, 6-character code |
| is_public | bool | default false — open community groups anyone can join |
| created_at | timestamptz | default now() |

RLS: SELECT/UPDATE for members only (via `get_my_group_ids()` security definer); public groups readable by all authenticated users via "Anyone can view public groups" policy.

---

### group_members
Membership in small groups.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PRIMARY KEY |
| group_id | uuid | references groups |
| user_id | uuid | references auth.users |
| role | text | 'admin' or 'member' |
| joined_at | timestamptz | default now() |

Constraints: UNIQUE (group_id, user_id)
RLS:
- SELECT: members can view their group's rows
- INSERT: users can join groups (own user_id only)
- DELETE: `is_group_admin()` for group-level admins; "Users can leave groups" for own row; "App admins can remove any member" for app admins

---

### group_messages
Chat messages in small groups.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PRIMARY KEY |
| group_id | uuid | references groups |
| user_id | uuid | references auth.users |
| content | text | |
| month | int | |
| day | int | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | nullable, set when message is edited |

RLS:
- SELECT/INSERT: group members only
- UPDATE: own messages only
- DELETE: own messages, group-level admins for their group, app admins for any group

---

### group_message_reactions
Emoji reactions on group messages.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PRIMARY KEY |
| message_id | uuid | references group_messages |
| user_id | uuid | references auth.users |
| emoji | text | one of 🙏 ❤️ 👍 🕊️ ✝️ 💙 🔥 |
| created_at | timestamptz | default now() |

Constraints: UNIQUE (message_id, user_id, emoji)
RLS: authenticated users can SELECT, INSERT, DELETE own reactions.

---

### group_read_receipts
Tracks the last time a user read messages in a group (for unread badge counts).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PRIMARY KEY |
| group_id | uuid | references groups |
| user_id | uuid | references auth.users |
| last_read_at | timestamptz | updated on every group visit |

Constraints: UNIQUE (group_id, user_id)
RLS: own rows only.

---

### group_bans
Users banned from a specific group.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PRIMARY KEY |
| group_id | uuid | references groups |
| user_id | uuid | references auth.users — the banned user |
| banned_by | uuid | nullable, references auth.users — who issued the ban |
| reason | text | nullable |
| created_at | timestamptz | default now() |

Constraints: UNIQUE (group_id, user_id)
Ban = INSERT, Unban = DELETE (no status column).
RLS:
- ALL: app admins (admins table)
- INSERT/DELETE: group creators and group-level admins ("Group moderators can manage bans")
- SELECT: users can check own ban status

---

### group_reports
User reports of messages in group chats.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PRIMARY KEY |
| group_id | uuid | references groups |
| reporter_user_id | uuid | references auth.users |
| reported_user_id | uuid | references auth.users |
| message_id | uuid | nullable, references group_messages |
| message_content | text | nullable, snapshot of reported message |
| reason | text | nullable — selected category (Harassment, Spam, Inappropriate content, Harmful language, Other) |
| reason_note | text | nullable — optional free-text context from reporter |
| status | text | 'pending' or 'resolved' |
| created_at | timestamptz | default now() |

RLS: authenticated users can INSERT; app admins can SELECT/UPDATE all.

---

### push_subscriptions
Web Push API subscriptions for daily reminder notifications.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PRIMARY KEY |
| user_id | uuid | references auth.users |
| endpoint | text | Push subscription endpoint URL |
| p256dh | text | Public key |
| auth | text | Auth secret |
| reminder_hour | int | Hour (UTC) to send daily reminder, 0–23 |
| created_at | timestamptz | default now() |

Constraints: UNIQUE (user_id, endpoint)
RLS: own rows only.

---

## Security Definer Functions (bypass RLS)

| Function | Purpose |
|---|---|
| `get_my_group_ids()` | Returns array of group IDs the current user belongs to |
| `is_group_admin(gid uuid)` | Returns true if current user is admin of given group |
| `get_group_id_by_invite_code(code text)` | Returns group ID for an invite code (used by non-members joining) |
| `get_member_display_names(member_ids uuid[])` | Returns id + display name (or email fallback) by joining auth.users |
| `admin_get_users()` | Returns all users with profile + read stats for admin panel |
| `admin_delete_user(target_user_id uuid)` | Deletes a user (admin only) |
| `admin_toggle_admin(target_user_id uuid)` | Toggles admin role for a user |

---

## Triggers

| Trigger | Table | Event | Function | Purpose |
|---|---|---|---|---|
| `on_auth_user_created` | auth.users | INSERT | `handle_new_user()` | Auto-creates profiles row, reads display_name from user metadata |
| `set_profiles_updated_at` | profiles | UPDATE | `set_updated_at()` | Updates updated_at timestamp |
| `trg_user_flags_updated_at` | user_flags | UPDATE | `set_updated_at()` | Updates updated_at timestamp |
